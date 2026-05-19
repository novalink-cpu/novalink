/**
 * Parse Outline / Shadowsocks ss:// accessUrl into SIP008-style server fields.
 */
export function parseSsAccessUrl(accessUrl) {
  const raw = String(accessUrl || '').trim();
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid access URL: ${raw.slice(0, 80)}`);
  }
  if (url.protocol !== 'ss:') {
    throw new Error(`Expected ss:// URL, got ${url.protocol}`);
  }

  const userInfoB64 = url.username;
  if (!userInfoB64) {
    throw new Error('ss:// URL missing credentials');
  }

  let decoded;
  try {
    decoded = Buffer.from(decodeURIComponent(userInfoB64), 'base64').toString('utf8');
  } catch {
    throw new Error('ss:// credentials are not valid base64');
  }

  const colon = decoded.indexOf(':');
  if (colon < 1) {
    throw new Error('ss:// credentials must be method:password');
  }

  const method = decoded.slice(0, colon);
  const password = decoded.slice(colon + 1);
  const server = url.hostname;
  const server_port = url.port ? parseInt(url.port, 10) : 8388;

  if (!server || !Number.isFinite(server_port)) {
    throw new Error('ss:// URL missing host or port');
  }

  return { server, server_port, method, password };
}
