import type { Order } from '@data/types';

const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, '') ?? '';

export function isApiEnabled(): boolean {
  return Boolean(base);
}

/** @deprecated */
export const isRenderApiEnabled = isApiEnabled;

export function apiConfigErrorMessage(): string {
  return (
    'Backend API မချိတ်ရသေးပါ — .env ထဲ VITE_API_BASE_URL (ဥပမာ https://u5-vpn-api.onrender.com) ဖြည့်ပြီး npm run build ပြန်လုပ်ပါ။'
  );
}

function apiUrl(path: string): string {
  if (!base) throw new Error(apiConfigErrorMessage());
  return `${base}${path}`;
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText);
  }
  return data;
}

export async function renderGetOrders(telegramUserId: string): Promise<Order[]> {
  const data = await parseJson<{ orders: Order[] }>(
    await fetch(apiUrl(`/api/orders?telegramUserId=${encodeURIComponent(telegramUserId)}`)),
  );
  return data.orders;
}

export async function renderGetOrder(telegramUserId: string, orderId: number): Promise<Order | null> {
  const data = await parseJson<{ order: Order }>(
    await fetch(
      apiUrl(
        `/api/orders/${orderId}?telegramUserId=${encodeURIComponent(telegramUserId)}`,
      ),
    ),
  );
  return data.order ?? null;
}

export async function renderCreateOrder(
  telegramUserId: string,
  order: Omit<Order, 'id' | 'createdAt' | 'telegramUserId'> & { packageMonths?: number },
): Promise<Order> {
  const data = await parseJson<{ order: Order }>(
    await fetch(apiUrl('/api/orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramUserId,
        regionId: order.regionId,
        regionName: order.regionName,
        packageId: order.packageId,
        packageLabel: order.packageLabel,
        packageMonths: order.packageMonths,
        amount: order.amount,
        paymentMethodId: order.paymentMethodId,
        paymentMethodName: order.paymentMethodName,
        status: order.status,
        orderType: order.orderType,
      }),
    }),
  );
  return data.order;
}

export async function renderUpdateOrder(
  telegramUserId: string,
  orderId: number,
  patch: Partial<Order>,
): Promise<Order> {
  const data = await parseJson<{ order: Order }>(
    await fetch(apiUrl(`/api/orders/${orderId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramUserId, patch }),
    }),
  );
  return data.order;
}

export async function renderSubmitPayment(
  telegramUserId: string,
  orderId: number,
  reference: string,
  screenshotFile: Blob,
  filename = 'payment.jpg',
): Promise<Order> {
  const form = new FormData();
  form.append('telegramUserId', telegramUserId);
  form.append('reference', reference);
  form.append('screenshot', screenshotFile, filename);

  const data = await parseJson<{ order: Order }>(
    await fetch(apiUrl(`/api/orders/${orderId}/submit-payment`), {
      method: 'POST',
      body: form,
    }),
  );
  return data.order;
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
