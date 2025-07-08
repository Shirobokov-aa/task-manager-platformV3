const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function generateHash() {
    const password = 'admin123'; // пароль для главного администратора
    const hash = await bcrypt.hash(password, 12);

    const sql = `-- Создание главного администратора
INSERT INTO users (id, email, password_hash, name, role, department) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'admin@taskmanager.com', '${hash}', 'Главный Администратор', 'admin', 'Администрация');
`;

    fs.writeFileSync(path.join(__dirname, '02-seed-data.sql'), sql);
    console.log('Generated hash:', hash);
    console.log('SQL file updated successfully');
    console.log('Admin credentials:');
    console.log('Email: admin@taskmanager.com');
    console.log('Password: admin123');
}

generateHash().catch(console.error);
