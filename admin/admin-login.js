// admin-login.js - Логика авторизации для админ-панели
class AdminAuth {
    constructor() {
        this.redirectChecked = false;
        this.init();
    }

    init() {
        // Сначала проверяем редирект, потом настраиваем форму
        this.checkExistingAuth().then(() => {
            this.setupLoginForm();
        });
    }

    async checkExistingAuth() {
        if (this.redirectChecked) return;
        
        const token = localStorage.getItem('admin_token');
        if (token) {
            try {
                // Проверяем валидность токена
                const response = await fetch('/api/admin/dashboard', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    // Токен валиден, перенаправляем в админку
                    window.location.href = 'admin.html';
                    return;
                } else {
                    // Токен невалиден, очищаем
                    localStorage.removeItem('admin_token');
                    localStorage.removeItem('admin_data');
                }
            } catch (error) {
                console.log('Token validation failed, staying on login page');
                // Ошибка сети или сервера - остаемся на странице логина
            }
        }
        this.redirectChecked = true;
    }

    setupLoginForm() {
        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });
    }

    async handleLogin() {
        const formData = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        };

        const submitBtn = document.querySelector('#login-form button[type="submit"]');
        const originalText = submitBtn.textContent;

        submitBtn.innerHTML = '<div class="loading"></div>';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка входа');
            }

            // Сохраняем токен и данные администратора
            localStorage.setItem('admin_token', data.token);
            localStorage.setItem('admin_data', JSON.stringify(data.admin));

            this.showNotification('Успешный вход! Перенаправление...', 'success');

            // Задержка перед перенаправлением чтобы показать уведомление
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);

        } catch (error) {
            this.showNotification(error.message, 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
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

// Инициализация авторизации
document.addEventListener('DOMContentLoaded', function() {
    window.adminAuth = new AdminAuth();
});