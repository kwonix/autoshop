// script.js - Основной скрипт фронтенда (адаптированный для Supabase)
class ShopApp {
    constructor() {
        this.cart = new CartManager();
        this.supabase = window.supabaseClient;
        this.init();
    }

    init() {
        this.loadCategories();
        this.loadPopularProducts();
        this.setupContactForm();
        this.setupAuthCheck();
    }

    async loadCategories() {
        try {
            const categories = await this.supabase.getCategories();
            this.renderCategories(categories);
        } catch (error) {
            console.error('Error loading categories:', error);
            this.showNotification('Ошибка загрузки категорий', 'error');
        }
    }

    renderCategories(categories) {
        const container = document.getElementById('categories-grid');
        if (!container) return;

        container.innerHTML = categories.map(category => `
            <div class="category-card" onclick="window.location='catalog.html?category=${category.slug}'">
                <div class="category-img" style="background-image: url('${category.image_url}')"></div>
                <div class="category-info">
                    <h3>${category.name}</h3>
                    <p>${category.description}</p>
                    <button class="btn btn-outline">Смотреть товары</button>
                </div>
            </div>
        `).join('');
    }

    async loadPopularProducts() {
        try {
            const products = await this.supabase.getPopularProducts();
            this.renderPopularProducts(products);
        } catch (error) {
            console.error('Error loading popular products:', error);
            this.showNotification('Ошибка загрузки товаров', 'error');
        }
    }

    renderPopularProducts(products) {
        const container = document.getElementById('popular-products');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = '<p class="text-center">Популярные товары не найдены</p>';
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-img" style="background-image: url('${product.image_url}')"></div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <div class="price">${this.formatPrice(product.price)}</div>
                    <button class="btn btn-primary" onclick="shopApp.cart.addToCart(${product.id})">
                        В корзину
                    </button>
                </div>
            </div>
        `).join('');
    }

    setupContactForm() {
        const form = document.getElementById('contact-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('contact-name').value,
                email: document.getElementById('contact-email').value,
                phone: document.getElementById('contact-phone').value,
                message: document.getElementById('contact-message').value
            };

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            submitBtn.innerHTML = '<div class="loading"></div>';
            submitBtn.disabled = true;

            try {
                await this.supabase.sendMessage(formData);
                this.showNotification('Сообщение успешно отправлено!');
                form.reset();
            } catch (error) {
                this.showNotification(error.message, 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    setupAuthCheck() {
        const user = this.supabase.getCurrentUser();
        if (user) {
            this.updateUIForLoggedInUser(user);
        }
    }

    updateUIForLoggedInUser(user) {
        const loginBtn = document.querySelector('.login-btn');
        if (loginBtn) {
            loginBtn.textContent = '👤 Кабинет';
            loginBtn.href = 'profile.html';
        }
    }

    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
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
}

class CartManager {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('cart')) || [];
    }

    async addToCart(productId, quantity = 1) {
        try {
            const product = await window.supabaseClient.getProduct(productId);
            
            const existingItem = this.items.find(item => item.id === productId);
            
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                this.items.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image_url,
                    quantity: quantity
                });
            }

            this.saveCart();
            this.updateCartCount();
            this.showNotification('Товар добавлен в корзину!');
        } catch (error) {
            this.showNotification('Ошибка добавления товара', 'error');
        }
    }

    removeFromCart(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveCart();
        this.updateCartCount();
        
        if (window.location.pathname.endsWith('cart.html')) {
            this.renderCart();
        }
    }

    updateQuantity(productId, newQuantity) {
        if (newQuantity < 1) {
            this.removeFromCart(productId);
            return;
        }

        const item = this.items.find(item => item.id === productId);
        if (item) {
            item.quantity = newQuantity;
            this.saveCart();
            
            if (window.location.pathname.endsWith('cart.html')) {
                this.renderCart();
            }
        }
    }

    getTotalPrice() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    getTotalItems() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.items));
    }

    updateCartCount() {
        const cartCountElements = document.querySelectorAll('#cart-count');
        const totalItems = this.getTotalItems();
        
        cartCountElements.forEach(element => {
            element.textContent = totalItems;
        });
    }

    async checkout(orderData) {
        try {
            const order = await window.supabaseClient.createOrder({
                ...orderData,
                items: this.items,
                total_amount: this.getTotalPrice()
            });

            // Очищаем корзину после успешного заказа
            this.items = [];
            this.saveCart();
            this.updateCartCount();

            return order;
        } catch (error) {
            throw error;
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
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    window.shopApp = new ShopApp();
    window.CartManager = CartManager;
});