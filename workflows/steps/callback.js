import { sendCompletionCallback } from '../../lib/callback.js';
import { getCompletionWebhookUrl } from '../../lib/config.js';

export async function sendSuccessCallbackStep(input, crawl, generation) {
  'use step';

  await sendCompletionCallback(getCompletionWebhookUrl(), {
    success: true,
    status: 'completed',
    jobId: input.jobId,
    sourceUrl: input.sourceUrl,
    chatId: generation.chatId,
    versionId: generation.versionId,
    demoUrl: generation.demoUrl,
    screenshotUrl: generation.screenshotUrl,
    webUrl: generation.webUrl,
    crawledPages: crawl.pageCount,
    crawlTruncated: crawl.truncated,
    metadata: input.metadata,
    completedAt: new Date().toISOString(),
  });
}

export async function sendFailureCallbackStep(input, error) {
  'use step';

  await sendCompletionCallback(getCompletionWebhookUrl(), {
    success: false,
    status: 'failed',
    jobId: input.jobId,
    sourceUrl: input.sourceUrl,
    error,
    metadata: input.metadata,
    completedAt: new Date().toISOString(),
  });
}
