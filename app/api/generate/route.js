import { start } from 'workflow/api';

import { generateWebsiteWorkflow } from '../../../workflows/generate-website.js';
import {
  getPositiveIntegerEnv,
  getRequiredEnv,
} from '../../../lib/config.js';
import { InputError, parseGenerationInput } from '../../../lib/input.js';
import {
  assertPublicHttpUrl,
  isAuthorizedWebhook,
} from '../../../lib/security.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  let inboundSecret;

  try {
    inboundSecret = getRequiredEnv('INBOUND_WEBHOOK_SECRET');
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 503 },
    );
  }

  if (!isAuthorizedWebhook(request, inboundSecret)) {
    return Response.json(
      { success: false, error: 'Unauthorized webhook request.' },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const input = parseGenerationInput(body);
    const publicUrl = await assertPublicHttpUrl(input.sourceUrl);
    input.sourceUrl = publicUrl.toString();
    input.pollIntervalSeconds = getPositiveIntegerEnv(
      'V0_POLL_INTERVAL_SECONDS',
      10,
      60,
    );
    input.maxPollAttempts = getPositiveIntegerEnv(
      'V0_MAX_POLL_ATTEMPTS',
      90,
      360,
    );

    const run = await start(generateWebsiteWorkflow, [input]);

    return Response.json(
      {
        success: true,
        accepted: true,
        jobId: input.jobId,
        runId: run.runId,
        status: 'queued',
      },
      { status: 202 },
    );
  } catch (error) {
    const isBadRequest =
      error instanceof InputError
      || error instanceof SyntaxError
      || /URL|hostname|address|required/i.test(error.message || '');

    console.error('Generate webhook failed:', error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error.',
      },
      { status: isBadRequest ? 400 : 500 },
    );
  }
}
