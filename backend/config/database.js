const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'autogadget_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'autogadget',
    password: process.env.DB_PASSWORD || 'autogadget_password_2025',
    port: process.env.DB_PORT || 5432,
});

// Тестирование подключения
pool.on('connect', () => {
    console.log('Подключение к PostgreSQL установлено');
});

pool.on('error', (err) => {
    console.error('Ошибка подключения к PostgreSQL:', err);
});

// Функция для выполнения миграций
async function runMigrations() {
    try {
        const fs = require('fs');
        const path = require('path');
        const migrationSQL = fs.readFileSync(path.join(__dirname, '../database/init.sql'), 'utf8');
        
        const client = await pool.connect();
        try {
            await client.query(migrationSQL);
            console.log('Миграции выполнены успешно');
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Ошибка выполнения миграций:', error);
    }
}

module.exports = {
    pool,
    runMigrations
};