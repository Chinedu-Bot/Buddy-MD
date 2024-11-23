const emojis = {
    promote: '⬆️',
    demote: '⬇️',
    admin: '👑',
    error: '❌',
    success: '✅',
    warning: '⚠️'
};

module.exports = {
    usage: ["promote", "demote"],
    desc: "Promote or demote a member in the group",
    commandType: "Group",
    isGroupOnly: true,
    isAdminOnly: true,
    isPrivateOnly: false,
    emoji: emojis.admin,
    async execute(sock, m, args, { isOwner, isGroupAdmin }) {
        try {
            if (!isGroupAdmin) {
                return buddy.reply(m, `${emojis.error} This command can only be used by group admins.`);
            }

            const isPromote = m.body.startsWith('/promote');
            const action = isPromote ? 'promote' : 'demote';
            const actionEmoji = isPromote ? emojis.promote : emojis.demote;

            let targetUser;
            if (m.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                targetUser = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (m.message?.extendedTextMessage?.contextInfo?.participant) {
                targetUser = m.message.extendedTextMessage.contextInfo.participant;
            } else if (args.length > 0) {
                targetUser = args[0].replace('@', '') + '@s.whatsapp.net';
            } else {
                return buddy.reply(m, `${emojis.warning} Please mention a user or reply to their message to ${action} them.`);
            }

            const groupMetadata = await sock.groupMetadata(m.chat);
            const participants = groupMetadata.participants;
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const isBotAdmin = participants.find(p => p.id === botJid)?.admin === 'admin';

            if (!isBotAdmin) {
                return buddy.reply(m, `${emojis.error} I need to be an admin to ${action} members.`);
            }

            const isUserInGroup = participants.some(p => p.id === targetUser);
            if (!isUserInGroup) {
                return buddy.reply(m, `${emojis.error} This user is not in the group.`);
            }

            const targetParticipant = participants.find(p => p.id === targetUser);
            const isTargetAdmin = targetParticipant?.admin === 'admin' || targetParticipant?.admin === 'superadmin';

            if (isPromote && isTargetAdmin) {
                return buddy.reply(m, `${emojis.admin} This user is already an admin.`);
            }

            if (!isPromote && !isTargetAdmin) {
                return buddy.reply(m, `${emojis.error} This user is not an admin.`);
            }

            await sock.groupParticipantsUpdate(m.key.remoteJid, [targetUser], action);

            const userName = targetParticipant.pushName || targetUser.split('@')[0];
            buddy.reply(m, `${actionEmoji} Successfully ${action}d ${userName} ${isPromote ? 'to' : 'from'} admin.`);
        } catch (error) {
            console.error(`Error in ${action} command:`, error);
            buddy.reply(m, `${emojis.error} An error occurred while trying to ${action} the user. Please try again later.`);
        }
    }
};