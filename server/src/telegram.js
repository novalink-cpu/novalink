import { config } from './config.js';
import { completeOrder, getOrderByIdAdmin, rejectOrder } from './db.js';
import { createVpnKey } from './vpn.js';

const API = 'https://api.telegram.org';

async function tg(method, body) {
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

export async function handleCallbackQuery(query) {
  const data = query.data || '';
  const fromId = String(query.from?.id ?? '');
  const isAdmin = config.adminChatIds.includes(fromId);

  if (!isAdmin) {
    await tg('answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'Admin သာ approve လုပ်နိုင်ပါသည်',
      show_alert: true,
    });
    return;
  }

  const [action, idStr] = data.split(':');
  const orderId = Number(idStr);
  if (!orderId || !['approve', 'reject'].includes(action)) return;

  await tg('answerCallbackQuery', { callback_query_id: query.id });

  const row = await getOrderByIdAdmin(orderId);
  if (!row) {
    await tg('editMessageCaption', {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
      caption: `Order #${orderId} မတွေ့ပါ`,
    }).catch(() => {});
    return;
  }

  if (action === 'reject') {
    await rejectOrder(orderId);
    await tg('editMessageCaption', {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
      caption: `${formatOrderCaption({ ...row, status: 'rejected' })}\n\n❌ Rejected by admin`,
    }).catch(() => {
      tg('sendMessage', {
        chat_id: query.message.chat.id,
        text: `Order #${orderId} ❌ rejected`,
      });
    });
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
    await tg('answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'ပြီးသား order ဖြစ်ပါသည်',
      show_alert: true,
    });
    return;
  }

  const { accessUrl, expiresAt } = await createVpnKey(row);
  const completed = await completeOrder(orderId, accessUrl, expiresAt);

  await tg('editMessageCaption', {
    chat_id: query.message.chat.id,
    message_id: query.message.message_id,
    caption: `${formatOrderCaption({ ...row, status: 'completed' })}\n\n✅ Approved — key issued`,
  }).catch(() => {
    tg('sendMessage', {
      chat_id: query.message.chat.id,
      text: `Order #${orderId} ✅ approved\nKey: ${accessUrl}`,
    });
  });

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

  return completed;
}

export async function handleTelegramUpdate(update) {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }
}

export async function setupWebhook() {
  if (!config.webhookUrl || !config.botToken) return;
  const url = `${config.webhookUrl.replace(/\/$/, '')}/telegram/webhook`;
  await tg('setWebhook', { url });
  console.log('[telegram] webhook set:', url);
}
