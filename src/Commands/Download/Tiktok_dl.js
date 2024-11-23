const axios = require('axios');
const fs = require('fs').promises; // Using fs.promises for async file operations
const path = require('path');

const emojis = {
    search: '🔍',
    found: '🎉',
    error: '🤖',
    processing: '⏳',
    done: '🚀',
    warning: '⚠️',
    downloadChoice: '👇',
    option: '✅'
};

module.exports = {
    usage: ["tiktok", "tt"],
    desc: "Download TikTok videos.",
    commandType: "Download",
    isGroupOnly: false,
    isAdminOnly: false,
    isPrivateOnly: false,
    emoji: "🎵",

    async execute(sock, m, args) {
        try {
            const MAXDLSIZE = settings.MAX_DOWNLOAD_SIZE * 1024 * 1024; // Convert MB to bytes
            const url = args[0];
            await buddy.react(m, emojis.search);

            if (!url) {
                return await buddy.reply(m, "🔗 Please provide a TikTok video URL.");
            }

            await buddy.react(m, emojis.processing);

            // Use the provided API
            const apiUrl = `https://api.vihangayt.com/downloader/tiktok?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl);

            if (!response.data || !response.data.status) {
                await buddy.react(m, emojis.error);
                return await buddy.reply(m, "❌ Unable to fetch video information. Please check the URL and try again.");
            }

            const videoInfo = response.data.data;

            let downloadOptions = `
📽️ *BUDDY-MD TIKTOK-DOWNLOADER* 📽️

┌───────────────────
├  👤 *Author:* ${videoInfo.uniqueId}
└───────────────────

🔗 Link: ${url}

🔢 Select the download option from below

\`[🎵] Audio File\`
   1 : Audio (a)

\`[📺] Video File\`
   2 : Video with Watermark (vw)
   3 : Video without Watermark (v)

\`\`\`We support various download options for better flexibility. Support us for more improvements! 🛠️\`\`\``;

            const beautifulFont = await buddy.changeFont(downloadOptions, 'smallBoldScript');

            const tempDir = path.join('./temp');
            try {
                await fs.access(tempDir); // Check if directory exists
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // Directory doesn't exist, create it
                    await fs.mkdir(tempDir);
                } else {
                    throw error; // Propagate other errors
                }
            }

            const sentMessage = await buddy.reply(m, beautifulFont);


            await buddy.react(m, emojis.downloadChoice);

            const responseMessage = await buddy.getResponseText(m, sentMessage);
            if (responseMessage) {
                await buddy.react(m, emojis.option);
                let chosenOption = responseMessage.response.toLowerCase();
                await buddy.react(m, emojis.processing);

                let downloadUrl, fileExtension;

                // Repeat until a valid option is chosen
                while (true) {
                    switch (chosenOption) {
                        case 'a':
                            case '1':
                            downloadUrl = videoInfo.download.find(item => item.type === 'audio').link;
                            fileExtension = 'mp3';
                            break;
                        case 'vw':
                            case '2':
                            downloadUrl = videoInfo.download.find(item => item.type === 'watermark').link;
                            fileExtension = 'mp4';
                            break;
                        case 'v':
                            case '3':
                            downloadUrl = videoInfo.download.find(item => item.type === 'no-watermark').link;
                            fileExtension = 'mp4';
                            break;
                        default:
                            await buddy.reply(m, "❌ Invalid option. Please choose a valid option (a, vw, or v).");
                            // Prompt again for a valid option
                            const newResponseMessage = await buddy.getResponseText(m, sentMessage);
                            chosenOption = newResponseMessage.response.toLowerCase();
                            continue; // Continue the loop to re-evaluate the chosen option
                    }

                    // Break out of the loop once a valid option is chosen
                    break;
                }

                // Download the file
                const fileResponse = await axios({
                    method: 'GET',
                    url: downloadUrl,
                    responseType: 'arraybuffer'
                });

                const fileSize = fileResponse.data.length;

                if (fileSize > MAXDLSIZE) {
                    await buddy.react(m, emojis.warning);
                    return await buddy.reply(m, `${emojis.warning} The file size (${(fileSize / 1024 / 1024).toFixed(2)} MB) exceeds the maximum allowed size (${settings.MAX_DOWNLOAD_SIZE} MB).`);
                }

                const tempFilePath = path.join(tempDir, `tiktok_${Date.now()}.${fileExtension}`);
                await fs.writeFile(tempFilePath, fileResponse.data);

                // Send the file
                if (chosenOption === 'a') {
                    await buddy.sendAudio(m, await fs.readFile(tempFilePath), `TikTok Audio - ${videoInfo.uniqueId}`);
                } else {
                    await buddy.sendVideo(m, await fs.readFile(tempFilePath), `TikTok Video - ${videoInfo.uniqueId}`);
                }

                // Clean up
                await fs.unlink(tempFilePath);

                await buddy.react(m, emojis.done);
            } else {
                await buddy.reply(m, "⏱️ Timed out waiting for your choice.");
            }
        } catch (error) {
            await buddy.react(m, emojis.error);
            console.log(error)
            if (error.message.includes('network')) {
                await buddy.reply(m, "🌐 Hmm, having trouble connecting to the internet. Please try again later.");
            } else {
                await buddy.reply(m, "🤖 Oops! Something unexpected happened. We'll look into it.");
            }
        }
    }
};
