import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { assertConfig, config } from './config.js';
import {
  createOrder,
  getOrderById,
  getOrdersByUser,
  getOrderByIdAdmin,
  getScreenshotRow,
  getVpnSubscriptionByToken,
  initDb,
  saveScreenshot,
  updateOrder,
} from './db.js';
import { buildSubscriptionJson } from './vpnSubscription.js';
import {
  getTelegramTransportMode,
  handleTelegramUpdate,
  initTelegramTransport,
  notifyAdminNewPayment,
} from './telegram.js';
import { parseOrderId } from './orderId.js';
import {
  adminResultHtml,
  approveOrderById,
  rejectOrderById,
  verifyAdminAction,
} from './adminActions.js';

assertConfig();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const app = express();
if (config.trustProxy) {
  app.set('trust proxy', 1);
}
app.use(express.json({ limit: '2mb' }));

function isCorsOriginAllowed(origin) {
  if (!origin) return true;
  const appOrigin = config.appPublicUrl?.replace(/\/$/, '');
  if (appOrigin && origin === appOrigin) return true;
  if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
    return true;
  }
  if (!config.corsOrigins.length && !appOrigin) return true;
  // Telegram Mini App WebView
  if (/^https:\/\/([\w-]+\.)?telegram\.org$/i.test(origin)) return true;
  if (origin === 'https://t.me') return true;
  return false;
}

const corsOptions = {
  origin(origin, cb) {
    if (isCorsOriginAllowed(origin)) return cb(null, true);
    console.warn('[cors] blocked origin:', origin);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
};
app.use(cors(corsOptions));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'novalink-api',
    telegram: getTelegramTransportMode(),
    publicApiUrl: config.publicApiUrl || null,
    appPublicUrl: config.appPublicUrl || null,
    vpnDemoMode: config.vpnDemoMode,
    vpnUseSsconf: config.vpnUseSsconf,
    outlineRegions: Object.keys(config.outlineServers),
    adminLinks: Boolean(config.publicApiUrl || config.webhookUrl),
  });
});

/** ssconf:// — Outline app fetches server list (Tokyo + Sydney, etc.) */
app.get('/vpn/c/:token.json', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token || token.length < 16) {
      return res.status(400).json({ error: 'Invalid token' });
    }
    const sub = await getVpnSubscriptionByToken(token);
    if (!sub) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (sub.forbidden) {
      return res.status(403).json({ error: 'Not active' });
    }
    if (sub.expired) {
      return res.status(410).json({ error: 'Expired' });
    }
    if (sub.empty) {
      return res.status(404).json({ error: 'No servers' });
    }
    const json = buildSubscriptionJson(sub.nodes);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.json(json);
  } catch (e) {
    console.error('[vpn] subscription json', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const telegramUserId = String(req.query.telegramUserId || '').trim();
    if (!telegramUserId) {
      return res.status(400).json({ error: 'telegramUserId required' });
    }
    const orders = await getOrdersByUser(telegramUserId);
    res.json({ orders: orders.map(withPublicUrls) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const id = parseOrderId(req.params.id);
    const telegramUserId = String(req.query.telegramUserId || '').trim();
    if (!telegramUserId) {
      return res.status(400).json({ error: 'telegramUserId required' });
    }
    const order = await getOrderById(id, telegramUserId);
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json({ order: withPublicUrls(order) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const body = req.body || {};
    const telegramUserId = String(body.telegramUserId || '').trim();
    if (!telegramUserId) {
      return res.status(400).json({ error: 'telegramUserId required' });
    }
    const order = await createOrder({
      telegramUserId,
      regionId: body.regionId,
      regionName: body.regionName,
      packageId: body.packageId,
      packageLabel: body.packageLabel,
      packageMonths: body.packageMonths ?? 1,
      amount: body.amount,
      paymentMethodId: body.paymentMethodId,
      paymentMethodName: body.paymentMethodName,
      status: body.status ?? 'pending',
      orderType: body.orderType ?? 'purchase',
    });
    res.status(201).json({ order: withPublicUrls(order) });
  } catch (e) {
    const code = e.statusCode || 500;
    console.error(e);
    res.status(code).json({ error: e.message });
  }
});

app.patch('/api/orders/:id', async (req, res) => {
  try {
    const id = parseOrderId(req.params.id);
    const telegramUserId = String(req.body?.telegramUserId || '').trim();
    if (!telegramUserId) {
      return res.status(400).json({ error: 'telegramUserId required' });
    }
    const order = await updateOrder(id, telegramUserId, req.body?.patch || req.body);
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json({ order: withPublicUrls(order) });
  } catch (e) {
    const code = e.statusCode || 500;
    console.error(e);
    res.status(code).json({ error: e.message });
  }
});

/** Screenshot + reference → DB, Telegram admin (photo + Approve/Reject) */
app.post(
  '/api/orders/:id/submit-payment',
  upload.single('screenshot'),
  async (req, res) => {
    try {
      const id = parseOrderId(req.params.id);
      const telegramUserId = String(req.body.telegramUserId || '').trim();
      const reference = String(req.body.reference || '').trim() || `Order #${id}`;

      if (!telegramUserId) {
        return res.status(400).json({ error: 'telegramUserId required' });
      }
      if (!req.file?.buffer?.length) {
        return res.status(400).json({ error: 'screenshot file required' });
      }

      await updateOrder(id, telegramUserId, { reference });
      const mime = req.file.mimetype || 'image/jpeg';
      const order = await saveScreenshot(id, mime, req.file.buffer);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      const row = await getOrderByIdAdmin(id);

      // Client ကို ချက်ချင်း အောင်မြင်ကြောင်း ပြန်ပါ — Telegram notify က နောက်ကွယ်မှာ
      res.json({
        success: true,
        order: withPublicUrls(order),
        message: 'တင်ပြပြီးပါပြီ — စောင့်ဆိုင်းဆဲ',
      });

      notifyAdminNewPayment(
        { ...row, reference, status: 'pending' },
        req.file.buffer,
        mime,
      ).catch((err) => {
        console.error('[telegram] notifyAdminNewPayment failed', err);
      });
    } catch (e) {
      const code = e.statusCode || 500;
      console.error(e);
      res.status(code).json({ error: e.message });
    }
  },
);

app.get('/api/orders/:id/screenshot', async (req, res) => {
  try {
    const id = parseOrderId(req.params.id);
    const row = await getScreenshotRow(id);
    if (!row?.screenshot_data) return res.status(404).end();
    res.setHeader('Content-Type', row.screenshot_mime || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(row.screenshot_data);
  } catch (e) {
    res.status(500).end();
  }
});

/** Admin — browser URL ခလုတ် (webhook မလိုပါ) */
app.get('/admin/approve/:id', async (req, res) => {
  try {
    const id = parseOrderId(req.params.id);
    if (!verifyAdminAction(id, 'approve', String(req.query.t || ''))) {
      return res.status(403).send(adminResultHtml('Forbidden', 'လင့်ခ် မမှန်ပါ'));
    }
    const result = await approveOrderById(id);
    if (!result.ok) {
      return res.status(404).send(adminResultHtml('Error', result.error || 'Failed'));
    }
    const body = result.already
      ? `Order #${id} — ပြီးသား approve လုပ်ထားပြီး`
      : `Order #${id} ✅ Approved\n\nKey:\n${result.accessUrl}`;
    res.send(adminResultHtml('✅ Approved', body));
  } catch (e) {
    console.error('[admin approve]', e);
    res.status(500).send(adminResultHtml('Error', e.message));
  }
});

app.get('/admin/reject/:id', async (req, res) => {
  try {
    const id = parseOrderId(req.params.id);
    if (!verifyAdminAction(id, 'reject', String(req.query.t || ''))) {
      return res.status(403).send(adminResultHtml('Forbidden', 'လင့်ခ် မမှန်ပါ'));
    }
    const result = await rejectOrderById(id);
    if (!result.ok) {
      return res.status(404).send(adminResultHtml('Error', result.error || 'Failed'));
    }
    res.send(adminResultHtml('❌ Rejected', `Order #${id} — ငွေလွှဲ မအတည်ပြုပါ`));
  } catch (e) {
    console.error('[admin reject]', e);
    res.status(500).send(adminResultHtml('Error', e.message));
  }
});

app.post('/telegram/webhook', async (req, res) => {
  res.json({ ok: true });
  try {
    if (req.body?.callback_query) {
      console.log('[webhook] callback_query', req.body.callback_query.data);
    }
    await handleTelegramUpdate(req.body);
  } catch (e) {
    console.error('[webhook]', e);
  }
});

function withPublicUrls(order) {
  if (!order) return order;
  const base = config.publicApiUrl.replace(/\/$/, '');
  if (order.screenshotUrl?.startsWith('/') && base) {
    return { ...order, screenshotUrl: `${base}${order.screenshotUrl}` };
  }
  return order;
}

async function main() {
  await initDb();
  app.listen(config.port, config.host, () => {
    console.log(`[api] listening on http://${config.host}:${config.port}`);
    initTelegramTransport().catch((e) => {
      console.error('[telegram] init failed', e);
    });
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
