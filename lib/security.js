import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
]);

export function isAuthorizedWebhook(request, secret) {
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get('authorization') || '';
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const headerToken = request.headers.get('x-webhook-secret')?.trim();
  const candidate = bearerToken || headerToken || '';

  return safeEqual(candidate, secret);
}

export function createWebhookSignature(body, secret) {
  if (!secret) {
    return null;
  }

  return `sha256=${crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')}`;
}

export async function assertPublicHttpUrl(value) {
  const url = parseHttpUrl(value);
  const hostname = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');

  if (
    BLOCKED_HOSTNAMES.has(hostname)
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal')
  ) {
    throw new Error('The URL hostname is not publicly routable.');
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error('Private and loopback IP addresses are not allowed.');
    }

    return url;
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });

  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error('The URL resolves to a private or unavailable address.');
  }

  return url;
}

export function parseHttpUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('A valid website URL is required.');
  }

  let url;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('A valid website URL is required.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are allowed.');
  }

  url.username = '';
  url.password = '';
  url.hash = '';

  return url;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length
    && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isPrivateIp(address) {
  const family = net.isIP(address);

  if (family === 4) {
    const [a, b] = address.split('.').map(Number);

    return (
      a === 0
      || a === 10
      || a === 127
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127)
      || a >= 224
    );
  }

  if (family === 6) {
    const normalized = address.toLowerCase();
    const mappedIpv4 = parseMappedIpv4(normalized);

    if (mappedIpv4) {
      return isPrivateIp(mappedIpv4);
    }

    return (
      normalized === '::'
      || normalized === '::1'
      || normalized.startsWith('fc')
      || normalized.startsWith('fd')
      || /^fe[89ab]/.test(normalized)
      || normalized.startsWith('2001:db8:')
    );
  }

  return true;
}

function parseMappedIpv4(address) {
  const dotted = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];

  if (dotted) {
    return dotted;
  }

  const hexadecimal = address.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);

  if (!hexadecimal) {
    return null;
  }

  const high = Number.parseInt(hexadecimal[1], 16);
  const low = Number.parseInt(hexadecimal[2], 16);

  return [
    high >> 8,
    high & 0xff,
    low >> 8,
    low & 0xff,
  ].join('.');
}
