import crypto from 'node:crypto';
import { config } from './config.js';
import { completeOrder, getOrderByIdAdmin, rejectOrder } from './db.js';
import { parseOrderId } from './orderId.js';
import { createVpnKey } from './vpn.js';
import { fulfillRenewOrder } from './vpnLifecycle.js';
import { sendUserMessage, tg } from './telegramApi.js';

function actionSecret() {
  return config.adminActionSecret || config.botToken || 'change-me';
}

export function signAdminAction(orderId, action) {
  return crypto
    .createHmac('sha256', actionSecret())
    .update(`${action}:${String(orderId)}`)
    .digest('hex')
    .slice(0, 24);
}

export function verifyAdminAction(orderId, action, token) {
  if (!token) return false;
  const expected = signAdminAction(orderId, action);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export async function approveOrderById(orderId) {
  const id = parseOrderId(orderId);
  const row = await getOrderByIdAdmin(id);
  if (!row) {
    return { ok: false, error: `Order #${id} မတွေ့ပါ` };
  }
  if (row.status === 'completed') {
    return { ok: true, already: true, orderId: id, accessUrl: row.access_url };
  }

  const isRenew = String(row.order_type || '').toLowerCase() === 'renew';

  let accessUrl;
  let expiresAt;
  let vpnMeta = {};
  let renewMode;
  let renewParentOrderId;

  try {
    if (isRenew) {
      const renewResult = await fulfillRenewOrder(row);
      renewMode = renewResult.mode;
      renewParentOrderId = renewResult.parentOrderId;
      accessUrl = renewResult.accessUrl;
      expiresAt = renewResult.expiresAt;
      vpnMeta = {
        configToken: renewResult.configToken,
        nodes: renewResult.nodes,
      };
    } else {
      const keyResult = await createVpnKey(row);
      accessUrl = keyResult.accessUrl;
      expiresAt = keyResult.expiresAt;
      vpnMeta = {
        configToken: keyResult.configToken,
        nodes: keyResult.nodes,
      };
    }
  } catch (e) {
    console.error('[admin] VPN fulfill failed', e);
    return { ok: false, error: e.message || 'VPN key ထုတ်၍ မရပါ' };
  }

  await completeOrder(id, accessUrl, expiresAt, vpnMeta);

  const expiryLabel = new Date(expiresAt).toLocaleDateString('my-MM');

  try {
    if (isRenew && renewMode === 'extend') {
      await sendUserMessage(
        row.telegram_user_id,
        [
          `✅ Order #${id} သက်တမ်းတိုး အတည်ပြုပြီး`,
          '',
          `သက်တမ်းကုန်: ${expiryLabel}`,
          '',
          'သင်၏ VPN Key အတူတူဖြစ်ပါသည် — Outline မှာ key အသစ် မလိုပါ။',
          '',
          `Key: ${accessUrl}`,
        ].join('\n'),
      );
    } else {
      await sendUserMessage(
        row.telegram_user_id,
        [
          `✅ Order #${id} အတည်ပြုပြီး`,
          isRenew && renewMode === 'rotate'
            ? 'သက်တမ်းကုန်ပြီးသား key ကို အသစ်ပြောင်းပေးထားပါသည်။'
            : '',
          '',
          `သက်တမ်းကုန်: ${expiryLabel}`,
          '',
          'Mini App → Active Keys မှလည်း ကူးယူနိုင်ပါသည်။',
          '',
          'အောက်က သင်၏ Activate Key ဖြစ်ပါတယ်ခင်ဗျာ',
        ]
          .filter(Boolean)
          .join('\n'),
      );
      await sendUserMessage(row.telegram_user_id, accessUrl);
    }
  } catch (e) {
    console.warn('[admin] send key to user failed', e.message);
  }

  for (const chatId of config.adminChatIds) {
    const adminNote =
      isRenew && renewMode === 'extend'
        ? `Renew extended (same key) parent #${renewParentOrderId ?? '—'}`
        : isRenew && renewMode === 'rotate'
          ? 'Renew rotated (new key)'
          : '';
    await tg('sendMessage', {
      chat_id: chatId,
      text: [`✅ Order #${id} Approved`, adminNote, `Key: ${accessUrl}`]
        .filter(Boolean)
        .join('\n'),
    }).catch(() => {});
  }

  return { ok: true, orderId: id, accessUrl, renewMode };
}

export async function rejectOrderById(orderId) {
  const id = parseOrderId(orderId);
  const row = await getOrderByIdAdmin(id);
  if (!row) {
    return { ok: false, error: `Order #${id} မတွေ့ပါ` };
  }

  await rejectOrder(id);

  try {
    await sendUserMessage(
      row.telegram_user_id,
      `❌ Order #${id} — ငွေလွှဲ အတည်မပြုနိုင်ပါ။ Support ကို ဆက်သွယ်ပါ။`,
    );
  } catch (e) {
    console.warn('[admin] notify user reject failed', e.message);
  }

  for (const chatId of config.adminChatIds) {
    await tg('sendMessage', {
      chat_id: chatId,
      text: `❌ Order #${id} Rejected`,
    }).catch(() => {});
  }

  return { ok: true, orderId: id };
}

export function adminResultHtml(title, body) {
  return `<!DOCTYPE html>
<html lang="my">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#e8f5e9;padding:24px;text-align:center}
    .box{background:#fff;border-radius:12px;padding:24px;max-width:360px;margin:40px auto;box-shadow:0 2px 12px rgba(0,0,0,.08)}
    h1{font-size:20px;color:#2e7d32}
    p{color:#333;line-height:1.5;word-break:break-all}
  </style>
</head>
<body>
  <div class="box">
    <h1>${title}</h1>
    <p>${body}</p>
    <p style="font-size:13px;color:#666">Telegram သို့ ပြန်သွားပြီး Mini App စစ်ပါ</p>
  </div>
</body>
</html>`;
}
