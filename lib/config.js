const DEFAULT_COMPLETION_WEBHOOK_URL =
  'https://mmpagent.makemyki.de/api/webhooks/website-agent';

export function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getCompletionWebhookUrl() {
  return process.env.COMPLETION_WEBHOOK_URL?.trim()
    || DEFAULT_COMPLETION_WEBHOOK_URL;
}

export function getPositiveIntegerEnv(name, fallback, maximum) {
  const parsed = Number.parseInt(process.env[name] || '', 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, maximum);
}
