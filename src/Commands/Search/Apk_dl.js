const axios = require('axios');
const fs = require('fs')
const path = require('path')

module.exports = {
    usage: ["apk", "app"],
    desc: "Search and send a stunning image from Google Images.",
    commandType: "Search",
    isGroupOnly: false,
    isAdminOnly: false,
    isPrivateOnly: false,
    emoji: "⬇️", // Emoji for download

    async execute(sock, m, args) {
        try {
            const query = args.join(' ');
            if (!query) {
                await buddy.reply(m, 'Please provide an app name to search.');
                return;
            }
            await buddy.react(m, '🔎');
            const searchUrl = `https://api.maher-zubair.tech/download/apk?id=${encodeURIComponent(query)}`;
            const response = await axios.get(searchUrl);
            const appData = response.data.result;

            // Prepare the download prompt with aesthetic styling and emojis
            const downloadPromptText = `
╭━━ 📥 *Download APK*

┃📲 *App:* ${appData.name}
┃🔢 *Version:* ${appData.version}
┃📏 *Size:* ${appData.size}
┃📅 *Last Updated:* ${appData.lastup}
┃📦 *Package:* ${appData.package}

╰━━━
⚙️ *Reply with "1" to download this APK.*

⚠️ *Disclaimer:* Downloading APKs from unknown sources can be risky. Only download apps from trusted sources.
`;

const fontBeauty = await buddy.changeFont(downloadPromptText, 'smallBoldScript');
// Prepare the download prompt with aesthetic styling and emojis
const finishText = `
╭━━ 📥 Downloaded APK 📥 
┃                                          
┃ 📲 \`App\`:     ${appData.name}
┃ 🔢 \`Version\`: ${appData.version}
┃ 📏 \`Size\`:    ${appData.size}
┃ 📅 \`Updated\`: ${appData.lastup}
┃ 📦 \`Package\`: ${appData.package}
┃                                          
╰━━━
`;
const fontBeautyTwo = await buddy.changeFont(finishText, 'smallBoldScript');
            // Send the download prompt message and react with emoji
            await buddy.react(m, '👍');
            const sentMessage = await buddy.sendImage(m, appData.icon, fontBeauty);
            await buddy.react(m, '🤔');
            if (sentMessage) {
                const response = await buddy.getResponseText(m, sentMessage, 30000); // wait for user response for 1 minute

                if (response.response.trim() === '1') {
                    await buddy.react(m, '🧩');
                    // Check maximum download size from settings
                    const maxdlSize = settings.MAX_DOWNLOAD_SIZE; // Assuming settings is imported and contains MAX_DOWNLOAD_SIZE

                    if (parseFloat(appData.size.split(' ')[0]) <= maxdlSize) {
                        // Perform the download logic here
                        const downloadUrl = appData.dllink;
                        await buddy.reply(m, `Downloading ${appData.name}...`);
                        await buddy.react(m, '⬇️');
                        // Implement your download logic here, e.g., using axios to download the APK file
                        const downloadResponse = await axios({
                            method: 'get',
                            url: downloadUrl,
                            responseType: 'stream',
                        });

                        // Example: Save the file to disk
                        const downloadFileName = `${appData.name}.apk`;
                        // Ensure the downloads directory exists
                        const downloadsDir = path.join('./temp');
                        if (!fs.existsSync(downloadsDir)) {
                            fs.mkdirSync(downloadsDir);
                        }
                        const filePath = path.join('./temp', downloadFileName); // Adjust the download path as needed
                        const writer = fs.createWriteStream(filePath);

                        downloadResponse.data.pipe(writer);

                        // Handle completion or errors
                        writer.on('finish', async () => {
                            console.log(`Downloaded ${downloadFileName}`);
                            await buddy.react(m, '⬆️');
                            await buddy.sendDocument(m, filePath, 'application/vnd.android.package-archive', `${appData.name}.apk`, fontBeautyTwo);
                            fs.unlinkSync(filePath);
                            await buddy.react(m, '👍');
                        });

                        writer.on('error', (err) => {
                            buddy.react(m, '🚫');
                            console.error('Error downloading file:', err);
                            buddy.reply(m, `Failed to download ${appData.name}. Please try again later.`);
                        });
                    } else {
                        buddy.react(m, '🤚');
                        await buddy.reply(m, `Cannot download ${appData.name}. File size exceeds maximum allowed size.`);
                    }
                } else {
                    buddy.react(m, '❌');
                    await buddy.reply(m, 'Download cancelled.');
                }
            }
        } catch (error) {
            console.error("Error executing APK command:", error.message);
            await buddy.reply(m, `Failed to fetch APK information. Please try again later.`);
        }
    }
};
