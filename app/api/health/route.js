export const runtime = 'nodejs';

export function GET() {
  return Response.json({
    ok: true,
    service: 'website-agent',
    timestamp: new Date().toISOString(),
  });
}
