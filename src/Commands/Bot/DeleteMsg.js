const emojis = {
    success: '✅',
    error: '❌',
    adminOnly: '👮‍♂️',
    groupOnly: '👥'
};

module.exports = {
    usage: ["delete", "del"], // Allow both 'delete' and 'del'
    desc: "Deletes a specific message if the bot is an admin in the group.",
    commandType: "Bot",
    isGroupOnly: true,
    isAdminOnly: true,
    isPrivateOnly: false,
    emoji: emojis.success, // Emoji for successful deletion

    async execute(sock, m, args) {
        try {
            // Check if the command is being used in a group
            if (!m.key.remoteJid.endsWith('@g.us')) {
                await buddy.react(m, emojis.groupOnly);
                return await buddy.reply(m, "This command can only be used in groups.");
            }

            // Check if the bot is an admin in the group
            const groupMetadata = await sock.groupMetadata(m.key.remoteJid);
            const botId = sock.user.id.replace(/:.*$/, "") + "@s.whatsapp.net";
            const botIsAdmin = groupMetadata.participants.some(p => p.id.includes(botId) && p.admin);

            if (!botIsAdmin) {
                await buddy.react(m, emojis.adminOnly);
                return await buddy.reply(m, "I need to be an admin to delete messages.");
            }


            // Get the message to be deleted (you might need to adjust how you fetch the target message)
            const quotedMessage = await buddy.getQuotedText(m);

            if (quotedMessage) {
                await buddy.deleteMsg(m);
                await buddy.react(m, emojis.success);
            } else {
                await buddy.reply(m, "Please quote/reply to the message you want me to delete.");
            }
        } catch (error) {
            await buddy.react(m, emojis.error);
            await buddy.reply(m, ("❌ An error occurred while trying to delete the message." + error));
        }
    }
};