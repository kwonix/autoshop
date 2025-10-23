-- Additional migrations for AutoGadget
-- This file is for future schema updates after initial deployment

-- Note: Most tables are already created in init.sql
-- This file is kept for future migrations

-- Add any future schema changes here
-- Example:
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS new_field VARCHAR(100);

-- Placeholder for future migrations
DO $$
BEGIN
    RAISE NOTICE 'Migrations script executed successfully!';
END $$;

-- Safe performance indexes: add indexes used by common queries without changing schema
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);

