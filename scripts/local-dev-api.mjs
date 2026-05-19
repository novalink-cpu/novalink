/**
 * Start embedded PostgreSQL + API (demo mode) for manual Mini App testing.
 * Run in one terminal: node scripts/local-dev-api.mjs
 * Other terminal: npm run dev (frontend)
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server', 'package.json'));
const EmbeddedPostgres = require('embedded-postgres').default;

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = path.join(root, 'server');
const pgData = path.join(root, '.local-pgdata');
const pgPort = 55432;

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: pgData,
    user: 'novalink',
    password: 'novalink',
    port: pgPort,
    persistent: true,
  });

  let init = true;
  try {
    await fs.access(path.join(pgData, 'PG_VERSION'));
    init = false;
  } catch {
    /* first run */
  }

  console.log('[local-dev] PostgreSQL port', pgPort);
  if (init) await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase('novalink');
  } catch {
    /* exists */
  }

  const env = {
    ...process.env,
    PORT: '3000',
    HOST: '0.0.0.0',
    DATABASE_URL: `postgresql://novalink:novalink@127.0.0.1:${pgPort}/novalink`,
    PUBLIC_API_URL: 'http://localhost:3000',
    APP_PUBLIC_URL: 'http://localhost:5173',
    CORS_ORIGINS: 'http://localhost:5173',
    ADMIN_ACTION_SECRET: 'local-demo-secret',
    VPN_DEMO_MODE: '1',
    VPN_USE_SSCONF: '1',
    SKIP_DOTENV: '1',
    TRUST_PROXY: '0',
  };

  console.log('[local-dev] API http://localhost:3000 (VPN_DEMO_MODE=1)');
  console.log('[local-dev] Approve URL pattern: http://localhost:3000/admin/approve/ORDER_ID?t=TOKEN');
  console.log('[local-dev] Ctrl+C to stop');

  const api = spawn(process.execPath, ['--watch', 'src/index.js'], {
    cwd: serverDir,
    env,
    stdio: 'inherit',
  });

  const stop = async () => {
    api.kill('SIGTERM');
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
