const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { pool } = require('./config/database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'autogadget_secret_key_2025';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
// Serve admin panel static files at /admin (use admin.html as the index)
app.use('/admin', express.static(path.join(__dirname, '..', 'admin'), { index: 'admin.html' }));

// Fallback for admin SPA routes (if any) to admin.html
app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin', 'admin.html'));
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Неверный токен' });
        }
        req.user = user;
        next();
    });
};

const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err || !user.isAdmin) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }
        req.user = user;
        next();
    });
};

// ==================== PUBLIC ROUTES ====================

// Главная страница
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: '../frontend' });
});

// Получить все товары
app.get('/api/products', async (req, res) => {
    try {
        const { category, search, page = 1, limit = 12 } = req.query;
        let query = `
            SELECT p.*, c.name as category_name, c.slug as category_slug 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.status = 'active'
        `;
        const params = [];
        let paramCount = 0;

        if (category && category !== 'all') {
            paramCount++;
            query += ` AND c.slug = $${paramCount}`;
            params.push(category);
        }

        if (search) {
            paramCount++;
            query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        query += ' ORDER BY p.popular DESC, p.name ASC';

        // Пагинация
        const offset = (page - 1) * limit;
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);
        
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(offset);

        const result = await pool.query(query, params);
        
        // Получаем общее количество для пагинации
        let countQuery = "SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = 'active'";
        const countParams = [];
        
        if (category && category !== 'all') {
            countQuery += ' AND c.slug = $1';
            countParams.push(category);
        }
        
        if (search) {
            countQuery += category && category !== 'all' ? ' AND (p.name ILIKE $2 OR p.description ILIKE $2)' : ' AND (p.name ILIKE $1 OR p.description ILIKE $1)';
            countParams.push(`%${search}%`);
        }
        
        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            products: result.rows,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить популярные товары
app.get('/api/products/popular', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.popular = true AND p.status = 'active' 
            LIMIT 8
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching popular products:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить товар по ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить категории
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categories ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создать заказ
app.post('/api/orders', async (req, res) => {
    try {
        const { customer_name, customer_email, customer_phone, customer_address, items, total_amount } = req.body;
        
        if (!customer_name || !customer_email || !customer_phone || !items || !total_amount) {
            return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
        }

        // Попытка извлечь user_id из заголовка Authorization (если пользователь залогинен)
        let userId = null;
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (token) {
                const payload = jwt.verify(token, JWT_SECRET);
                if (payload && payload.userId) userId = payload.userId;
            }
        } catch (e) {
            // Игнорируем ошибку проверки токена — продолжаем как гость
            console.warn('Order creation: token verify failed or absent');
        }

        // Вставляем user_id, если он известен
        let result;
        if (userId) {
            result = await pool.query(
                `INSERT INTO orders (user_id, customer_name, customer_email, customer_phone, customer_address, items, total_amount) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [userId, customer_name, customer_email, customer_phone, customer_address, JSON.stringify(items), total_amount]
            );
        } else {
            result = await pool.query(
                `INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, items, total_amount) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [customer_name, customer_email, customer_phone, customer_address, JSON.stringify(items), total_amount]
            );
        }

        // Добавляем запись в историю статусов
        await pool.query(
            'INSERT INTO order_status_history (order_id, status, notes) VALUES ($1, $2, $3)',
            [result.rows[0].id, 'new', 'Заказ создан']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Ошибка создания заказа' });
    }
});

// Регистрация пользователя
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, full_name, phone } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        // Проверяем существование пользователя
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        // Хешируем пароль
        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (email, password_hash, full_name, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name',
            [email, passwordHash, full_name, phone]
        );

        res.status(201).json({ 
            message: 'Пользователь успешно зарегистрирован',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Ошибка регистрации' });
    }
});

// Вход пользователя
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

// Получить профиль текущего пользователя
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user && req.user.userId;
        const email = req.user && req.user.email;

        if (!userId && !email) return res.status(400).json({ error: 'Не удалось определить пользователя' });

        const result = userId
            ? await pool.query('SELECT id, email, full_name, phone, address FROM users WHERE id = $1', [userId])
            : await pool.query('SELECT id, email, full_name, phone, address FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Ошибка получения профиля' });
    }
});

// Обновить профиль текущего пользователя
app.patch('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user && req.user.userId;
        const email = req.user && req.user.email;

        if (!userId && !email) return res.status(400).json({ error: 'Не удалось определить пользователя' });

        const { full_name, phone, address } = req.body;

        // Обновляем доступные поля
        const queryParts = [];
        const params = [];
        let idx = 1;

        if (full_name !== undefined) {
            queryParts.push(`full_name = $${idx++}`);
            params.push(full_name);
        }
        if (phone !== undefined) {
            queryParts.push(`phone = $${idx++}`);
            params.push(phone);
        }
        if (address !== undefined) {
            queryParts.push(`address = $${idx++}`);
            params.push(address);
        }

        if (queryParts.length === 0) {
            return res.status(400).json({ error: 'Нет полей для обновления' });
        }

        // Условие WHERE
        let whereClause;
        if (userId) {
            whereClause = `WHERE id = $${idx}`;
            params.push(userId);
        } else {
            whereClause = `WHERE email = $${idx}`;
            params.push(email);
        }

        const updateQuery = `UPDATE users SET ${queryParts.join(', ')}, updated_at = CURRENT_TIMESTAMP ${whereClause} RETURNING id, email, full_name, phone, address`;

        const result = await pool.query(updateQuery, params);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });

        res.json({ message: 'Профиль обновлён', user: result.rows[0] });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Ошибка обновления профиля' });
    }
});

// Отправка сообщения обратной связи
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Имя, email и сообщение обязательны' });
        }

        await pool.query(
            'INSERT INTO contact_messages (name, email, phone, message) VALUES ($1, $2, $3, $4)',
            [name, email, phone, message]
        );

        res.json({ message: 'Сообщение успешно отправлено' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Ошибка отправки сообщения' });
    }
});

// ==================== ADMIN ROUTES ====================

// Вход администратора
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        const result = await pool.query('SELECT * FROM admin_users WHERE email = $1 AND is_active = true', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const admin = result.rows[0];
        const validPassword = await bcrypt.compare(password, admin.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const token = jwt.sign(
            { 
                adminId: admin.id, 
                email: admin.email, 
                role: admin.role,
                isAdmin: true 
            }, 
            JWT_SECRET, 
            { expiresIn: '8h' }
        );

        res.json({
            token,
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Error admin login:', error);
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

// Получить статистику для дашборда
app.get('/api/admin/dashboard', authenticateAdmin, async (req, res) => {
    try {
        const ordersCount = await pool.query('SELECT COUNT(*) FROM orders');
        const newOrdersCount = await pool.query('SELECT COUNT(*) FROM orders WHERE status = $1', ['new']);
        const totalRevenue = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE status != $1', ['cancelled']);
        const productsCount = await pool.query('SELECT COUNT(*) FROM products WHERE status = $1', ['active']);
        const messagesCount = await pool.query('SELECT COUNT(*) FROM contact_messages WHERE status = $1', ['new']);
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');

        // Последние заказы
        const recentOrders = await pool.query(`
            SELECT * FROM orders 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        // Популярные товары
        const popularProducts = await pool.query(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.popular = true AND p.status = 'active' 
            LIMIT 5
        `);

        res.json({
            total_orders: parseInt(ordersCount.rows[0].count),
            new_orders: parseInt(newOrdersCount.rows[0].count),
            total_revenue: parseFloat(totalRevenue.rows[0].revenue),
            total_products: parseInt(productsCount.rows[0].count),
            new_messages: parseInt(messagesCount.rows[0].count),
            total_users: parseInt(usersCount.rows[0].count),
            recent_orders: recentOrders.rows,
            popular_products: popularProducts.rows
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Ошибка загрузки статистики' });
    }
});

// Получить заказы с фильтрами
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        let query = 'SELECT * FROM orders';
        const params = [];
        let paramCount = 0;

        if (status && status !== 'all') {
            paramCount++;
            query += ` WHERE status = $${paramCount}`;
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        // Пагинация
        const offset = (page - 1) * limit;
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);
        
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(offset);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Ошибка загрузки заказов' });
    }
});

// Обновить заказ
app.put('/api/admin/orders/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, manager_notes } = req.body;

        const result = await pool.query(
            'UPDATE orders SET status = $1, manager_notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [status, manager_notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        // Добавляем запись в историю статусов
        await pool.query(
            'INSERT INTO order_status_history (order_id, status, notes) VALUES ($1, $2, $3)',
            [id, status, manager_notes || 'Статус обновлен']
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Ошибка обновления заказа' });
    }
});

// Получить товары для админки
app.get('/api/admin/products', authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Ошибка загрузки товаров' });
    }
});

// Создать товар
app.post('/api/admin/products', authenticateAdmin, async (req, res) => {
    try {
        const { name, description, price, category_id, image_url, stock, popular, features } = req.body;
        
        const result = await pool.query(
            `INSERT INTO products (name, description, price, category_id, image_url, stock, popular, features) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [name, description, price, category_id, image_url, stock, popular, JSON.stringify(features)]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Ошибка создания товара' });
    }
});

// Обновить товар
app.put('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, category_id, image_url, stock, popular, features, status } = req.body;

        const result = await pool.query(
            `UPDATE products 
             SET name = $1, description = $2, price = $3, category_id = $4, image_url = $5, 
                 stock = $6, popular = $7, features = $8, status = $9, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $10 RETURNING *`,
            [name, description, price, category_id, image_url, stock, popular, JSON.stringify(features), status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Ошибка обновления товара' });
    }
});

// Удалить товар
app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }

        res.json({ message: 'Товар успешно удален' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Ошибка удаления товара' });
    }
});

// Получить категории для админки
app.get('/api/admin/categories', authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, COUNT(p.id) as product_count 
            FROM categories c 
            LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active' 
            GROUP BY c.id 
            ORDER BY c.name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Ошибка загрузки категорий' });
    }
});

// Создать категорию
app.post('/api/admin/categories', authenticateAdmin, async (req, res) => {
    try {
        const { name, description, slug, image_url } = req.body;
        
        const result = await pool.query(
            'INSERT INTO categories (name, description, slug, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description, slug, image_url]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Ошибка создания категории' });
    }
});

// Получить сообщения
app.get('/api/admin/messages', authenticateAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM contact_messages';
        const params = [];

        if (status && status !== 'all') {
            query += ' WHERE status = $1';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Ошибка загрузки сообщений' });
    }
});

// Обновить сообщение
app.put('/api/admin/messages/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, response } = req.body;

        const result = await pool.query(
            'UPDATE contact_messages SET status = $1, response = $2 WHERE id = $3 RETURNING *',
            [status, response, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Сообщение не найдено' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating message:', error);
        res.status(500).json({ error: 'Ошибка обновления сообщения' });
    }
});

// Получить аналитику
app.get('/api/admin/analytics', authenticateAdmin, async (req, res) => {
    try {
        // Топ товаров по продажам
        const topProducts = await pool.query(`
            SELECT 
                p.name,
                COUNT(o.id) as sales_count,
                SUM(o.total_amount) as revenue
            FROM orders o,
            LATERAL jsonb_array_elements(o.items) AS item
            JOIN products p ON (item->>'id')::int = p.id
            WHERE o.status != 'cancelled'
            GROUP BY p.id, p.name
            ORDER BY sales_count DESC
            LIMIT 10
        `);

        // Продажи по дням за последнюю неделю
        const salesByDay = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as orders_count,
                SUM(total_amount) as revenue
            FROM orders 
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' 
                AND status != 'cancelled'
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        res.json({
            top_products: topProducts.rows,
            sales_by_day: salesByDay.rows
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Ошибка загрузки аналитики' });
    }
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ 
            status: 'OK', 
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            database: 'disconnected',
            error: error.message 
        });
    }
});

// Получить заказы текущего аутентифицированного пользователя
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const email = req.user && req.user.email;
        const userId = req.user && req.user.userId;

        if (!email && !userId) {
            return res.status(400).json({ error: 'Не удалось определить пользователя' });
        }

        let result;
        if (email) {
            result = await pool.query('SELECT * FROM orders WHERE customer_email = $1 ORDER BY created_at DESC', [email]);
        } else {
            // В случае, если в таблице orders будет поле user_id
            result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        }

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ error: 'Ошибка загрузки заказов пользователя' });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`AutoGadget Server running on port ${PORT}`);
    console.log(`API доступен по http://localhost:${PORT}/api`);
    console.log(`Frontend доступен по http://localhost:${PORT}`);
    console.log(`Admin panel доступна по http://localhost:${PORT}/admin`);
});