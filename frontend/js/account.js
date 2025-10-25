// account.js - Логика личного кабинета
class AccountApp {
    constructor() {
        this.addresses = [];
        this.editingAddressId = null;
        this.init();
    }

    init() {
        const token = localStorage.getItem('user_token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        this.loadProfile();
        this.loadOrders();
        this.loadAddresses();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Сохранение профиля
        document.getElementById('save-profile').addEventListener('click', () => {
            this.saveProfile();
        });

        // Выход
        document.getElementById('logout').addEventListener('click', () => {
            this.logout();
        });

        // Форма добавления адреса
        document.getElementById('address-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveAddress();
        });

        // Закрытие модального окна по клику на overlay
        document.getElementById('address-modal').addEventListener('click', (e) => {
            if (e.target.id === 'address-modal') {
                this.closeAddressModal();
            }
        });
    }

    async loadProfile() {
        try {
            const token = localStorage.getItem('user_token');
            const profile = await Components.apiCall('/auth/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            document.getElementById('profile-email').value = profile.email || '';
            document.getElementById('profile-name').value = profile.full_name || '';
            document.getElementById('profile-phone').value = profile.phone || '';
        } catch (error) {
            console.error('Error loading profile:', error);
            Components.showNotification('Ошибка загрузки профиля', 'error');
        }
    }

    async saveProfile() {
        try {
            const token = localStorage.getItem('user_token');
            const profileData = {
                full_name: document.getElementById('profile-name').value,
                phone: document.getElementById('profile-phone').value
            };

            await Components.apiCall('/auth/profile', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: profileData
            });

            Components.showNotification('Профиль успешно обновлен');
        } catch (error) {
            console.error('Error saving profile:', error);
            Components.showNotification(error.message || 'Ошибка сохранения профиля', 'error');
        }
    }

    async loadOrders() {
        try {
            const token = localStorage.getItem('user_token');
            const orders = await Components.apiCall('/orders', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            this.renderOrders(orders);
        } catch (error) {
            console.error('Error loading orders:', error);
            document.getElementById('orders-list').innerHTML = 
                '<p style="text-align: center; color: #666;">Не удалось загрузить заказы</p>';
        }
    }

    renderOrders(orders) {
        const container = document.getElementById('orders-list');
        
        if (orders.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">У вас пока нет заказов</p>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <div class="order-id">Заказ #${order.id}</div>
                    <div class="order-status ${order.status}">${this.getStatusText(order.status)}</div>
                </div>
                <div class="order-info">
                    <div class="order-info-item">
                        <span class="order-info-label">Дата:</span>
                        ${new Date(order.created_at).toLocaleDateString('ru-RU')}
                    </div>
                    <div class="order-info-item">
                        <span class="order-info-label">Сумма:</span>
                        ${Components.formatPrice(order.total_amount)}
                    </div>
                    <div class="order-info-item" style="grid-column: 1 / -1;">
                    <span class="order-info-label">Адрес доставки:</span>
                    ${order.customer_address || 'Не указан'}
                    </div>
                        ${order.customer_comment ? `
                    <div class="order-info-item" style="grid-column: 1 / -1;">
                        <span class="order-info-label">Комментарий:</span>
                        <span style="font-style: italic; color: #666;">${order.customer_comment}</span>
                    </div>
                ` : ''}
            </div>
                ${this.renderOrderItems(order.items)}
            </div>
        `).join('');
    }

    renderOrderItems(items) {
        let parsedItems = [];
        try {
            parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
        } catch (e) {
            return '<p>Не удалось загрузить товары</p>';
        }

        return `
            <div class="order-items">
                <strong style="display: block; margin-bottom: 10px;">Товары в заказе:</strong>
                ${parsedItems.map(item => `
                    <div class="order-item-row">
                        <span>${item.name} × ${item.quantity}</span>
                        <span>${Components.formatPrice(item.price * item.quantity)}</span>
                    </div>
                `).join('')}
            </div>
        `;
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

    // Управление адресами
    async loadAddresses() {
        try {
            const token = localStorage.getItem('user_token');
            const addresses = await Components.apiCall('/auth/addresses', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            this.addresses = addresses;
            this.renderAddresses();
        } catch (error) {
            console.error('Error loading addresses:', error);
            this.addresses = [];
            this.renderAddresses();
        }
    }

    renderAddresses() {
        const container = document.getElementById('addresses-list');
        
        if (this.addresses.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center;">Нет сохраненных адресов</p>';
            return;
        }

        container.innerHTML = this.addresses.map((address) => `
            <div class="address-item ${address.is_default ? 'default' : ''}">
                <div class="address-label">
                    ${address.label}
                    ${address.is_default ? '<span style="color: #4caf50; font-size: 0.85rem;"> (Основной)</span>' : ''}
                </div>
                <div class="address-text">${address.address}</div>
                <div class="address-actions">
                    <button class="btn btn-outline btn-small" onclick="accountApp.editAddress(${address.id})">
                        Изменить
                    </button>
                    ${!address.is_default ? `
                        <button class="btn btn-outline btn-small" onclick="accountApp.setDefaultAddress(${address.id})">
                            Сделать основным
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary btn-small" onclick="accountApp.deleteAddress(${address.id})">
                        Удалить
                    </button>
                </div>
            </div>
        `).join('');
    }

    showAddAddressModal() {
        this.editingAddressId = null;
        document.getElementById('address-modal-title').textContent = 'Добавить адрес доставки';
        document.getElementById('address-label').value = '';
        document.getElementById('address-text').value = '';
        document.getElementById('address-default').checked = false;
        document.getElementById('address-modal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    editAddress(addressId) {
        // Валидация ID адреса
        if (!addressId || addressId === 0) {
            console.error('Invalid address ID:', addressId);
            Components.showNotification('Ошибка: некорректный идентификатор адреса', 'error');
            return;
        }

        this.editingAddressId = addressId;
        const address = this.addresses.find(a => a.id === addressId);
        
        if (!address) {
            console.error('Address not found:', addressId, this.addresses);
            Components.showNotification('Адрес не найден', 'error');
            return;
        }
        
        document.getElementById('address-modal-title').textContent = 'Редактировать адрес';
        document.getElementById('address-label').value = address.label || '';
        document.getElementById('address-text').value = address.address || '';
        document.getElementById('address-default').checked = address.is_default || false;
        document.getElementById('address-modal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeAddressModal() {
        document.getElementById('address-modal').style.display = 'none';
        document.body.style.overflow = '';
        this.editingAddressId = null;
    }

    async saveAddress() {
        const label = document.getElementById('address-label').value.trim();
        const address = document.getElementById('address-text').value.trim();
        const is_default = document.getElementById('address-default').checked;

        if (!label || !address) {
            Components.showNotification('Заполните все поля', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('user_token');
            const addressData = { label, address, is_default };

            if (this.editingAddressId) {
                // Редактирование
                await Components.apiCall(`/auth/addresses/${this.editingAddressId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: addressData
                });
                Components.showNotification('Адрес обновлен');
            } else {
                // Добавление
                await Components.apiCall('/auth/addresses', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: addressData
                });
                Components.showNotification('Адрес добавлен');
            }

            this.closeAddressModal();
            await this.loadAddresses();
        } catch (error) {
            Components.showNotification(error.message || 'Ошибка сохранения адреса', 'error');
        }
    }

    async setDefaultAddress(addressId) {
        // Валидация ID адреса
        if (!addressId || addressId === 0) {
            console.error('Invalid address ID for setDefault:', addressId);
            Components.showNotification('Ошибка: некорректный идентификатор адреса', 'error');
            return;
        }

        // Проверяем, что адрес существует
        const address = this.addresses.find(a => a.id === addressId);
        if (!address) {
            console.error('Address not found for setDefault:', addressId, this.addresses);
            Components.showNotification('Адрес не найден', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('user_token');
            await Components.apiCall(`/auth/addresses/${addressId}/default`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            Components.showNotification('Основной адрес обновлен');
            await this.loadAddresses();
        } catch (error) {
            console.error('Error setting default address:', error);
            Components.showNotification(error.message || 'Ошибка установки основного адреса', 'error');
        }
    }

    async deleteAddress(addressId) {
        // Валидация ID адреса
        if (!addressId || addressId === 0) {
            console.error('Invalid address ID for delete:', addressId);
            Components.showNotification('Ошибка: некорректный идентификатор адреса', 'error');
            return;
        }

        if (!confirm('Удалить этот адрес?')) return;
        
        try {
            const token = localStorage.getItem('user_token');
            await Components.apiCall(`/auth/addresses/${addressId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            Components.showNotification('Адрес удален');
            await this.loadAddresses();
        } catch (error) {
            console.error('Error deleting address:', error);
            Components.showNotification(error.message || 'Ошибка удаления адреса', 'error');
        }
    }

    logout() {
        localStorage.removeItem('user_token');
        window.location.href = 'login.html';
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    window.accountApp = new AccountApp();
});
