import { config } from './config.js';
import { completeOrder, getOrderByIdAdmin, rejectOrder } from './db.js';
import { parseOrderId } from './orderId.js';
import { createVpnKey } from './vpn.js';

const API = 'https://api.telegram.org';

let pollingActive = false;
let transportMode = 'none';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function getTelegramTransportMode() {
  return transportMode;
}

function webhookBaseUrl() {
  const base = config.webhookUrl || config.publicApiUrl;
  return base ? base.replace(/\/$/, '') : '';
}

async function tg(method, body = {}) {
  if (!config.botToken) throw new Error('TELEGRAM_BOT_TOKEN not set');
  const res = await fetch(`${API}/bot${config.botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram ${method}: ${JSON.stringify(data)}`);
  }
  return data.result;
}

function isAdminUser(telegramUserId) {
  const id = String(telegramUserId ?? '');
  return config.adminChatIds.some((adminId) => adminId === id);
}

function adminKeyboard(orderId) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `approve:${orderId}` },
        { text: '❌ Reject', callback_data: `reject:${orderId}` },
      ],
    ],
  };
}

function emptyKeyboard() {
  return { inline_keyboard: [] };
}

function formatOrderCaption(order) {
  return [
    '🔔 NovaLink — ငွေလွှဲ screenshot',
    '',
    `Order ID: ${order.id}`,
    `User (TG): ${order.telegram_user_id}`,
    `Region: ${order.region_name}`,
    `Package: ${order.package_label}`,
    `Amount: ${order.amount} MMK`,
    `Payment: ${order.payment_method_name || '-'}`,
    `Reference: ${order.reference || '-'}`,
    `Status: ${order.status}`,
  ].join('\n');
}

async function editAdminMessage(query, caption) {
  const chatId = query.message?.chat?.id;
  const messageId = query.message?.message_id;
  if (!chatId || !messageId) return;

  const base = {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: emptyKeyboard(),
  };

  if (query.message?.photo?.length) {
    await tg('editMessageCaption', { ...base, caption });
  } else {
    await tg('editMessageText', { ...base, text: caption });
  }
}

/** Screenshot + ခလုတ် — sendMessage (keyboard ယုံကြည်ရ) + sendPhoto */
export async function notifyAdminNewPayment(orderRow, screenshotBuffer, mime) {
  if (!config.adminChatIds.length) return;

  const caption = formatOrderCaption(orderRow);
  const keyboard = adminKeyboard(orderRow.id);

  for (const chatId of config.adminChatIds) {
    if (screenshotBuffer?.length) {
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('caption', caption);
      form.append('photo', new Blob([screenshotBuffer], { type: mime || 'image/jpeg' }), 'payment.jpg');

      const res = await fetch(`${API}/bot${config.botToken}/sendPhoto`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!data.ok) {
        console.error('[telegram] sendPhoto failed', data);
      }
    }

    await tg('sendMessage', {
      chat_id: chatId,
      text: `👇 Order #${orderRow.id} — Approve သို့မဟုတ် Reject နှိပ်ပါ`,
      reply_markup: keyboard,
    });
  }
}

export async function sendUserMessage(telegramUserId, text) {
  await tg('sendMessage', {
    chat_id: telegramUserId,
    text,
    disable_web_page_preview: false,
  });
}

async function answerCallback(query, text, showAlert = false) {
  await tg('answerCallbackQuery', {
    callback_query_id: query.id,
    text: text || undefined,
    show_alert: showAlert,
  }).catch((e) => console.warn('[telegram] answerCallbackQuery', e.message));
}

export async function handleCallbackQuery(query) {
  const data = query.data || '';
  const fromId = String(query.from?.id ?? '');

  console.log('[telegram] callback', { data, fromId, mode: transportMode });

  if (!isAdminUser(fromId)) {
    await answerCallback(
      query,
      `Admin ID မကိုက်ညီပါ — TELEGRAM_ADMIN_CHAT_IDS=${fromId} ထည့်ပါ`,
      true,
    );
    return;
  }

  const [action, idStr] = data.split(':');
  let orderId;
  try {
    orderId = parseOrderId(idStr);
  } catch {
    await answerCallback(query, 'မမှန်သော order ID', true);
    return;
  }

  if (!['approve', 'reject'].includes(action)) {
    await answerCallback(query, 'မမှန်သော ခလုတ်', true);
    return;
  }

  const row = await getOrderByIdAdmin(orderId);
  if (!row) {
    await answerCallback(query, `Order #${orderId} မတွေ့ပါ`, true);
    return;
  }

  if (action === 'reject') {
    await answerCallback(query, '❌ Rejected');
    await rejectOrder(orderId);
    try {
      await editAdminMessage(
        query,
        `${formatOrderCaption({ ...row, status: 'rejected' })}\n\n❌ Rejected by admin`,
      );
    } catch (e) {
      console.warn('[telegram] edit reject message', e.message);
    }
    try {
      await sendUserMessage(
        row.telegram_user_id,
        `❌ Order #${orderId} — ငွေလွှဲ အတည်မပြုနိုင်ပါ။ Support ကို ဆက်သွယ်ပါ။`,
      );
    } catch (e) {
      console.warn('[telegram] notify user reject failed', e.message);
    }
    return;
  }

  if (row.status === 'completed') {
    await answerCallback(query, 'ပြီးသား order ဖြစ်ပါသည်', true);
    return;
  }

  await answerCallback(query, '✅ Processing...');

  const { accessUrl, expiresAt } = await createVpnKey(row);
  await completeOrder(orderId, accessUrl, expiresAt);

  try {
    await editAdminMessage(
      query,
      `${formatOrderCaption({ ...row, status: 'completed' })}\n\n✅ Approved — key issued`,
    );
  } catch (e) {
    console.warn('[telegram] edit approve message', e.message);
    await tg('sendMessage', {
      chat_id: query.message.chat.id,
      text: `Order #${orderId} ✅ approved\nKey: ${accessUrl}`,
    }).catch(() => {});
  }

  try {
    await sendUserMessage(
      row.telegram_user_id,
      [
        `✅ Order #${orderId} အတည်ပြုပြီး — VPN Key`,
        '',
        accessUrl,
        '',
        `သက်တမ်းကုန်: ${new Date(expiresAt).toLocaleDateString('my-MM')}`,
        '',
        'Mini App → Active Keys မှလည်း ကူးယူနိုင်ပါသည်။',
      ].join('\n'),
    );
  } catch (e) {
    console.warn('[telegram] send key to user failed (user may not have started bot)', e.message);
  }
}

export async function handleTelegramUpdate(update) {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
  }
}

async function startPolling() {
  if (pollingActive || !config.botToken) return;
  pollingActive = true;
  transportMode = 'polling';

  await tg('deleteWebhook', { drop_pending_updates: false }).catch(() => {});

  console.log('[telegram] ✅ polling mode — Approve/Reject ခလုတ် အလုပ်လုပ်မည်');

  let offset = 0;
  while (pollingActive) {
    try {
      const updates = await tg('getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['callback_query', 'message'],
      });
      if (!Array.isArray(updates)) continue;

      for (const update of updates) {
        offset = Math.max(offset, update.update_id + 1);
        handleTelegramUpdate(update).catch((e) => {
          console.error('[telegram] handle update failed', e);
        });
      }
    } catch (e) {
      console.error('[telegram] polling error', e.message);
      await sleep(4000);
    }
  }
}

async function trySetupWebhook() {
  const base = webhookBaseUrl();
  if (!base) return false;

  const url = `${base}/telegram/webhook`;

  await tg('deleteWebhook', { drop_pending_updates: true }).catch(() => {});

  await tg('setWebhook', {
    url,
    allowed_updates: ['callback_query', 'message'],
    drop_pending_updates: true,
  });

  const info = await tg('getWebhookInfo', {});
  console.log('[telegram] webhook URL:', info.url || url);
  if (info.last_error_message) {
    console.warn('[telegram] webhook error:', info.last_error_message);
    return false;
  }
  if (!info.url) return false;

  transportMode = 'webhook';
  console.log('[telegram] ✅ webhook mode');
  return true;
}

/** Server စတင်ချိန် — webhook သို့မဟုတ် polling (ခလုတ်အတွက် polling ပိုတည်ငြိမ်) */
export async function initTelegramTransport() {
  if (!config.botToken) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN not set');
    return;
  }

  if (!config.adminChatIds.length) {
    console.warn('[telegram] TELEGRAM_ADMIN_CHAT_IDS not set');
  } else {
    console.log('[telegram] admin IDs:', config.adminChatIds.join(', '));
  }

  if (config.usePolling) {
    console.log('[telegram] TELEGRAM_USE_POLLING=1 — webhook မသုံး၊ polling သုံး');
    await startPolling();
    return;
  }

  const webhookOk = await trySetupWebhook().catch((e) => {
    console.warn('[telegram] webhook setup failed:', e.message);
    return false;
  });

  if (!webhookOk) {
    console.warn('[telegram] webhook မအောင်မြင် — polling သို့ ပြောင်းပါ');
    await startPolling();
  }
}

/** @deprecated — initTelegramTransport သုံးပါ */
export async function setupWebhook() {
  await initTelegramTransport();
}
