import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool;

export function getPool() {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }
  if (!pool) {
    pool = new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: /localhost|127\.0\.0\.1/i.test(config.databaseUrl)
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function initDb() {
  const sqlDir = path.join(__dirname, '..', 'sql');
  const schema = fs.readFileSync(path.join(sqlDir, 'schema.sql'), 'utf8');
  await getPool().query(schema);
  for (const name of ['migration_vpn_subscription.sql', 'migration_platform_label.sql']) {
    const migrationPath = path.join(sqlDir, name);
    if (fs.existsSync(migrationPath)) {
      const migration = fs.readFileSync(migrationPath, 'utf8');
      await getPool().query(migration);
    }
  }
}

export function rowToOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    telegramUserId: row.telegram_user_id,
    regionId: row.region_id,
    regionName: row.region_name,
    platformLabel: row.platform_label ?? undefined,
    packageId: row.package_id,
    packageLabel: row.package_label,
    packageMonths: row.package_months,
    amount: row.amount,
    paymentMethodId: row.payment_method_id ?? undefined,
    paymentMethodName: row.payment_method_name ?? undefined,
    status: row.status,
    reference: row.reference ?? undefined,
    screenshotUrl: row.screenshot_data
      ? `/api/orders/${row.id}/screenshot`
      : undefined,
    accessUrl: row.access_url ?? undefined,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : undefined,
    orderType: row.order_type ?? 'purchase',
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function createOrder(data) {
  const r = await getPool().query(
    `INSERT INTO orders (
      telegram_user_id, region_id, region_name, platform_label, package_id, package_label,
      package_months, amount, payment_method_id, payment_method_name, status, order_type
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *`,
    [
      data.telegramUserId,
      data.regionId,
      data.regionName,
      data.platformLabel ?? null,
      data.packageId,
      data.packageLabel,
      data.packageMonths ?? 1,
      data.amount,
      data.paymentMethodId ?? null,
      data.paymentMethodName ?? null,
      data.status ?? 'pending',
      data.orderType ?? 'purchase',
    ],
  );
  return rowToOrder(r.rows[0]);
}

export async function updateOrder(id, telegramUserId, patch) {
  const map = {
    status: 'status',
    reference: 'reference',
    paymentMethodId: 'payment_method_id',
    paymentMethodName: 'payment_method_name',
    accessUrl: 'access_url',
    expiresAt: 'expires_at',
  };

  const fields = [];
  const values = [];
  let i = 1;

  for (const [key, col] of Object.entries(map)) {
    if (patch[key] !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(patch[key]);
    }
  }

  if (!fields.length) {
    return getOrderById(id, telegramUserId);
  }

  fields.push('updated_at = NOW()');
  const idParam = i++;
  const userParam = i;
  values.push(id, telegramUserId);

  const r = await getPool().query(
    `UPDATE orders SET ${fields.join(', ')}
     WHERE id = $${idParam} AND telegram_user_id = $${userParam}
     RETURNING *`,
    values,
  );
  return rowToOrder(r.rows[0]);
}

export async function saveScreenshot(id, mime, buffer) {
  const r = await getPool().query(
    `UPDATE orders SET
      screenshot_mime = $1,
      screenshot_data = $2,
      updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [mime, buffer, id],
  );
  return rowToOrder(r.rows[0]);
}

export async function getOrderById(id, telegramUserId) {
  const r = await getPool().query(
    `SELECT * FROM orders WHERE id = $1 AND telegram_user_id = $2`,
    [id, telegramUserId],
  );
  return rowToOrder(r.rows[0]);
}

export async function getOrderByIdAdmin(id) {
  const r = await getPool().query(`SELECT * FROM orders WHERE id = $1`, [id]);
  return r.rows[0] ?? null;
}

export async function getOrdersByUser(telegramUserId) {
  const r = await getPool().query(
    `SELECT * FROM orders WHERE telegram_user_id = $1 ORDER BY id DESC`,
    [telegramUserId],
  );
  return r.rows.map(rowToOrder);
}

export async function completeOrder(id, accessUrl, expiresAt, vpnMeta = {}) {
  const r = await getPool().query(
    `UPDATE orders SET
      status = 'completed',
      access_url = $1,
      expires_at = $2,
      vpn_config_token = $4,
      vpn_nodes = $5,
      updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [
      accessUrl,
      expiresAt,
      id,
      vpnMeta.configToken ?? null,
      vpnMeta.nodes ? JSON.stringify(vpnMeta.nodes) : null,
    ],
  );
  return rowToOrder(r.rows[0]);
}

/** Public ssconf JSON — token from ssconf URL path. */
export async function getVpnSubscriptionByToken(token) {
  const r = await getPool().query(
    `SELECT id, status, expires_at, vpn_nodes
     FROM orders
     WHERE vpn_config_token = $1`,
    [token],
  );
  const row = r.rows[0];
  if (!row) return null;
  if (row.status !== 'completed') return { forbidden: true };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { expired: true };
  }
  let nodes = row.vpn_nodes;
  if (typeof nodes === 'string') {
    try {
      nodes = JSON.parse(nodes);
    } catch {
      nodes = null;
    }
  }
  if (!Array.isArray(nodes) || !nodes.length) return { empty: true };
  return { orderId: row.id, nodes };
}

export async function rejectOrder(id) {
  const r = await getPool().query(
    `UPDATE orders SET status = 'rejected', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id],
  );
  return rowToOrder(r.rows[0]);
}

export async function getScreenshotRow(id) {
  const r = await getPool().query(
    `SELECT screenshot_mime, screenshot_data FROM orders WHERE id = $1`,
    [id],
  );
  return r.rows[0] ?? null;
}
