const { downloadContentFromMessage, downloadMediaMessage, delay } = require('@whiskeysockets/baileys');
const fs = require('fs').promises;
const path = require('path');
const { streamToBuffer } = require('./BuddyStreamToBuffer');
const fancyScriptFonts = require('./BuddyFonts');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const MAX_LISTENERS = 10;
const listeners = [];

const RED = "\x1b[31m";
const RESET = "\x1b[0m";

async function buddyMsg(sock) {
  try {
    // Clear previous cache/data
    Object.keys(require.cache).forEach((key) => {
      delete require.cache[key];
    });

    // Initialize SQLite database
    const dbPath = path.join(__dirname, 'buddy_database.sqlite');
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Create a table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS buddy_data (
        key TEXT PRIMARY KEY,
        value TEXT,
        level INTEGER DEFAULT 0
      )
    `);

    const sendMessage = async (jid, content, options = {}) => {
      try {
        await sock.sendPresenceUpdate('composing', jid);
        await delay(200);
        return await sock.sendMessage(jid, content, options);
      } catch (err) {
        console.error(`${RED}Error sending message: ${err.message}${RESET}`);
        throw err;
      }
    };

    global.buddy = {
      reply: async (m, text) => sendMessage(m.key.remoteJid, { text }, { quoted: m }),

      send: async (m, text) => sendMessage(m.key.remoteJid, { text }),

      react: async (m, emoji) => sendMessage(m.key.remoteJid, { react: { text: emoji, key: m.key } }),

      editMsg: async (m, sentMessage, newMessage) =>
        sendMessage(m.key.remoteJid, { edit: sentMessage.key, text: newMessage, type: "MESSAGE_EDIT" }),

      deleteMsgGroup: async (m) => {
        const { remoteJid } = m.key;
        const groupMetadata = await sock.groupMetadata(remoteJid);
        const botId = sock.user.id.replace(/:.*$/, "") + "@s.whatsapp.net";
        const botIsAdmin = groupMetadata.participants.some(p => p.id.includes(botId) && p.admin);

        if (!botIsAdmin) {
          throw new Error("I cannot delete messages because I am not an admin in this group.");
        }

        const quotedMsg = m?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) {
          throw new Error("Please reply to the message you want to delete.");
        }

        const isOwnMessage = m.key.participant === m?.message?.extendedTextMessage?.contextInfo?.participant;
        const stanId = m?.message?.extendedTextMessage?.contextInfo?.stanzaId;

        const messageToDelete = {
          key: {
            remoteJid: m.key.remoteJid,
            fromMe: isOwnMessage,
            id: stanId,
            participant: m?.message?.extendedTextMessage?.contextInfo?.participant
          }
        };

        await sock.sendPresenceUpdate('composing', remoteJid);
        await delay(200);
        const response = await sock.sendMessage(remoteJid, { delete: messageToDelete.key });
        await delay(750);
        await sock.sendMessage(remoteJid, { delete: m.key });
        return response;
      },

      sendSticker: async (m, bufferOrUrl) => {
        const jid = m.key.remoteJid;
        return sendMessage(jid, { sticker: bufferOrUrl }, { quoted: m });
      },

      sendImage: async (m, bufferOrUrl, caption) => {
        const jid = m.key.remoteJid;
        const options = typeof bufferOrUrl === 'string'
          ? { image: { url: bufferOrUrl }, caption }
          : { image: bufferOrUrl, caption };
        return sendMessage(jid, options);
      },

      sendVideo: async (m, bufferOrUrl, caption) => {
        const jid = m.key.remoteJid;
        const options = typeof bufferOrUrl === 'string'
          ? { video: { url: bufferOrUrl }, caption }
          : { video: bufferOrUrl, caption };
        return sendMessage(jid, options);
      },

      sendDocument: async (m, bufferOrUrl, mimetype, fileName, caption) => {
        const jid = m.key.remoteJid;
        const options = typeof bufferOrUrl === 'string'
          ? { document: { url: bufferOrUrl }, mimetype, fileName, caption }
          : { document: bufferOrUrl, mimetype, fileName, caption };
        return sendMessage(jid, options);
      },

      sendAudio: async (m, bufferOrUrl, ptt = false) => {
        const jid = m.key.remoteJid;
        const options = typeof bufferOrUrl === 'string'
          ? { audio: { url: bufferOrUrl }, ptt, mimetype: 'audio/mpeg' }
          : { audio: bufferOrUrl, ptt, mimetype: 'audio/mpeg' };
        await sock.sendPresenceUpdate('recording', jid);
        await delay(400);
        return sendMessage(jid, options, { quoted: m });
      },

      sendGif: async (m, bufferOrUrl, playback = true) => {
        const jid = m.key.remoteJid;
        let gifBuffer;
        if (typeof bufferOrUrl === 'string') {
          const response = await fetch(bufferOrUrl);
          gifBuffer = await response.arrayBuffer();
        } else {
          gifBuffer = bufferOrUrl;
        }
        return sendMessage(jid, { video: gifBuffer, gifPlayback: playback });
      },


      externalAdReply: async (m, head, title, body, mediaType, thumbnailPath) => {
        const urlOrPath = typeof thumbnailPath === 'string'
          ? { url: thumbnailPath }
          : await fs.readFile(thumbnailPath);

        return sendMessage(m.key.remoteJid, {
          text: head,
          contextInfo: {
            externalAdReply: {
              showAdAttribution: false,
              renderLargerThumbnail: true,
              title: title,
              body: body,
              previewType: 0,
              mediaType: mediaType,
              thumbnail: urlOrPath,
              mediaUrl: '',
            },
          },
        });
      },

      replyWithMention: async (m, text, users) => {
        const mentions = users.map(u => `@${u}`).join(' ');
        return sendMessage(m.key.remoteJid, { text: `${text} ${mentions}`, mentions }, { quoted: m });
      },

      forwardMessage: async (jid, messageToForward, options = {}) => {
        return sock.relayMessage(jid, messageToForward.message, options);
      },

      getQuotedMessage: async (m) => {
        const quotedMessage = m?.message?.extendedTextMessage?.contextInfo?.quotedMessage
          || m?.message?.conversation?.contextInfo?.quotedMessage;

        if (quotedMessage) {
          return quotedMessage;
        }
        return null;
      },

      getQuotedText: async (m) => {
        const quotedMessage = m?.message?.extendedTextMessage?.contextInfo?.quotedMessage
          || m?.message?.conversation?.contextInfo?.quotedMessage;

        if (quotedMessage) {
          return quotedMessage.extendedTextMessage?.text || quotedMessage.conversation || null;
        }
        return null;
      },

      getQuotedMedia: async (m) => {
        const findMediaMessage = (obj) => {
          if (!obj) return null;
          const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];
          for (const type of mediaTypes) {
            if (obj[type]) return { type, message: obj[type] };
          }
          if (typeof obj === 'object') {
            for (const key in obj) {
              const result = findMediaMessage(obj[key]);
              if (result) return result;
            }
          }
          return null;
        };

        for (const key in m.message) {
          const msg = m.message[key];
          if (msg?.contextInfo?.quotedMessage) {
            const media = findMediaMessage(msg.contextInfo.quotedMessage);
            if (media) return media;
          }
        }
        return false;
      },

      getMessageType: async (m) => {
        if (!m.message) return null;
        return Object.keys(m.message)[0];
      },

      getQuotedMessageType: async (m) => {
        if (!m.message) return null;
        const messageType = Object.keys(m.message)[0];
        return m.message[messageType]?.contextInfo?.quotedMessage;
      },

      getCaptionMessage: async (m) => {
        for (const key in m.message) {
          const msg = m.message[key];
          if (msg?.caption) return msg;
        }
        return null;
      },

      getResponseText: async (key, sentMessage, timeout) => {
        return new Promise((resolve, reject) => {
          const timer = timeout && timeout > 0 ? setTimeout(() => {
            sock.ev.off('messages.upsert', replyHandler);
            reject(new Error('Timeout exceeded while waiting for response'));
          }, timeout) : null;

          const replyHandler = async ({ messages }) => {
            const msg = messages[0];
            const senderJid = key.key.remoteJid;
            const isValidReply = (
              (msg.message?.extendedTextMessage?.contextInfo?.stanzaId === sentMessage.key.id ||
                msg.message?.conversation?.contextInfo?.stanzaId === sentMessage.key.id) &&
              (senderJid.endsWith('@g.us') ? key.key.participant : key.key.remoteJid) ===
              (msg.key.remoteJid.endsWith('@g.us') ? msg.key.participant : msg.key.remoteJid)
            );

            if (isValidReply) {
              if (timer) clearTimeout(timer);
              sock.ev.off('messages.upsert', replyHandler);
              const responseText = msg.message?.extendedTextMessage?.text || msg.message?.conversation;
              resolve({ key: msg.key, message: msg.message, response: responseText });
            }
          };

          listeners.push(replyHandler);
          if (listeners.length > MAX_LISTENERS) {
            const oldestListener = listeners.shift();
            sock.ev.off('messages.upsert', oldestListener);
          }

          sock.ev.on('messages.upsert', replyHandler);
        });
      },

      downloadQuotedMedia: async (m) => {
        const quotedMsg = await global.buddy.getQuotedMedia(m);
        if (!quotedMsg) throw new Error('No quoted media message found.');

        const getExtension = (type) => {
          const extensions = { imageMessage: 'png', videoMessage: 'mp4', audioMessage: 'mp3' };
          return extensions[type] || 'bin';
        };

        const extension = getExtension(quotedMsg.type);
        const filename = quotedMsg.message.fileName || `media_${Date.now()}.${extension}`;
        const mimeType = quotedMsg.message.mimetype.split('/')[0];
        const mediaData = await downloadContentFromMessage(quotedMsg.message, mimeType);
        const buffer = await streamToBuffer(mediaData);

        return { buffer, extension, filename };
      },

      downloadMediaMsg: async (m) => {
        if (!m.message) return null;

        const messageType = Object.keys(m.message)[0];
        const validTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'documentWithCaptionMessage'];

        if (!validTypes.includes(messageType)) {
          return 'Provide a valid message (quoted messages are not valid)';
        }

        const buffer = await downloadMediaMessage(m, "buffer", {});
        const getExtension = (type) => {
          const extensions = {
            imageMessage: m.message.imageMessage.mimetype === 'image/png' ? '.png' : '.jpeg',
            videoMessage: '.mp4',
            audioMessage: '.mp3',
            documentMessage: `.${m.message.documentMessage.fileName.split('.').pop()}`,
            documentWithCaptionMessage: `.${m.message.documentWithCaptionMessage.message.documentMessage.fileName.split('.').pop()}`
          };
          return extensions[type];
        };

        const extension = getExtension(messageType);
        return { buffer, extension };
      },

      changeFont: async (text, font) => {
        if (typeof text !== 'string' || typeof font !== 'string') {
          throw new Error("Both 'text' and 'font' must be of type string.");
        }

        const fontMap = fancyScriptFonts[font];
        if (!fontMap) {
          throw new Error(`Font '${font}' is not available in fancyScriptFonts.`);
        }

        await delay(10); // Simulating async operation
        return text.split('').map(char => fontMap[char] || char).join('');
      },

      getFileSizeInMB: async (m) => {
        if (!m.message) return null;

        for (const key of Object.keys(m.message)) {
          const messageContent = m.message[key];
          if (messageContent && messageContent.fileLength) {
            const fileSizeBytes = parseInt(messageContent.fileLength);
            return fileSizeBytes / (1024 * 1024); // Convert to MB
          }
        }
        return null;
      },

      saveFileToTemp: async (bufferData, filename) => {
        const tempDir = path.join(__dirname, 'temp');
        await fs.mkdir(tempDir, { recursive: true });
        const tempPath = path.join(tempDir, filename);
        await fs.writeFile(tempPath, bufferData);
        return tempPath;
      },

        // New database functions
        dbSave: async (key, value) => {
          await db.run('INSERT OR REPLACE INTO buddy_data (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
        },
  
        dbGet: async (key) => {
          const result = await db.get('SELECT value FROM buddy_data WHERE key = ?', [key]);
          return result ? JSON.parse(result.value) : null;
        },
  
        dbRemove: async (key) => {
          await db.run('DELETE FROM buddy_data WHERE key = ?', [key]);
        },
  
        dbLevel: async (key, increment = 1) => {
          await db.run('INSERT OR REPLACE INTO buddy_data (key, level) VALUES (?, COALESCE((SELECT level FROM buddy_data WHERE key = ?) + ?, 1))', [key, key, increment]);
          const result = await db.get('SELECT level FROM buddy_data WHERE key = ?', [key]);
          return result ? result.level : null;
        },
  
        dbGetLevel: async (key) => {
          const result = await db.get('SELECT level FROM buddy_data WHERE key = ?', [key]);
          return result ? result.level : 0;
        },
  
        dbGetAll: async () => {
          const results = await db.all('SELECT key, value, level FROM buddy_data');
          return results.map(row => ({
            key: row.key,
            value: JSON.parse(row.value),
            level: row.level
          }));
        },
  
        dbClear: async () => {
          await db.run('DELETE FROM buddy_data');
        },  
    };
  } catch (err) {
    console.error(`${RED}Error in buddyMsg: ${err.message}${RESET}`);
  }
}

module.exports = { buddyMsg };