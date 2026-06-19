import {
  createWebhookSignature,
  parseHttpUrl,
} from './security.js';

export async function sendCompletionCallback(urlValue, payload) {
  const url = parseHttpUrl(urlValue);

  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new Error('The completion webhook must use HTTPS in production.');
  }

  const body = JSON.stringify(payload);
  const signature = createWebhookSignature(
    body,
    process.env.COMPLETION_WEBHOOK_SECRET?.trim(),
  );
  const headers = {
    'content-type': 'application/json',
    'user-agent': 'website-agent/1.0',
  };

  if (signature) {
    headers['x-website-agent-signature'] = signature;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    throw new Error(
      `Completion webhook failed with HTTP ${response.status}: ${responseText.slice(0, 500)}`,
    );
  }
}
