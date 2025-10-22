// script.js - Основной скрипт фронтенда
class ShopApp {
    constructor() {
        this.cart = new CartManager();
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
            const categories = await Components.apiCall('/categories');
            this.renderCategories(categories);
        } catch (error) {
            console.error('Error loading categories:', error);
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
            const products = await Components.apiCall('/products/popular');
            this.renderPopularProducts(products);
        } catch (error) {
            console.error('Error loading popular products:', error);
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
                    <div class="price">${Components.formatPrice(product.price)}</div>
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
                await Components.apiCall('/contact', {
                    method: 'POST',
                    body: formData
                });

                Components.showNotification('Сообщение успешно отправлено!');
                form.reset();
            } catch (error) {
                Components.showNotification(error.message, 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    setupAuthCheck() {
        const token = localStorage.getItem('user_token');
        if (token) {
            // Обновляем интерфейс для авторизованного пользователя
            const loginBtn = document.querySelector('.login-btn');
            if (loginBtn) {
                loginBtn.textContent = '👤 Кабинет';
                loginBtn.href = 'profile.html'; // Можно добавить страницу профиля
            }
        }
    }
}

class CartManager {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('cart')) || [];
    }

    addToCart(productId, quantity = 1) {
        // В реальном приложении здесь был бы запрос к API для получения данных товара
        const product = this.getProductData(productId);
        if (!product) {
            Components.showNotification('Товар не найден', 'error');
            return;
        }

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
        Components.showNotification('Товар добавлен в корзину!');
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
            const order = await Components.apiCall('/orders', {
                method: 'POST',
                body: {
                    ...orderData,
                    items: this.items,
                    total_amount: this.getTotalPrice()
                }
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

    // Временный метод для демо - в реальном приложении данные брались бы с сервера
    getProductData(productId) {
        const productsData = {
            1: { id: 1, name: 'Видеорегистратор 4K', price: 5990, image_url: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3' },
            2: { id: 2, name: 'Автомобильные коврики', price: 3490, image_url: 'https://images.unsplash.com/photo-1570733780745-d192c48b8ff3' },
            3: { id: 3, name: 'Компрессор автомобильный', price: 2790, image_url: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888' },
            4: { id: 4, name: 'Навигатор с радар-детектором', price: 8990, image_url: 'https://images.unsplash.com/photo-1558637845-c8b7ead71a3e' },
            5: { id: 5, name: 'Полироль для кузова', price: 890, image_url: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a' },
            6: { id: 6, name: 'Чехлы на сиденья', price: 2490, image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70' },
            7: { id: 7, name: 'Сигнализация с автозапуском', price: 12990, image_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537' },
            8: { id: 8, name: 'Щетки стеклоочистителя', price: 1290, image_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d' }
        };
        
        return productsData[productId];
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    window.shopApp = new ShopApp();
    window.CartManager = CartManager;
});