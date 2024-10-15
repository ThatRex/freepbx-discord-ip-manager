import cron from 'node-cron'
import { db, schema } from '../lib/db/index.js'
import { sql } from 'drizzle-orm'
import { dev, env } from '../lib/environment.js'
import { execPromise } from '../lib/utils/exec-promise.js'

const { ipLogs } = schema

const untrustTimedOutIPs = async () => {
    const hours = env.IP_TRUST_TIMEOUT_HOURS
    if (!hours) return

    console.log('Untrusting Timedout IPs.')
    try {
        const records = await db
            .update(ipLogs)
            .set({ timestamp_untrusted: sql`CURRENT_TIMESTAMP` })
            .where(
                sql`${ipLogs.timestamp_untrusted} IS NULL AND ${ipLogs.timestamp} <= datetime('now', '-${sql.raw(hours.toString())} hours')`
            )
            .returning({ ip: ipLogs.ipv4 })

        for (const { ip } of records) {
            console.log(ip)
            await execPromise(`fwconsole firewall untrust ${ip}`)
        }
    } catch (err: any) {
        console.error('Something went wrong untrusting IPs. Error:', err)
    }
    console.log('Done')
}

if (dev) {
    console.log('Dev Mode Detected. Running Jobs Immediately.')
    untrustTimedOutIPs()
}

cron.schedule('0 * * * *', untrustTimedOutIPs)
