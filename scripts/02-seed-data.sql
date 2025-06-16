-- Создание главного администратора
INSERT INTO users (id, email, password_hash, name, role, department) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'admin@taskmanager.com', '$2b$12$91iEvEmCC37Mc.ovI4tK0ORMMCoJy0gBKrxAVPtr9zTXSWyDeEwrG', 'Главный Администратор', 'admin', 'Администрация');
