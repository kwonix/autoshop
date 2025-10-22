-- Additional migrations for future updates

-- Add product ratings table
CREATE TABLE IF NOT EXISTS product_ratings (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    user_id INTEGER REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, user_id)
);

-- Add wishlist table
CREATE TABLE IF NOT EXISTS wishlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Add product views tracking
CREATE TABLE IF NOT EXISTS product_views (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_ratings_product ON product_ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_user ON product_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_product ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_created ON product_views(created_at);

-- Add order tracking number
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_number);

-- Add product SEO fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title VARCHAR(200);
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug VARCHAR(200) UNIQUE;

-- Update existing products with slugs
UPDATE products SET slug = LOWER(REPLACE(REPLACE(name, ' ', '-'), '/', '-')) WHERE slug IS NULL;

-- Create slugs for categories if not exists
ALTER TABLE categories ADD COLUMN IF NOT EXISTS meta_title VARCHAR(200);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Add inventory management
CREATE TABLE IF NOT EXISTS inventory_logs (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    change_amount INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason VARCHAR(100),
    created_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add email templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default email templates
INSERT INTO email_templates (name, subject, content, variables) VALUES 
('order_confirmation', 'Подтверждение заказа #{{order_id}}', '<h1>Спасибо за ваш заказ!</h1><p>Ваш заказ #{{order_id}} успешно оформлен.</p>', '["order_id", "customer_name", "order_total"]'),
('order_status_update', 'Обновление статуса заказа #{{order_id}}', '<h1>Статус вашего заказа обновлен</h1><p>Статус заказа #{{order_id}}: {{status}}</p>', '["order_id", "customer_name", "status"]');