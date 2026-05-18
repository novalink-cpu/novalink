import 'dotenv/config';

function trim(v) {
  return typeof v === 'string' ? v.trim() : '';
}

export const config = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: trim(process.env.DATABASE_URL),
  botToken: trim(process.env.TELEGRAM_BOT_TOKEN),
  adminChatIds: trim(process.env.TELEGRAM_ADMIN_CHAT_IDS)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  webhookUrl:
    trim(process.env.TELEGRAM_WEBHOOK_URL) ||
    trim(process.env.PUBLIC_API_URL) ||
    trim(process.env.RENDER_EXTERNAL_URL),
  /** 1 = webhook မသုံး polling only (local dev). မထားရင် webhook ဦးစီး */
  usePolling: ['1', 'true', 'yes', 'on'].includes(
    trim(process.env.TELEGRAM_USE_POLLING || '').toLowerCase(),
  ),
  corsOrigins: trim(process.env.CORS_ORIGINS)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  publicApiUrl: trim(process.env.PUBLIC_API_URL) || trim(process.env.RENDER_EXTERNAL_URL),
  adminActionSecret: trim(process.env.ADMIN_ACTION_SECRET),
  xuiPanelUrl: trim(process.env.XUI_PANEL_URL),
  xuiUsername: trim(process.env.XUI_USERNAME),
  xuiPassword: trim(process.env.XUI_PASSWORD),
  vpnDemoMode: ['1', 'true', 'yes', 'on'].includes(
    trim(process.env.VPN_DEMO_MODE || '1').toLowerCase(),
  ),
};

export function assertConfig() {
  if (!config.databaseUrl) {
    console.warn('[config] DATABASE_URL not set — API will fail until PostgreSQL is linked on Render.');
  }
  if (!config.botToken) {
    console.warn('[config] TELEGRAM_BOT_TOKEN not set — Telegram notify/approve disabled.');
  }
  if (!config.adminChatIds.length) {
    console.warn('[config] TELEGRAM_ADMIN_CHAT_IDS not set — admin notifications disabled.');
  }
}
