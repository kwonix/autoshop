// admin.js - Основная логика админ-панели
class AdminApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentFilters = {};
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        await this.checkAuth();
        this.setupNavigation();
        this.setupEventListeners();
        await this.loadDashboard();
        this.updateCurrentDate();
        
        this.isInitialized = true;
    }

    async checkAuth() {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            console.log('No admin token found, redirecting to login');
            this.redirectToLogin();
            return;
        }

        try {
            // Проверяем валидность токена через API
            const response = await fetch('/api/admin/dashboard', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.log('Token invalid, logging out');
                    this.logout();
                }
                throw new Error('Invalid token');
            }

            // Токен валиден, загружаем данные пользователя
            const adminData = JSON.parse(localStorage.getItem('admin_data'));
            if (adminData && document.getElementById('admin-username')) {
                document.getElementById('admin-username').textContent = adminData.name;
            }

        } catch (error) {
            console.error('Auth check failed:', error);
            this.logout();
        }
    }

    redirectToLogin() {
        // Используем replace чтобы избежать истории навигации
        window.location.replace('admin-login.html');
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
        // Выход из системы - проверяем что элемент существует
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        } else {
            console.warn('Logout button not found');
        }

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
        
        const activeItem = document.querySelector(`[data-page="${page}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
        
        // Скрываем все страницы
        document.querySelectorAll('.admin-page').forEach(pageEl => {
            pageEl.classList.remove('active');
        });
        
        // Показываем нужную страницу
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // Обновляем заголовок
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = this.getPageTitle(page);
        }
        
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
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('ru-RU', options);
        }
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
        try {
            const stats = await this.apiCall('/dashboard');
            this.renderDashboard(stats);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    renderDashboard(stats) {
        const statsGrid = document.getElementById('dashboard-stats');
        if (!statsGrid) {
            console.warn('Dashboard stats grid not found');
            return;
        }

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

        if (!orders || orders.length === 0) {
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

        if (!products || products.length === 0) {
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
        try {
            const orders = await this.apiCall('/orders');
            this.renderOrders(orders);
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    renderOrders(orders) {
        const tbody = document.getElementById('orders-table-body');
        if (!tbody) return;

        if (!orders || orders.length === 0) {
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
        try {
            const products = await this.apiCall('/products');
            this.renderProducts(products);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    renderProducts(products) {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;

        if (!products || products.length === 0) {
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

    // ... остальные методы остаются такими же, как в предыдущей версии ...

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
        window.location.replace('admin-login.html');
    }
}

// Инициализация админ-панели с проверкой DOM
document.addEventListener('DOMContentLoaded', function() {
    // Ждем полной загрузки DOM перед инициализацией
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.adminApp = new AdminApp();
            window.adminApp.init();
        });
    } else {
        window.adminApp = new AdminApp();
        window.adminApp.init();
    }
});