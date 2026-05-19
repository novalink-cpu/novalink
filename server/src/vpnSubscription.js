import crypto from 'node:crypto';
import { config } from './config.js';
import { createOutlineAccessKey } from './outline.js';
import { parseSsAccessUrl } from './ssUrl.js';

const REGION_LABELS = {
  jp: 'Tokyo',
  au: 'Sydney',
};

/** Regions to provision: order region first, then other configured regions. */
export function regionsForSubscription(orderRegionId) {
  const preferred = String(orderRegionId || 'jp').toLowerCase();
  const configured = Object.keys(config.outlineServers);
  const ordered = [];
  if (configured.includes(preferred)) ordered.push(preferred);
  for (const id of configured) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

export function generateConfigToken() {
  return crypto.randomBytes(24).toString('base64url');
}

export function buildSsconfUrl(token, orderId) {
  const base = (config.publicApiUrl || '').replace(/\/$/, '');
  if (!base) {
    throw new Error('PUBLIC_API_URL is required for ssconf:// keys');
  }
  const { host } = new URL(base);
  const fragment = `NovaLink-Order-${orderId}`;
  return `ssconf://${host}/vpn/c/${token}.json#${fragment}`;
}

/**
 * SIP008-style JSON for Outline app (ssconf://).
 * @param {Array<{ server: string, server_port: number, method: string, password: string, remarks?: string }>} nodes
 */
export function buildSubscriptionJson(nodes) {
  return {
    version: 1,
    servers: nodes.map((n) => ({
      server: n.server,
      server_port: n.server_port,
      method: n.method,
      password: n.password,
      remarks: n.remarks || n.server,
    })),
  };
}

/**
 * Create Outline keys on all configured regions; return ssconf URL + node metadata.
 */
export async function createMultiRegionVpnSubscription(orderRow) {
  const orderId = orderRow.id;
  const token = generateConfigToken();
  const regionIds = regionsForSubscription(orderRow.region_id);
  const nodes = [];
  const errors = [];

  for (const regionId of regionIds) {
    const server = config.outlineServers[regionId];
    if (!server?.apiUrl || !server?.certSha256) {
      errors.push(`${regionId}: not configured`);
      continue;
    }
    const label = REGION_LABELS[regionId] || regionId.toUpperCase();
    try {
      const key = await createOutlineAccessKey(
        server.apiUrl,
        server.certSha256,
        `Order-${orderId}-${regionId}`,
      );
      const parsed = parseSsAccessUrl(key.accessUrl);
      nodes.push({
        regionId,
        outlineKeyId: key.id,
        ...parsed,
        remarks: label,
      });
    } catch (e) {
      console.error(`[vpn] create key failed region=${regionId}`, e.message);
      errors.push(`${regionId}: ${e.message}`);
    }
  }

  if (!nodes.length) {
    throw new Error(
      errors.length
        ? `VPN key ထုတ်၍ မရပါ — ${errors.join('; ')}`
        : 'Outline server မချိတ်ရသေးပါ',
    );
  }

  if (errors.length) {
    console.warn(`[vpn] partial subscription order=${orderId}:`, errors.join('; '));
  }

  const months = orderRow.package_months || 1;
  const expires = new Date();
  expires.setMonth(expires.getMonth() + months);

  const useSsconf =
    config.vpnUseSsconf &&
    config.publicApiUrl &&
    nodes.length >= 1;

  let accessUrl;
  if (useSsconf) {
    accessUrl = buildSsconfUrl(token, orderId);
  } else {
    const primary = String(orderRow.region_id || 'jp').toLowerCase();
    const primaryNode =
      nodes.find((n) => n.regionId === primary) || nodes[0];
    accessUrl = rebuildSsUrl(primaryNode, `NovaLink-Order-${orderId}`);
  }

  return {
    accessUrl,
    expiresAt: expires.toISOString(),
    configToken: useSsconf ? token : null,
    nodes,
    ssconf: useSsconf,
  };
}

/** Rebuild ss:// from parsed node (fallback when ssconf disabled). */
function rebuildSsUrl(node, name) {
  const creds = Buffer.from(`${node.method}:${node.password}`).toString('base64');
  const host = node.server;
  const port = node.server_port;
  const tag = encodeURIComponent(name || 'NovaLink');
  return `ss://${creds}@${host}:${port}/?outline=1#${tag}`;
}

export function createDemoSubscription(orderRow) {
  const orderId = orderRow.id;
  const token = generateConfigToken();
  const primary = String(orderRow.region_id || 'jp').toLowerCase();
  const nodes = [
    {
      regionId: 'jp',
      outlineKeyId: null,
      server: 'tokyo.demo.novalink',
      server_port: 443,
      method: 'chacha20-ietf-poly1305',
      password: `demo-jp-${orderId}`,
      remarks: 'Tokyo (demo)',
    },
    {
      regionId: 'au',
      outlineKeyId: null,
      server: 'sydney.demo.novalink',
      server_port: 443,
      method: 'chacha20-ietf-poly1305',
      password: `demo-au-${orderId}`,
      remarks: 'Sydney (demo)',
    },
  ];

  const months = orderRow.package_months || 1;
  const expires = new Date();
  expires.setMonth(expires.getMonth() + months);

  const useSsconf = config.vpnUseSsconf && config.publicApiUrl;
  const accessUrl = useSsconf
    ? buildSsconfUrl(token, orderId)
    : rebuildSsUrl(
        nodes.find((n) => n.regionId === primary) || nodes[0],
        `NovaLink-Order-${orderId}`,
      );

  return {
    accessUrl,
    expiresAt: expires.toISOString(),
    configToken: useSsconf ? token : null,
    nodes,
    ssconf: Boolean(useSsconf),
  };
}
