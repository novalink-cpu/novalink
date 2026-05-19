import { config } from './config.js';
import { deleteOutlineAccessKey } from './outline.js';
import {
  getOrdersExpiredNeedingRevoke,
  markVpnKeysRevoked,
  findRenewParentOrder,
  updateParentSubscription,
} from './db.js';
import { createVpnKey } from './vpn.js';

export function parseVpnNodes(raw) {
  if (!raw) return null;
  let nodes = raw;
  if (typeof nodes === 'string') {
    try {
      nodes = JSON.parse(nodes);
    } catch {
      return null;
    }
  }
  return Array.isArray(nodes) ? nodes : null;
}

export function isOrderExpired(row) {
  if (!row?.expires_at) return false;
  return new Date(row.expires_at).getTime() < Date.now();
}

export function isVpnKeysRevoked(row) {
  return Boolean(row?.vpn_keys_revoked_at);
}

/** Stack months onto current expiry, or from now if already expired. */
export function computeRenewedExpiry(currentExpiresIso, months) {
  const now = Date.now();
  const current = currentExpiresIso ? new Date(currentExpiresIso).getTime() : 0;
  const base = current > now ? new Date(currentExpiresIso) : new Date();
  base.setMonth(base.getMonth() + months);
  return base.toISOString();
}

export function computeFreshExpiry(months) {
  const expires = new Date();
  expires.setMonth(expires.getMonth() + months);
  return expires.toISOString();
}

/** Delete Outline access keys for stored vpn_nodes. */
export async function deleteVpnNodesOnOutline(nodes) {
  if (!nodes?.length || config.vpnDemoMode) return;

  for (const node of nodes) {
    if (node.outlineKeyId == null || node.outlineKeyId === '') continue;
    const server = config.outlineServers[node.regionId];
    if (!server?.apiUrl || !server?.certSha256) continue;
    try {
      await deleteOutlineAccessKey(
        server.apiUrl,
        server.certSha256,
        node.outlineKeyId,
      );
    } catch (e) {
      console.warn(
        `[vpn] delete Outline key failed region=${node.regionId} keyId=${node.outlineKeyId}:`,
        e.message,
      );
    }
  }
}

/** Revoke keys on Outline and mark order so we do not delete twice. */
export async function revokeOrderVpnKeys(orderRow) {
  if (!orderRow || isVpnKeysRevoked(orderRow)) return;

  const nodes = parseVpnNodes(orderRow.vpn_nodes);
  if (nodes?.length) {
    await deleteVpnNodesOnOutline(nodes);
  }
  await markVpnKeysRevoked(orderRow.id);
}

export async function runExpiryRevocationJob() {
  const rows = await getOrdersExpiredNeedingRevoke();
  if (!rows.length) return { revoked: 0 };

  let revoked = 0;
  for (const row of rows) {
    try {
      await revokeOrderVpnKeys(row);
      revoked += 1;
      console.log(`[expiry] revoked Outline keys for order #${row.id}`);
    } catch (e) {
      console.error(`[expiry] revoke failed order #${row.id}`, e.message);
    }
  }
  return { revoked };
}

/**
 * Renew approve: extend same key when still active; rotate (delete old + new) when expired/revoked.
 */
export async function fulfillRenewOrder(renewRow) {
  const months = renewRow.package_months || 1;
  const parent = await findRenewParentOrder(
    renewRow.telegram_user_id,
    renewRow.region_id,
    renewRow.renew_parent_order_id,
  );

  if (!parent) {
    throw new Error(
      'သက်တမ်းတိုင် မလုပ်နိုင်ပါ — ယခင်အော်ဒါ completed မတွေ့ပါ။ VPN Key အသစ် ဝယ်ယူပါ။',
    );
  }

  const parentNodes = parseVpnNodes(parent.vpn_nodes);
  const expired = isOrderExpired(parent);
  const revoked = isVpnKeysRevoked(parent);
  const canExtend =
    !expired && !revoked && parent.access_url && parentNodes?.length;

  if (canExtend) {
    const expiresAt = computeRenewedExpiry(parent.expires_at, months);
    await updateParentSubscription(parent.id, { expiresAt });
    return {
      mode: 'extend',
      parentOrderId: parent.id,
      accessUrl: parent.access_url,
      expiresAt,
      configToken: parent.vpn_config_token ?? null,
      nodes: parentNodes,
    };
  }

  if (parentNodes?.length && !revoked) {
    await revokeOrderVpnKeys(parent);
  }

  const keyResult = await createVpnKey({
    ...parent,
    id: parent.id,
    package_months: months,
    region_id: parent.region_id,
  });

  const expiresAt = keyResult.expiresAt;
  await updateParentSubscription(parent.id, {
    accessUrl: keyResult.accessUrl,
    expiresAt,
    configToken: keyResult.configToken,
    nodes: keyResult.nodes,
  });

  return {
    mode: 'rotate',
    parentOrderId: parent.id,
    accessUrl: keyResult.accessUrl,
    expiresAt,
    configToken: keyResult.configToken,
    nodes: keyResult.nodes,
  };
}

/**
 * Support / admin key fix: delete old Outline keys, issue new key, keep existing expires_at.
 */
export async function rotateOrderVpnKey(orderRow) {
  if (!orderRow || orderRow.status !== 'completed') {
    throw new Error('completed အော်ဒါသာ key rotate လုပ်နိုင်ပါသည်');
  }

  const previousExpiry = orderRow.expires_at
    ? new Date(orderRow.expires_at).toISOString()
    : null;

  const nodes = parseVpnNodes(orderRow.vpn_nodes);
  if (nodes?.length && !isVpnKeysRevoked(orderRow)) {
    await revokeOrderVpnKeys(orderRow);
  }

  const keyResult = await createVpnKey({
    ...orderRow,
    id: orderRow.id,
    package_months: orderRow.package_months || 1,
    region_id: orderRow.region_id,
  });

  const expiresAt = previousExpiry || keyResult.expiresAt;

  await updateParentSubscription(orderRow.id, {
    accessUrl: keyResult.accessUrl,
    expiresAt,
    configToken: keyResult.configToken,
    nodes: keyResult.nodes,
  });

  return {
    accessUrl: keyResult.accessUrl,
    expiresAt,
    configToken: keyResult.configToken,
    nodes: keyResult.nodes,
  };
}
