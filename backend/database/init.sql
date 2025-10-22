-- Создание базы данных и пользователя
CREATE DATABASE autoshop;
CREATE USER autoshop_user WITH PASSWORD 'autoshop_password_2024';
GRANT ALL PRIVILEGES ON DATABASE autoshop TO autoshop_user;

-- Подключение к базе autoshop
\c autoshop;

-- Таблица категорий
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица товаров
CREATE TABLE products (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица пользователей
CREATE TABLE users (
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
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_address TEXT,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'new',
    manager_notes TEXT,
    items JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица истории статусов заказа
CREATE TABLE order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    status VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица уведомлений
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    order_id INTEGER REFERENCES orders(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица администраторов
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'manager',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица обратной связи
CREATE TABLE contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'new',
    response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица аналитики
CREATE TABLE product_analytics (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    views INTEGER DEFAULT 0,
    purchases INTEGER DEFAULT 0,
    added_to_cart INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для производительности
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_admin_users_email ON admin_users(email);

-- Начальные данные
INSERT INTO categories (name, description, slug, image_url) VALUES
('Автоэлектроника', 'Навигаторы, видеорегистраторы, парктроники', 'electronics', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d'),
('Уход за авто', 'Автокосметика, щетки, чистящие средства', 'care', 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a'),
('Автоаксессуары', 'Чехлы, коврики, органайзеры', 'accessories', 'https://images.unsplash.com/photo-1570733780745-d192c48b8ff3'),
('Безопасность', 'Сигнализации, замки, противоугонные системы', 'safety', 'https://images.unsplash.com/photo-1580273916550-e323be2ae537');

INSERT INTO products (name, description, price, category_id, image_url, stock, popular, features) VALUES
('Видеорегистратор 4K', 'Высококачественная запись с ночным режимом', 5990.00, 1, 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3', 15, true, '["4K разрешение", "Ночной режим", "GPS", "Wi-Fi"]'),
('Автомобильные коврики', 'Влагостойкие коврики с высокими бортами', 3490.00, 3, 'https://images.unsplash.com/photo-1570733780745-d192c48b8ff3', 25, true, '["Влагостойкие", "Высокие борта", "Универсальные"]'),
('Компрессор автомобильный', 'Мощный компрессор для подкачки шин', 2790.00, 3, 'https://images.unsplash.com/photo-1583121274602-3e2820c69888', 18, true, '["Цифровой манометр", "Автоотключение", "LED-подсветка"]'),
('Навигатор с радар-детектором', 'Умный навигатор с предупреждением о камерах', 8990.00, 1, 'https://images.unsplash.com/photo-1558637845-c8b7ead71a3e', 8, false, '["Радар-детектор", "Обновления онлайн", "Голосовое управление"]'),
('Полироль для кузова', 'Защитная полироль с эффектом грязеотталкивания', 890.00, 2, 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a', 50, false, '["Защита от УФ", "Грязеотталкивание", "Легкое нанесение"]'),
('Чехлы на сиденья', 'Универсальные чехлы из экокожи', 2490.00, 3, 'https://images.unsplash.com/photo-1503376780353-7e6692767b70', 30, false, '["Экокожа", "Универсальные", "Легкая установка"]'),
('Сигнализация с автозапуском', 'Надежная сигнализация с функцией автозапуска', 12990.00, 4, 'https://images.unsplash.com/photo-1580273916550-e323be2ae537', 12, false, '["Автозапуск", "Двусторонняя связь", "Мобильное управление"]'),
('Щетки стеклоочистителя', 'Качественные бесшумные щетки', 1290.00, 2, 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d', 40, false, '["Бесшумные", "Универсальные", "Простая установка"]');

-- Администратор по умолчанию
INSERT INTO admin_users (email, password_hash, name, role) VALUES 
('admin@autogadget.ru', '$2b$10$8S7AhNp.9y4p5YV5Q2qZVuG6KjJ8hL1mR5Xp3vVd4rT7wN1sZzOa', 'Администратор', 'admin');

-- Тестовый пользователь
INSERT INTO users (email, password_hash, full_name, phone) VALUES 
('user@example.com', '$2b$10$8S7AhNp.9y4p5YV5Q2qZVuG6KjJ8hL1mR5Xp3vVd4rT7wN1sZzOa', 'Тестовый Пользователь', '+79991234567');

-- Тестовый заказ
INSERT INTO orders (customer_name, customer_email, customer_phone, total_amount, status, items) VALUES 
('Иван Иванов', 'ivan@example.com', '+79991234567', 9480.00, 'new', 
'[{"id": 1, "name": "Видеорегистратор 4K", "price": 5990, "quantity": 1, "image": "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3"}, 
{"id": 3, "name": "Компрессор автомобильный", "price": 2790, "quantity": 1, "image": "https://images.unsplash.com/photo-1583121274602-3e2820c69888"}]');