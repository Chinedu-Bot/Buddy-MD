console.log('🐾 Starting...');

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, makeInMemoryStore, delay, generateMessageIDV2, encodeBinaryNode } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require('pino');
const path = require('path');
const useMongoDBAuthState = require("../Plugin/BuddyMongoAuth");
const { MongoClient } = require("mongodb");

// Small Fix For Waiting for Message
const NodeCache = require('node-cache');
const msgRetryCounterCache = new NodeCache();

// Set up logging
// Enhanced logging
const logger = pino({
    level: process.env.LOG_LEVEL || 'silent',
});

// Plugins
const { buddyMsg } = require('../Plugin/BuddyMsg');
const { initializeBuddyEvents } = require('../Plugin/BuddyEvent');
const { loadCommands } = require('../Plugin/BuddyLoadCmd');
const { againstEventManager } = require('../Plugin/BuddyEventHandle');

(async () => {
    await loadCommands(path.join(__dirname, '../Commands'));
})();

let messagesSent = 0;


// Auth Decider Function
async function getAuthState() {
    try {
        if (settings.MONGO_DB_URL) {
            const mongoClient = new MongoClient(settings.MONGO_DB_URL, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });

            try {
                await mongoClient.connect();
                console.log('\x1b[32m%s\x1b[0m', 'Successfully connected to the MongoDB database!');

                const db = mongoClient.db("buddy_md");
                const collection = db.collection("buddy_md_auth");

                // Check if session exists in the database
                const sessionExists = await collection.findOne({});
                if (sessionExists) {
                    return await useMongoDBAuthState(collection);
                }

                // If session does not exist in the database, check the file
                const credsPath = path.resolve('./src/Session/creds.json');
                if (fs.existsSync(credsPath)) {
                    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));

                    // Write the session to the database
                    await collection.insertOne(creds);
                    console.log('\x1b[32m%s\x1b[0m', 'Session information written to the MongoDB database from creds.json!');

                    return await useMongoDBAuthState(collection);
                }

                // If neither option exists, do nothing and return
                console.log('\x1b[33m%s\x1b[0m', 'No session information found in the database or creds.json.');
                return await useMongoDBAuthState(collection);

            } catch (err) {
                console.error('\x1b[31m%s\x1b[0m', 'Failed to connect to the MongoDB database:', err);
            } finally {
                await mongoClient.close();
            }
        } else {
            console.log('\x1b[33m%s\x1b[0m', 'Using multi-file auth state.');
            return await useMultiFileAuthState(path.join('./src/Session'));
        }
    } catch (err) {
        console.log('\x1b[31m%s\x1b[0m', 'Error in getAuthState:', err);
    }
}


async function buddyMd(io, app) {
    try {
        const chalk = (await import('chalk')).default;

        // Endpoint to fetch statistics
        app.get('/messagestotal', (req, res) => {
            res.json({
                messageTotal: messagesSent,
            });
        });

        // In-memory store for caching
        const store = makeInMemoryStore({ logger });


        const { state, saveCreds } = await getAuthState();

        // fetch latest version of WA Web
        const { version, isLatest } = await fetchLatestBaileysVersion()
        console.log(chalk.cyanBright(`using WA v${version.join('.')}, isLatest: ${isLatest}`))

        const sock = await makeWASocket({
            options: {
                headers: {
                    'Connection': 'Upgrade',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                }
            },
            printQRInTerminal: true,
            mobile: false,
            keepAliveIntervalMs: 10000,
            downloadHistory: false,
            msgRetryCounterCache,
            syncFullHistory: true,
            shouldSyncHistoryMessage: msg => {
                console.log(chalk.cyanBright(`Syncing chats..[${msg.progress}%]`));
                return !!msg.syncType;
            },
            markOnlineOnConnect: true,
            defaultQueryTimeoutMs: undefined,
            logger,
            Browsers: ['BUDDY-MD', 'Chrome', '113.0.5672.126'],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            linkPreviewImageThumbnailWidth: 1980,
            generateHighQualityLinkPreview: true,
            getMessage: async (key) => {
                if (store) {
                    const msg = await store.loadMessage(key.remoteJid, key.id)
                    return msg?.message || undefined
                }
                return {
                    conversation: ''
                }
            },
            patchMessageBeforeSending: async (msg, recipientJids) => {
                await sock.uploadPreKeysToServerIfRequired();
                messagesSent = messagesSent + 1;

                // // Emit 'messageCount' event to all connected clients with updated count
                // io.emit('messageCount', messagesSent);

                // const messageType = Object.keys(msg)[0];
                // const messageContent = msg[messageType]?.text || msg[messageType]?.caption || '';


                // // Default typing delay settings
                // const defaultTypingDelay = {
                //     min: 400, // Minimum delay in milliseconds
                //     max: 800, // Maximum delay in milliseconds
                //     longMessageThreshold: 300, // Characters
                // };

                // // Merge default and custom settings (if available)
                // const typingDelay = defaultTypingDelay;
                // const messageLength = messageContent.length;

                // // Handle audio messages
                // if (messageType === 'audioMessage') {
                //     await sock.sendPresenceUpdate('recording', recipientJids[0]);
                //     const audioDuration = msg.audioMessage.seconds || 5; // Estimate duration if not provided
                //     await delay(audioDuration * 1000); // Wait for the audio duration
                //     await sock.sendPresenceUpdate('paused', recipientJids[0]);
                //     return msg;
                // } else if (messageType === 'videoMessage' || messageType === 'imageMessage' || messageType === 'documentMessage' || messageType === 'documentWithCaptionMessage' || messageType === 'protocolMessage' || messageType === 'reactionMessage') {
                //     return msg;
                // }

                // // Handle text or caption messages
                // const typingDuration = messageLength > typingDelay.longMessageThreshold
                //     ? typingDelay.max
                //     : (Math.random() * (typingDelay.max - typingDelay.min) + typingDelay.min);

                // await sock.sendPresenceUpdate('composing', recipientJids[0]);
                // await delay(typingDuration);
                // await sock.sendPresenceUpdate('paused', recipientJids[0]);
                return msg;
            }
        });

        // console.log(sock)
        store.bind(sock.ev);
        // Assuming 'sock' is your socket connection
        await againstEventManager.init(sock);
        initializeBuddyEvents(sock, chalk);

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log(qr);
            }

            // if (!sock.authState.creds.registered && pairingOption === 'Whatsapp Pairing Code') {
            //     setTimeout(async () => {
            //         const code = await sock.requestPairingCode(pairingNumber);
            //         console.log(chalk.greenBright(`Pairing Code: ${code}`))
            //     }, 5000);
            // }


            if (connection === "open") {
                try {

                    console.log(chalk.cyan('Checking Connection....'));
                    console.log(chalk.cyan('Making Socket....'));
                    console.log(chalk.cyan('Calling Socket...'));
                    console.log(chalk.cyan('Connected! 🔒✅'));
                    // Don't Remove budd
                    buddyMsg(sock);
                    return new Promise((resolve, reject) => {
                        // Restart timer (refactored)
                        setTimeout(async () => {
                            try {
                                console.log(chalk.yellow('Restarting socket...'));
                                await sock.end({ reason: 'Clearing store' });
                            } catch (error) {
                                console.error(chalk.red('Error restarting socket:'), error.message);
                            } finally {
                                buddyMd(io, app);
                            }
                        }, 300 * 60 * 1000); // 300 minutes
                    });
                } catch (err) {
                    console.log('Error in:', err)
                }
            }

            const code = lastDisconnect?.error?.output?.statusCode;

            if (code === 428) {
                console.log(chalk.cyan('Connection closed! 🔒'));
                sock.ev.removeAllListeners();
                await delay(2000); // Add a delay before reconnecting
                buddyMd(io, app);
                await sock.ws.close();
                return
            }

            if (code === 500) {
                console.log(chalk.cyan('Connection closed! 🔒'));
                sock.ev.removeAllListeners();
                await delay(2000); // Add a delay before reconnecting
                buddyMd(io, app);
                await sock.ws.close();
                return
            }


            if (connection === "close" || code) {
                try {
                    const reason = lastDisconnect && lastDisconnect.error ? new Boom(lastDisconnect.error).output.statusCode : 500;
                    switch (reason) {
                        case DisconnectReason.connectionClosed:
                            console.log(chalk.cyan('Connection closed! 🔒'));
                            sock.ev.removeAllListeners();
                            await delay(5000); // Add a delay before reconnecting
                            buddyMd(io, app);
                            await sock.ws.close();
                            return;
                        case DisconnectReason.connectionLost:
                            console.log(chalk.cyan('Connection lost from server! 📡'));
                            console.log(chalk.cyan('Trying to Reconnect! 🔂'));
                            await delay(2000);
                            sock.ev.removeAllListeners();
                            buddyMd(io, app);
                            await sock.ws.close();
                            return;
                        case DisconnectReason.restartRequired:
                            console.log(chalk.cyan('Restart required, restarting... 🔄'));
                            await delay(5000);
                            // sock.ev.removeAllListeners();
                            buddyMd(io, app);
                            return;
                        case DisconnectReason.timedOut:
                            console.log(chalk.cyan('Connection timed out! ⌛'));
                            sock.ev.removeAllListeners();
                            await delay(5000); // Add a delay before reconnecting
                            buddyMd(io, app);
                            await sock.ws.close();
                            return;
                        default:
                            console.log(chalk.cyan('You Logged out from your phone. Try to rescan the QR again. ⚠️'));
                            return;
                    }
                } catch (error) {
                    console.error(chalk.red('Error occurred during connection close:'), error.message);
                }
            }

            //    // Enable read receipts
            sock.sendReadReceiptAck = true;
        });
    } catch (err) {
        console.log('Error in BuddyMD:', err)
    }

}

module.exports = { buddyMd }