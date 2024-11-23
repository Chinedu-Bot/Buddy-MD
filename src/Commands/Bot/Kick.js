const emojis = {
    kick: '🚫',
    admin: '👑',
    error: '❌',
    success: '✅',
    warning: '⚠️'
};

module.exports = {
    usage: ["kick", "remove"],
    desc: "Kick a member from the group",
    commandType: "Group",
    isGroupOnly: true,
    isAdminOnly: true,
    isPrivateOnly: false,
    emoji: emojis.kick,
    async execute(sock, m, args, { isOwner, isGroupAdmin }) {
        try {
            if (!isGroupAdmin) {
                return buddy.reply(m, `${emojis.error} This command can only be used by group admins.`);
            }

            const quoted = await buddy.getQuotedMessage(m);

            let kickUser;

            if (m.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                kickUser = m.message.extendedTextMessage.contextInfo.mentionedJid[0]; // Get the first mentioned user
            } else if (m.message?.extendedTextMessage?.contextInfo?.participant) {
                kickUser = m.message.extendedTextMessage.contextInfo.participant; // Get from quoted message
            }
            // Check if there's an argument (mention or JID)
            else if (args.length > 0) {
                kickUser = args[0].replace('@', '') + '@s.whatsapp.net';
            }
            // If no user is specified
            else {
                return buddy.reply(m, `${emojis.warning} Please mention a user or reply to their message to kick them.`);
            }

            // Ensure the bot has permission to remove participants
            const groupMetadata = await sock.groupMetadata(m.chat);
            const participants = groupMetadata.participants;
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const isBotAdmin = participants.find(p => p.id === botJid)?.admin === 'admin';

            if (!isBotAdmin) {
                return buddy.reply(m, `${emojis.error} I need to be an admin to kick members.`);
            }

            // Check if the user to be kicked is in the group
            const isUserInGroup = participants.some(p => p.id === kickUser);
            if (!isUserInGroup) {
                return buddy.reply(m, `${emojis.error} This user is not in the group.`);
            }

            // Check if the user to be kicked is an admin
            const isKickUserAdmin = participants.find(p => p.id === kickUser)?.admin === 'admin' || participants.find(p => p.id === kickUser)?.admin === 'superadmin';
            if (isKickUserAdmin) {
                return buddy.reply(m, `${emojis.admin} You can't kick another admin.`);
            }

            // Kick the user
            await sock.groupParticipantsUpdate(m.key.remoteJid, [kickUser], 'remove');

            // Get user's name or use their number if name is not available
            const kickedUser = participants.find(p => p.id === kickUser);
            const userName = kickedUser.pushName || kickUser.split('@')[0];

            buddy.reply(m, `${emojis.success} Successfully kicked ${userName} from the group.`);

        } catch (error) {
            console.error("Error in kick command:", error);
            buddy.reply(m, `${emojis.error} An error occurred while trying to kick the user. Please try again later.`);
        }
    }
};