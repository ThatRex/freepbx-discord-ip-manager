import { z } from 'zod'

export const env = process.env
export const dev = env.NODE_ENV?.toLowerCase() !== 'production'

const envSchema = z.object({
    BOT_TOKEN: z.string(),
    IP_TRUST_TIMEOUT_HOURS: z.string().regex(/\d+/).transform(Number),
    ABUSEIPDB_KEY: z.string().optional(),
    IP_ABUSE_CONFIDENCE_REJECTION_PERCENTAGE: z
        .string()
        .regex(/\d+/)
        .optional()
        .default('50')
        .transform(Number),
    BLACKLIST_CSV: z.string()
})

envSchema.parse(process.env)

declare global {
    namespace NodeJS {
        interface ProcessEnv extends z.infer<typeof envSchema> {}
    }
}
