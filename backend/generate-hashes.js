const bcrypt = require('bcryptjs');

// Generate password hashes for default users
async function generateHashes() {
    console.log('Generating password hashes for default users...\n');
    
    // Admin password: admin123
    const adminHash = await bcrypt.hash('admin123', 10);
    console.log('Admin (admin@autogadget.ru):');
    console.log('  Password: admin123');
    console.log('  Hash:', adminHash);
    console.log('');
    
    // User password: user123
    const userHash = await bcrypt.hash('user123', 10);
    console.log('User (user@example.com):');
    console.log('  Password: user123');
    console.log('  Hash:', userHash);
    console.log('');
    
    console.log('SQL to update init.sql:');
    console.log('----------------------------------------');
    console.log(`INSERT INTO admin_users (email, password_hash, name, role) VALUES`);
    console.log(`('admin@autogadget.ru', '${adminHash}', 'Администратор', 'admin')`);
    console.log(`ON CONFLICT (email) DO NOTHING;`);
    console.log('');
    console.log(`INSERT INTO users (email, password_hash, full_name, phone) VALUES`);
    console.log(`('user@example.com', '${userHash}', 'Тестовый Пользователь', '+79991234567')`);
    console.log(`ON CONFLICT (email) DO NOTHING;`);
}

generateHashes().catch(console.error);
