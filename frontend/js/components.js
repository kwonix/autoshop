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
                                    🛒 Корзина <span id="cart-count">0</span>
                                </a></li>
                                <li><a href="login.html" class="login-btn ${window.location.pathname.endsWith('login.html') ? 'active' : ''}">
                                    ${localStorage.getItem('user_token') ? 'Кабинет' : 'Войти'}
                                </a></li>
                            </ul>
                        </nav>
                    </div>
                </div>
            </header>
        `;
    }

    static footer() {
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
                                <li><a href="catalog.html?category=electronics">Автоэлектроника</a></li>
                                <li><a href="catalog.html?category=care">Уход за авто</a></li>
                                <li><a href="catalog.html?category=accessories">Автоаксессуары</a></li>
                                <li><a href="catalog.html?category=safety">Безопасность</a></li>
                            </ul>
                        </div>
                        <div class="footer-column">
                            <h3>Помощь</h3>
                            <ul>
                                <li><a href="#">Доставка и оплата</a></li>
                                <li><a href="#">Гарантия и возврат</a></li>
                                <li><a href="#">Частые вопросы</a></li>
                                <li><a href="#">Отзывы</a></li>
                            </ul>
                        </div>
                        <div class="footer-column">
                            <h3>Контакты</h3>
                            <ul>
                                <li>г. Москва, ул. Автозаводская, д. 15</li>
                                <li>+7 (495) 123-45-67</li>
                                <li>info@autogadget.ru</li>
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

    static async apiCall(endpoint, options = {}) {
        const baseURL = '/api';
        const url = `${baseURL}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка сервера');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
}

// Загрузка компонентов при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем header
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = Components.header();
    }

    // Загружаем footer
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        footerContainer.innerHTML = Components.footer();
    }

    // Обновляем счетчик корзины
    CartManager.updateCartCount();
});