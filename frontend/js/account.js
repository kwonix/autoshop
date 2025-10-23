// account.js - Логика личного кабинета пользователя
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');
    if (!token) {
        // Перенаправляем на страницу входа
        window.location.href = 'login.html';
        return;
    }

    // Получаем профиль с сервера — профиль должен храниться на стороне сервера
    let user = {};
    try {
        const profile = await Components.apiCall('/auth/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        user = profile || {};
    } catch (e) {
        console.warn('Profile fetch failed; profile data unavailable', e);
    }

    // Заполняем форму профиля
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-name').value = user.full_name || '';
    document.getElementById('profile-phone').value = user.phone || '';

    document.getElementById('logout').addEventListener('click', () => {
        localStorage.removeItem('user_token');
        localStorage.removeItem('user_data');
        window.location.href = 'index.html';
    });

    document.getElementById('save-profile').addEventListener('click', async () => {
        const name = document.getElementById('profile-name').value;
        const phone = document.getElementById('profile-phone').value;

        // Попытка отправить изменения на сервер
        try {
            const result = await Components.apiCall('/auth/profile', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: {
                    full_name: name,
                    phone: phone
                }
            });

                // Обновляем интерфейс (не сохраняем профиль в localStorage — он хранится на сервере)
                const newUser = Object.assign({}, user, result.user);
                document.getElementById('profile-email').value = newUser.email || '';
                document.getElementById('profile-name').value = newUser.full_name || '';
                document.getElementById('profile-phone').value = newUser.phone || '';
                Components.showNotification('Профиль сохранён');
        } catch (error) {
            console.error('Ошибка сохранения профиля на сервере:', error);
                // Не сохраняем профиль локально — показываем ошибку и предлагаем повторить
                Components.showNotification('Ошибка сохранения профиля на сервере. Попробуйте позже.', 'error');
        }
    });

    // Попытка загрузить заказы пользователя с сервера
    try {
        const orders = await Components.apiCall('/orders', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        renderOrders(orders);
        document.getElementById('orders-note').textContent = '';
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        document.getElementById('orders-list').innerHTML = '<p>Не удалось загрузить историю заказов.</p>';
        document.getElementById('orders-note').textContent = 'Если сервер возвращает ошибку, возможно, отсутствует соответствующий бэкенд-эндпоинт. Мы добавили GET /api/orders в backend для возврата заказов по email из токена.';
    }
});

function renderOrders(orders) {
    const container = document.getElementById('orders-list');
    if (!container) return;

    if (!orders || orders.length === 0) {
        container.innerHTML = '<p>История заказов пуста.</p>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="card" style="padding:12px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>Заказ #${order.id}</strong>
                    <div style="font-size:0.9em; color:#666">${new Date(order.created_at).toLocaleString()}</div>
                </div>
                <div style="text-align:right">
                    <div style="font-weight:600">${Components.formatPrice(order.total_amount || 0)}</div>
                    <div class="status-badge status-${order.status}" style="margin-top:6px">${order.status}</div>
                </div>
            </div>
            <div style="margin-top:10px; font-size:0.95em; color:#333">
                ${renderOrderItems(order.items)}
            </div>
        </div>
    `).join('');
}

function renderOrderItems(itemsJson) {
    try {
        const items = typeof itemsJson === 'string' ? JSON.parse(itemsJson) : itemsJson;
        if (!items || items.length === 0) return '<div style="color:#666">Нет товаров в заказе</div>';

        return `
            <div style="border-top:1px solid #eee; margin-top:10px; padding-top:10px;">
                ${items.map(it => `
                    <div style="display:flex; justify-content:space-between; padding:4px 0;">
                        <div>${it.name}</div>
                        <div>${it.quantity} × ${Components.formatPrice(it.price)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        console.error('Ошибка рендера items', e);
        return '<div style="color:#666">Невозможно прочитать товары заказа</div>';
    }
}
