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

  console.log(
    'v0 chat created:',
    JSON.stringify({
      id: chat?.id ?? null,
      object: chat?.object ?? null,
      privacy: chat?.privacy ?? null,
      webUrl: chat?.webUrl ?? null,
      apiUrl: chat?.apiUrl ?? null,
      url: chat?.url ?? null,
      latestVersionStatus: chat?.latestVersion?.status ?? null,
      latestVersionDemoUrl: chat?.latestVersion?.demoUrl ?? null,
      keys: chat ? Object.keys(chat) : null,
    }),
  );

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

  try {
    chat = await client.chats.getById({ chatId });
  } catch (error) {
    if (isChatNotReady(error)) {
      console.log(
        'v0 status poll: getById not ready',
        JSON.stringify({ chatId, message: error?.message ?? String(error) }),
      );

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

  let versions = null;

  try {
    versions = await client.chats.findVersions({ chatId, limit: 10 });
  } catch (error) {
    console.log(
      'v0 status poll: findVersions failed (ignored)',
      JSON.stringify({ chatId, message: error?.message ?? String(error) }),
    );
  }

  const latestVersion = chat.latestVersion ?? null;
  const selectedVersion = selectStatusVersion(latestVersion, versions);
  const status = latestVersion?.status ?? selectedVersion?.status ?? 'pending';
  const result = {
    chatId: chat.id || chatId,
    status,
    demoUrl: selectedVersion?.demoUrl ?? null,
    screenshotUrl: selectedVersion?.screenshotUrl ?? null,
    versionId: selectedVersion?.id ?? latestVersion?.id ?? null,
    webUrl: chat.webUrl ?? null,
  };

  console.log(
    'v0 status poll:',
    JSON.stringify({
      chatId: result.chatId,
      status: result.status,
      demoUrl: result.demoUrl,
      versionId: result.versionId,
    }),
  );

  return result;
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
