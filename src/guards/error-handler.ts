import { GuardFunction } from 'discordx'
import { CommandInteraction, DiscordAPIError } from 'discord.js'

export const ErrorHandler: GuardFunction<CommandInteraction> = async (
    interaction,
    client,
    next
) => {
    try {
        await next()
    } catch (err: any) {
        let message: string

        switch (true) {
            case err instanceof DiscordAPIError && [50001, 50013].includes(err.code as number): {
                message = `Sorry, I don't have permission to do that.`
                break
            }
            case err instanceof Error: {
                message = `Error: ${err.message}`
                break
            }
            default: {
                message = 'Unknown Error'
            }
        }

        console.error(`Error while running command ${interaction.commandName}: ${message}`)
        if (interaction.deferred) interaction.editReply({ content: message })
        else interaction.reply({ content: message, ephemeral: true })
    }
}
