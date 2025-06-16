-- Сброс пароля для главного администратора на значение по умолчанию (admin123)
UPDATE users
SET password_hash = E'$2b$12$D6DH77IEiuQr101xORpV6OXxvIa6UsvfdywivRP2Jj/zcsLQqtyaa'
WHERE email = 'admin@taskmanager.com';
