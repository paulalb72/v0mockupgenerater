import { del, list } from '@vercel/blob';

import { getPositiveIntegerEnv, getRequiredEnv } from './config.js';

const LOGO_PREFIX = 'logos/';
const DELETE_BATCH_SIZE = 100;
const DEFAULT_RETENTION_DAYS = 7;
const MAX_RETENTION_DAYS = 3650;

export function selectExpiredUrls(blobs, cutoffMs) {
  return blobs
    .filter((blob) => {
      const uploadedAt = new Date(blob.uploadedAt).getTime();
      return Number.isFinite(uploadedAt) && uploadedAt < cutoffMs;
    })
    .map((blob) => blob.url);
}

export async function cleanupOldLogos() {
  const token = getRequiredEnv('BLOB_READ_WRITE_TOKEN');
  const retentionDays = getPositiveIntegerEnv(
    'BLOB_RETENTION_DAYS',
    DEFAULT_RETENTION_DAYS,
    MAX_RETENTION_DAYS,
  );
  const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  let cursor;
  let scanned = 0;
  const expiredUrls = [];

  do {
    const result = await list({ prefix: LOGO_PREFIX, cursor, token });
    scanned += result.blobs.length;
    expiredUrls.push(...selectExpiredUrls(result.blobs, cutoffMs));
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  for (let index = 0; index < expiredUrls.length; index += DELETE_BATCH_SIZE) {
    await del(expiredUrls.slice(index, index + DELETE_BATCH_SIZE), { token });
  }

  return { scanned, deleted: expiredUrls.length, retentionDays };
}
