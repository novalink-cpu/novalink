/**
 * Local ssconf demo — no Docker required.
 * Starts embedded PostgreSQL, API server, creates order, approves, fetches JSON.
 *
 * Usage: node scripts/local-ssconf-e2e.mjs
 */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server', 'package.json'));
const EmbeddedPostgres = require('embedded-postgres').default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const serverDir = path.join(root, 'server');
const pgData = path.join(root, '.local-pgdata');
const pgPort = 55432;

function signAdminAction(orderId, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(`approve:${String(orderId)}`)
    .digest('hex')
    .slice(0, 24);
}

async function waitFor(url, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  console.log('=== NovaLink local ssconf E2E (demo mode) ===\n');

  const pg = new EmbeddedPostgres({
    databaseDir: pgData,
    user: 'novalink',
    password: 'novalink',
    port: pgPort,
    persistent: true,
  });

  console.log('[1/6] Starting embedded PostgreSQL on port', pgPort, '...');
  const pgVersionFile = path.join(pgData, 'PG_VERSION');
  let pgReady = false;
  try {
    await import('node:fs/promises').then((fs) => fs.access(pgVersionFile));
    pgReady = true;
    console.log('       Reusing existing .local-pgdata');
  } catch {
    /* first run */
  }
  if (!pgReady) await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase('novalink');
  } catch (e) {
    if (!/already exists/i.test(String(e.message))) throw e;
  }

  const databaseUrl = `postgresql://novalink:novalink@127.0.0.1:${pgPort}/novalink`;
  const adminSecret = 'local-demo-secret';
  const apiBase = 'http://127.0.0.1:3000';

  const env = {
    ...process.env,
    PORT: '3000',
    HOST: '127.0.0.1',
    DATABASE_URL: databaseUrl,
    PUBLIC_API_URL: apiBase,
    APP_PUBLIC_URL: 'http://localhost:5173',
    CORS_ORIGINS: 'http://localhost:5173',
    ADMIN_ACTION_SECRET: adminSecret,
    VPN_DEMO_MODE: '1',
    VPN_USE_SSCONF: '1',
    TRUST_PROXY: '0',
    SKIP_DOTENV: '1',
    TELEGRAM_BOT_TOKEN: '',
    TELEGRAM_ADMIN_CHAT_IDS: '',
  };

  console.log('[2/6] Starting API server...');
  const serverProc = spawn(process.execPath, ['src/index.js'], {
    cwd: serverDir,
    env: { ...env, DOTENV_CONFIG_PATH: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverLog = '';
  serverProc.stdout.on('data', (d) => {
    serverLog += d.toString();
    process.stdout.write(d);
  });
  serverProc.stderr.on('data', (d) => {
    serverLog += d.toString();
    process.stderr.write(d);
  });

  const cleanup = async () => {
    serverProc.kill('SIGTERM');
    try {
      await pg.stop();
    } catch {
      /* ignore */
    }
  };
  process.on('SIGINT', () => {
    cleanup().then(() => process.exit(130));
  });

  try {
    const health = await waitFor(`${apiBase}/health`);
    const healthJson = await health.json();
    console.log('\n[3/6] Health:', JSON.stringify(healthJson, null, 2));
    if (!healthJson.vpnDemoMode || !healthJson.vpnUseSsconf) {
      throw new Error('Expected vpnDemoMode and vpnUseSsconf true');
    }

    console.log('[4/6] Creating test order...');
    const orderRes = await fetch(`${apiBase}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramUserId: 'local-test-user',
        regionId: 'jp',
        regionName: 'Tokyo',
        packageId: 'p1',
        packageLabel: '1 Month',
        packageMonths: 1,
        amount: 5000,
        paymentMethodId: 'kbz',
        paymentMethodName: 'KBZ Pay',
        status: 'pending',
      }),
    });
    if (!orderRes.ok) throw new Error(`create order: ${await orderRes.text()}`);
    const { order } = await orderRes.json();
    console.log('       Order id:', order.id);

    const token = signAdminAction(order.id, adminSecret);
    console.log('[5/6] Approving order (demo ssconf)...');
    const approveRes = await fetch(`${apiBase}/admin/approve/${order.id}?t=${token}`);
    const approveHtml = await approveRes.text();
    if (!approveRes.ok || !approveHtml.includes('Approved')) {
      throw new Error(`approve failed: ${approveHtml.slice(0, 300)}`);
    }

    const orderGet = await fetch(
      `${apiBase}/api/orders/${order.id}?telegramUserId=local-test-user`,
    );
    const { order: completed } = await orderGet.json();
    const accessUrl = completed.accessUrl;
    console.log('       Key:', accessUrl);

    if (!String(accessUrl).startsWith('ssconf://')) {
      throw new Error(`Expected ssconf:// URL, got: ${accessUrl}`);
    }

    const jsonPath = accessUrl.replace(/^ssconf:\/\/[^/]+/, '').split('#')[0];
    const subUrl = `${apiBase}${jsonPath}`;
    console.log('[6/6] Fetching subscription JSON:', subUrl);

    const subRes = await fetch(subUrl);
    if (!subRes.ok) throw new Error(`subscription JSON: ${subRes.status} ${await subRes.text()}`);
    const subJson = await subRes.json();

    console.log('\n=== SUCCESS ===');
    console.log(JSON.stringify(subJson, null, 2));
    console.log('\nNext: copy this key into Outline app on your phone');
    console.log(accessUrl);
    console.log('\n(Phone cannot use localhost — use production URL for real device test.)');
  } finally {
    await cleanup();
  }
}

main().catch((e) => {
  console.error('\n=== FAILED ===', e.message);
  if (e.message?.includes('embedded-postgres')) {
    console.error('Run: cd server && npm install embedded-postgres --save-dev');
  }
  process.exit(1);
});
