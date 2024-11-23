const emojis = {
    ping: '🏓',       // Ping-pong emoji
    response: '🚀',   // Rocket emoji for a fast response
    thinking: '🤔'   // Thinking emoji while processing
};

module.exports = {
    usage: ["ping"],
    desc: "Checks the bot's response time.",
    commandType: "Bot",
    isGroupOnly: false,
    isAdminOnly: false,
    isPrivateOnly: false,
    emoji: emojis.ping, // Emoji metadata added here

    async execute(sock, m) {
        try {
            // Initial reaction to indicate the bot is working on the request
            await buddy.react(m, emojis.thinking); 

            // Get the timestamp before sending the message
            const startTime = Date.now(); 

            // Send the "Pong!" message
            const sentMsg = await buddy.reply(m, "🏓 Running Latency Test!"); 

            // Calculate the round-trip time
            const latency = Date.now() - startTime;

            // Edit the message with the latency information and a rocket emoji
            await buddy.editMsg(m, sentMsg, `🚀 Pong! ${latency}ms`);

        } catch (error) {
            // Error handling
            await buddy.react(m, emojis.error);
            await buddy.reply(m, "❌ An error occurred while checking the ping.");
        }
    }
};
