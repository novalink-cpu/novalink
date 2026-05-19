import dotenv from 'dotenv';
if (process.env.SKIP_DOTENV !== '1') {
  dotenv.config();
}

function trim(v) {
  return typeof v === 'string' ? v.trim() : '';
}

/** Strip labels from Outline Manager / access.txt paste (apiUrl:https://...). */
function cleanOutlineApiUrl(v) {
  let s = trim(v).replace(/^apiUrl:\s*/i, '');
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

function cleanOutlineCert(v) {
  return trim(v)
    .replace(/^(certSha256|certificateSha256|sha256):\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

/** Region id (sg, jp, au) → Outline Management API credentials */
function loadOutlineServers() {
  const map = {
    sg: { apiUrl: 'OUTLINE_SG_API_URL', cert: 'OUTLINE_SG_CERT_SHA256' },
    jp: { apiUrl: 'OUTLINE_JP_API_URL', cert: 'OUTLINE_JP_CERT_SHA256' },
    au: { apiUrl: 'OUTLINE_AU_API_URL', cert: 'OUTLINE_AU_CERT_SHA256' },
  };
  const servers = {};
  for (const [regionId, keys] of Object.entries(map)) {
    const apiUrl = cleanOutlineApiUrl(process.env[keys.apiUrl]);
    const certSha256 = cleanOutlineCert(process.env[keys.cert]);
    if (apiUrl && certSha256) {
      servers[regionId] = { apiUrl, certSha256 };
    }
  }
  // Singapore VPS creds were often stored under OUTLINE_JP_* before OUTLINE_SG_* existed
  if (!servers.sg && servers.jp) {
    console.warn('[config] OUTLINE_SG_* missing — using OUTLINE_JP_* for Singapore (sg)');
    servers.sg = { ...servers.jp };
  }
  return servers;
}

export const config = {
  port: Number(process.env.PORT || 3000),
  host: trim(process.env.HOST) || '0.0.0.0',
  databaseUrl: trim(process.env.DATABASE_URL),
  botToken: trim(process.env.TELEGRAM_BOT_TOKEN),
  adminChatIds: trim(process.env.TELEGRAM_ADMIN_CHAT_IDS)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  /** https://api.domain.com — Telegram webhook + screenshot URLs */
  publicApiUrl:
    trim(process.env.PUBLIC_API_URL) ||
    trim(process.env.API_PUBLIC_URL) ||
    trim(process.env.RENDER_EXTERNAL_URL),
  webhookUrl:
    trim(process.env.TELEGRAM_WEBHOOK_URL) ||
    trim(process.env.PUBLIC_API_URL) ||
    trim(process.env.RENDER_EXTERNAL_URL),
  usePolling: ['1', 'true', 'yes', 'on'].includes(
    trim(process.env.TELEGRAM_USE_POLLING || '').toLowerCase(),
  ),
  /** https://domain.com — Mini App origin (CORS) */
  appPublicUrl: trim(process.env.APP_PUBLIC_URL),
  corsOrigins: (() => {
    const list = trim(process.env.CORS_ORIGINS)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const app = trim(process.env.APP_PUBLIC_URL).replace(/\/$/, '');
    if (app && !list.includes(app)) list.push(app);
    return list;
  })(),
  adminActionSecret: trim(process.env.ADMIN_ACTION_SECRET),
  outlineServers: loadOutlineServers(),
  vpnDemoMode: ['1', 'true', 'yes', 'on'].includes(
    trim(process.env.VPN_DEMO_MODE || '0').toLowerCase(),
  ),
  /** ssconf:// subscription (all configured Outline regions in one link) */
  vpnUseSsconf: !['0', 'false', 'no', 'off'].includes(
    trim(process.env.VPN_USE_SSCONF || '1').toLowerCase(),
  ),
  trustProxy: !['0', 'false', 'no'].includes(
    trim(process.env.TRUST_PROXY || '1').toLowerCase(),
  ),
  /** PC platforms (windows, macos, linux) → Outline region id */
  outlinePcRegion: trim(process.env.OUTLINE_PC_REGION || 'jp').toLowerCase() || 'jp',
  /** How often to delete Outline keys for expired orders (default 15 min) */
  vpnExpiryCheckMs: Math.max(
    60_000,
    Number(process.env.VPN_EXPIRY_CHECK_MINUTES || 15) * 60_000,
  ),
};

export function assertConfig() {
  if (!config.databaseUrl) {
    console.warn('[config] DATABASE_URL not set — API will fail until PostgreSQL is running.');
  }
  if (!config.botToken) {
    console.warn('[config] TELEGRAM_BOT_TOKEN not set — Telegram notify/approve disabled.');
  }
  if (!config.adminChatIds.length) {
    console.warn('[config] TELEGRAM_ADMIN_CHAT_IDS not set — admin notifications disabled.');
  }
  if (!config.publicApiUrl) {
    console.warn('[config] PUBLIC_API_URL not set — webhook + screenshot links may fail.');
  }
  if (config.vpnUseSsconf && !config.publicApiUrl && !config.vpnDemoMode) {
    console.warn('[config] VPN_USE_SSCONF=1 but PUBLIC_API_URL missing — will fall back to ss://');
  }
  if (!config.appPublicUrl && !config.corsOrigins.length) {
    console.warn('[config] APP_PUBLIC_URL or CORS_ORIGINS not set — Mini App CORS may block.');
  }
  if (!config.vpnDemoMode) {
    const missing = ['sg', 'jp', 'au'].filter((r) => !config.outlineServers[r]);
    if (missing.length) {
      console.warn(
        `[config] Outline not configured for: ${missing.join(', ')} — approve will fail for those regions`,
      );
    }
  }
}
