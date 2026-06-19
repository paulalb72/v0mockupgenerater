import { cleanupOldLogos } from '../../../lib/cleanup.js';
import { getRequiredEnv } from '../../../lib/config.js';
import { isAuthorizedWebhook } from '../../../lib/security.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request) {
  let cronSecret;

  try {
    cronSecret = getRequiredEnv('CRON_SECRET');
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 503 },
    );
  }

  if (!isAuthorizedWebhook(request, cronSecret)) {
    return Response.json(
      { success: false, error: 'Unauthorized cleanup request.' },
      { status: 401 },
    );
  }

  try {
    const result = await cleanupOldLogos();

    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error('Logo cleanup failed:', error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error.',
      },
      { status: 500 },
    );
  }
}
