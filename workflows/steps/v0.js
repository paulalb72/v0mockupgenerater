import { buildV0Prompt } from '../../lib/prompt.js';
import { uploadLogo } from '../../lib/logo.js';
import {
  getV0GenerationStatus,
  startV0Generation,
} from '../../lib/v0.js';

export async function startV0GenerationStep(input, crawl) {
  'use step';

  const prompt = buildV0Prompt(input, crawl);
  const attachments = [];

  if (input.logo) {
    const logoUrl = await uploadLogo(input.logo, input.jobId);
    attachments.push({ url: logoUrl });
  }

  console.log(
    'v0 generation start:',
    JSON.stringify({
      promptChars: prompt.length,
      attachmentCount: attachments.length,
      attachmentUrls: attachments.map((attachment) => attachment.url),
    }),
  );

  return startV0Generation({ prompt, attachments });
}

export async function getV0StatusStep(chatId) {
  'use step';

  return getV0GenerationStatus(chatId);
}
