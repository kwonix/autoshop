// cart.js - Логика корзины
class CartApp {
    constructor() {
        this.cart = new CartManager();
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
    }

    showCheckoutModal() {
        if (this.cart.items.length === 0) {
            Components.showNotification('Корзина пуста', 'error');
            return;
        }

        // Заполняем форму данными пользователя, если он авторизован
        const userData = this.getUserData();
        if (userData) {
            document.getElementById('customer-name').value = userData.full_name || '';
            document.getElementById('customer-email').value = userData.email || '';
            document.getElementById('customer-phone').value = userData.phone || '';
            document.getElementById('customer-address').value = userData.address || '';
        }

        document.getElementById('checkout-modal').style.display = 'block';
    }

    closeCheckoutModal() {
        document.getElementById('checkout-modal').style.display = 'none';
    }

    getUserData() {
        const token = localStorage.getItem('user_token');
        if (token) {
            try {
                const userData = JSON.parse(localStorage.getItem('user_data'));
                return userData;
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
        return null;
    }

    async processCheckout() {
        const formData = {
            customer_name: document.getElementById('customer-name').value,
            customer_email: document.getElementById('customer-email').value,
            customer_phone: document.getElementById('customer-phone').value,
            customer_address: document.getElementById('customer-address').value
        };

        // Валидация
        if (!formData.customer_name || !formData.customer_email || !formData.customer_phone) {
            Components.showNotification('Заполните все обязательные поля', 'error');
            return;
        }

        const submitBtn = document.querySelector('#checkout-form button[type="submit"]');
        const originalText = submitBtn.textContent;

        submitBtn.innerHTML = '<div class="loading"></div>';
        submitBtn.disabled = true;

        try {
            const order = await this.cart.checkout(formData);
            
            Components.showNotification(`Заказ #${order.id} успешно оформлен!`);
            this.closeCheckoutModal();
            this.renderCart();

            // Перенаправляем на страницу успеха или очищаем корзину
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

// Инициализация корзины
document.addEventListener('DOMContentLoaded', function() {
    window.cartApp = new CartApp();
});