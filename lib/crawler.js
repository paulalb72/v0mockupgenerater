import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

import { getPositiveIntegerEnv } from './config.js';
import { assertPublicHttpUrl } from './security.js';

const NAVIGATION_TIMEOUT_MS = 45_000;
const MAX_TEXT_PER_PAGE = 10_000;
const DEFAULT_MAX_PAGES = 15;
const HARD_MAX_PAGES = 30;
const DEFAULT_MAX_TEXT_CHARS = 80_000;
const HARD_MAX_TEXT_CHARS = 160_000;
const MAX_IMAGES = 40;
const SKIPPED_EXTENSIONS =
  /\.(?:7z|avi|css|csv|docx?|eot|gif|gz|ico|jpe?g|js|json|mov|mp3|mp4|pdf|png|pptx?|rar|svg|tar|tiff?|ttf|txt|webm|webp|woff2?|xlsx?|xml|zip)$/i;

const CONSENT_PATTERNS = [
  /accept all/i,
  /accept cookies/i,
  /^accept$/i,
  /allow all/i,
  /alles akzeptieren/i,
  /alle akzeptieren/i,
  /cookies akzeptieren/i,
  /^akzeptieren$/i,
  /zustimmen/i,
  /einverstanden/i,
];

export async function crawlWebsite({
  sourceUrl,
  requestedMaxPages,
}) {
  const entryUrl = await assertPublicHttpUrl(sourceUrl);
  const maxPages = Math.min(
    requestedMaxPages
      || getPositiveIntegerEnv('CRAWLER_MAX_PAGES', DEFAULT_MAX_PAGES, HARD_MAX_PAGES),
    HARD_MAX_PAGES,
  );
  const maxTextChars = getPositiveIntegerEnv(
    'CRAWLER_MAX_TEXT_CHARS',
    DEFAULT_MAX_TEXT_CHARS,
    HARD_MAX_TEXT_CHARS,
  );
  const executablePath = await resolveExecutablePath();
  const headless = localChromeIsConfigured() ? true : 'shell';
  const browser = await puppeteer.launch({
    args: localChromeIsConfigured()
      ? await puppeteer.defaultArgs({ headless })
      : await puppeteer.defaultArgs({ args: chromium.args, headless }),
    defaultViewport: { width: 1440, height: 900 },
    executablePath,
    headless,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (compatible; WebsiteAgent/1.0; +https://vercel.com)',
    );
    await installRequestGuard(page);
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    page.setDefaultTimeout(12_000);

    const queue = [canonicalizeUrl(entryUrl)];
    const queued = new Set(queue);
    const pages = [];
    const images = [];
    const seenImages = new Set();
    let totalTextChars = 0;
    let crawlOrigin = entryUrl.origin;

    while (
      queue.length > 0
      && pages.length < maxPages
      && totalTextChars < maxTextChars
    ) {
      const currentUrl = queue.shift();

      try {
        await assertPublicHttpUrl(currentUrl);
        const response = await page.goto(currentUrl, {
          timeout: NAVIGATION_TIMEOUT_MS,
          waitUntil: 'domcontentloaded',
        });

        if (!response || response.status() >= 400) {
          pages.push({
            url: currentUrl,
            error: `HTTP ${response?.status() ?? 'navigation failed'}`,
          });
          continue;
        }

        await dismissConsent(page);
        await waitForSettledPage(page);

        const extracted = await extractPage(page);
        const finalUrl = canonicalizeUrl(new URL(page.url()));
        if (successfulPageCount(pages) === 0) {
          crawlOrigin = new URL(finalUrl).origin;
        }
        const remainingText = maxTextChars - totalTextChars;
        const text = extracted.text.slice(
          0,
          Math.min(MAX_TEXT_PER_PAGE, remainingText),
        );

        pages.push({
          url: finalUrl,
          title: extracted.title,
          description: extracted.description,
          headings: extracted.headings,
          text,
        });
        totalTextChars += text.length;

        for (const image of extracted.images) {
          if (images.length >= MAX_IMAGES || seenImages.has(image.url)) {
            continue;
          }

          seenImages.add(image.url);
          images.push(image);
        }

        for (const link of extracted.links) {
          const candidate = normalizeInternalLink(link, finalUrl, crawlOrigin);

          if (
            !candidate
            || queued.has(candidate)
            || queued.size >= maxPages * 5
          ) {
            continue;
          }

          queued.add(candidate);
          queue.push(candidate);
        }
      } catch (error) {
        pages.push({
          url: currentUrl,
          error: getErrorMessage(error),
        });
      }
    }

    const successfulPages = pages.filter((pageResult) => !pageResult.error);

    if (successfulPages.length === 0) {
      throw new Error(
        `No page could be crawled successfully. ${pages[0]?.error || ''}`.trim(),
      );
    }

    return {
      sourceUrl: entryUrl.toString(),
      crawledAt: new Date().toISOString(),
      pageCount: successfulPages.length,
      pages,
      images,
      truncated: queue.length > 0 || totalTextChars >= maxTextChars,
    };
  } finally {
    await browser.close();
  }
}

async function installRequestGuard(page) {
  const publicHostCache = new Map();

  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const requestUrl = request.url();

    if (!/^https?:/i.test(requestUrl)) {
      await request.continue().catch(() => {});
      return;
    }

    try {
      const hostname = new URL(requestUrl).hostname.toLowerCase();
      let validation = publicHostCache.get(hostname);

      if (!validation) {
        validation = assertPublicHttpUrl(requestUrl);
        publicHostCache.set(hostname, validation);
      }

      await validation;
      await request.continue();
    } catch {
      await request.abort('blockedbyclient').catch(() => {});
    }
  });
}

async function resolveExecutablePath() {
  const localExecutable = process.env.CHROME_EXECUTABLE_PATH?.trim();

  if (localExecutable) {
    return localExecutable;
  }

  const packUrl = process.env.CHROMIUM_PACK_URL?.trim();

  if (!packUrl) {
    throw new Error(
      'CHROMIUM_PACK_URL or CHROME_EXECUTABLE_PATH must be configured.',
    );
  }

  return chromium.executablePath(packUrl);
}

function localChromeIsConfigured() {
  return Boolean(process.env.CHROME_EXECUTABLE_PATH?.trim());
}

async function waitForSettledPage(page) {
  await Promise.race([
    page.waitForNetworkIdle({ idleTime: 500, timeout: 5_000 }),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]).catch(() => {});
}

async function dismissConsent(page) {
  await new Promise((resolve) => setTimeout(resolve, 500));

  for (const pattern of CONSENT_PATTERNS) {
    const clicked = await page.evaluate((source) => {
      const matcher = new RegExp(source, 'i');
      const candidates = [
        ...document.querySelectorAll(
          'button, a, [role="button"], input[type="button"], input[type="submit"]',
        ),
      ];
      const target = candidates.find((element) => {
        const text = (
          element.innerText
          || element.textContent
          || element.value
          || ''
        ).trim();
        const rect = element.getBoundingClientRect();

        return rect.width > 0 && rect.height > 0 && matcher.test(text);
      });

      if (!target) {
        return false;
      }

      target.click();
      return true;
    }, pattern.source).catch(() => false);

    if (clicked) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      break;
    }
  }
}

async function extractPage(page) {
  return page.evaluate(() => {
    const normalize = (value) =>
      (value || '')
        .replace(/\r/g, '')
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n')
        .trim();
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const links = [...document.querySelectorAll('a[href]')]
      .filter(visible)
      .map((anchor) => anchor.href);
    const images = [...document.images]
      .filter(visible)
      .map((image) => ({
        url: image.currentSrc || image.src,
        alt: (image.alt || '').trim() || null,
        width: image.naturalWidth || Math.round(image.getBoundingClientRect().width),
        height:
          image.naturalHeight || Math.round(image.getBoundingClientRect().height),
      }))
      .filter((image) => /^https?:/i.test(image.url));

    return {
      title: document.title.trim(),
      description:
        document.querySelector('meta[name="description"]')?.content?.trim() || '',
      headings: [...document.querySelectorAll('h1, h2, h3')]
        .filter(visible)
        .map((heading) => normalize(heading.innerText))
        .filter(Boolean)
        .slice(0, 80),
      text: normalize(document.body?.innerText || ''),
      links,
      images,
    };
  });
}

function normalizeInternalLink(value, baseUrl, origin) {
  try {
    const url = new URL(value, baseUrl);

    if (
      !['http:', 'https:'].includes(url.protocol)
      || url.origin !== origin
      || SKIPPED_EXTENSIONS.test(url.pathname)
      || /\/(?:logout|log-out|signout|sign-out)(?:\/|$)/i.test(url.pathname)
    ) {
      return null;
    }

    return canonicalizeUrl(url);
  } catch {
    return null;
  }
}

function canonicalizeUrl(input) {
  const url = input instanceof URL ? new URL(input) : new URL(input);
  url.hash = '';

  for (const key of [...url.searchParams.keys()]) {
    if (
      key.toLowerCase().startsWith('utm_')
      || ['fbclid', 'gclid', 'ref'].includes(key.toLowerCase())
    ) {
      url.searchParams.delete(key);
    }
  }

  if (url.pathname !== '/') {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }

  return url.toString();
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Unexpected crawl error.';
}

function successfulPageCount(pages) {
  return pages.reduce(
    (count, pageResult) => count + Number(!pageResult.error),
    0,
  );
}
