-- VPN key lifecycle: renew parent link + Outline revoke tracking

ALTER TABLE orders ADD COLUMN IF NOT EXISTS renew_parent_order_id INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vpn_keys_revoked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_expiry_revoke
  ON orders (expires_at)
  WHERE status = 'completed' AND vpn_keys_revoked_at IS NULL;
