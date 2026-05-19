import crypto from 'node:crypto';
import { config } from './config.js';
import { createOutlineAccessKey } from './outline.js';
import { parseSsAccessUrl } from './ssUrl.js';

export const REGION_LABELS = {
  sg: 'Singapore',
  jp: 'Tokyo',
  au: 'Sydney',
};

export const DEFAULT_REGION_ID = 'sg';

/** Singapore (mobile): direct ss:// — PC regions: ssconf:// when enabled. */
export function shouldUseSsconfForRegion(regionId) {
  if (!config.vpnUseSsconf || !config.publicApiUrl) return false;
  return String(regionId || '').toLowerCase() !== 'sg';
}

/** Single region per order (mobile → sg, PC → jp/au per platform mapping). */
export function regionsForSubscription(orderRegionId) {
  const id = String(orderRegionId || DEFAULT_REGION_ID).toLowerCase();
  return [id];
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

  const primary = String(orderRow.region_id || DEFAULT_REGION_ID).toLowerCase();
  const primaryNode = nodes.find((n) => n.regionId === primary) || nodes[0];
  const useSsconf = shouldUseSsconfForRegion(primary);

  let accessUrl;
  if (useSsconf) {
    accessUrl = buildSsconfUrl(token, orderId);
  } else {
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

const DEMO_NODES = {
  sg: {
    regionId: 'sg',
    outlineKeyId: null,
    server: 'singapore.demo.novalink',
    server_port: 443,
    method: 'chacha20-ietf-poly1305',
    remarks: 'Singapore (demo)',
  },
  jp: {
    regionId: 'jp',
    outlineKeyId: null,
    server: 'tokyo.demo.novalink',
    server_port: 443,
    method: 'chacha20-ietf-poly1305',
    remarks: 'Tokyo (demo)',
  },
  au: {
    regionId: 'au',
    outlineKeyId: null,
    server: 'sydney.demo.novalink',
    server_port: 443,
    method: 'chacha20-ietf-poly1305',
    remarks: 'Sydney (demo)',
  },
};

export function createDemoSubscription(orderRow) {
  const orderId = orderRow.id;
  const token = generateConfigToken();
  const primary = String(orderRow.region_id || DEFAULT_REGION_ID).toLowerCase();
  const template = DEMO_NODES[primary] || DEMO_NODES.sg;
  const nodes = [
    {
      ...template,
      password: `demo-${primary}-${orderId}`,
    },
  ];

  const months = orderRow.package_months || 1;
  const expires = new Date();
  expires.setMonth(expires.getMonth() + months);

  const useSsconf = shouldUseSsconfForRegion(primary);
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
