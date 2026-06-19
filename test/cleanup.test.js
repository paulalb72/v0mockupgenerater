import assert from 'node:assert/strict';
import test from 'node:test';

import { selectExpiredUrls } from '../lib/cleanup.js';

test('selects only blobs uploaded before the cutoff', () => {
  const cutoffMs = new Date('2026-06-10T00:00:00.000Z').getTime();
  const blobs = [
    { url: 'https://blob/old.png', uploadedAt: '2026-06-01T00:00:00.000Z' },
    { url: 'https://blob/fresh.png', uploadedAt: '2026-06-15T00:00:00.000Z' },
    { url: 'https://blob/edge.png', uploadedAt: '2026-06-10T00:00:00.000Z' },
  ];

  const expired = selectExpiredUrls(blobs, cutoffMs);

  assert.deepEqual(expired, ['https://blob/old.png']);
});

test('ignores blobs with an unparseable timestamp', () => {
  const expired = selectExpiredUrls(
    [{ url: 'https://blob/broken.png', uploadedAt: 'not-a-date' }],
    Date.now(),
  );

  assert.deepEqual(expired, []);
});
