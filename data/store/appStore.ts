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

/** PostgreSQL SERIAL max — Date.now() must not be used as order id with the API */
const PG_INT_MAX = 2_147_483_647;

function isClientTempOrderId(id: number | undefined): boolean {
  return id == null || id < 1 || id > PG_INT_MAX;
}

/** API mode: draft/local မှ မမှန်သော id ကို server pending အော်ဒါနဲ့ ချိတ်ပါ */
async function resolveServerOrderId(
  userId: string,
  orderId?: number,
  draft?: PurchaseDraft,
): Promise<number | null> {
  if (!isApiEnabled()) {
    return isClientTempOrderId(orderId) ? null : (orderId ?? null);
  }
  if (orderId != null && !isClientTempOrderId(orderId)) {
    return orderId;
  }
  try {
    const orders = await renderGetOrders(userId);
    const open = orders.filter((o) =>
      ['pending', 'paid', 'verified'].includes(o.status),
    );
    let pool = open;
    if (draft?.regionId) {
      const byRegion = pool.filter((o) => o.regionId === draft.regionId);
      if (byRegion.length) pool = byRegion;
    }
    if (draft?.packageId) {
      const byPkg = pool.filter((o) => o.packageId === draft.packageId);
      if (byPkg.length) pool = byPkg;
    }
    pool.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return pool[0]?.id ?? null;
  } catch {
    return null;
  }
}

function purgeInvalidLocalOrders() {
  const orders = read<Order[]>(ORDERS_KEY, []);
  const filtered = orders.filter((o) => !isClientTempOrderId(o.id));
  if (filtered.length !== orders.length) {
    write(ORDERS_KEY, filtered);
  }
}

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
    return 0;
  }
  return localCreateOrderId();
}

export async function saveOrder(order: Order, userId: string): Promise<Order> {
  let withUser = { ...order, telegramUserId: userId };
  const pkg = PACKAGES.find((p) => p.id === order.packageId);

  if (isApiEnabled()) {
    try {
      if (!isClientTempOrderId(withUser.id)) {
        const remote = await renderGetOrder(userId, withUser.id);
        if (remote) {
          withUser = await renderUpdateOrder(userId, withUser.id, withUser);
          localSaveOrder(withUser, userId);
          return withUser;
        }
      }
      withUser = await renderCreateOrder(userId, {
        ...withUser,
        packageMonths: pkg?.months ?? 1,
      });
      if (isClientTempOrderId(withUser.id)) {
        throw new Error('ဆာဗာသို့ အော်ဒါ မသိမ်းနိုင်ပါ — VITE_API_BASE_URL နှင့် Render API စစ်ပါ။');
      }
    } catch (e) {
      console.warn('API saveOrder failed', e);
      throw e;
    }
  }

  if (!isClientTempOrderId(withUser.id)) {
    localSaveOrder(withUser, userId);
  }
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
    const draft = getPurchaseDraft();
    let id = orderId;
    if (isClientTempOrderId(id)) {
      const resolved = await resolveServerOrderId(userId, id, draft);
      if (!resolved) return null;
      id = resolved;
      savePurchaseDraft({ ...draft, orderId: id });
    }
    try {
      return await renderGetOrder(userId, id);
    } catch (e) {
      console.warn('API getOrder failed', e);
      return null;
    }
  }
  purgeInvalidLocalOrders();
  return localGetOrders(userId).find((o) => o.id === orderId) ?? null;
}

export async function submitPaymentProof(
  userId: string,
  orderId: number,
  screenshot: string | Blob,
): Promise<Order> {
  if (!isApiEnabled()) {
    throw new Error(apiConfigErrorMessage());
  }
  const draft = getPurchaseDraft();
  const resolved = await resolveServerOrderId(userId, orderId, draft);
  if (!resolved) {
    throw new Error(
      'အော်ဒါ ID မမှန်ပါ — Home မှ Region/Package ပြန်ရွေးပြီး အသစ်ဝယ်ပါ (အရင် cache ရှင်းရန် Telegram ကို ပိတ်ပြီး ပြန်ဖွင့်ပါ)။',
    );
  }
  if (resolved !== orderId) {
    savePurchaseDraft({ ...draft, orderId: resolved });
  }
  const blob = typeof screenshot === 'string' ? await dataUrlToBlob(screenshot) : screenshot;
  const reference = `Order #${resolved}`;
  const { order: updated, message } = await renderSubmitPayment(userId, resolved, reference, blob);
  localSaveOrder(updated, userId);
  return { ...updated, submitMessage: message };
}

export function getPurchaseDraft(): PurchaseDraft {
  purgeInvalidLocalOrders();
  const draft = read<PurchaseDraft>(DRAFT_KEY, {});
  if (isClientTempOrderId(draft.orderId)) {
    const { orderId: _removed, ...rest } = draft;
    write(DRAFT_KEY, rest);
    return rest;
  }
  return draft;
}

/** App စတင်ချိန် localStorage မှ မမှန်သော order id များ ရှင်းပါ */
export function migrateStaleOrderData() {
  purgeInvalidLocalOrders();
  getPurchaseDraft();
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
