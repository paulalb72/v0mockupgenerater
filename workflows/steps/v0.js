import {
  buildV0Prompt,
  getV0ImageAttachments,
} from '../../lib/prompt.js';
import { uploadLogo } from '../../lib/logo.js';
import {
  getV0GenerationStatus,
  startV0Generation,
} from '../../lib/v0.js';

export async function startV0GenerationStep(input, crawl) {
  'use step';

  const attachments = getV0ImageAttachments(crawl);

  if (input.logo) {
    const logoUrl = await uploadLogo(input.logo, input.jobId);
    attachments.unshift({ url: logoUrl });
  }

  return startV0Generation({
    prompt: buildV0Prompt(input, crawl),
    attachments,
  });
}

export async function getV0StatusStep(chatId) {
  'use step';

  return getV0GenerationStatus(chatId);
}
