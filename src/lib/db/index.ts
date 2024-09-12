import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'

export const sqlite = new Database('database.db')
export const db = drizzle(sqlite)
export * as schema from './schema.js'
