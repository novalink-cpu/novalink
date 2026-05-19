import { approveOrderById, rejectOrderById } from './adminActions.js';
import { config } from './config.js';
import { getOrderByIdAdmin } from './db.js';
import { parseOrderId } from './orderId.js';

import { sendUserMessage, tg } from './telegramApi.js';

const TELEGRAM_API = 'https://api.telegram.org';

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

function isAdminActor(query) {
  const fromId = String(query.from?.id ?? '');
  const chatId = String(query.message?.chat?.id ?? '');
  return config.adminChatIds.some((adminId) => adminId === fromId || adminId === chatId);
}

/** Telegram callback ခလုတ် — browser မဖွင့်ပါ */
function adminKeyboard(orderId) {
  const id = String(orderId);
  return {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `approve:${id}` },
        { text: '❌ Reject', callback_data: `reject:${id}` },
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

/** Screenshot + Approve/Reject ခလုတ် — message တစ်ခုတည်း */
export async function notifyAdminNewPayment(orderRow, screenshotBuffer, mime) {
  if (!config.adminChatIds.length) return;

  const caption = `${formatOrderCaption(orderRow)}\n\n👇 Approve သို့မဟုတ် Reject နှိပ်ပါ`;
  const keyboard = adminKeyboard(orderRow.id);

  for (const chatId of config.adminChatIds) {
    if (screenshotBuffer?.length) {
      const form = new FormData();
      form.append('chat_id', String(chatId));
      form.append('caption', caption);
      form.append('reply_markup', JSON.stringify(keyboard));
      form.append(
        'photo',
        new Blob([screenshotBuffer], { type: mime || 'image/jpeg' }),
        'payment.jpg',
      );

      const res = await fetch(`${TELEGRAM_API}/bot${config.botToken}/sendPhoto`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!data.ok) {
        console.error('[telegram] sendPhoto+keyboard failed', data);
        await tg('sendMessage', {
          chat_id: chatId,
          text: caption,
          reply_markup: keyboard,
        });
      }
    } else {
      await tg('sendMessage', {
        chat_id: chatId,
        text: caption,
        reply_markup: keyboard,
      });
    }
  }
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

  if (!isAdminActor(query)) {
    await answerCallback(
      query,
      `Admin ID: ${fromId} — TELEGRAM_ADMIN_CHAT_IDS မှာထည့်ပါ`,
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

  if (action === 'reject') {
    await answerCallback(query, 'လုပ်ဆောင်နေသည်...');
    const result = await rejectOrderById(orderId);
    if (result.ok) {
      try {
        const row = await getOrderByIdAdmin(orderId);
        await editAdminMessage(
          query,
          `${formatOrderCaption({ ...row, status: 'rejected' })}\n\n❌ Rejected`,
        );
      } catch (e) {
        console.warn('[telegram] edit reject message', e.message);
      }
    } else {
      try {
        await editAdminMessage(query, `❌ Reject မအောင်မြင်: ${result.error || 'Failed'}`);
      } catch {
        /* ignore */
      }
    }
    return;
  }

  if (action === 'approve') {
    await answerCallback(query, 'လုပ်ဆောင်နေသည်...');
    const result = await approveOrderById(orderId);
    if (!result.ok) {
      try {
        await editAdminMessage(query, `❌ Approve မအောင်မြင်: ${result.error || 'Failed'}`);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const row = await getOrderByIdAdmin(orderId);
      await editAdminMessage(
        query,
        `${formatOrderCaption({ ...row, status: 'completed' })}\n\n✅ Approved — key ပို့ပြီး`,
      );
    } catch (e) {
      console.warn('[telegram] edit approve message', e.message);
    }
    return;
  }

  await answerCallback(query, 'မမှန်သော ခလုတ်', true);
}

export async function handleTelegramUpdate(update) {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
  }
}

/** Local dev သာ — webhook ဖျက်ပြီး polling (Render production မှာ မသုံးပါ) */
function startPolling() {
  if (pollingActive || !config.botToken) return;

  void (async () => {
    await tg('deleteWebhook', { drop_pending_updates: true }).catch(() => {});
    const info = await tg('getWebhookInfo', {}).catch(() => ({}));
    if (info.url) {
      console.error(
        '[telegram] polling မစတင်နိုင် — webhook သေးသေးရှိနေသည်:',
        info.url,
      );
      return;
    }

    pollingActive = true;
    transportMode = 'polling';
    console.log('[telegram] ✅ polling mode (local dev)');

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
        const msg = e.message || '';
        if (msg.includes('409')) {
          console.error(
            '[telegram] 409 Conflict — webhook နှင့် polling တပြိုင်နက် မရပါ။ TELEGRAM_USE_POLLING ဖယ်ပါ။',
          );
          pollingActive = false;
          return;
        }
        console.error('[telegram] polling error', msg);
        await sleep(4000);
      }
    }
  })();
}

async function trySetupWebhook() {
  const base = webhookBaseUrl();
  if (!base) return false;

  const url = `${base}/telegram/webhook`;

  await tg('deleteWebhook', { drop_pending_updates: false }).catch(() => {});

  await tg('setWebhook', {
    url,
    allowed_updates: ['callback_query'],
    drop_pending_updates: false,
  });

  const info = await tg('getWebhookInfo', {});
  const registered = Boolean(info.url);
  console.log('[telegram] webhook URL:', info.url || '(none)');

  if (!registered) {
    return false;
  }

  transportMode = 'webhook';
  console.log('[telegram] ✅ webhook mode — Approve/Reject ခလုတ် အလုပ်လုပ်မည်');
  if (info.last_error_message) {
    console.warn(
      '[telegram] ယခင် webhook ပို့မှု error (ခလုတ် အလုပ်လုပ်နိုင်သေး):',
      info.last_error_message,
    );
  }
  return true;
}

/** Production (Render): webhook သာ — polling မသုံး (409 Conflict ရှောင်ရန်) */
export async function initTelegramTransport() {
  console.log('[telegram] initializing bot transport...');

  if (!config.botToken) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN not set — ခလုတ် အလုပ်မလုပ်ပါ');
    return;
  }

  if (!config.adminChatIds.length) {
    console.warn('[telegram] TELEGRAM_ADMIN_CHAT_IDS not set — ခလုတ် နှိပ်ရင် admin မမှတ်မိပါ');
  } else {
    console.log('[telegram] admin IDs:', config.adminChatIds.join(', '));
  }

  const base = webhookBaseUrl();
  console.log('[telegram] API base URL:', base || '(မရှိ — PUBLIC_API_URL စစ်ပါ)');
  if (!base) {
    console.warn('[telegram] PUBLIC_API_URL မရှိ — webhook / screenshot link မထွက်ပါ');
    return;
  }

  if (config.usePolling) {
    console.log('[telegram] TELEGRAM_USE_POLLING=1 (local dev)');
    startPolling();
    return;
  }

  const webhookOk = await trySetupWebhook().catch((e) => {
    console.warn('[telegram] webhook setup failed:', e.message);
    return false;
  });

  if (!webhookOk) {
    console.error(
      '[telegram] webhook မအောင်မြင်ပါ — PUBLIC_API_URL=https://api.domain.com နှင့် HTTPS စစ်ပါ',
    );
    console.error(
      '[telegram] TELEGRAM_USE_POLLING မထားပါ — polling သည် webhook နှင့် 409 Conflict ဖြစ်စေသည်',
    );
  }
}

/** @deprecated — initTelegramTransport သုံးပါ */
export async function setupWebhook() {
  await initTelegramTransport();
}
