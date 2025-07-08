import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://taskmanager:taskmanager_password@localhost:5432/taskmanager'
  },
  verbose: true,
  strict: true,
} satisfies Config
