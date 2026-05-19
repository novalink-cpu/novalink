import crypto from 'node:crypto';
import https from 'node:https';
import { URL } from 'node:url';

function normalizeFingerprint(fp) {
  return String(fp || '')
    .replace(/:/g, '')
    .replace(/\s/g, '')
    .toLowerCase();
}

function certFingerprintHex(cert) {
  return crypto.createHash('sha256').update(cert.raw).digest('hex').toLowerCase();
}

function certFingerprintBase64(cert) {
  return crypto.createHash('sha256').update(cert.raw).digest('base64');
}

function fingerprintMatches(cert, expected) {
  const exp = normalizeFingerprint(expected);
  if (!exp) return false;
  return (
    normalizeFingerprint(certFingerprintHex(cert)) === exp ||
    normalizeFingerprint(certFingerprintBase64(cert)) === exp
  );
}

/**
 * Outline Management API (shadowbox) — self-signed cert + fingerprint from install.
 * @see https://github.com/Jigsaw-Code/outline-server
 */
export function outlineRequest(apiUrl, certSha256, method, path, body) {
  const base = new URL(apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`);
  const target = new URL(path.replace(/^\//, ''), base);
  const payload = body !== undefined ? JSON.stringify(body) : undefined;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: target.hostname,
        port: target.port || 443,
        path: target.pathname + target.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let data;
          try {
            data = text ? JSON.parse(text) : {};
          } catch {
            reject(new Error(`Outline invalid JSON: ${text.slice(0, 200)}`));
            return;
          }
          if (res.statusCode >= 400) {
            reject(
              new Error(
                data?.error?.message || data?.message || `Outline HTTP ${res.statusCode}`,
              ),
            );
            return;
          }
          resolve(data);
        });
      },
    );

    req.on('socket', (socket) => {
      socket.on('secureConnect', () => {
        const cert = socket.getPeerCertificate();
        if (!cert?.raw?.length) {
          req.destroy(new Error('Outline: no peer certificate'));
          return;
        }
        if (!fingerprintMatches(cert, certSha256)) {
          req.destroy(new Error('Outline: certificate fingerprint mismatch'));
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/** Create access key; returns ss:// accessUrl from Outline server. */
export async function createOutlineAccessKey(apiUrl, certSha256, name) {
  const data = await outlineRequest(apiUrl, certSha256, 'POST', '/access-keys', {
    name: name || 'NovaLink',
  });
  if (!data?.accessUrl) {
    throw new Error('Outline: accessUrl missing in response');
  }
  return {
    id: data.id,
    name: data.name,
    accessUrl: data.accessUrl,
  };
}

/** Remove access key on Outline server (expire / revoke). */
export async function deleteOutlineAccessKey(apiUrl, certSha256, keyId) {
  if (keyId == null || keyId === '') return;
  await outlineRequest(apiUrl, certSha256, 'DELETE', `/access-keys/${keyId}`);
}
