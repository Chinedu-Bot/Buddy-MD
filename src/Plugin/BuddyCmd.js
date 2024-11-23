const { getCommand, getAllCommands } = require('./BuddyLoadCmd');
const cooldowns = new Map();
const rateLimit = new Map();

async function buddyCmdUpsert(sock, m) {
    try {
        if (!m || !m.message) return;

        const { message } = m;
        const messageTypes = ['extendedTextMessage', 'conversation', 'imageMessage', 'videoMessage'];
        let text = messageTypes.reduce((acc, type) =>
            acc || (message[type] && (message[type].text || message[type].caption || message[type])) || '', '');

        const response = text.toLowerCase();
        const prefix = settings.PREFIX.find(p => response.startsWith(p));

        if (!prefix) return;

        if (settings.WORK_MODE.toLowerCase() === "private" && m.key.remoteJid.endsWith('@g.us')) {
            return;
        }

        const [commandName, ...args] = response.slice(prefix.length).trim().split(/\s+/);
        const command = getCommand(commandName);

        if (!command) {
            await handleUnknownCommand(sock, m, commandName, prefix);
            return;
        }

        const sender = m.key.remoteJid.endsWith('@g.us') ? m.key.participant : m.key.remoteJid;
        const context = await buildContext(sock, m, sender);

        if (!await checkPermissions(sock, m, command, context)) return;
        if (!await checkCooldown(sock, m, command, sender)) return;
        if (!await checkRateLimit(sock, m, sender)) return;

        try {
            if (command.emoji) await buddy.react(m, command.emoji);
            if (settings.READ_ALL_MESSAGES) await sock.readMessages([m.key]);

            await command.execute(sock, m, args, context);
        } catch (err) {
            console.error(`Error executing command ${commandName}:`, err);
            await buddy.reply(m, 'An error occurred while processing your command. Please try again later.');
        }
    } catch (error) {
        console.error('Error in Command Execute:', error);
    }
}

async function handleUnknownCommand(sock, m, commandName, prefix) {
    const similarCommands = findSimilarCommands(commandName);
    let replyMessage = `Unknown command: ${commandName}. Type ${prefix}help for available commands.`;
    if (similarCommands.length > 0) {
        replyMessage += `\n\nDid you mean:\n${similarCommands.join('\n')}`;
    }
    await buddy.reply(m, replyMessage);
}

function findSimilarCommands(commandName) {
    const allCommands = getAllCommands();
    return allCommands
        .filter(cmd => {
            const usages = Array.isArray(cmd.usage) ? cmd.usage : [cmd.usage];
            return usages.some(usage => usage.toLowerCase().startsWith(commandName.toLowerCase()));
        })
        .map(cmd => Array.isArray(cmd.usage) ? cmd.usage[0] : cmd.usage)
        .slice(0, 3);
}

async function buildContext(sock, m, sender) {
    const isOwner = settings.OWNER_NUMBERS.includes(sender.split('@')[0]);
    const isGroupAdmin = m.key.remoteJid.endsWith('@g.us')
        ? (await sock.groupMetadata(m.key.remoteJid)).participants
            .filter(p => p.admin)
            .map(p => p.id)
            .includes(sender)
        : false;
    return { isOwner, isGroupAdmin };
}

async function checkPermissions(sock, m, command, context) {
    const { isOwner, isGroupAdmin } = context;
    if (command.isAdminOnly && !m.key.fromMe && !isOwner) {
        await buddy.reply(m, '⛔ *This command can only be used by bot Owners.*');
        return false;
    } else if (command.isGroupOnly && !m.key.remoteJid.endsWith('@g.us')) {
        await buddy.reply(m, '⛔ *This command can only be used in groups.*');
        return false;
    } else if (command.isPrivateOnly && !m.key.remoteJid.endsWith('@s.whatsapp.net')) {
        await buddy.reply(m, '⛔ *This command can only be used in private chats.*');
        return false;
    } else if (command.isGroupAdminOnly && !isGroupAdmin && !isOwner) {
        await buddy.reply(m, '⛔ *This command can only be used by group admins.*');
        return false;
    }
    return true;
}

async function checkCooldown(sock, m, command, sender) {
    const cooldownTime = command.cooldown || settings.COMMAND_COOLDOWN_TIME_IN_MS || 2000;
    const now = Date.now();
    const timestamps = cooldowns.get(sender) || cooldowns.set(sender, new Map()).get(sender);

    if (timestamps.has(command.usage)) {
        const expirationTime = timestamps.get(command.usage) + cooldownTime;
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            await buddy.reply(m, `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.usage}\` command.`);
            return false;
        }
    }

    timestamps.set(command.usage, now);
    setTimeout(() => timestamps.delete(command.usage), cooldownTime);
    return true;
}

async function checkRateLimit(sock, m, sender) {
    const maxCommandsPerMinute = settings.MAX_COMMANDS_PER_MINUTE || 10;
    const now = Date.now();
    const userRateLimit = rateLimit.get(sender) || { count: 0, resetTime: now + 60000 };

    if (now > userRateLimit.resetTime) {
        userRateLimit.count = 1;
        userRateLimit.resetTime = now + 60000;
    } else {
        userRateLimit.count++;
    }

    rateLimit.set(sender, userRateLimit);

    if (userRateLimit.count > maxCommandsPerMinute) {
        await buddy.reply(m, `You've reached the maximum number of commands per minute. Please wait before trying again.`);
        return false;
    }

    return true;
}

module.exports = { buddyCmdUpsert };