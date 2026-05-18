import { config } from './config.js';

/**
 * Create VPN access key after admin approval.
 * Set VPN_DEMO_MODE=0 and XUI_* env vars when wiring a real 3x-ui panel.
 */
export async function createVpnKey(orderRow) {
  const months = orderRow.package_months || 1;
  const expires = new Date();
  expires.setMonth(expires.getMonth() + months);

  if (!config.vpnDemoMode && config.xuiPanelUrl) {
    // TODO: call 3x-ui / x-ui REST API with config.xuiUsername / config.xuiPassword
    console.warn('[vpn] XUI_PANEL_URL set but client not implemented — using demo key');
  }

  const host = orderRow.region_id || 'vpn';
  const accessUrl = `ss://demo-${orderRow.telegram_user_id}@${host}.example:443/?outline=1#NovaLink-${orderRow.id}`;

  return {
    accessUrl,
    expiresAt: expires.toISOString(),
  };
}
