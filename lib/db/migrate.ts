import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"
import { users } from "./schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://taskmanager:taskmanager_password@localhost:5432/taskmanager'

  console.log("Подключение к базе данных...")
  console.log("Connection string:", connectionString.replace(/:[^:@]*@/, ':***@'))

  // Создаем соединение специально для миграций
  const migrationClient = postgres(connectionString, {
    max: 1,
    ssl: false
  })

  const db = drizzle(migrationClient, { schema: { users } })

  console.log("Запуск миграций...")

  try {
    await migrate(db, { migrationsFolder: "./drizzle" })
    console.log("Миграции выполнены успешно!")

    // Создаем главного администратора, если его нет
    console.log("Проверяем наличие главного администратора...")

    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@taskmanager.com"))
      .limit(1)

    if (existingAdmin.length === 0) {
      console.log("Создаем главного администратора...")
      const hashedPassword = await bcrypt.hash("admin123", 10)

      await db
        .insert(users)
        .values({
          email: "admin@taskmanager.com",
          passwordHash: hashedPassword,
          name: "Главный администратор",
          role: "admin",
          department: "Администрация",
        })

      console.log("✅ Главный администратор создан:")
      console.log("   Email: admin@taskmanager.com")
      console.log("   Пароль: admin123")
      console.log("   ⚠️  ВАЖНО: Смените пароль после первого входа!")
    } else {
      console.log("✅ Главный администратор уже существует")
    }

  } catch (error) {
    console.error("Ошибка выполнения миграций:", error)
    process.exit(1)
  } finally {
    await migrationClient.end()
    console.log("Соединение с БД закрыто")
  }
}

if (require.main === module) {
  runMigrations()
}

export { runMigrations }
