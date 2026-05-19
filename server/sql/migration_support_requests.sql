-- User reports key connection issue → admin Approve (rotate key) / Reject

CREATE TABLE IF NOT EXISTS support_requests (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL,
  telegram_user_id TEXT NOT NULL,
  issue_type TEXT NOT NULL DEFAULT 'connection',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_pending ON support_requests (status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_support_order ON support_requests (order_id);
