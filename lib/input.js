import { z } from 'zod';

const jobIdPattern = /^[A-Za-z0-9_-]{1,100}$/;
const logoDataUrlPattern = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/;
const MAX_LOGO_CHARS = 6_000_000;

const incomingSchema = z
  .object({
    jobId: z.string().regex(jobIdPattern).optional(),
    url: z.string().optional(),
    currentUrl: z.string().optional(),
    websiteUrl: z.string().optional(),
    prompt: z.string().trim().min(1).max(50_000),
    logo: z
      .string()
      .max(MAX_LOGO_CHARS)
      .regex(
        logoDataUrlPattern,
        'logo must be a base64 image data URL (data:image/...;base64,...).',
      ),
    brandManual: z.unknown().optional(),
    brand_manual: z.unknown().optional(),
    websiteStructure: z.unknown().optional(),
    structure: z.unknown().optional(),
    additionalTexts: z.record(z.string(), z.string()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    maxPages: z.number().int().min(1).max(30).optional(),
  })
  .passthrough();

export function parseGenerationInput(body) {
  const result = incomingSchema.safeParse(body);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');
    throw new InputError(message);
  }

  const data = result.data;
  const sourceUrl = data.url || data.currentUrl || data.websiteUrl;

  if (!sourceUrl) {
    throw new InputError('url, currentUrl, or websiteUrl is required.');
  }

  return {
    jobId: data.jobId || createJobId(),
    sourceUrl,
    prompt: data.prompt,
    logo: data.logo.replace(/\s+/g, ''),
    brandManual: data.brandManual ?? data.brand_manual ?? null,
    websiteStructure: data.websiteStructure ?? data.structure ?? null,
    additionalTexts: data.additionalTexts ?? {},
    metadata: data.metadata ?? {},
    maxPages: data.maxPages,
  };
}

export class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InputError';
  }
}

function createJobId() {
  return `website-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}
