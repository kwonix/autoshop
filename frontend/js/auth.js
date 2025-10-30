// auth.js - Логика авторизации и регистрации
class AuthApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupLoginForm();
        this.setupRegisterForm();
        this.setupPhoneInput();
        this.setupForgotPassword();
        this.checkExistingAuth();
    }

    setupPhoneInput() {
        const phoneInput = document.getElementById('phone');
        if (!phoneInput) return;

        // Устанавливаем начальное значение
        phoneInput.value = '+7 (';

        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            // Если пользователь удалил все, возвращаем начальное значение
            if (value.length === 0) {
                e.target.value = '+7 (';
                return;
            }

            // Оставляем только цифры после 7
            if (value.startsWith('7')) {
                value = value.substring(1);
            } else if (value.startsWith('8')) {
                value = value.substring(1);
            }

            // Ограничиваем длину до 10 цифр
            value = value.substring(0, 10);

            // Форматируем номер
            let formatted = '+7 (';
            if (value.length > 0) {
                formatted += value.substring(0, 3);
            }
            if (value.length >= 4) {
                formatted += ') ' + value.substring(3, 6);
            }
            if (value.length >= 7) {
                formatted += ' ' + value.substring(6, 8);
            }
            if (value.length >= 9) {
                formatted += ' ' + value.substring(8, 10);
            }

            e.target.value = formatted;
        });

        // Предотвращаем удаление префикса
        phoneInput.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.selectionStart <= 4) {
                e.preventDefault();
            }
        });

        // Устанавливаем курсор в правильную позицию при фокусе
        phoneInput.addEventListener('focus', (e) => {
            if (e.target.value === '+7 (') {
                e.target.setSelectionRange(4, 4);
            }
        });

        // При клике устанавливаем курсор после префикса
        phoneInput.addEventListener('click', (e) => {
            if (e.target.selectionStart < 4) {
                e.target.setSelectionRange(4, 4);
            }
        });
    }

    setupForgotPassword() {
        const forgotPasswordLink = document.getElementById('forgot-password-link');
        const modal = document.getElementById('forgot-password-modal');
        const closeModal = document.querySelector('.close-modal');
        const forgotPasswordForm = document.getElementById('forgot-password-form');

        if (!forgotPasswordLink || !modal) return;

        // Открытие модального окна
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            modal.style.display = 'flex';
        });

        // Закрытие модального окна
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        // Закрытие при клике вне окна
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Обработка формы восстановления пароля
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleForgotPassword();
            });
        }
    }

    async handleForgotPassword() {
        const email = document.getElementById('reset-email').value;
        const submitBtn = document.querySelector('#forgot-password-form button[type="submit"]');
        const originalText = submitBtn.textContent;

        submitBtn.innerHTML = '<div class="loading"></div>';
        submitBtn.disabled = true;

        try {
            // Здесь должен быть запрос на сервер для отправки письма восстановления
            // Для демонстрации просто показываем уведомление
            await new Promise(resolve => setTimeout(resolve, 1500)); // Имитация запроса
            
            Components.showNotification(
                'Ссылка для восстановления пароля отправлена на ' + email,
                'success'
            );
            
            document.getElementById('forgot-password-modal').style.display = 'none';
            document.getElementById('forgot-password-form').reset();
            
        } catch (error) {
            Components.showNotification('Ошибка при отправке ссылки', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
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

            // Сохраняем только токен — профиль хранится на сервере
            localStorage.setItem('user_token', result.token);

            Components.showNotification('Успешный вход!');

            // Перенаправляем в личный кабинет
            setTimeout(() => {
                window.location.href = 'account.html';
            }, 1000);

        } catch (error) {
            Components.showNotification(error.message, 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleRegister() {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const phone = document.getElementById('phone').value;

        // Валидация пароля
        if (password !== confirmPassword) {
            Components.showNotification('Пароли не совпадают', 'error');
            return;
        }

        if (password.length < 6) {
            Components.showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        // Извлекаем только цифры из отформатированного номера
        const phoneDigits = phone.replace(/\D/g, '');
        
        // Проверка длины номера (должно быть 11 цифр: 7 + 10)
        if (phoneDigits.length !== 11) {
            Components.showNotification('Введите корректный номер телефона', 'error');
            return;
        }

        const formData = {
            email: document.getElementById('email').value,
            password: password,
            full_name: document.getElementById('fullname').value,
            phone: '+' + phoneDigits // Сохраняем в формате +71234567890
        };

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

            // Автоматический переход на страницу входа после успешной регистрации
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);

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
        // Удаляем токен и очищаем возможные старые локальные данные
        localStorage.removeItem('user_token');
        localStorage.removeItem('user_data');
        window.location.href = 'index.html';
    }
}

// Инициализация авторизации
document.addEventListener('DOMContentLoaded', function() {
    window.authApp = new AuthApp();
});
