// admin.js - Основная логика админ-панели
class AdminApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentFilters = {};
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupNavigation();
        this.setupEventListeners();
        this.loadDashboard();
        this.updateCurrentDate();
    }

    async checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }

    try {
        // Проверяем валидность токена
        const response = await fetch('/api/admin/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.logout();
                return;
            }
            throw new Error('Invalid token');
        }

        const adminData = JSON.parse(localStorage.getItem('admin_data'));
        if (adminData) {
            document.getElementById('admin-username').textContent = adminData.name;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        this.logout();
    }
}

    setupNavigation() {
        const menuItems = document.querySelectorAll('.admin-menu-item[data-page]');
        
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.navigateTo(page);
            });
        });
    }

    setupEventListeners() {
        // Выход из системы
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Закрытие модальных окон
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModal();
            }
        });

        // Закрытие модальных окон по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    navigateTo(page) {
        // Обновляем активные элементы меню
        document.querySelectorAll('.admin-menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');
        
        // Скрываем все страницы
        document.querySelectorAll('.admin-page').forEach(pageEl => {
            pageEl.classList.remove('active');
        });
        
        // Показываем нужную страницу
        document.getElementById(`${page}-page`).classList.add('active');
        document.getElementById('page-title').textContent = this.getPageTitle(page);
        
        // Загружаем данные для страницы
        this.loadPageData(page);
        
        this.currentPage = page;
    }

    getPageTitle(page) {
        const titles = {
            dashboard: 'Дашборд',
            orders: 'Управление заказами',
            products: 'Управление товарами',
            categories: 'Управление категориями',
            analytics: 'Аналитика продаж',
            messages: 'Обратная связь'
        };
        return titles[page] || 'Админ-панель';
    }

    async loadPageData(page) {
        try {
            switch(page) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'orders':
                    await this.loadOrders();
                    break;
                case 'products':
                    await this.loadProducts();
                    break;
                case 'categories':
                    await this.loadCategories();
                    break;
                case 'analytics':
                    await this.loadAnalytics();
                    break;
                case 'messages':
                    await this.loadMessages();
                    break;
            }
        } catch (error) {
            this.showNotification('Ошибка загрузки данных', 'error');
            console.error(`Error loading ${page}:`, error);
        }
    }

    updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('current-date').textContent = 
            now.toLocaleDateString('ru-RU', options);
    }

    // === API METHODS ===
    async apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('admin_token');
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(`/api/admin${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    throw new Error('Сессия истекла');
                }
                throw new Error(data.error || 'Ошибка сервера');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // === DASHBOARD ===
    async loadDashboard() {
        const stats = await this.apiCall('/dashboard');
        this.renderDashboard(stats);
    }

    renderDashboard(stats) {
        const statsGrid = document.getElementById('dashboard-stats');
        if (!statsGrid) return;

        statsGrid.innerHTML = `
            <div class="stat-card">
                <h3>Всего заказов</h3>
                <div class="value">${stats.total_orders}</div>
                <div class="trend positive">+12% за неделю</div>
            </div>
            <div class="stat-card">
                <h3>Новые заказы</h3>
                <div class="value">${stats.new_orders}</div>
                <div class="trend positive">Требуют обработки</div>
            </div>
            <div class="stat-card">
                <h3>Общая выручка</h3>
                <div class="value">${this.formatPrice(stats.total_revenue)}</div>
                <div class="trend positive">+8% за неделю</div>
            </div>
            <div class="stat-card">
                <h3>Новые сообщения</h3>
                <div class="value">${stats.new_messages}</div>
                <div class="trend">Требуют ответа</div>
            </div>
        `;

        this.renderRecentOrders(stats.recent_orders);
        this.renderPopularProducts(stats.popular_products);
        this.updateMenuBadges(stats);
    }

    renderRecentOrders(orders) {
        const container = document.getElementById('recent-orders-list');
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = '<p class="text-center">Нет recent заказов</p>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="order-item" style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>#${order.id}</strong> - ${order.customer_name}
                        <br>
                        <small>${new Date(order.created_at).toLocaleDateString()}</small>
                    </div>
                    <div style="text-align: right;">
                        <span class="status-badge status-${order.status}">
                            ${this.getStatusText(order.status)}
                        </span>
                        <br>
                        <strong>${this.formatPrice(order.total_amount)}</strong>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderPopularProducts(products) {
        const container = document.getElementById('popular-products-list');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = '<p class="text-center">Нет популярных товаров</p>';
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="product-item" style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${product.image_url}" alt="${product.name}" 
                         style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                    <div style="flex: 1;">
                        <strong>${product.name}</strong>
                        <br>
                        <small>${this.formatPrice(product.price)} • ${product.stock} шт.</small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateMenuBadges(stats) {
        const newOrdersBadge = document.getElementById('new-orders-count');
        const newMessagesBadge = document.getElementById('new-messages-count');
        
        if (newOrdersBadge) newOrdersBadge.textContent = stats.new_orders;
        if (newMessagesBadge) newMessagesBadge.textContent = stats.new_messages;
    }

    // === ORDERS ===
    async loadOrders() {
        const orders = await this.apiCall('/orders');
        this.renderOrders(orders);
    }

    renderOrders(orders) {
        const tbody = document.getElementById('orders-table-body');
        if (!tbody) return;

        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <p>Заказы не найдены</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = orders.map(order => `
            <tr>
                <td><strong>#${order.id}</strong></td>
                <td>
                    <div>${order.customer_name}</div>
                    <small>${order.customer_email}</small>
                    <br>
                    <small>${order.customer_phone}</small>
                </td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td><strong>${this.formatPrice(order.total_amount)}</strong></td>
                <td>
                    <span class="status-badge status-${order.status}">
                        ${this.getStatusText(order.status)}
                    </span>
                </td>
                <td>
                    <button class="btn-action btn-view" onclick="adminApp.viewOrder(${order.id})">
                        👁️ Просмотр
                    </button>
                    <button class="btn-action btn-edit" onclick="adminApp.editOrder(${order.id})">
                        ✏️ Изменить
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async viewOrder(orderId) {
        try {
            const orders = await this.apiCall('/orders');
            const order = orders.find(o => o.id === orderId);
            
            if (!order) {
                this.showNotification('Заказ не найден', 'error');
                return;
            }
            
            this.showOrderModal(order);
        } catch (error) {
            this.showNotification('Ошибка загрузки заказа', 'error');
        }
    }

    showOrderModal(order, isEdit = false) {
        const modalContent = `
            <h2>${isEdit ? 'Редактирование' : 'Просмотр'} заказа #${order.id}</h2>
            
            <div class="form-group">
                <label>Информация о клиенте</label>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                    <p><strong>Имя:</strong> ${order.customer_name}</p>
                    <p><strong>Email:</strong> ${order.customer_email}</p>
                    <p><strong>Телефон:</strong> ${order.customer_phone}</p>
                    <p><strong>Дата заказа:</strong> ${new Date(order.created_at).toLocaleString()}</p>
                </div>
            </div>
            
            <div class="form-group">
                <label>Товары в заказе</label>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                    ${JSON.parse(order.items).map(item => `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                            <span>${item.name}</span>
                            <span>${item.quantity} × ${this.formatPrice(item.price)}</span>
                        </div>
                    `).join('')}
                    <hr>
                    <div style="display: flex; justify-content: space-between; font-weight: bold;">
                        <span>Итого:</span>
                        <span>${this.formatPrice(order.total_amount)}</span>
                    </div>
                </div>
            </div>
            
            ${isEdit ? `
                <div class="form-group">
                    <label for="order-status">Статус заказа</label>
                    <select id="order-status" class="form-control">
                        <option value="new" ${order.status === 'new' ? 'selected' : ''}>Новый</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>В обработке</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Отправлен</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Доставлен</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Отменен</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="manager-notes">Заметки менеджера</label>
                    <textarea id="manager-notes" class="form-control">${order.manager_notes || ''}</textarea>
                </div>
            ` : ''}
        `;
        
        const modalActions = isEdit ? `
            <button class="btn btn-primary" onclick="adminApp.updateOrder(${order.id})">Сохранить изменения</button>
            <button class="btn btn-secondary" onclick="adminApp.closeModal()">Отмена</button>
        ` : `
            <button class="btn btn-primary" onclick="adminApp.editOrder(${order.id})">Редактировать</button>
            <button class="btn btn-secondary" onclick="adminApp.closeModal()">Закрыть</button>
        `;
        
        this.showModal(modalContent, modalActions);
    }

    editOrder(orderId) {
        this.closeModal();
        setTimeout(() => {
            this.viewOrder(orderId, true);
        }, 300);
    }

    async updateOrder(orderId) {
        const status = document.getElementById('order-status').value;
        const notes = document.getElementById('manager-notes').value;

        try {
            await this.apiCall(`/orders/${orderId}`, {
                method: 'PUT',
                body: { status, manager_notes: notes }
            });

            this.closeModal();
            this.loadOrders();
            this.showNotification('Заказ успешно обновлен');
        } catch (error) {
            this.showNotification('Ошибка обновления заказа', 'error');
        }
    }

    // === PRODUCTS ===
    async loadProducts() {
        const products = await this.apiCall('/products');
        this.renderProducts(products);
    }

    renderProducts(products) {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;

        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <p>Товары не найдены</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = products.map(product => `
            <tr>
                <td>${product.id}</td>
                <td>
                    <img src="${product.image_url}" alt="${product.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                </td>
                <td>
                    <strong>${product.name}</strong>
                    <br>
                    <small>${product.description}</small>
                </td>
                <td>${product.category_name}</td>
                <td><strong>${this.formatPrice(product.price)}</strong></td>
                <td>${product.stock} шт.</td>
                <td>
                    <span class="status-badge ${product.status === 'active' ? 'status-delivered' : 'status-cancelled'}">
                        ${product.status === 'active' ? 'Активен' : 'Неактивен'}
                    </span>
                </td>
                <td>
                    <button class="btn-action btn-edit" onclick="adminApp.editProduct(${product.id})">
                        ✏️
                    </button>
                    <button class="btn-action btn-delete" onclick="adminApp.deleteProduct(${product.id})">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join('');
    }

    showProductModal(product = null) {
        const isEdit = !!product;
        
        const modalContent = `
            <h2>${isEdit ? 'Редактирование' : 'Добавление'} товара</h2>
            
            <form id="product-form">
                <div class="form-group">
                    <label for="product-name">Название товара *</label>
                    <input type="text" id="product-name" value="${product?.name || ''}" required>
                </div>
                
                <div class="form-group">
                    <label for="product-description">Описание *</label>
                    <textarea id="product-description" required>${product?.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="product-category">Категория *</label>
                    <select id="product-category" required>
                        <option value="">Выберите категорию</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="product-price">Цена (₽) *</label>
                    <input type="number" id="product-price" value="${product?.price || ''}" step="0.01" min="0" required>
                </div>
                
                <div class="form-group">
                    <label for="product-stock">Количество на складе *</label>
                    <input type="number" id="product-stock" value="${product?.stock || ''}" min="0" required>
                </div>
                
                <div class="form-group">
                    <label for="product-image">URL изображения</label>
                    <input type="url" id="product-image" value="${product?.image_url || ''}">
                </div>
                
                <div class="form-group">
                    <label for="product-features">Характеристики (каждая с новой строки)</label>
                    <textarea id="product-features">${product?.features ? JSON.parse(product.features).join('\n') : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="product-popular" ${product?.popular ? 'checked' : ''}>
                        Популярный товар
                    </label>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="product-active" ${!product || product.status === 'active' ? 'checked' : ''}>
                        Активный товар
                    </label>
                </div>
            </form>
        `;
        
        const modalActions = `
            <button class="btn btn-primary" onclick="adminApp.${isEdit ? 'update' : 'create'}Product(${product?.id || ''})">
                ${isEdit ? 'Сохранить' : 'Создать'}
            </button>
            <button class="btn btn-secondary" onclick="adminApp.closeModal()">Отмена</button>
        `;
        
        this.showModal(modalContent, modalActions);
        this.loadCategoriesForSelect();
    }

    async loadCategoriesForSelect() {
        try {
            const categories = await this.apiCall('/categories');
            const select = document.getElementById('product-category');
            
            select.innerHTML = '<option value="">Выберите категорию</option>' +
                categories.map(cat => 
                    `<option value="${cat.id}">${cat.name}</option>`
                ).join('');
        } catch (error) {
            console.error('Error loading categories for select:', error);
        }
    }

    async createProduct() {
        const formData = this.getProductFormData();
        
        try {
            await this.apiCall('/products', {
                method: 'POST',
                body: formData
            });

            this.closeModal();
            this.loadProducts();
            this.showNotification('Товар успешно создан');
        } catch (error) {
            this.showNotification('Ошибка создания товара', 'error');
        }
    }

    async updateProduct(productId) {
        const formData = this.getProductFormData();
        
        try {
            await this.apiCall(`/products/${productId}`, {
                method: 'PUT',
                body: formData
            });

            this.closeModal();
            this.loadProducts();
            this.showNotification('Товар успешно обновлен');
        } catch (error) {
            this.showNotification('Ошибка обновления товара', 'error');
        }
    }

    getProductFormData() {
        const features = document.getElementById('product-features').value
            .split('\n')
            .filter(f => f.trim())
            .map(f => f.trim());
            
        return {
            name: document.getElementById('product-name').value,
            description: document.getElementById('product-description').value,
            category_id: parseInt(document.getElementById('product-category').value),
            price: parseFloat(document.getElementById('product-price').value),
            stock: parseInt(document.getElementById('product-stock').value),
            image_url: document.getElementById('product-image').value,
            features: features,
            popular: document.getElementById('product-popular').checked,
            status: document.getElementById('product-active').checked ? 'active' : 'inactive'
        };
    }

    async editProduct(productId) {
        try {
            const products = await this.apiCall('/products');
            const product = products.find(p => p.id === productId);
            
            if (product) {
                this.showProductModal(product);
            }
        } catch (error) {
            this.showNotification('Ошибка загрузки товара', 'error');
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Вы уверены, что хотите удалить этот товар?')) {
            return;
        }

        try {
            await this.apiCall(`/products/${productId}`, {
                method: 'DELETE'
            });

            this.loadProducts();
            this.showNotification('Товар успешно удален');
        } catch (error) {
            this.showNotification('Ошибка удаления товара', 'error');
        }
    }

    // === CATEGORIES ===
    async loadCategories() {
        const categories = await this.apiCall('/categories');
        this.renderCategories(categories);
    }

    renderCategories(categories) {
        const container = document.getElementById('categories-grid');
        if (!container) return;

        if (categories.length === 0) {
            container.innerHTML = '<p class="text-center">Категории не найдены</p>';
            return;
        }

        container.innerHTML = categories.map(category => `
            <div class="category-card">
                <div class="category-header">
                    <div class="category-name">${category.name}</div>
                    <div>
                        <button class="btn-action btn-edit" onclick="adminApp.editCategory(${category.id})">
                            ✏️
                        </button>
                    </div>
                </div>
                <p style="color: #666; margin-bottom: 15px;">${category.description}</p>
                <div class="category-stats">
                    <div class="stat-item">
                        <div class="stat-value">${category.product_count}</div>
                        <div class="stat-label">Товаров</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${category.total_sales || 0}</div>
                        <div class="stat-label">Продаж</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // === ANALYTICS ===
    async loadAnalytics() {
        const period = document.getElementById('analytics-period')?.value || 'week';
        const analytics = await this.apiCall(`/analytics?period=${period}`);
        this.renderAnalytics(analytics);
    }

    renderAnalytics(analytics) {
        this.renderTopProducts(analytics.top_products);
        this.renderAnalyticsTable(analytics.top_products);
    }

    renderTopProducts(products) {
        const container = document.getElementById('top-products-list');
        if (!container) return;

        container.innerHTML = products.map((product, index) => `
            <div style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${index + 1}. ${product.name}</strong>
                        <br>
                        <small>${product.sales_count} продаж</small>
                    </div>
                    <div style="text-align: right;">
                        <strong>${this.formatPrice(product.revenue)}</strong>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderAnalyticsTable(products) {
        const tbody = document.getElementById('analytics-table-body');
        if (!tbody) return;

        tbody.innerHTML = products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.sales_count}</td>
                <td>${this.formatPrice(product.revenue)}</td>
                <td>⭐ 4.8</td>
            </tr>
        `).join('');
    }

    // === MESSAGES ===
    async loadMessages() {
        const messages = await this.apiCall('/messages');
        this.renderMessages(messages);
    }

    renderMessages(messages) {
        const container = document.getElementById('messages-list');
        if (!container) return;

        if (messages.length === 0) {
            container.innerHTML = '<p class="text-center">Сообщения не найдены</p>';
            return;
        }

        container.innerHTML = messages.map(message => `
            <div class="message-card ${message.status === 'new' ? 'unread' : ''}" 
                 onclick="adminApp.viewMessage(${message.id})">
                <div class="message-header">
                    <div class="message-sender">${message.name}</div>
                    <div class="message-date">
                        ${new Date(message.created_at).toLocaleDateString()}
                    </div>
                </div>
                <div class="message-preview">${message.message}</div>
                <div>
                    <span class="message-status">${message.status === 'new' ? 'Новое' : 'Обработано'}</span>
                    <small>${message.email}</small>
                </div>
            </div>
        `).join('');
    }

    async viewMessage(messageId) {
        try {
            const messages = await this.apiCall('/messages');
            const message = messages.find(m => m.id === messageId);
            
            if (!message) {
                this.showNotification('Сообщение не найдено', 'error');
                return;
            }
            
            this.showMessageModal(message);
        } catch (error) {
            this.showNotification('Ошибка загрузки сообщения', 'error');
        }
    }

    showMessageModal(message) {
        const modalContent = `
            <h2>Сообщение от ${message.name}</h2>
            
            <div class="form-group">
                <label>Контактная информация</label>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                    <p><strong>Имя:</strong> ${message.name}</p>
                    <p><strong>Email:</strong> ${message.email}</p>
                    <p><strong>Телефон:</strong> ${message.phone || 'Не указан'}</p>
                    <p><strong>Дата:</strong> ${new Date(message.created_at).toLocaleString()}</p>
                </div>
            </div>
            
            <div class="form-group">
                <label>Сообщение</label>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; min-height: 100px;">
                    ${message.message}
                </div>
            </div>
            
            <div class="form-group">
                <label for="message-response">Ответ</label>
                <textarea id="message-response" placeholder="Введите ответ клиенту...">${message.response || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label for="message-status">Статус</label>
                <select id="message-status">
                    <option value="new" ${message.status === 'new' ? 'selected' : ''}>Новое</option>
                    <option value="processed" ${message.status === 'processed' ? 'selected' : ''}>Обработано</option>
                </select>
            </div>
        `;
        
        const modalActions = `
            <button class="btn btn-primary" onclick="adminApp.updateMessage(${message.id})">Сохранить</button>
            <button class="btn btn-secondary" onclick="adminApp.closeModal()">Закрыть</button>
        `;
        
        this.showModal(modalContent, modalActions);
    }

    async updateMessage(messageId) {
        const status = document.getElementById('message-status').value;
        const response = document.getElementById('message-response').value;
        
        try {
            await this.apiCall(`/messages/${messageId}`, {
                method: 'PUT',
                body: { status, response }
            });

            this.closeModal();
            this.loadMessages();
            this.showNotification('Сообщение обработано');
        } catch (error) {
            this.showNotification('Ошибка обработки сообщения', 'error');
        }
    }

    // === UTILITY METHODS ===
    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    }

    getStatusText(status) {
        const statuses = {
            new: 'Новый',
            processing: 'В обработке',
            shipped: 'Отправлен',
            delivered: 'Доставлен',
            cancelled: 'Отменен'
        };
        return statuses[status] || status;
    }

    showModal(content, actions = '') {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'block';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            ${content}
            <div class="modal-actions">
                ${actions}
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        this.currentModal = overlay;
    }

    closeModal() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
        }
    }

    showNotification(message, type = 'success') {
        const container = document.getElementById('notifications-container') || this.createNotificationsContainer();
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    createNotificationsContainer() {
        const container = document.createElement('div');
        container.id = 'notifications-container';
        container.className = 'notifications-container';
        document.body.appendChild(container);
        return container;
    }

    logout() {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_data');
        window.location.href = 'admin-login.html';
    }
}

// Инициализация админ-панели
document.addEventListener('DOMContentLoaded', function() {
    window.adminApp = new AdminApp();
});