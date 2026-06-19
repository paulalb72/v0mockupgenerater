import { createClient } from 'v0-sdk';

import { getRequiredEnv } from './config.js';

export async function startV0Generation({ prompt, attachments }) {
  const client = createV0Client();
  const payload = {
    message: prompt,
    responseMode: 'async',
  };

  if (attachments.length > 0) {
    payload.attachments = attachments;
  }

  const chat = await client.chats.create(payload);

  if (!chat?.id) {
    throw new Error('v0 did not return a chat ID.');
  }

  return {
    chatId: chat.id,
    webUrl: chat.webUrl ?? null,
    initialStatus: chat.latestVersion?.status ?? 'pending',
  };
}

export async function getV0GenerationStatus(chatId) {
  const client = createV0Client();
  let chat;
  let versions;

  try {
    [chat, versions] = await Promise.all([
      client.chats.getById({ chatId }),
      client.chats.findVersions({ chatId, limit: 10 }),
    ]);
  } catch (error) {
    if (isChatNotReady(error)) {
      return {
        chatId,
        status: 'pending',
        demoUrl: null,
        screenshotUrl: null,
        versionId: null,
        webUrl: null,
      };
    }

    throw error;
  }

  const latestVersion = chat.latestVersion ?? null;
  const selectedVersion = selectStatusVersion(latestVersion, versions);
  const status = latestVersion?.status ?? selectedVersion?.status ?? 'pending';

  return {
    chatId: chat.id || chatId,
    status,
    demoUrl: selectedVersion?.demoUrl ?? null,
    screenshotUrl: selectedVersion?.screenshotUrl ?? null,
    versionId: selectedVersion?.id ?? latestVersion?.id ?? null,
    webUrl: chat.webUrl ?? null,
  };
}

export function isChatNotReady(error) {
  const status = error?.status ?? error?.statusCode;

  if (status === 404) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error ?? '');

  return /\bHTTP 404\b/.test(message)
    || /chat_not_found|not_found_error/i.test(message);
}

function createV0Client() {
  return createClient({
    apiKey: getRequiredEnv('V0_API_KEY'),
    baseUrl: process.env.V0_API_URL?.trim() || 'https://api.v0.dev/v1',
  });
}

function selectStatusVersion(latestVersion, versions) {
  const availableVersions = Array.isArray(versions?.data) ? versions.data : [];

  if (
    latestVersion
    && typeof latestVersion.demoUrl === 'string'
    && latestVersion.demoUrl.trim() !== ''
  ) {
    return latestVersion;
  }

  return availableVersions.find((version) => (
    version?.id === latestVersion?.id
    && version?.status === 'completed'
    && version?.demoUrl
  )) ?? availableVersions.find((version) => (
    version?.status === 'completed' && version?.demoUrl
  )) ?? latestVersion;
}
