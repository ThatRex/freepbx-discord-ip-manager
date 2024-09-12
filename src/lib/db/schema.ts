import { sql } from 'drizzle-orm'
import { text, integer, sqliteTable, index } from 'drizzle-orm/sqlite-core'

export const ipLogs = sqliteTable(
    'ip_logs',
    {
        id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
        timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
        timestamp_untrusted: text('timestamp_untrusted'),
        ipv4: text('ipv4').notNull(),
        note: text('note'),
        discordUserID: text('discord_userid').notNull()
    },
    (tbl) => {
        return {
            ipv4Idx: index('ip4v_idx').on(tbl.ipv4)
        }
    }
)
