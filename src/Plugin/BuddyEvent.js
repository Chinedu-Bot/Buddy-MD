const { getAggregateVotesInPollMessage } = require("@whiskeysockets/baileys");
const { buddyCmdUpsert } = require('./BuddyCmd');
const logger = require('./Buddylogger'); // Assuming you have a logger module
const { EventEmitter } = require('events');

class BuddyEventsManager extends EventEmitter {
    constructor(sock, chalk) {
        super();
        this.sock = sock;
        this.chalk = chalk;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.handleMessagesUpsert();
        this.handleMessagesUpdate();
        this.handleChatsUpsert();
        this.handleChatsUpdate();
        this.handleLabelsAssociation();
        this.handleLabelsEdit();
        this.handlePresenceUpdate();
        this.handleGroupsUpsert();
        this.handleGroupsUpdate();
        this.handleGroupParticipantsUpdate();
        this.handleCredsUpdate();
        this.handleMessagingHistorySet();
        this.handleChatsDelete();
        this.handleMessageReceiptUpdate();
        this.handleBlocklistSet();
        this.handleBlocklistUpdate();
        this.handleCall();

        logger.info(this.chalk.green(`🚀 Baileys event listeners initialized.`));
    }

    async handleMessagesUpsert() {
        this.sock.ev.on('messages.upsert', async ({ messages }) => {
            console.log(messages)
            const m = messages[0];
            try {
                console.log(JSON.stringify(m), '+++++++++++++++++++++++++++++++++++')
                console.log(m)
                logger.debug(this.chalk.blue(`📩 Upserted message:`), m);
                await buddyCmdUpsert(this.sock, m);
                this.emit('messageUpserted', m);
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling messages.upsert event:`), error);
                this.emit('error', { event: 'messages.upsert', error });
            }
        });
    }

    async handleMessagesUpdate() {
        this.sock.ev.on('messages.update', async (updates) => {
            for (const { key, update } of updates) {
                if (update.pollUpdates) {
                    try {
                        const pollCreation = await this.sock.getMessage(key.remoteJid, key.id);
                        if (pollCreation) {
                            const pollMessage = await getAggregateVotesInPollMessage({
                                message: pollCreation,
                                pollUpdates: update.pollUpdates,
                            });
                            logger.info('Updated poll message:', pollMessage);
                            this.emit('pollUpdated', pollMessage);
                        }
                    } catch (error) {
                        logger.error(this.chalk.red(`❌ Error handling poll update:`), error);
                        this.emit('error', { event: 'messages.update', error });
                    }
                }
            }
        });
    }

    async handleChatsUpsert() {
        this.sock.ev.on('chats.upsert', async (chats) => {
            try {
                logger.debug(this.chalk.green(`🗣️ Upserted chats:`), JSON.stringify(chats));
                // Implement your logic for upserted chats
                this.emit('chatsUpserted', chats);
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling chats.upsert event:`), error);
                this.emit('error', { event: 'chats.upsert', error });
            }
        });
    }

    async handleChatsUpdate() {
        this.sock.ev.on('chats.update', async (updatedChats) => {
            try {
                logger.debug(this.chalk.green(`🗣️ Updated chats:`), JSON.stringify(updatedChats));
                // Implement your logic for updated chats
                this.emit('chatsUpdated', updatedChats);
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling chats.update event:`), error);
                this.emit('error', { event: 'chats.update', error });
            }
        });
    }

    async handleLabelsAssociation() {
        this.sock.ev.on('labels.association', async (labelAssociation) => {
            try {
                logger.debug(this.chalk.yellow(`🏷️ Label association:`), JSON.stringify(labelAssociation));
                // Implement your logic for label association events
                this.emit('labelsAssociated', labelAssociation);
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling labels.association event:`), error);
                this.emit('error', { event: 'labels.association', error });
            }
        });
    }

    async handleLabelsEdit() {
        this.sock.ev.on('labels.edit', async (label) => {
            try {
                logger.debug(this.chalk.yellow(`🏷️ Edited label:`), JSON.stringify(label));
                // Implement your logic for label edit events
                this.emit('labelEdited', label);
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling labels.edit event:`), error);
                this.emit('error', { event: 'labels.edit', error });
            }
        });
    }

    async handlePresenceUpdate() {
        this.sock.ev.on('presence.update', async ({ id, presences }) => {
            try {
                logger.debug(this.chalk.cyan(`👤 Presence update for ${id}:`), JSON.stringify(presences));
                // Implement your logic for presence updates
                this.emit('presenceUpdated', { id, presences });
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling presence.update event:`), error);
                this.emit('error', { event: 'presence.update', error });
            }
        });
    }

    async handleGroupsUpsert() {
        this.sock.ev.on('groups.upsert', async (groupMetadata) => {
            try {
                logger.debug(this.chalk.magenta(`👥 Upserted groups:`), JSON.stringify(groupMetadata));
                // Implement your logic for upserted groups
                this.emit('groupsUpserted', groupMetadata);
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling groups.upsert event:`), error);
                this.emit('error', { event: 'groups.upsert', error });
            }
        });
    }

    async handleGroupsUpdate() {
        this.sock.ev.on('groups.update', async (updatedGroups) => {
            try {
                logger.debug(this.chalk.magenta(`👥 Updated groups:`), JSON.stringify(updatedGroups));
                // Implement your logic for updated groups
                this.emit('groupsUpdated', updatedGroups);
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling groups.update event:`), error);
                this.emit('error', { event: 'groups.update', error });
            }
        });
    }

    async handleGroupParticipantsUpdate() {
        this.sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
            try {
                logger.debug(this.chalk.magenta(`👥 Group participants update for ${id}:`), participants, action);
                // Implement your logic for group participant updates
                this.emit('groupParticipantsUpdated', { id, participants, action });
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling group-participants.update event:`), error);
                this.emit('error', { event: 'group-participants.update', error });
            }
        });
    }

    async handleCredsUpdate() {
        this.sock.ev.on('creds.update', async (credentials) => {
            try {
             //   logger.debug(this.chalk.blueBright(`🔑 Credentials update:`), JSON.stringify(credentials));
                // Implement your logic for credentials updates
                this.emit('credsUpdated', credentials);
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling creds.update event:`), error);
                this.emit('error', { event: 'creds.update', error });
            }
        });
    }

    async handleMessagingHistorySet() {
        this.sock.ev.on('messaging-history.set', async ({ chats, contacts, messages, isLatest }) => {
            try {
                logger.debug(this.chalk.cyan(`📜 Messaging history set:`));
                logger.debug(this.chalk.cyan(`   Chats:`), JSON.stringify(chats));
                logger.debug(this.chalk.cyan(`   Contacts:`), JSON.stringify(contacts));
                logger.debug(this.chalk.cyan(`   Messages:`), JSON.stringify(messages));
                logger.debug(this.chalk.cyan(`   isLatest:`), isLatest);
                // Implement your logic for handling messaging history set event
                this.emit('messagingHistorySet', { chats, contacts, messages, isLatest });
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling messaging-history.set event:`), error);
                this.emit('error', { event: 'messaging-history.set', error });
            }
        });
    }

    async handleChatsDelete() {
        this.sock.ev.on('chats.delete', async (chatIds) => {
            try {
                logger.debug(this.chalk.green(`🗑️ Deleted chats:`), JSON.stringify(chatIds));
                // Implement your logic for deleted chats
                this.emit('chatsDeleted', chatIds);
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling chats.delete event:`), error);
                this.emit('error', { event: 'chats.delete', error });
            }
        });
    }

    async handleMessageReceiptUpdate() {
        this.sock.ev.on('message-receipt.update', async (receiptUpdates) => {
            try {
                logger.debug(this.chalk.blue(`📨 Message receipt update:`));
                logger.debug(this.chalk.blue(`   Receipt updates:`), JSON.stringify(receiptUpdates));
                // Implement your logic for message receipt updates
                this.emit('messageReceiptUpdated', receiptUpdates);
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling message-receipt.update event:`), error);
                this.emit('error', { event: 'message-receipt.update', error });
            }
        });
    }

    async handleBlocklistSet() {
        this.sock.ev.on('blocklist.set', async ({ blocklist }) => {
            try {
                logger.debug(this.chalk.red(`🚫 Blocklist set:`));
                logger.debug(this.chalk.red(`   Blocklist:`), JSON.stringify(blocklist));
                // Implement your logic for blocklist set event
                this.emit('blocklistSet', blocklist);
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling blocklist.set event:`), error);
                this.emit('error', { event: 'blocklist.set', error });
            }
        });
    }

    async handleBlocklistUpdate() {
        this.sock.ev.on('blocklist.update', async ({ blocklist, type }) => {
            try {
                logger.debug(this.chalk.red(`🚫 Blocklist update:`));
                logger.debug(this.chalk.red(`   Blocklist:`), JSON.stringify(blocklist));
                logger.debug(this.chalk.red(`   Type:`), type);
                // Implement your logic for blocklist update event
                this.emit('blocklistUpdated', { blocklist, type });
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling blocklist.update event:`), error);
                this.emit('error', { event: 'blocklist.update', error });
            }
        });
    }

    async handleCall() {
        this.sock.ev.on('call', async (callEvents) => {
            try {
                logger.debug(this.chalk.yellowBright(`📞 Call events:`), JSON.stringify(callEvents));
                this.emit('callReceived', callEvents);
            } catch (error) {
                logger.error(this.chalk.red(`❌ Error handling call event:`), error);
                this.emit('error', { event: 'call', error });
            }
        });
    }
}

async function initializeBuddyEvents(sock, chalk) {
    const buddyEventsManager = new BuddyEventsManager(sock, chalk);

    // Example of using the event emitter
    buddyEventsManager.on('messageUpserted', (message) => {
        // Custom logic for when a message is upserted
        logger.info('Custom handler for upserted message:', message);
    });

    buddyEventsManager.on('error', ({ event, error }) => {
        logger.error(`Error in event ${event}:`, error);
        // Implement error handling strategy (e.g., retry logic, notifications)
    });

    return buddyEventsManager;
}

module.exports = { initializeBuddyEvents };