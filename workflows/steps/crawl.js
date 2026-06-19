import { crawlWebsite } from '../../lib/crawler.js';

export async function crawlWebsiteStep(input) {
  'use step';

  return crawlWebsite({
    sourceUrl: input.sourceUrl,
    requestedMaxPages: input.maxPages,
  });
}
