-- Run once on Render PostgreSQL (or auto via initDb on startup)

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  telegram_user_id TEXT NOT NULL,
  region_id TEXT NOT NULL,
  region_name TEXT NOT NULL,
  package_id TEXT NOT NULL,
  package_label TEXT NOT NULL,
  package_months INT NOT NULL DEFAULT 1,
  amount INT NOT NULL,
  payment_method_id TEXT,
  payment_method_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reference TEXT,
  screenshot_mime TEXT,
  screenshot_data BYTEA,
  access_url TEXT,
  expires_at TIMESTAMPTZ,
  order_type TEXT DEFAULT 'purchase',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_telegram ON orders (telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
