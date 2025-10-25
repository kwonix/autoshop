// cart.js - Логика корзины
class CartApp {
    constructor() {
        this.cart = new CartManager();
        this.userAddresses = [];
        this.init();
    }

    init() {
        this.renderCart();
        this.setupEventListeners();
    }

    renderCart() {
        this.renderCartItems();
        this.renderCartSummary();
    }

    renderCartItems() {
        const container = document.getElementById('cart-items');
        
        if (this.cart.items.length === 0) {
            container.innerHTML = `
                <div class="empty-cart">
                    <p>Ваша корзина пуста</p>
                    <a href="catalog.html" class="btn btn-primary">Перейти к покупкам</a>
                </div>
            `;
            document.getElementById('cart-summary').style.display = 'none';
            return;
        }

        document.getElementById('cart-summary').style.display = 'block';
        
        container.innerHTML = this.cart.items.map(item => `
            <div class="cart-item">
                <div class="cart-item-img" style="background-image: url('${item.image}')"></div>
                <div class="cart-item-details">
                    <h3>${item.name}</h3>
                    <div class="cart-item-price">${Components.formatPrice(item.price)}</div>
                    <div class="cart-item-controls">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="cartApp.updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn" onclick="cartApp.updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                        </div>
                        <button class="remove-btn" onclick="cartApp.removeFromCart(${item.id})">Удалить</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderCartSummary() {
        const subtotal = this.cart.getTotalPrice();
        const shipping = subtotal > 5000 ? 0 : 500;
        const total = subtotal + shipping;

        document.getElementById('subtotal').textContent = Components.formatPrice(subtotal);
        document.getElementById('shipping').textContent = Components.formatPrice(shipping);
        document.getElementById('total').textContent = Components.formatPrice(total);
    }

    updateQuantity(productId, newQuantity) {
        this.cart.updateQuantity(productId, newQuantity);
        this.renderCart();
    }

    removeFromCart(productId) {
        this.cart.removeFromCart(productId);
        this.renderCart();
    }

    setupEventListeners() {
        document.getElementById('checkout-btn').addEventListener('click', () => {
            this.showCheckoutModal();
        });

        document.getElementById('checkout-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.processCheckout();
        });

        // НЕ добавляем обработчик для address-select здесь, 
        // так как элемент создается динамически в renderAddressSelect()
    }

    async showCheckoutModal() {
        if (this.cart.items.length === 0) {
            Components.showNotification('Корзина пуста', 'error');
            return;
        }

        const token = localStorage.getItem('user_token');
        
        if (token) {
            // Пользователь авторизован - загружаем его данные и адреса
            try {
                const [userData, addresses] = await Promise.all([
                    this.getUserData(),
                    this.loadUserAddresses()
                ]);

                if (userData) {
                    document.getElementById('customer-name').value = userData.full_name || '';
                    document.getElementById('customer-email').value = userData.email || '';
                    document.getElementById('customer-phone').value = userData.phone || '';
                }

                this.userAddresses = addresses || [];
                this.renderAddressSelect();

                // Автоматически заполняем основной адрес если есть
                const defaultAddress = this.userAddresses.find(addr => addr.is_default);
                if (defaultAddress) {
                    const selectElement = document.getElementById('address-select');
                    if (selectElement) {
                        selectElement.value = defaultAddress.id;
                        document.getElementById('customer-address').value = defaultAddress.address;
                    }
                }
            } catch (e) {
                console.warn('Не удалось загрузить данные пользователя', e);
            }
        } else {
            // Пользователь не авторизован - скрываем выбор адресов
            this.renderAddressSelect();
        }

        document.getElementById('checkout-modal').style.display = 'block';
    }

    renderAddressSelect() {
        const selectContainer = document.getElementById('address-select-container');
        const addressTextarea = document.getElementById('customer-address');
        
        if (this.userAddresses.length > 0) {
            // Показываем выпадающий список с адресами
            selectContainer.style.display = 'block';
            
            const selectHtml = `
                <select id="address-select" class="form-control">
                    <option value="">-- Выберите адрес --</option>
                    ${this.userAddresses.map(addr => `
                        <option value="${addr.id}" ${addr.is_default ? 'selected' : ''}>
                            ${addr.label} ${addr.is_default ? '(Основной)' : ''}
                        </option>
                    `).join('')}
                    <option value="custom">Ввести другой адрес</option>
                </select>
            `;
            
            selectContainer.innerHTML = selectHtml;
            
            // Если выбран адрес - делаем textarea readonly
            if (this.userAddresses.find(addr => addr.is_default)) {
                addressTextarea.readOnly = true;
                addressTextarea.style.backgroundColor = '#f5f5f5';
            }

            // Добавляем обработчик события после рендеринга
            const selectElement = document.getElementById('address-select');
            if (selectElement) {
                selectElement.addEventListener('change', (e) => {
                    this.handleAddressSelect(e.target.value);
                });
            }
        } else {
            // Скрываем выпадающий список
            selectContainer.style.display = 'none';
            selectContainer.innerHTML = '';
            addressTextarea.readOnly = false;
            addressTextarea.style.backgroundColor = '';
        }
    }

    handleAddressSelect(addressId) {
        const addressTextarea = document.getElementById('customer-address');
        
        if (addressId === 'custom' || addressId === '') {
            // Разрешаем ввод произвольного адреса
            addressTextarea.value = '';
            addressTextarea.readOnly = false;
            addressTextarea.style.backgroundColor = '';
            addressTextarea.placeholder = 'Введите адрес доставки';
        } else {
            // Заполняем выбранный адрес
            const selectedAddress = this.userAddresses.find(addr => addr.id === parseInt(addressId));
            if (selectedAddress) {
                addressTextarea.value = selectedAddress.address;
                addressTextarea.readOnly = true;
                addressTextarea.style.backgroundColor = '#f5f5f5';
            }
        }
    }

    async loadUserAddresses() {
        const token = localStorage.getItem('user_token');
        if (!token) return [];

        try {
            const addresses = await Components.apiCall('/auth/addresses', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return addresses;
        } catch (error) {
            console.error('Error loading addresses:', error);
            return [];
        }
    }

    closeCheckoutModal() {
        document.getElementById('checkout-modal').style.display = 'none';
    }

    getUserData() {
        const token = localStorage.getItem('user_token');
        if (token) {
            try {
                return Components.apiCall('/auth/profile', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (error) {
                console.error('Error fetching user profile:', error);
            }
        }
        return null;
    }

    async processCheckout() {
        const nameEl = document.getElementById('customer-name');
        const emailEl = document.getElementById('customer-email');
        const phoneEl = document.getElementById('customer-phone');
        const addressEl = document.getElementById('customer-address');
        const commentEl = document.getElementById('order-comment');

        const formData = {
            customer_name: nameEl ? nameEl.value.trim() : '',
            customer_email: emailEl ? emailEl.value.trim() : '',
            customer_phone: phoneEl ? phoneEl.value.trim() : '',
            customer_address: addressEl ? addressEl.value.trim() : '',
            customer_comment: commentEl ? commentEl.value.trim() : ''
        };

        if (!formData.customer_name || !formData.customer_email || !formData.customer_phone) {
            Components.showNotification('Заполните все обязательные поля', 'error');
            return;
        }

        const submitBtn = document.querySelector('#checkout-form button[type="submit"]');
        const originalText = submitBtn.textContent;

        submitBtn.innerHTML = '<div class="loading"></div>';
        submitBtn.disabled = true;

        try {
            const token = localStorage.getItem('user_token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const order = await this.cart.checkout({ ...formData, _headers: headers });
            
            Components.showNotification(`Заказ #${order.id} успешно оформлен!`);
            this.closeCheckoutModal();
            this.renderCart();

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            Components.showNotification(error.message, 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.cartApp = new CartApp();
});
