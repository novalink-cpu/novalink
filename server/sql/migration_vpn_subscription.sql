-- ssconf subscription (run on startup after schema.sql)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS vpn_config_token TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vpn_nodes JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_vpn_config_token
  ON orders (vpn_config_token)
  WHERE vpn_config_token IS NOT NULL;
