const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  usage: ["getaudio", "toaudio"],
  desc: "Extract audio from videos.",
  commandType: "Convert",
  isGroupOnly: false,
  isAdminOnly: false,
  isPrivateOnly: false,
  emoji: "🎵", 

  async execute(sock, m, args) {
    try {
      const MAX_FILE_SIZE_MB = 0.5 || settings.MAX_DOWNLOAD_SIZE || 50; 

      const quoted = await buddy.getQuotedMedia(m);
      const messageType = await buddy.getMessageType(m);
      const quotedMessageType = await buddy.getQuotedMessageType(m);

      const validMessageTypes = ['videoMessage'];

      if (!quoted && !validMessageTypes.includes(messageType) && !validMessageTypes.includes(quotedMessageType)) {
        await buddy.reply(m, 'Please reply to a video to extract audio.');
        await buddy.react(m, '❌');
        return;
      }
      
      let vidbuff;
      let fileExtension; // Variable to store the file extension
      
      if (quoted) {
        const quotedMedia = await buddy.downloadQuotedMedia(m);
        if (quotedMedia) {
          vidbuff = quotedMedia.buffer;
          fileExtension = quotedMedia.extension; // Get the file extension
        }
      } else {
        const mediaMsg = await buddy.downloadMediaMsg(m);
        if (mediaMsg) {
          vidbuff = mediaMsg.buffer;
          fileExtension = mediaMsg.extension; // Get the file extension
        }
      }

      if (vidbuff) {
        const fileSizeMB = await buddy.getFileSizeInMB(m);

        if (fileSizeMB > MAX_FILE_SIZE_MB) {
          await buddy.reply(m, `The video is too large to process. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
          return;
        }

        const tempDir = path.join('./temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir);
        }

        // Use fileExtension when creating the tempFilePath
        const tempFilePath = path.join(tempDir, `temp_video_${Date.now()}.${fileExtension}`);
        const outputFilePath = path.join(tempDir, `extracted_audio_${Date.now()}.mp3`);

        fs.writeFileSync(tempFilePath, vidbuff);

        exec(`ffmpeg -i "${tempFilePath}" -vn -ar 44100 -ac 2 -b:a 192k "${outputFilePath}"`, async (error) => {
          if (error) {
            console.error("FFmpeg error:", error.message);
            await buddy.reply(m, 'Failed to extract audio. Please try again later.');
          } else {
            const audioBuffer = fs.readFileSync(outputFilePath);
            await buddy.sendAudio(m, audioBuffer); 
          }
          fs.unlinkSync(tempFilePath);
          fs.unlinkSync(outputFilePath);
        });
      }
    } catch (error) {
      console.error("Error extracting audio:", error.message);
      await buddy.reply(m, `Failed to extract audio. Please try again later.`);
    }
  }
};

