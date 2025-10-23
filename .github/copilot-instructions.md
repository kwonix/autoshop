## Краткие инструкции для AI-кодеров (AutoShop)

Ниже — специфичные, практические указания, которые помогут быстро вносить изменения в этот репозиторий.

1. Большая картина
   - Архитектура: Nginx (статические файлы + прокси /api) → Backend (Express, порт 3000) → PostgreSQL. Файлы: `nginx/nginx.conf`, `Dockerfile`, `docker-compose.yml`.
   - Frontend: чистый HTML/CSS/JS в `frontend/` (вьюхи) и `admin/` (админка). Backend может также отдавать статику при локальном запуске — см. `backend/server.js` (express.static('../frontend')).

2. Ключевые рабочие файлы
   - API / сервер: `backend/server.js` — все REST-эндпоинты (`/api/*`, `/api/admin/*`), JWT-авторизация, rate-limit, helmet.
   - DB-конфиг и миграции: `backend/config/database.js`, `backend/database/init.sql`, `backend/database/migrations.sql`.
   - Пакеты/скрипты: `backend/package.json` (скрипты `start`, `dev`, `migrate`). Node.js >=18 required.
   - Docker: `docker-compose.yml` (сервисы: postgres, backend, nginx), `Dockerfile` (multi-stage для backend).

3. Dev / запуск / отладка (конкретно)
   - Быстрый запуск (локально, docker):
     - Скопируй `.env.example` → `.env`, проверь `POSTGRES_PASSWORD` и `JWT_SECRET`.
     - `docker-compose up -d` — старт всех сервисов.
   - Локальная разработка backend без докера:
     - В `backend/` выполнить `npm install`, затем `npm run dev` (nodemon) — backend слушает 3000 и отдаёт статику из `../frontend`.
   - Миграции БД:
     - `npm run migrate` в `backend/` или `require('./config/database').runMigrations()`; docker-compose при старте монтирует `backend/database/*.sql` в `/docker-entrypoint-initdb.d`.
   - Healthchecks, логи:
     - Backend health: `GET /api/health` (используется в healthcheck). Для логов: `docker-compose logs -f backend`.

4. Частые паттерны и соглашения
   - API-уровень: все маршруты под `/api` и `/api/admin`. Админские проверки — middleware `authenticateAdmin` в `backend/server.js`.
   - Авторизация: JWT, токен в заголовке `Authorization: Bearer <token>`; на фронтенде — `localStorage` ключи `user_token`, `user_data`, `admin_token`, `admin_data`.
   - SQL: используется `pg` с параметризованными запросами `$1, $2...` в `backend/server.js`.
   - Без сборки фронтенда: статические файлы — обычные HTML/JS; правки в `frontend/` и `admin/` сразу видны при перезагрузке Nginx/локального сервера.

5. Интеграционные места, на которые стоит обратить внимание при изменениях
   - Любое изменение API требует проверки `nginx/nginx.conf` (проксирование `/api` → `backend:3000`) и healthcheck в `docker-compose.yml`.
   - Изменения в структуре БД: обновляй `backend/database/migrations.sql` и `init.sql` и запускай `npm run migrate` или перезапусти контейнер БД (в Docker — монтирование применит init-скрипты только при инициализации нового тома).
   - Изменение схемы ответа API: обнови фронтенд файлы в `frontend/js/` и `admin/` (формы, Components.apiCall) — клиент жестко ожидает поля (например, `token`, `user`, `id`, `status`).

6. Примеры типовых задач и шаги
   - «Добавить поле product.color» — 1) добавить колонку в `migrations.sql`, 2) обновить `backend` запросы в `server.js`, 3) обновить формы/рендер на `frontend` и `admin`, 4) протестировать в Docker (`docker-compose up -d --build`) и проверить `/api/products/:id`.
   - «Исправить 401 на админ-роуте» — проверь `authenticateAdmin` и генерацию токена в `/api/admin/login` (token payload должен содержать `isAdmin: true`).

7. Что не нужно делать автоматически
   - Не менять `backend/database/init.sql` и ожидать переноса в работающую БД с уже созданным томом — init файлы применяются только при создании нового контейнера/тома.
   - Не менять JWT_SECRET в продакшене через код — это конфиг окружения (`.env` / docker-compose env).

8. Полезные файлы для справки
   - `README.md` (корень) — быстрый старт и команды docker
   - `QUICKSTART.md`, `DOCKER_README.md` — расширённая дока по контейнерам
   - `backend/server.js`, `backend/config/database.js`, `backend/package.json` — ядро логики

Если что-то неполно или нужно добавить примеры для специфичных задач (например, как добавлять новые admin-страницы или писать миграции), скажите — добавлю примеры и чеклист интеграции.
