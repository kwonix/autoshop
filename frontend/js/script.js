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
                <div class="category-img" style="background-image: url('${category.image_url || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7'}')"></div>
                <div class="category-info">
                    <h3>${category.name}</h3>
                    <p>${category.description || ''}</p>
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
                <div class="product-img" style="background-image: url('${product.image_url || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7'}')"></div>
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
            const loginBtn = document.querySelector('.login-btn');
            if (loginBtn) {
                loginBtn.textContent = '👤 Кабинет';
                loginBtn.href = 'account.html';
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.shopApp = new ShopApp();
});
