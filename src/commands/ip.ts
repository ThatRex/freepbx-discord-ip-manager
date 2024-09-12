import { exec } from 'child_process'
import { ApplicationCommandOptionType, CommandInteraction, User } from 'discord.js'
import { Discord, Guard, Slash, SlashGroup, SlashOption } from 'discordx'
import { IPV4_REGEX } from '../lib/regex.js'
import util from 'util'
import { db, schema } from '../lib/db/index.js'
import { and, asc, eq, sql } from 'drizzle-orm'
import { ErrorHandler } from '../guards/error-handler.js'
import moment from 'moment'
import { env } from '../lib/environment.js'

const execPromise = util.promisify(exec)

const { ipLogs } = schema

async function genHistory(interaction: CommandInteraction, user?: User) {
    const queryBase = db
        .select({
            ip: ipLogs.ipv4,
            note: ipLogs.note,
            timestamp: ipLogs.timestamp,
            timestamp_untrusted: ipLogs.timestamp_untrusted,
            userId: ipLogs.discordUserID
        })
        .from(ipLogs)
        .limit(100)
        .orderBy(asc(ipLogs.timestamp))

    const query = !user ? queryBase : queryBase.where(eq(ipLogs.discordUserID, user.id))

    const records = await query

    const maxLenIP = Math.max(...records.map(({ ip }) => ip.length))

    let content = '# IP History\n```\n'
    for (const { ip, note, timestamp, timestamp_untrusted, userId } of records) {
        const a = ip.padEnd(maxLenIP, ' ')
        const b = timestamp_untrusted ? 'Untrusted' : 'Trusted'
        const c = moment(timestamp_untrusted ?? timestamp).format('YYYY-MM-DD HH:mm:ss')
        const d = note ? ` - ${note}` : ''

        content = content + `${a} : `

        if (!user) {
            const u = await interaction.client.users.fetch(userId)
            content = content + `${u.username} `
        }

        content = content + `${b} @ ${c}${d}\n`
    }
    content = content + '\n```'

    return content
}

@Discord()
@Guard(ErrorHandler)
@SlashGroup({ description: 'Staff IP Management', name: 'ip', root: 'staff' })
@SlashGroup('ip', 'staff')
class IPStaff {
    @Slash({ name: 'list', description: 'View IP history.' })
    async list(
        @SlashOption({
            description: 'User whos history to view',
            name: 'user',
            required: false,
            type: ApplicationCommandOptionType.User
        })
        user: User,

        interaction: CommandInteraction
    ) {
        const content = await genHistory(interaction, user)
        await interaction.reply({
            content,
            ephemeral: true
        })
    }
}

@Discord()
@Guard(ErrorHandler)
@SlashGroup({ description: 'Manage IPs', name: 'ip' })
@SlashGroup('ip')
class IP {
    @Slash({ name: 'list', description: 'View your IP history.' })
    async list(interaction: CommandInteraction) {
        const content = await genHistory(interaction, interaction.user)

        await interaction.reply({
            content,
            ephemeral: true
        })
    }

    @Slash({ name: 'trust', description: 'Trust an IP.' })
    async trust(
        @SlashOption({
            name: 'ipv4',
            description: 'Your Public IPV4 Address.',
            required: true,
            type: ApplicationCommandOptionType.String
        })
        ip: string,

        @SlashOption({
            name: 'note',
            description: 'a note',
            required: false,
            type: ApplicationCommandOptionType.String
        })
        note: string,

        interaction: CommandInteraction
    ) {
        if (!ip.match(IPV4_REGEX)) {
            const content =
                'Please provide a valid IPv4 Address. [Get your IP here.](https://api.ipify.org/?format=txt)'
            await interaction.reply({ content, ephemeral: true })
            return
        }

        let reject = false
        let rejectReason = ''

        const ipTrusted = await this.isTrustedIP(ip)
        if (ipTrusted) {
            reject = true
            rejectReason = 'This IP is already trusted.'
        }

        if (!reject && env.ABUSEIPDB_KEY) {
            const url = `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}`
            const res = await fetch(url, { headers: { Key: env.ABUSEIPDB_KEY } })
            if (res.ok) {
                const json = await res.json()
                if (
                    json.data.abuseConfidenceScore >=
                    env.IP_ABUSE_CONFIDENCE_REJECTION_PERCENTAGE
                ) {
                    reject = true
                    rejectReason = `IP abuse confidence score is to high.`
                }
            }
        }

        if (reject) {
            await interaction.reply({
                content: `IP Rejected. Reason: ${rejectReason}`,
                ephemeral: true
            })
            return
        }

        await execPromise(`fwconsole firewall trust ${ip}`)
        await db.insert(ipLogs).values({
            discordUserID: interaction.user.id,
            ipv4: ip,
            note
        })

        await interaction.reply({ content: 'Your IP has been trusted.', ephemeral: true })
    }

    @Slash({ name: 'untrust', description: 'Untrust an IP.' })
    async untrust(
        @SlashOption({
            name: 'ipv4',
            description: 'Your Public IPV4 Address.',
            required: true,
            type: ApplicationCommandOptionType.String
        })
        ip: string,

        interaction: CommandInteraction
    ) {
        if (!ip.match(IPV4_REGEX)) {
            const content = 'Please provide a valid IPv4 Address.'
            await interaction.reply({ content, ephemeral: true })
            return
        }

        const ipTrusted = await this.isTrustedIP(ip)
        if (!ipTrusted) {
            await interaction.reply({ content: 'This IP is not trusted.', ephemeral: true })
            return
        }

        const records = await db
            .select()
            .from(ipLogs)
            .where(and(eq(ipLogs.ipv4, ip), eq(ipLogs.discordUserID, interaction.user.id)))
            .limit(1)

        if (records.length) {
            await execPromise(`fwconsole firewall untrust ${ip}`)
            await db
                .update(ipLogs)
                .set({ timestamp_untrusted: sql`CURRENT_TIMESTAMP` })
                .where(and(eq(ipLogs.ipv4, ip), eq(ipLogs.discordUserID, interaction.user.id)))
            await interaction.reply({ content: 'Your IP has been untusted.', ephemeral: true })
            return
        }

        await interaction.reply({
            content: 'This IP is not associated with your account.',
            ephemeral: true
        })
    }

    private async isTrustedIP(ip: string) {
        const output = await execPromise(`fwconsole firewall list trusted | grep ${ip}`)
        return !!output.stdout
    }
}
