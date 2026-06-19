import { crawlWebsite } from '../../lib/crawler.js';

export async function crawlWebsiteStep(input) {
  'use step';

  const crawl = await crawlWebsite({
    sourceUrl: input.sourceUrl,
    requestedMaxPages: input.maxPages,
  });

  // Only images, counts and flags are used downstream. The full page text is
  // large and would bloat the persisted step result; an oversized step result
  // can break workflow memoization (the create step re-runs on every poll and
  // creates a fresh chat each time -> permanent chat_not_found).
  return {
    sourceUrl: crawl.sourceUrl,
    crawledAt: crawl.crawledAt,
    pageCount: crawl.pageCount,
    truncated: crawl.truncated,
    images: crawl.images,
  };
}
