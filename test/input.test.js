import assert from 'node:assert/strict';
import test from 'node:test';

import {
  InputError,
  parseGenerationInput,
} from '../lib/input.js';

const LOGO_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

test('normalizes supported webhook field aliases', () => {
  const input = parseGenerationInput({
    currentUrl: 'https://example.com',
    prompt: 'Build the website',
    logo: LOGO_DATA_URL,
    brand_manual: { colors: ['#fff'] },
    structure: { pages: ['home'] },
    additionalTexts: { claim: 'Best in class' },
  });

  assert.equal(input.sourceUrl, 'https://example.com');
  assert.equal(input.logo, LOGO_DATA_URL);
  assert.deepEqual(input.brandManual, { colors: ['#fff'] });
  assert.deepEqual(input.websiteStructure, { pages: ['home'] });
  assert.deepEqual(input.additionalTexts, { claim: 'Best in class' });
});

test('rejects a payload without a URL', () => {
  assert.throws(
    () => parseGenerationInput({ prompt: 'Build the website', logo: LOGO_DATA_URL }),
    InputError,
  );
});

test('rejects a payload without a logo', () => {
  assert.throws(
    () =>
      parseGenerationInput({
        url: 'https://example.com',
        prompt: 'Build the website',
      }),
    InputError,
  );
});

test('rejects a logo that is not a base64 image data URL', () => {
  assert.throws(
    () =>
      parseGenerationInput({
        url: 'https://example.com',
        prompt: 'Build the website',
        logo: 'https://example.com/logo.png',
      }),
    InputError,
  );
});

test('rejects unsafe job IDs', () => {
  assert.throws(
    () =>
      parseGenerationInput({
        jobId: '../unsafe',
        url: 'https://example.com',
        prompt: 'Build the website',
        logo: LOGO_DATA_URL,
      }),
    InputError,
  );
});
