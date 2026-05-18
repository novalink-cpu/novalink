/** PostgreSQL INTEGER max — client must not use Date.now() as order id */
export const PG_INT_MAX = 2_147_483_647;

export function parseOrderId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1 || id > PG_INT_MAX) {
    const err = new Error(
      `Order ID မမှန်ပါ — server မှ ထုတ်သော id (၁–${PG_INT_MAX}) သာ သုံးပါ။ App ကို ပြန် build/deploy လုပ်ပါ။`,
    );
    err.statusCode = 400;
    throw err;
  }
  return id;
}

export function isClientTempOrderId(id) {
  return !id || id < 1 || id > PG_INT_MAX;
}
