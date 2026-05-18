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
  initDb,
  saveScreenshot,
  updateOrder,
} from './db.js';
import { handleTelegramUpdate, notifyAdminNewPayment, setupWebhook } from './telegram.js';

assertConfig();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const app = express();
app.use(express.json({ limit: '2mb' }));

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (!config.corsOrigins.length) return cb(null, true);
    if (config.corsOrigins.includes(origin) || config.corsOrigins.includes('*')) {
      return cb(null, true);
    }
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
};
app.use(cors(corsOptions));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'u5-vpn-api' });
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
    const id = Number(req.params.id);
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
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/orders/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const telegramUserId = String(req.body?.telegramUserId || '').trim();
    if (!telegramUserId) {
      return res.status(400).json({ error: 'telegramUserId required' });
    }
    const order = await updateOrder(id, telegramUserId, req.body?.patch || req.body);
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json({ order: withPublicUrls(order) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/** Screenshot + reference → DB, Telegram admin (photo + Approve/Reject) */
app.post(
  '/api/orders/:id/submit-payment',
  upload.single('screenshot'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const telegramUserId = String(req.body.telegramUserId || '').trim();
      const reference = String(req.body.reference || '').trim();

      if (!telegramUserId || !reference) {
        return res.status(400).json({ error: 'telegramUserId and reference required' });
      }
      if (!req.file?.buffer?.length) {
        return res.status(400).json({ error: 'screenshot file required' });
      }

      await updateOrder(id, telegramUserId, { reference });
      const mime = req.file.mimetype || 'image/jpeg';
      const order = await saveScreenshot(id, mime, req.file.buffer);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      const row = await getOrderByIdAdmin(id);
      await notifyAdminNewPayment(
        { ...row, reference, status: 'verified' },
        req.file.buffer,
        mime,
      );

      res.json({
        success: true,
        order: withPublicUrls(order),
        message: 'Admin ဆီ Telegram သို့ ပို့ပြီးပါပြီ — အတည်ပြုချိန် စောင့်ပါ',
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  },
);

app.get('/api/orders/:id/screenshot', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await getScreenshotRow(id);
    if (!row?.screenshot_data) return res.status(404).end();
    res.setHeader('Content-Type', row.screenshot_mime || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(row.screenshot_data);
  } catch (e) {
    res.status(500).end();
  }
});

app.post('/telegram/webhook', async (req, res) => {
  try {
    await handleTelegramUpdate(req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error('[webhook]', e);
    res.json({ ok: true });
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
  await setupWebhook();
  app.listen(config.port, () => {
    console.log(`[api] listening on port ${config.port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
