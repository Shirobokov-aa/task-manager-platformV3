import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const connectionString = process.env.DATABASE_URL!

// Создаем пул соединений с ограниченным количеством клиентов
const client = postgres(connectionString, {
  max: 10, // максимальное количество соединений
  idle_timeout: 20, // время в секундах, после которого неиспользуемое соединение закрывается
  connect_timeout: 10, // время ожидания соединения в секундах
})

// Обработка закрытия соединений при завершении работы
process.on('SIGTERM', () => {
  console.log('Closing DB connections...')
  client.end().then(() => {
    console.log('DB connections closed.')
    process.exit(0)
  })
})

export const db = drizzle(client, { schema })
