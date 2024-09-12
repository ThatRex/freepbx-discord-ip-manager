import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db, sqlite } from '.'

migrate(db, { migrationsFolder: './src/lib/db/migrations' })
sqlite.close()
