-- Device label (Android, iPhone / iPad, Windows, …)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_label TEXT;
