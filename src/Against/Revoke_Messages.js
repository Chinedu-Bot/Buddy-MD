// ./src/Against/RejectCall.js
module.exports = {
    event: ['messages.upsert'],
    desc: 'Revoke Messages...!',
    isEnabled: settings.REVOKE_MESSAGES,
    async execute(sock, data) {
        const m = data.messages[0];
        console.log('999999999999999999', m, '000000000000000')
        console.log('Hekkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk')
        // Check if the message is a revoke message (updated condition)
        if (m.key && m.key.remoteJid && m.key.fromMe === false && m.message && m.message.protocolMessage && m.message.protocolMessage.type === ('REVOKE' || 0)) {
            // Get the original message ID from the protocol message
            const originalMessageId = m.message.protocolMessage.key.id;

            // Find the original message in the chat history
            const originalMessage = await sock.store.loadMessage(m.key.remoteJid, originalMessageId);

            if (originalMessage) {
                // Forward the revoked message to the owner number
                await sock.sendMessage(sock.user.id, {
                    forward: originalMessage,
                    text: `*Revoked Message:*\n\n*From:* ${originalMessage.pushName} (${originalMessage.key.remoteJid})\n*Deleted at:* ${new Date().toLocaleString()}`
                });
            }
        }
    }
};