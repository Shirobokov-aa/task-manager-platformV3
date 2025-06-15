-- Создание тестовых пользователей
INSERT INTO users (id, email, password_hash, name, role, department) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'admin@company.com', E'$2b$12$D6DH77IEiuQr101xORpV6OXxvIa6UsvfdywivRP2Jj/zcsLQqtyaa', 'Администратор', 'admin', 'IT'),
    ('550e8400-e29b-41d4-a716-446655440002', 'manager@company.com', E'$2b$12$D6DH77IEiuQr101xORpV6OXxvIa6UsvfdywivRP2Jj/zcsLQqtyaa', 'Менеджер Проекта', 'project_manager', 'Разработка'),
    ('550e8400-e29b-41d4-a716-446655440003', 'developer@company.com', E'$2b$12$D6DH77IEiuQr101xORpV6OXxvIa6UsvfdywivRP2Jj/zcsLQqtyaa', 'Разработчик', 'executor', 'Разработка'),
    ('550e8400-e29b-41d4-a716-446655440004', 'observer@company.com', E'$2b$12$D6DH77IEiuQr101xORpV6OXxvIa6UsvfdywivRP2Jj/zcsLQqtyaa', 'Наблюдатель', 'observer', 'QA');

-- Создание тестового проекта
INSERT INTO projects (id, title, description, owner_id) VALUES
    ('660e8400-e29b-41d4-a716-446655440001', 'Веб-платформа задачника', 'Разработка внутренней системы управления задачами', '550e8400-e29b-41d4-a716-446655440002');

-- Добавление участников проекта
INSERT INTO project_members (project_id, user_id, role) VALUES
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'project_manager'),
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'executor'),
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'observer');

-- Создание тестовых задач
INSERT INTO tasks (id, title, description, project_id, assignee_id, creator_id, status, priority, complexity, due_date, tags) VALUES
    ('770e8400-e29b-41d4-a716-446655440001', 'Настройка базы данных', 'Создание схемы БД и начальных данных', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'completed', 'high', 3, '2024-01-15 18:00:00', ARRAY['backend', 'database']),
    ('770e8400-e29b-41d4-a716-446655440002', 'Разработка UI компонентов', 'Создание основных компонентов интерфейса', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'in_progress', 'medium', 5, '2024-01-20 18:00:00', ARRAY['frontend', 'ui']);

-- Создание подзадачи
INSERT INTO tasks (id, title, description, project_id, parent_task_id, assignee_id, creator_id, status, priority, complexity, tags) VALUES
    ('770e8400-e29b-41d4-a716-446655440003', 'Компонент списка задач', 'Создание компонента для отображения списка задач', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'open', 'medium', 2, ARRAY['frontend', 'component']);
