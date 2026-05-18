import { config } from './config.js';
import { completeOrder, getOrderByIdAdmin, rejectOrder } from './db.js';
import { parseOrderId } from './orderId.js';
import { createVpnKey } from './vpn.js';

const API = 'https://api.telegram.org';

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

export async function notifyAdminNewPayment(orderRow, screenshotBuffer, mime) {
  if (!config.adminChatIds.length) return;

  const caption = formatOrderCaption(orderRow);

  for (const chatId of config.adminChatIds) {
    if (screenshotBuffer?.length) {
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('caption', caption);
      form.append('reply_markup', JSON.stringify(adminKeyboard(orderRow.id)));
      form.append('photo', new Blob([screenshotBuffer], { type: mime || 'image/jpeg' }), 'payment.jpg');

      const res = await fetch(`${API}/bot${config.botToken}/sendPhoto`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!data.ok) {
        console.error('[telegram] sendPhoto failed', data);
        await tg('sendMessage', {
          chat_id: chatId,
          text: `${caption}\n\n(ဓာတ်ပုံ ပို့၍မရ — screenshot ကို API မှ ကြည့်ပါ)`,
          reply_markup: adminKeyboard(orderRow.id),
        });
      }
    } else {
      await tg('sendMessage', {
        chat_id: chatId,
        text: caption,
        reply_markup: adminKeyboard(orderRow.id),
      });
    }
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

  if (!isAdminUser(fromId)) {
    await answerCallback(query, 'Admin သာ approve လုပ်နိုင်ပါသည်', true);
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
    await rejectOrder(orderId);
    await answerCallback(query, '❌ Rejected');
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

export async function setupWebhook() {
  if (!config.botToken) return;

  if (!config.webhookUrl) {
    console.warn(
      '[telegram] TELEGRAM_WEBHOOK_URL မထည့်ရသေး — Approve/Reject ခလုတ် အလုပ်မလုပ်ပါ။',
    );
    console.warn('[telegram] Render env: TELEGRAM_WEBHOOK_URL=https://YOUR-SERVICE.onrender.com');
    return;
  }

  const url = `${config.webhookUrl.replace(/\/$/, '')}/telegram/webhook`;

  await tg('deleteWebhook', { drop_pending_updates: true }).catch(() => {});

  await tg('setWebhook', {
    url,
    allowed_updates: ['callback_query', 'message'],
    drop_pending_updates: true,
  });

  const info = await tg('getWebhookInfo', {});
  console.log('[telegram] webhook URL:', info.url || url);
  console.log('[telegram] pending updates:', info.pending_update_count ?? 0);
  if (info.last_error_message) {
    console.warn('[telegram] webhook last error:', info.last_error_message);
  }
  if (!config.adminChatIds.length) {
    console.warn('[telegram] TELEGRAM_ADMIN_CHAT_IDS မထည့်ရသေး');
  } else {
    console.log('[telegram] admin IDs:', config.adminChatIds.join(', '));
  }
}
