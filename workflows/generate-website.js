import { FatalError, sleep } from 'workflow';

import {
  sendFailureCallbackStep,
  sendSuccessCallbackStep,
} from './steps/callback.js';
import { crawlWebsiteStep } from './steps/crawl.js';
import {
  getV0StatusStep,
  startV0GenerationStep,
} from './steps/v0.js';

export async function generateWebsiteWorkflow(input) {
  'use workflow';

  try {
    const crawl = await crawlWebsiteStep(input);
    const generation = await startV0GenerationStep(input, crawl);
    const completed = generation.demoUrl
      ? generation
      : await waitForV0Completion(
        generation.chatId,
        input.pollIntervalSeconds,
        input.maxPollAttempts,
      );

    await sendSuccessCallbackStep(input, crawl, completed);

    return {
      jobId: input.jobId,
      chatId: completed.chatId,
      demoUrl: completed.demoUrl,
      status: 'completed',
    };
  } catch (error) {
    await sendFailureCallbackStep(input, serializeError(error));
    throw error;
  }
}

async function waitForV0Completion(chatId, pollInterval, maxAttempts) {
  let lastStatus = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const status = await getV0StatusStep(chatId);
    lastStatus = status;

    if (status.demoUrl) {
      return status;
    }

    if (status.status === 'failed') {
      throw new FatalError(`v0 generation failed for chat ${chatId}.`);
    }

    await sleep(`${pollInterval} seconds`);
  }

  throw new FatalError(
    `v0 generation did not complete after ${maxAttempts} status checks `
    + `(last status: ${lastStatus?.status ?? 'unknown'}, `
    + `demoUrl: ${lastStatus?.demoUrl ?? 'none'}, `
    + `webUrl: ${lastStatus?.webUrl ?? 'none'}).`,
  );
}

function serializeError(error) {
  return {
    name: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : String(error),
  };
}
