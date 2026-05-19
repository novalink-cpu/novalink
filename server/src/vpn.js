import { createDemoSubscription, createMultiRegionVpnSubscription } from './vpnSubscription.js';
import { config } from './config.js';

/**
 * Admin Approve — multi-region Outline keys + ssconf:// subscription (jp + au).
 */
export async function createVpnKey(orderRow) {
  if (config.vpnDemoMode) {
    console.warn('[vpn] VPN_DEMO_MODE=1 — demo subscription only');
    return createDemoSubscription(orderRow);
  }

  return createMultiRegionVpnSubscription(orderRow);
}
