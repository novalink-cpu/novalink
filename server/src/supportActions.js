import { config } from './config.js';
import {
  createSupportRequestRow,
  getOrderById,
  getOrderByIdAdmin,
  getSupportRequestById,
  updateSupportRequestStatus,
} from './db.js';
import { parseOrderId } from './orderId.js';
import { rotateOrderVpnKey } from './vpnLifecycle.js';
import { sendUserMessage, tg } from './telegramApi.js';

export async function submitKeyIssueReport(telegramUserId, orderIdRaw) {
  const orderId = parseOrderId(orderIdRaw);
  const userId = String(telegramUserId || '').trim();
  if (!userId || userId === 'guest') {
    throw Object.assign(new Error('Telegram အတွင်းမှသာ တင်ပြနိုင်ပါသည်'), { statusCode: 400 });
  }

  const order = await getOrderById(orderId, userId);
  if (!order) {
    throw Object.assign(new Error('အော်ဒါ မတွေ့ပါ'), { statusCode: 404 });
  }
  if (order.status !== 'completed') {
    throw Object.assign(
      new Error('Key ရရှိပြီးသော အော်ဒါသာ တင်ပြနိုင်ပါသည်'),
      { statusCode: 400 },
    );
  }
  if (order.orderType === 'renew') {
    throw Object.assign(
      new Error('သက်တမ်းတိုင် အော်ဒါ မဟုတ် — ဝယ်ယူမှု အော်ဒါ # ကို ရွေးပါ'),
      { statusCode: 400 },
    );
  }
  if (!order.accessUrl) {
    throw Object.assign(new Error('ဤအော်ဒါတွင် key မရှိသေးပါ'), { statusCode: 400 });
  }

  const row = await createSupportRequestRow(orderId, userId);
  const adminOrder = await getOrderByIdAdmin(orderId);

  return {
    ok: true,
    supportRequestId: row.id,
    orderId,
    supportRow: row,
    adminOrder,
    message: 'တင်ပြပြီးပါပြီ — admin စစ်ဆေးပြီး key အသစ် ပို့ပေးပါမည်',
  };
}

export async function approveKeyIssueById(supportRequestId) {
  const reqId = parseOrderId(supportRequestId);
  const support = await getSupportRequestById(reqId);
  if (!support) {
    return { ok: false, error: `Support #${reqId} မတွေ့ပါ` };
  }
  if (support.status === 'approved') {
    return { ok: true, already: true, supportRequestId: reqId };
  }
  if (support.status === 'rejected') {
    return { ok: false, error: 'ဤတောင်းဆိုမှု rejected ဖြစ်ပြီးသား' };
  }

  const order = await getOrderByIdAdmin(support.order_id);
  if (!order || order.status !== 'completed') {
    return { ok: false, error: `Order #${support.order_id} completed မဟုတ်ပါ` };
  }

  let keyResult;
  try {
    keyResult = await rotateOrderVpnKey(order);
  } catch (e) {
    console.error('[support] rotate failed', e);
    return { ok: false, error: e.message || 'Key rotate မအောင်မြင်' };
  }

  await updateSupportRequestStatus(reqId, 'approved');

  const expiryLabel = keyResult.expiresAt
    ? new Date(keyResult.expiresAt).toLocaleDateString('my-MM')
    : '-';

  try {
    await sendUserMessage(
      order.telegram_user_id,
      [
        `✅ Order #${order.id} — Key အသစ် ထုတ်ပေးပြီး`,
        '',
        'ချိတ်မရခြင်း ပြင်ဆင်မှု — key အဟောင်းကို ပိတ်ပြီး အသစ် ပို့ပေးထားပါသည်။',
        '',
        `သက်တမ်းကုန်: ${expiryLabel}`,
        '',
        'အောက်က Activate Key အသစ်ဖြစ်ပါတယ်',
      ].join('\n'),
    );
    await sendUserMessage(order.telegram_user_id, keyResult.accessUrl);
  } catch (e) {
    console.warn('[support] send key to user failed', e.message);
  }

  for (const chatId of config.adminChatIds) {
    await tg('sendMessage', {
      chat_id: chatId,
      text: `✅ Key fix approved — Order #${order.id}\nKey: ${keyResult.accessUrl}`,
    }).catch(() => {});
  }

  return {
    ok: true,
    supportRequestId: reqId,
    orderId: order.id,
    accessUrl: keyResult.accessUrl,
  };
}

export async function rejectKeyIssueById(supportRequestId) {
  const reqId = parseOrderId(supportRequestId);
  const support = await getSupportRequestById(reqId);
  if (!support) {
    return { ok: false, error: `Support #${reqId} မတွေ့ပါ` };
  }
  if (support.status === 'rejected') {
    return { ok: true, already: true };
  }
  if (support.status === 'approved') {
    return { ok: false, error: 'ဤတောင်းဆိုမှု approve ဖြစ်ပြီးသား' };
  }

  await updateSupportRequestStatus(reqId, 'rejected');

  const order = await getOrderByIdAdmin(support.order_id);
  if (order?.telegram_user_id) {
    try {
      await sendUserMessage(
        order.telegram_user_id,
        [
          `❌ Order #${order.id} — Key ပြင်ဆင်မှုအသစ် မလုပ်ဆောင်ပေးနိုင်သည့်အတွက် ခွင့်လွှတ်ပါ`,
          '',
          'Support ကို ဆက်သွယ်ပါ (သို့မဟုတ် သက်တမ်းတိုး/ဝယ်ယူမှု အသစ်)။',
        ].join('\n'),
      );
    } catch (e) {
      console.warn('[support] notify user reject failed', e.message);
    }
  }

  return { ok: true, supportRequestId: reqId, orderId: support.order_id };
}
