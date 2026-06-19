import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildV0Prompt,
  getV0ImageAttachments,
} from '../lib/prompt.js';

test('combines instructions, JSON inputs, additional texts, and crawl content', () => {
  const prompt = buildV0Prompt(
    {
      prompt: 'Create a new site.',
      brandManual: { primary: '#000' },
      websiteStructure: { pages: ['home'] },
      additionalTexts: { claim: 'Quality first' },
    },
    {
      pages: [{ url: 'https://example.com', text: 'Current copy' }],
      images: [],
    },
  );

  assert.match(prompt, /Create a new site/);
  assert.match(prompt, /Brand Manual/);
  assert.match(prompt, /Weitere Texte/);
  assert.match(prompt, /Quality first/);
  assert.match(prompt, /Marken-Logo/);
  assert.match(prompt, /Current copy/);
});

test('prioritizes likely logos and caps v0 image attachments', () => {
  const images = Array.from({ length: 12 }, (_, index) => ({
    url: `https://example.com/image-${index}.png`,
    alt: index === 10 ? 'Company Logo' : '',
  }));
  const attachments = getV0ImageAttachments({ images });

  assert.equal(attachments.length, 8);
  assert.equal(attachments[0].url, 'https://example.com/image-10.png');
});
