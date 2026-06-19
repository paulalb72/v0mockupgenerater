import { put } from '@vercel/blob';

import { getRequiredEnv } from './config.js';

const DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/;

export function parseLogoDataUrl(value) {
  const match = typeof value === 'string'
    ? value.trim().replace(/\s+/g, '').match(DATA_URL_PATTERN)
    : null;

  if (!match) {
    throw new Error(
      'logo must be a base64 image data URL (data:image/...;base64,...).',
    );
  }

  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');

  if (buffer.length === 0) {
    throw new Error('logo data URL contains no image data.');
  }

  return { contentType, buffer };
}

export async function uploadLogo(dataUrl, jobId) {
  const token = getRequiredEnv('BLOB_READ_WRITE_TOKEN');
  const { contentType, buffer } = parseLogoDataUrl(dataUrl);
  const extension = contentType.split('/')[1]?.split('+')[0] || 'png';
  const blob = await put(`logos/${jobId}-${Date.now()}.${extension}`, buffer, {
    access: 'public',
    contentType,
    token,
  });

  return blob.url;
}
