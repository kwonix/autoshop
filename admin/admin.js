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

    checkAuth() {
        const token = localStorage.getItem('admin_token');
        if (!token || token === 'null' || token === 'undefined') {
            window.location.href = 'admin-login.html';
            return;
        }

        try {
            const adminData = JSON.parse(localStorage.getItem('admin_data'));
            if (adminData) {
                document.getElementById('admin-username').textContent = adminData.name;
            }
        } catch (error) {
            console.error('Error parsing admin data:', error);
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

            // Clone response before reading to avoid "body stream already read" error
            const responseClone = response.clone();
            
            // Try to parse JSON, but fall back to text for non-JSON responses
            let data;
            try {
                data = await response.json();
            } catch (parseErr) {
                data = await responseClone.text();
            }

            if (!response.ok) {
                // If unauthorized or forbidden, clear local auth and redirect to login
                if (response.status === 401 || response.status === 403) {
                    const serverMessage = (data && typeof data === 'object' && data.error) ? data.error : String(data || 'Доступ запрещен');
                    console.error('API call unauthorized/forbidden', { endpoint, status: response.status, response: data });
                    this.showNotification(serverMessage, 'error');
                    this.logout();
                    const err = new Error(serverMessage);
                    err.status = response.status;
                    err.response = data;
                    throw err;
                }

                const serverMessage = (data && typeof data === 'object' && data.error) ? data.error : String(data || 'Ошибка сервера');
                const err = new Error(serverMessage);
                err.status = response.status;
                err.response = data;
                console.error('API call failed', { endpoint, status: response.status, response: data });
                throw err;
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

    // Render order items safely (accepts JSON string or already-parsed array)
    renderOrderItems(items) {
        let parsed = [];
        try {
            if (!items) return '';
            if (typeof items === 'string') {
                parsed = JSON.parse(items);
            } else if (Array.isArray(items)) {
                parsed = items;
            } else if (typeof items === 'object') {
                // Sometimes pg returns jsonb as object
                parsed = items;
            }
        } catch (e) {
            console.error('Failed to parse order items:', e);
            return '<div class="text-danger">Невозможно отобразить товары в заказе</div>';
        }

        return parsed.map(item => `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                            <span>${item.name}</span>
                            <span>${item.quantity} × ${this.formatPrice(item.price)}</span>
                        </div>
                    `).join('');
    }

    async viewOrder(orderId, isEdit = false) {
        try {
            const orders = await this.apiCall('/orders');
            const order = orders.find(o => o.id == orderId); // Use == for type coercion

            if (!order) {
                this.showNotification('Заказ не найден', 'error');
                return;
            }

            this.showOrderModal(order, isEdit);
        } catch (error) {
            console.error('viewOrder error:', error);
            const msg = error && error.message ? error.message : 'Ошибка загрузки заказа';
            this.showNotification(msg, 'error');
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
                <label>Адрес доставки</label>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                    <p>${order.customer_address || '<em style="color: #999;">Не указан</em>'}</p>
                </div>
            </div>
            
            ${order.customer_comment ? `
            <div class="form-group">
                <label>Комментарий клиента</label>
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; font-style: italic;">${order.customer_comment}</p>
                </div>
            </div>
            ` : ''}
            
            <div class="form-group">
                <label>Товары в заказе</label>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                    ${this.renderOrderItems(order.items)}
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
            <button class="btn btn-danger" onclick="adminApp.deleteOrder(${order.id})" style="margin-left: auto;">Удалить заказ</button>
            <button class="btn btn-secondary" onclick="adminApp.closeModal()">Отмена</button>
        ` : `
            <button class="btn btn-primary" onclick="adminApp.editOrder(${order.id})">Редактировать</button>
            <button class="btn btn-secondary" onclick="adminApp.closeModal()">Закрыть</button>
        `;
        
        this.showModal(modalContent, modalActions);
    }

    async editOrder(orderId) {
        this.closeModal();
        setTimeout(async () => {
            await this.viewOrder(orderId, true);
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
            console.error('updateOrder error:', error);
            const msg = error && error.message ? error.message : 'Ошибка обновления заказа';
            this.showNotification(msg, 'error');
        }
    }

    async deleteOrder(orderId) {
        if (!confirm('Вы уверены, что хотите удалить этот заказ? Это действие нельзя отменить.')) {
            return;
        }

        try {
            await this.apiCall(`/orders/${orderId}`, {
                method: 'DELETE'
            });

            this.closeModal();
            this.loadOrders();
            this.showNotification('Заказ успешно удален');
        } catch (error) {
            console.error('deleteOrder error:', error);
            const msg = error && error.message ? error.message : 'Ошибка удаления заказа';
            this.showNotification(msg, 'error');
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
                    <button class="btn-action btn-view" onclick="adminApp.viewProduct(${product.id})">
                        👁️
                    </button>
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

    async viewProduct(productId) {
        try {
            const products = await this.apiCall('/products');
            const product = products.find(p => p.id == productId);
            
            if (!product) {
                this.showNotification('Товар не найден', 'error');
                return;
            }
            
            this.showProductModal(product, false);
        } catch (error) {
            console.error('viewProduct error:', error);
            this.showNotification('Ошибка загрузки товара', 'error');
        }
    }

    showProductModal(product = null, isEdit = true) {
        const modalContent = `
            <h2>${product && !isEdit ? 'Просмотр товара' : (product ? 'Редактирование товара' : 'Добавление товара')}</h2>
            
            ${!isEdit && product ? `
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 30px; margin-bottom: 20px;">
                    <div>
                        <img src="${product.image_url}" alt="${product.name}" 
                             style="width: 100%; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <div style="margin-top: 15px; text-align: center;">
                            <span class="status-badge ${product.status === 'active' ? 'status-delivered' : 'status-cancelled'}">
                                ${product.status === 'active' ? 'Активен' : 'Неактивен'}
                            </span>
                            ${product.popular ? '<span class="status-badge" style="background: #ff9800; margin-left: 5px;">Популярный</span>' : ''}
                        </div>
                    </div>
                    <div>
                        <h3 style="margin: 0 0 10px 0; color: var(--primary-color);">${product.name}</h3>
                        <p style="color: #666; margin-bottom: 20px;">${product.description}</p>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div>
                                    <label style="color: #666; font-size: 0.9rem;">Цена</label>
                                    <div style="font-size: 1.8rem; font-weight: bold; color: var(--primary-color);">
                                        ${this.formatPrice(product.price)}
                                    </div>
                                </div>
                                <div>
                                    <label style="color: #666; font-size: 0.9rem;">На складе</label>
                                    <div style="font-size: 1.8rem; font-weight: bold; color: ${product.stock > 10 ? 'var(--success-color)' : 'var(--warning-color)'};">
                                        ${product.stock} шт.
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="font-weight: 600; color: var(--dark-color); margin-bottom: 8px; display: block;">Категория</label>
                            <div style="color: #666;">${product.category_name || 'Не указана'}</div>
                        </div>
                        
                        ${product.features && this.parseFeatures(product.features).length > 0 ? `
                            <div>
                                <label style="font-weight: 600; color: var(--dark-color); margin-bottom: 8px; display: block;">Характеристики</label>
                                <ul style="list-style: none; padding: 0; margin: 0;">
                                    ${this.parseFeatures(product.features).map(f => `
                                        <li style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                                            <span style="color: #666;">✓ ${f}</span>
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : `
                <form id="product-form">
                    <div class="form-group">
                        <label for="product-name">Название товара *</label>
                        <input type="text" id="product-name" value="${product?.name || ''}" required ${!isEdit ? 'disabled' : ''}>
                    </div>
                    
                    <div class="form-group">
                        <label for="product-description">Описание *</label>
                        <textarea id="product-description" required ${!isEdit ? 'disabled' : ''}>${product?.description || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="product-category">Категория *</label>
                        <select id="product-category" required ${!isEdit ? 'disabled' : ''}>
                            <option value="">Выберите категорию</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="product-price">Цена (₽) *</label>
                        <input type="number" id="product-price" value="${product?.price || ''}" step="0.01" min="0" required ${!isEdit ? 'disabled' : ''}>
                    </div>
                    
                    <div class="form-group">
                        <label for="product-stock">Количество на складе *</label>
                        <input type="number" id="product-stock" value="${product?.stock || ''}" min="0" required ${!isEdit ? 'disabled' : ''}>
                    </div>
                    
                    <div class="form-group">
                        <label for="product-image">URL изображения или загрузить файл</label>
                        <input type="url" id="product-image" value="${product?.image_url || ''}" placeholder="https://..." ${!isEdit ? 'disabled' : ''}>
                        ${isEdit ? '<input type="file" id="product-image-file" accept="image/*" style="margin-top:8px;">' : ''}
                    </div>
                    
                    <div class="form-group">
                        <label for="product-features">Характеристики (каждая с новой строки)</label>
                        <textarea id="product-features" ${!isEdit ? 'disabled' : ''}>${this.getProductFeatures(product)}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="product-popular" ${product?.popular ? 'checked' : ''} ${!isEdit ? 'disabled' : ''}>
                            Популярный товар
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="product-active" ${!product || product.status === 'active' ? 'checked' : ''} ${!isEdit ? 'disabled' : ''}>
                            Активный товар
                        </label>
                    </div>
                </form>
            `}
        `;
        
        const modalActions = !isEdit && product ? `
            <button class="btn btn-primary" onclick="adminApp.editProductFromView(${product.id})">Редактировать</button>
            <button class="btn btn-danger" onclick="adminApp.deleteProduct(${product.id})" style="margin-left: auto;">Удалить</button>
            <button class="btn btn-secondary" onclick="adminApp.closeModal()">Закрыть</button>
        ` : `
            <button class="btn btn-primary" onclick="adminApp.${product ? 'update' : 'create'}Product(${product?.id || ''})">
                ${product ? 'Сохранить' : 'Создать'}
            </button>
            <button class="btn btn-secondary" onclick="adminApp.closeModal()">Отмена</button>
        `;
        
        this.showModal(modalContent, modalActions);
        if (isEdit || product) {
            this.loadCategoriesForSelect();
            if (product) {
                setTimeout(() => {
                    const categorySelect = document.getElementById('product-category');
                    if (categorySelect && product.category_id) {
                        categorySelect.value = product.category_id;
                    }
                }, 100);
            }
        }
    }

    parseFeatures(features) {
        if (!features) return [];
        try {
            if (Array.isArray(features)) return features;
            if (typeof features === 'string') {
                const parsed = JSON.parse(features);
                return Array.isArray(parsed) ? parsed : [];
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async editProductFromView(productId) {
        this.closeModal();
        setTimeout(async () => {
            await this.editProduct(productId);
        }, 300);
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
        // If user selected a file, send multipart/form-data
        try {
            const fileInput = document.getElementById('product-image-file');
            const token = localStorage.getItem('admin_token');

            if (fileInput && fileInput.files && fileInput.files.length > 0) {
                const fd = new FormData();
                const data = this.getProductFormData();
                // append scalar fields
                Object.keys(data).forEach(key => {
                    if (key === 'features') {
                        fd.append(key, JSON.stringify(data[key]));
                    } else {
                        fd.append(key, data[key] === undefined ? '' : data[key]);
                    }
                });
                fd.append('image', fileInput.files[0]);

                const res = await fetch('/api/admin/products', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: fd
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Ошибка создания товара');
                }
            } else {
                const formData = this.getProductFormData();
                await this.apiCall('/products', {
                    method: 'POST',
                    body: formData
                });
            }

            this.closeModal();
            this.loadProducts();
            this.showNotification('Товар успешно создан');
        } catch (error) {
            this.showNotification(error.message || 'Ошибка создания товара', 'error');
        }
    }

    async updateProduct(productId) {
        try {
            const fileInput = document.getElementById('product-image-file');
            const token = localStorage.getItem('admin_token');

            if (fileInput && fileInput.files && fileInput.files.length > 0) {
                const fd = new FormData();
                const data = this.getProductFormData();
                Object.keys(data).forEach(key => {
                    if (key === 'features') {
                        fd.append(key, JSON.stringify(data[key]));
                    } else {
                        fd.append(key, data[key] === undefined ? '' : data[key]);
                    }
                });
                fd.append('image', fileInput.files[0]);

                const res = await fetch(`/api/admin/products/${productId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: fd
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Ошибка обновления товара');
                }
            } else {
                const formData = this.getProductFormData();
                await this.apiCall(`/products/${productId}`, {
                    method: 'PUT',
                    body: formData
                });
            }

            this.closeModal();
            this.loadProducts();
            this.showNotification('Товар успешно обновлен');
        } catch (error) {
            this.showNotification(error.message || 'Ошибка обновления товара', 'error');
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

    getProductFeatures(product) {
        if (!product || !product.features) return '';
        
        try {
            // If it's already an array
            if (Array.isArray(product.features)) {
                return product.features.join('\n');
            }
            
            // If it's a JSON string
            if (typeof product.features === 'string') {
                const parsed = JSON.parse(product.features);
                if (Array.isArray(parsed)) {
                    return parsed.join('\n');
                }
                // If it's just a plain string, return it
                return product.features;
            }
            
            return '';
        } catch (error) {
            console.warn('Could not parse product features:', error);
            // If JSON parsing fails, return the raw string
            return typeof product.features === 'string' ? product.features : '';
        }
    }

    async editProduct(productId) {
        try {
            const products = await this.apiCall('/products');
            const product = products.find(p => p.id == productId); // Use == for type coercion
            
            if (product) {
                this.showProductModal(product, true);
            } else {
                this.showNotification('Товар не найден', 'error');
            }
        } catch (error) {
            console.error('editProduct error:', error);
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

    // === FILTERS AND CATEGORIES ACTIONS ===
    async filterOrders() {
        const status = document.getElementById('order-status-filter')?.value || 'all';
        try {
            const orders = await this.apiCall(`/orders?status=${status}`);
            this.renderOrders(orders);
        } catch (error) {
            this.showNotification('Ошибка применения фильтров', 'error');
        }
    }

    resetFilters() {
        const statusEl = document.getElementById('order-status-filter');
        const dateEl = document.getElementById('order-date-filter');
        if (statusEl) statusEl.value = 'all';
        if (dateEl) dateEl.value = '';
        this.loadOrders();
    }

    async searchProducts() {
        const q = document.getElementById('product-search')?.value || '';
        try {
            // Use public products endpoint which supports search
            const resp = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=100`);
            const data = await resp.json();
            const products = data.products || [];
            this.renderProducts(products);
        } catch (error) {
            this.showNotification('Ошибка поиска товаров', 'error');
        }
    }

    showCategoryModal(category = null) {
        const isEdit = !!category;
        const modalContent = `
            <h2>${isEdit ? 'Редактирование' : 'Добавление'} категории</h2>
            <form id="category-form">
                <div class="form-group">
                    <label for="category-name">Название *</label>
                    <input type="text" id="category-name" value="${category?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="category-slug">Slug (латиницей)</label>
                    <input type="text" id="category-slug" value="${category?.slug || ''}">
                </div>
                <div class="form-group">
                    <label for="category-description">Описание</label>
                    <textarea id="category-description">${category?.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="category-image">URL изображения или загрузить файл</label>
                    <input type="url" id="category-image" value="${category?.image_url || ''}" placeholder="https://...">
                    <input type="file" id="category-image-file" accept="image/*" style="margin-top:8px;">
                </div>
            </form>
        `;

        const modalActions = isEdit ? `
            <button class="btn btn-primary" onclick="adminApp.saveCategory(${category.id})">Сохранить</button>
            <button class="btn btn-danger" onclick="adminApp.deleteCategory(${category.id})" style="margin-left: auto;">Удалить категорию</button>
            <button class="btn btn-secondary" onclick="adminApp.closeModal()">Отмена</button>
        ` : `
            <button class="btn btn-primary" onclick="adminApp.saveCategory()">Создать</button>
            <button class="btn btn-secondary" onclick="adminApp.closeModal()">Отмена</button>
        `;

        this.showModal(modalContent, modalActions);
    }

    async editCategory(categoryId) {
        try {
            const categories = await this.apiCall('/categories');
            const category = categories.find(c => c.id === categoryId);
            if (!category) return this.showNotification('Категория не найдена', 'error');
            this.showCategoryModal(category);
        } catch (error) {
            this.showNotification('Ошибка загрузки категории', 'error');
        }
    }

    async saveCategory(categoryId = null) {
        try {
            const fileInput = document.getElementById('category-image-file');
            const token = localStorage.getItem('admin_token');

            if (fileInput && fileInput.files && fileInput.files.length > 0) {
                // Upload with file
                const fd = new FormData();
                fd.append('name', document.getElementById('category-name').value);
                fd.append('slug', document.getElementById('category-slug').value);
                fd.append('description', document.getElementById('category-description').value);
                fd.append('image_url', document.getElementById('category-image').value);
                fd.append('image', fileInput.files[0]);

                const url = categoryId ? `/api/admin/categories/${categoryId}` : '/api/admin/categories';
                const method = categoryId ? 'PUT' : 'POST';

                const res = await fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: fd
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Ошибка сохранения категории');
                }
            } else {
                // Upload without file
                const name = document.getElementById('category-name').value;
                const slug = document.getElementById('category-slug').value;
                const description = document.getElementById('category-description').value;
                const image_url = document.getElementById('category-image').value;

                if (!name) return this.showNotification('Название обязательно', 'error');

                if (categoryId) {
                    const res = await fetch(`/api/admin/categories/${categoryId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ name, slug, description, image_url })
                    });
                    if (!res.ok) throw new Error((await res.json()).error || 'Ошибка обновления категории');
                } else {
                    await this.apiCall('/categories', {
                        method: 'POST',
                        body: { name, slug, description, image_url }
                    });
                }
            }

            this.closeModal();
            this.loadCategories();
            this.showNotification(categoryId ? 'Категория обновлена' : 'Категория создана');
        } catch (error) {
            this.showNotification(error.message || 'Ошибка сохранения категории', 'error');
        }
    }

    async deleteCategory(categoryId) {
        if (!confirm('Вы уверены, что хотите удалить эту категорию? Все товары в этой категории могут быть затронуты.')) {
            return;
        }

        try {
            await this.apiCall(`/categories/${categoryId}`, {
                method: 'DELETE'
            });

            this.closeModal();
            this.loadCategories();
            this.showNotification('Категория успешно удалена');
        } catch (error) {
            this.showNotification(error.message || 'Ошибка удаления категории', 'error');
        }
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
        const status = document.getElementById('message-status-filter')?.value || 'all';
        const messages = await this.apiCall(`/messages?status=${status}`);
        this.renderMessages(messages);
    }

    async filterMessages() {
        await this.loadMessages();
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