import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'localhost',
    port: 5432,
    database: 'taskmanager',
    user: 'taskmanager',
    password: 'taskmanager_password'
  }
} satisfies Config
