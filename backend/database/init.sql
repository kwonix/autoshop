-- AutoGadget Database Initialization
-- This script runs automatically when PostgreSQL container starts for the first time

-- Таблица категорий
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL,
    image_url VARCHAR(500),
    meta_title VARCHAR(200),
    meta_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица товаров
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    image_url VARCHAR(500),
    stock INTEGER DEFAULT 0,
    popular BOOLEAN DEFAULT false,
    features JSONB,
    status VARCHAR(20) DEFAULT 'active',
    meta_title VARCHAR(200),
    meta_description TEXT,
    slug VARCHAR(200) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица заказов
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_address TEXT,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'new',
    manager_notes TEXT,
    tracking_number VARCHAR(100),
    items JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица истории статусов заказа
CREATE TABLE IF NOT EXISTS order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица уведомлений
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица администраторов
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'manager',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица обратной связи
CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'new',
    response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица аналитики товаров
CREATE TABLE IF NOT EXISTS product_analytics (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    purchases INTEGER DEFAULT 0,
    added_to_cart INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица рейтингов товаров
CREATE TABLE IF NOT EXISTS product_ratings (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, user_id)
);

-- Таблица избранного
CREATE TABLE IF NOT EXISTS wishlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Таблица просмотров товаров
CREATE TABLE IF NOT EXISTS product_views (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица логов инвентаря
CREATE TABLE IF NOT EXISTS inventory_logs (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    change_amount INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason VARCHAR(100),
    created_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица email шаблонов
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

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_product_ratings_product ON product_ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_user ON product_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_product ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_created ON product_views(created_at);

-- Начальные данные
INSERT INTO categories (name, description, slug, image_url) VALUES
('Автоэлектроника', 'Навигаторы, видеорегистраторы, парктроники', 'electronics', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d'),
('Уход за авто', 'Автокосметика, щетки, чистящие средства', 'care', 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a'),
('Автоаксессуары', 'Чехлы, коврики, органайзеры', 'accessories', 'https://images.unsplash.com/photo-1570733780745-d192c48b8ff3'),
('Безопасность', 'Сигнализации, замки, противоугонные системы', 'safety', 'https://images.unsplash.com/photo-1580273916550-e323be2ae537')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name, description, price, category_id, image_url, stock, popular, features, slug) VALUES
('Видеорегистратор 4K', 'Высококачественная запись с ночным режимом', 5990.00, 1, 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3', 15, true, '["4K разрешение", "Ночной режим", "GPS", "Wi-Fi"]', 'videoregistrator-4k'),
('Автомобильные коврики', 'Влагостойкие коврики с высокими бортами', 3490.00, 3, 'https://images.unsplash.com/photo-1570733780745-d192c48b8ff3', 25, true, '["Влагостойкие", "Высокие борта", "Универсальные"]', 'avtomobilnye-kovriki'),
('Компрессор автомобильный', 'Мощный компрессор для подкачки шин', 2790.00, 3, 'https://images.unsplash.com/photo-1583121274602-3e2820c69888', 18, true, '["Цифровой манометр", "Автоотключение", "LED-подсветка"]', 'kompressor-avtomobilnyy'),
('Навигатор с радар-детектором', 'Умный навигатор с предупреждением о камерах', 8990.00, 1, 'https://images.unsplash.com/photo-1558637845-c8b7ead71a3e', 8, false, '["Радар-детектор", "Обновления онлайн", "Голосовое управление"]', 'navigator-s-radar-detektorom'),
('Полироль для кузова', 'Защитная полироль с эффектом грязеотталкивания', 890.00, 2, 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a', 50, false, '["Защита от УФ", "Грязеотталкивание", "Легкое нанесение"]', 'polirol-dlya-kuzova'),
('Чехлы на сиденья', 'Универсальные чехлы из экокожи', 2490.00, 3, 'https://images.unsplash.com/photo-1503376780353-7e6692767b70', 30, false, '["Экокожа", "Универсальные", "Легкая установка"]', 'chekhly-na-sideniya'),
('Сигнализация с автозапуском', 'Надежная сигнализация с функцией автозапуска', 12990.00, 4, 'https://images.unsplash.com/photo-1580273916550-e323be2ae537', 12, false, '["Автозапуск", "Двусторонняя связь", "Мобильное управление"]', 'signalizatsiya-s-avtozapuskom'),
('Щетки стеклоочистителя', 'Качественные бесшумные щетки', 1290.00, 2, 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d', 40, false, '["Бесшумные", "Универсальные", "Простая установка"]', 'shchetki-stekloochistitelya')
ON CONFLICT (slug) DO NOTHING;

-- Администратор по умолчанию (password: admin123)
-- Hash generated with: bcrypt.hash('admin123', 10)
INSERT INTO admin_users (email, password_hash, name, role) VALUES
('admin@autogadget.ru', '$2a$10$sQcWJezH50iSJFrNYX2/UOaZcLbk60HM9i8wVEHs69Typ3lIadZhW', 'Администратор', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Тестовый пользователь (password: user123)
INSERT INTO users (email, password_hash, full_name, phone) VALUES
('user@example.com', '$2a$10$UtVd.B9obQ5Bd2/uGFUd1eYP6C/xI2kMWNfw7NZYTz0HhmqZ/e4yi', 'Тестовый Пользователь', '+79991234567')
ON CONFLICT (email) DO NOTHING;

-- Email шаблоны по умолчанию
INSERT INTO email_templates (name, subject, content, variables) VALUES 
('order_confirmation', 'Подтверждение заказа #{{order_id}}', '<h1>Спасибо за ваш заказ!</h1><p>Ваш заказ #{{order_id}} успешно оформлен.</p><p>Общая сумма: {{order_total}} руб.</p>', '["order_id", "customer_name", "order_total"]'),
('order_status_update', 'Обновление статуса заказа #{{order_id}}', '<h1>Статус вашего заказа обновлен</h1><p>Заказ #{{order_id}}</p><p>Новый статус: {{status}}</p>', '["order_id", "customer_name", "status"]')
ON CONFLICT DO NOTHING;

-- Завершение инициализации
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully!';
END $$;
