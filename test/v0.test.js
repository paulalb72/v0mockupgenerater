import assert from 'node:assert/strict';
import test from 'node:test';

import { isChatNotReady } from '../lib/v0.js';

test('treats a 404 chat_not_found as not-yet-ready', () => {
  assert.equal(
    isChatNotReady(new Error('HTTP 404: {"error":{"code":"chat_not_found"}}')),
    true,
  );
  assert.equal(isChatNotReady({ status: 404 }), true);
});

test('does not swallow other errors', () => {
  assert.equal(isChatNotReady(new Error('HTTP 500: server error')), false);
  assert.equal(isChatNotReady({ status: 429 }), false);
  assert.equal(isChatNotReady(new Error('Network down')), false);
});
