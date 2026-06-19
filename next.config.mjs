import { withWorkflow } from 'workflow/next';

const nextConfig = {
  outputFileTracingIncludes: {
    '/.well-known/workflow/v1/step': [
      './node_modules/@sparticuz/chromium-min/**/*',
    ],
  },
  serverExternalPackages: [
    '@sparticuz/chromium-min',
    'puppeteer-core',
  ],
};

export default withWorkflow(nextConfig);
