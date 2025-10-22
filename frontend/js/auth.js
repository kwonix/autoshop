// auth.js - Логика авторизации и регистрации
class AuthApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupLoginForm();
        this.setupRegisterForm();
        this.checkExistingAuth();
    }

    setupLoginForm() {
        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });
    }

    setupRegisterForm() {
        const form = document.getElementById('register-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
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
            const result = await Components.apiCall('/auth/login', {
                method: 'POST',
                body: formData
            });

            // Сохраняем токен и данные пользователя
            localStorage.setItem('user_token', result.token);
            localStorage.setItem('user_data', JSON.stringify(result.user));

            Components.showNotification('Успешный вход!');

            // Перенаправляем на главную страницу
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);

        } catch (error) {
            Components.showNotification(error.message, 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleRegister() {
        const formData = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            full_name: document.getElementById('fullname').value,
            phone: document.getElementById('phone').value
        };

        // Валидация пароля
        if (formData.password !== document.getElementById('confirm-password').value) {
            Components.showNotification('Пароли не совпадают', 'error');
            return;
        }

        if (formData.password.length < 6) {
            Components.showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        const submitBtn = document.querySelector('#register-form button[type="submit"]');
        const originalText = submitBtn.textContent;

        submitBtn.innerHTML = '<div class="loading"></div>';
        submitBtn.disabled = true;

        try {
            const result = await Components.apiCall('/auth/register', {
                method: 'POST',
                body: formData
            });

            Components.showNotification(result.message);

            // Автоматически логиним пользователя после регистрации
            setTimeout(async () => {
                await this.handleLogin();
            }, 1000);

        } catch (error) {
            Components.showNotification(error.message, 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    checkExistingAuth() {
        const token = localStorage.getItem('user_token');
        if (token && (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html'))) {
            // Если пользователь уже авторизован, перенаправляем на главную
            window.location.href = 'index.html';
        }
    }

    static logout() {
        localStorage.removeItem('user_token');
        localStorage.removeItem('user_data');
        window.location.href = 'index.html';
    }
}

// Инициализация авторизации
document.addEventListener('DOMContentLoaded', function() {
    window.authApp = new AuthApp();
});