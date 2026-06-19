import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertPublicHttpUrl,
  createWebhookSignature,
  isAuthorizedWebhook,
  parseHttpUrl,
} from '../lib/security.js';

test('accepts bearer and webhook-secret authentication', () => {
  const bearerRequest = new Request('https://agent.example/api/generate', {
    headers: { authorization: 'Bearer secret' },
  });
  const headerRequest = new Request('https://agent.example/api/generate', {
    headers: { 'x-webhook-secret': 'secret' },
  });

  assert.equal(isAuthorizedWebhook(bearerRequest, 'secret'), true);
  assert.equal(isAuthorizedWebhook(headerRequest, 'secret'), true);
  assert.equal(isAuthorizedWebhook(headerRequest, 'wrong'), false);
});

test('creates stable HMAC signatures', () => {
  assert.equal(
    createWebhookSignature('{"ok":true}', 'secret'),
    'sha256=f6b4a2841c93f8bf2fb8f2c13d8fb0b6c8e8019f09ee405d248daa8385fad638',
  );
});

test('allows only HTTP URLs', () => {
  assert.equal(parseHttpUrl('https://example.com').protocol, 'https:');
  assert.throws(() => parseHttpUrl('file:///etc/passwd'));
});

test('blocks local and private crawl targets', async () => {
  await assert.rejects(() => assertPublicHttpUrl('http://localhost'));
  await assert.rejects(() => assertPublicHttpUrl('http://127.0.0.1'));
  await assert.rejects(() => assertPublicHttpUrl('http://10.0.0.1'));
  await assert.rejects(() =>
    assertPublicHttpUrl('http://[::ffff:127.0.0.1]'),
  );
});
