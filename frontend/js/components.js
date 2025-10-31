// components.js - Общие компоненты и утилиты
class Components {
    static header() {
        return `
            <header>
                <div class="container">
                    <div class="header-content">
                        <div class="logo">AutoGadget</div>
                        <nav>
                            <ul>
                                <li><a href="index.html" class="${window.location.pathname.endsWith('index.html') || window.location.pathname === '/' ? 'active' : ''}">Главная</a></li>
                                <li><a href="catalog.html" class="${window.location.pathname.endsWith('catalog.html') ? 'active' : ''}">Каталог</a></li>
                                <li><a href="cart.html" class="cart-link ${window.location.pathname.endsWith('cart.html') ? 'active' : ''}">
                                    Корзина <span id="cart-count">0</span>
                                </a></li>
                                <li><a href="${localStorage.getItem('user_token') ? 'account.html' : 'login.html'}" class="login-btn">
                                    ${localStorage.getItem('user_token') ? 'Профиль' : 'Войти'}
                                </a></li>
                            </ul>
                        </nav>
                    </div>
                </div>
            </header>
        `;
    }

    static async footer() {
        // Получаем категории для отображения в футере
        let categoriesLinks = '';
        try {
            const categories = await Components.apiCall('/categories');
            // Ограничиваем до 4 категорий
            const limitedCategories = categories.slice(0, 4);
            categoriesLinks = limitedCategories.map(cat => 
                `<li><a href="catalog.html?category=${cat.slug}">${cat.name}</a></li>`
            ).join('');
        } catch (error) {
            // Если не удалось загрузить, используем статические ссылки
            categoriesLinks = `
                <li><a href="catalog.html?category=electronics">Автоэлектроника</a></li>
                <li><a href="catalog.html?category=care">Уход за авто</a></li>
                <li><a href="catalog.html?category=accessories">Автоаксессуары</a></li>
                <li><a href="catalog.html?category=safety">Безопасность</a></li>
            `;
        }

        return `
            <footer>
                <div class="container">
                    <div class="footer-content">
                        <div class="footer-column">
                            <h3>AutoGadget</h3>
                            <p>Лучшие автомобильные аксессуары для вашего комфорта и безопасности.</p>
                            <div class="social-links">
                                <a href="https://vk.com/kwonix" target="_blank" title="VKontakte">VK</a>
                                <a href="https://t.me/kwonix" target="_blank" title="Telegram">TG</a>
                                <a href="https://www.youtube.com/watch?v=04mfKJWDSzI" target="_blank" title="YouTube">YT</a>
                            </div>
                        </div>
                        <div class="footer-column">
                            <h3>Категории</h3>
                            <ul>
                                ${categoriesLinks}
                            </ul>
                        </div>
                        <div class="footer-column">
                            <h3>Помощь</h3>
                            <ul>
                                <li><a href="help.html#delivery">Доставка и оплата</a></li>
                                <li><a href="help.html#warranty">Гарантия и возврат</a></li>
                                <li><a href="help.html#faq">Частые вопросы</a></li>
                                <li><a href="help.html#reviews">Отзывы</a></li>
                            </ul>
                        </div>
                        <div class="footer-column">
                            <h3>Контакты</h3>
                            <ul>
                                <li>г. Москва, ул. Автозаводская, д. 15</li>
                                <li><a href="tel:+74951234567">+7 (495) 123-45-67</a></li>
                                <li><a href="mailto:info@autogadget.ru">info@autogadget.ru</a></li>
                                <li><a href="index.html#contact">Связаться с нами</a></li>
                            </ul>
                        </div>
                    </div>
                    <div class="copyright">
                        <p>&copy; 2025 AutoGadget. Все права защищены.</p>
                    </div>
                </div>
            </footer>
        `;
    }

    static showNotification(message, type = 'success') {
        const container = document.getElementById('notifications-container') || this.createNotificationsContainer();
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    static createNotificationsContainer() {
        const container = document.createElement('div');
        container.id = 'notifications-container';
        container.className = 'notifications-container';
        document.body.appendChild(container);
        return container;
    }

    static formatPrice(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    }

    static updateCartCount() {
        try {
            const items = JSON.parse(localStorage.getItem('cart')) || [];
            const total = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
            document.querySelectorAll('#cart-count').forEach(el => el.textContent = total);
        } catch (e) {
            console.warn('Components.updateCartCount: failed to read cart from localStorage', e);
        }
    }

    static async apiCall(endpoint, options = {}) {
        const baseURL = '/api';
        const url = `${baseURL}${endpoint}`;
        
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            
            // Сначала проверяем статус, потом читаем body
            if (!response.ok) {
                let errorData;
                const contentType = response.headers.get('content-type');
                
                try {
                    if (contentType && contentType.includes('application/json')) {
                        errorData = await response.json();
                    } else {
                        errorData = await response.text();
                    }
                } catch (e) {
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }

                const errorMessage = typeof errorData === 'object' && errorData.error 
                    ? errorData.error 
                    : (typeof errorData === 'string' ? errorData : `HTTP ${response.status}`);
                
                throw new Error(errorMessage);
            }

            // Успешный ответ
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
}

// Менеджер корзины
class CartManager {
    constructor() {
        this.items = this.loadCart();
        this.updateCartCount();
    }

    loadCart() {
        try {
            return JSON.parse(localStorage.getItem('cart')) || [];
        } catch (e) {
            return [];
        }
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.items));
        this.updateCartCount();
    }

    updateCartCount() {
        Components.updateCartCount();
    }

    async addToCart(productId) {
        try {
            // Загружаем информацию о товаре
            const product = await Components.apiCall(`/products/${productId}`);
            
            // Проверяем, есть ли уже товар в корзине
            const existingItem = this.items.find(item => item.id === productId);
            
            if (existingItem) {
                existingItem.quantity++;
            } else {
                this.items.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image_url,
                    quantity: 1
                });
            }
            
            this.saveCart();
            Components.showNotification(`${product.name} добавлен в корзину`);
        } catch (error) {
            console.error('Error adding to cart:', error);
            Components.showNotification('Ошибка добавления товара в корзину', 'error');
        }
    }

    removeFromCart(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveCart();
    }

    updateQuantity(productId, quantity) {
        if (quantity <= 0) {
            this.removeFromCart(productId);
            return;
        }
        
        const item = this.items.find(item => item.id === productId);
        if (item) {
            item.quantity = quantity;
            this.saveCart();
        }
    }

    getTotalPrice() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    async checkout(customerData) {
        const headers = customerData._headers || {};
        delete customerData._headers;

        const orderData = {
            ...customerData,
            items: this.items,
            total_amount: this.getTotalPrice() + (this.getTotalPrice() > 5000 ? 0 : 500)
        };

        try {
            const order = await Components.apiCall('/orders', {
                method: 'POST',
                headers,
                body: orderData
            });

            // Очищаем корзину
            this.items = [];
            this.saveCart();

            return order;
        } catch (error) {
            throw error;
        }
    }
}

// Загрузка компонентов при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = Components.header();
    }

    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        footerContainer.innerHTML = await Components.footer();
    }

    Components.updateCartCount();
    
    // Инициализируем глобальный объект shopApp с корзиной для главной страницы
    if (!window.shopApp) {
        window.shopApp = {
            cart: new CartManager()
        };
    }
});
