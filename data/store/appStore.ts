import {
  apiConfigErrorMessage,
  dataUrlToBlob,
  isApiEnabled,
  renderCreateOrder,
  renderGetOrder,
  renderGetOrders,
  renderSubmitPayment,
  renderUpdateOrder,
} from '@backend/api/client';
import { PACKAGES } from '@data/config';
import type { Order, PurchaseDraft, VpnKey } from '@data/types';

const ORDERS_KEY = 'u5_orders';
const KEYS_KEY = 'u5_keys';
const DRAFT_KEY = 'u5_purchase_draft';
const ORDER_COUNTER_KEY = 'u5_order_counter';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function localGetOrders(userId: string): Order[] {
  return read<Order[]>(ORDERS_KEY, []).filter((o) => !o.telegramUserId || o.telegramUserId === userId);
}

function localSaveOrder(order: Order, userId: string) {
  const orders = read<Order[]>(ORDERS_KEY, []);
  const withUser = { ...order, telegramUserId: userId };
  const index = orders.findIndex((o) => o.id === withUser.id);
  if (index >= 0) orders[index] = withUser;
  else orders.unshift(withUser);
  write(ORDERS_KEY, orders);
}

function localCreateOrderId(): number {
  const current = Number(localStorage.getItem(ORDER_COUNTER_KEY) || '506');
  const next = current + 1;
  localStorage.setItem(ORDER_COUNTER_KEY, String(next));
  return next;
}

export function isUsingApi(): boolean {
  return isApiEnabled();
}

/** @deprecated use isUsingApi */
export const isUsingRenderApi = isUsingApi;

export async function createOrderId(): Promise<number> {
  if (isApiEnabled()) {
    return Date.now();
  }
  return localCreateOrderId();
}

export async function saveOrder(order: Order, userId: string): Promise<Order> {
  let withUser = { ...order, telegramUserId: userId };
  const pkg = PACKAGES.find((p) => p.id === order.packageId);

  if (isApiEnabled()) {
    try {
      const remote = await renderGetOrder(userId, order.id);
      if (remote) {
        withUser = await renderUpdateOrder(userId, order.id, withUser);
      } else {
        withUser = await renderCreateOrder(userId, {
          ...withUser,
          packageMonths: pkg?.months ?? 1,
        });
      }
    } catch (e) {
      console.warn('API saveOrder failed, order kept locally', e);
    }
  }

  localSaveOrder(withUser, userId);
  return withUser;
}

export async function getOrders(userId: string): Promise<Order[]> {
  if (isApiEnabled()) {
    try {
      return await renderGetOrders(userId);
    } catch (e) {
      console.warn('API getOrders failed, using local', e);
    }
  }
  return localGetOrders(userId);
}

export async function getOrder(userId: string, orderId: number): Promise<Order | null> {
  if (isApiEnabled()) {
    try {
      const remote = await renderGetOrder(userId, orderId);
      if (remote) return remote;
    } catch (e) {
      console.warn('API getOrder failed, using local', e);
    }
  }
  return localGetOrders(userId).find((o) => o.id === orderId) ?? null;
}

export async function submitPaymentProof(
  userId: string,
  orderId: number,
  reference: string,
  screenshot: string | Blob,
): Promise<Order> {
  if (!isApiEnabled()) {
    throw new Error(apiConfigErrorMessage());
  }
  const blob = typeof screenshot === 'string' ? await dataUrlToBlob(screenshot) : screenshot;
  const updated = await renderSubmitPayment(userId, orderId, reference, blob);
  localSaveOrder(updated, userId);
  return updated;
}

export function getPurchaseDraft(): PurchaseDraft {
  return read<PurchaseDraft>(DRAFT_KEY, {});
}

export function savePurchaseDraft(draft: PurchaseDraft) {
  write(DRAFT_KEY, draft);
}

export function clearPurchaseDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export async function getLastOrderRegion(
  userId: string,
): Promise<{ regionId: string; regionName: string } | null> {
  const orders = await getOrders(userId);
  const found = orders.find((o) => o.regionId);
  if (!found) return null;
  return { regionId: found.regionId, regionName: found.regionName };
}

export async function getActiveKeysFromOrders(userId: string): Promise<VpnKey[]> {
  const orders = await getOrders(userId);
  const now = Date.now();
  return orders
    .filter((o) => o.accessUrl && o.status === 'completed')
    .filter((o) => !o.expiresAt || new Date(o.expiresAt).getTime() > now)
    .map((o) => ({
      id: `order-${o.id}`,
      region: o.regionName,
      packageLabel: o.packageLabel,
      accessUrl: o.accessUrl!,
      expiresAt: o.expiresAt ?? '',
      isActive: true,
      orderId: o.id,
    }));
}

export async function getActiveKeys(userId: string): Promise<VpnKey[]> {
  const fromOrders = await getActiveKeysFromOrders(userId);
  if (fromOrders.length) return fromOrders;
  return read<VpnKey[]>(KEYS_KEY, []);
}

export function addVpnKey(key: VpnKey) {
  const keys = read<VpnKey[]>(KEYS_KEY, []);
  keys.unshift(key);
  write(KEYS_KEY, keys);
}
