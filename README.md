# AutoShop - Интернет-магазин автомобильных аксессуаров

Полнофункциональный интернет-магазин с админ-панелью на чистом HTML/CSS/JS и Node.js бэкенде.

## 🚀 Возможности

### Для клиентов
- 📦 Каталог товаров с фильтрацией и поиском
- 🛒 Корзина покупок
- 👤 Регистрация и авторизация
- 📱 Адаптивный дизайн
- ✉️ Обратная связь

### Для администраторов
- 📊 Дашборд с аналитикой
- 📦 Управление заказами
- 🛍️ CRUD для товаров и категорий
- 📈 Аналитика продаж
- ✉️ Управление обратной связью

## 🛠 Технологии

- **Frontend**: Pure HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Web Server**: Nginx
- **Deployment**: Docker & Docker Compose

## 🐳 Docker Quick Start

### Требования
- Docker Engine 20.10+
- Docker Compose 2.0+

### Быстрая установка (3 шага)

1. **Настройка окружения:**
```bash
cd autoshop
cp .env.example .env
# Отредактируйте .env и установите надежные пароли
```

2. **Запуск сервисов:**
```bash
docker-compose up -d
```

3. **Доступ к приложению:**
- **Frontend**: http://localhost
- **Admin панель**: http://localhost/admin
- **API**: http://localhost/api

### Управление через скрипты

**Windows:**
```cmd
docker-manager.bat
```

**Linux/Mac:**
```bash
chmod +x docker-manager.sh
./docker-manager.sh
```

## 📚 Документация

- **[QUICKSTART.md](QUICKSTART.md)** - Быстрый старт с Docker
- **[DOCKER_README.md](DOCKER_README.md)** - Полная документация по Docker
- **[DOCKER_MIGRATION.md](DOCKER_MIGRATION.md)** - Описание миграции на Docker

## 🔧 Основные команды Docker

```bash
# Запуск всех сервисов
docker-compose up -d

# Остановка сервисов
docker-compose down

# Просмотр логов
docker-compose logs -f

# Перезапуск после изменений
docker-compose up -d --build

# Проверка статуса
docker-compose ps

# Резервное копирование БД
docker-compose exec postgres pg_dump -U autoshop_user autoshop > backup.sql
```

## 📊 Архитектура

```
┌─────────────────────┐
│   Nginx Container   │
│   (Port 80, 443)    │
│   - Frontend files  │
│   - Admin panel     │
│   - API proxy       │
└──────────┬──────────┘
           │
           ├─────────────────────┐
           │                     │
    ┌──────▼──────┐      ┌──────▼──────┐
    │   Backend   │      │  PostgreSQL │
    │  Container  │◄─────│  Container  │
    │ (Port 3000) │      │ (Port 5432) │
    └─────────────┘      └─────────────┘
```

## 🔒 Безопасность

Перед продакшн развертыванием обязательно:

- [ ] Измените `POSTGRES_PASSWORD` в `.env`
- [ ] Сгенерируйте надежный `JWT_SECRET` в `.env`
- [ ] Обновите пароль администратора после первого входа
- [ ] Настройте HTTPS/SSL сертификаты
- [ ] Настройте файрвол
- [ ] Настройте регулярное резервное копирование

## 🌟 Функционал

### Клиентская часть
- Главная страница с популярными товарами
- Каталог с фильтрацией по категориям
- Поиск товаров
- Корзина покупок
- Форма заказа
- Регистрация и авторизация
- Обратная связь

### Админ панель
- Dashboard с общей статистикой
- Управление заказами (создание, просмотр, обновление статуса)
- Управление товарами (CRUD операции)
- Управление категориями
- Просмотр сообщений обратной связи
- Аналитика продаж

## 🗄️ База данных

### Таблицы
- `products` - Товары
- `categories` - Категории
- `orders` - Заказы
- `order_status_history` - История статусов заказов
- `users` - Пользователи
- `admin_users` - Администраторы
- `contact_messages` - Сообщения обратной связи

### Миграции
Все миграции БД находятся в `backend/database/` и автоматически применяются при первом запуске контейнера.

## 🔄 Процесс разработки

1. Внесите изменения в код
2. Пересоберите сервисы: `docker-compose up -d --build`
3. Проверьте логи: `docker-compose logs -f backend`
4. Протестируйте изменения
5. Закоммитьте в git

## 🐛 Устранение неполадок

### Сервисы не запускаются
```bash
docker-compose down
docker-compose up -d
docker-compose logs
```

### Порты заняты
```bash
# Windows
netstat -ano | findstr ":80"

# Linux/Mac
lsof -i :80
```

### Проблемы с БД
```bash
# Проверка здоровья БД
docker-compose exec postgres pg_isready -U autoshop_user

# Логи БД
docker-compose logs postgres

# Перезапуск БД
docker-compose restart postgres
```

## 📈 Мониторинг

```bash
# Использование ресурсов
docker stats

# Использование диска
docker system df

# Здоровье сервисов
curl http://localhost:3000/api/health
```

## 🔄 Обновление

```bash
# Получить последние изменения
git pull

# Пересобрать и перезапустить
docker-compose up -d --build

# Очистить неиспользуемые образы
docker image prune -a -f
```

## 💾 Резервное копирование

```bash
# Создать резервную копию
docker-compose exec -T postgres pg_dump -U autoshop_user autoshop > backup.sql

# Восстановить из резервной копии
cat backup.sql | docker-compose exec -T postgres psql -U autoshop_user -d autoshop
```

## 🤝 Вклад в проект

1. Fork проекта
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## 📝 Лицензия

Этот проект распространяется под лицензией MIT.

## 📞 Контакты

- Email: support@autogadget.ru
- Telegram: @autoshop_support

## 🙏 Благодарности

- Спасибо всем контрибьюторам
- Node.js и Express.js за отличный фреймворк
- PostgreSQL за надежную БД
- Docker за упрощение развертывания

---

**Готово к работе!** Запустите `docker-compose up -d` и начните использовать 🚀
