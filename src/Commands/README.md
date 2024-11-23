
# Buddy Utilities for WhatsApp Bots (`buddyMsg.js`)

This module provides a collection of utility functions designed to simplify the development of WhatsApp bots using the Baileys library. It offers convenient wrappers for common tasks such as sending various message types, managing messages, interacting with quoted messages, and more.

## Installation

This module is typically used within a larger WhatsApp bot project that utilizes the Baileys library. Ensure you have Baileys installed in your project.

## Usage

1. **Import the module:**
   ```javascript
   const { buddyMsg } = require('./buddyMsg'); 
   // Assuming buddyMsg.js is in the same directory
   ```

2. **Initialize and use within your Baileys bot setup:**
   ```javascript
   const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');

   // ... your Baileys setup ...

   const sock = makeWASocket({
       // ... your Baileys configuration ...
   });

   // ... your authentication logic ... 

   sock.ev.on('connection.update', (update) => {
       const { connection, lastDisconnect } = update;
       if (connection === 'close') {
           // ... your reconnection logic ...
       } else if (connection === 'open') {
           console.log('Connected!');
           buddyMsg(sock); // Initialize buddy utilities
           
           // Your bot logic utilizing the global 'buddy' object:
           sock.ev.on('messages.upsert', async ({ messages }) => {
               const m = messages[0];
               if (!m.message) return; 

               try {
                   // Example usage of buddy utilities:
                   if (m.body && m.body.toLowerCase() === 'hi') {
                       await buddy.reply(m, 'Hello there!'); 
                   }

                   // ... your other bot command handlers ... 
               } catch (err) {
                   console.error(err); 
               }
           }); 
       }
   });
   ```

## Functions

### `buddyMsg(sock)`

Initializes the `buddy` object with utility functions, attaching them to the global scope.

- **Parameters:**
    - `sock`: The Baileys socket instance.

- **Returns:** 
    - `void`

- **Example:**
    ```javascript
    buddyMsg(sock); 
    ```

**The `buddy` Object**

After calling `buddyMsg(sock)`, a global object named `buddy` becomes available with the following functions:

### `buddy.reply(m, text)`

Replies to a message.

- **Parameters:**
    - `m`: The original message object received by the bot.
    - `text`: The text message to reply with.

- **Returns:** 
    - `Promise<Proto.WebMessageInfo>`: A promise that resolves to the sent message object.

- **Example:**
    ```javascript
    await buddy.reply(m, 'This is a reply!'); 
    ```

### `buddy.send(m, text)`

Sends a text message to the chat.

- **Parameters:**
    - `m`: The original message object (used to get the chat ID).
    - `text`: The text message to send.

- **Returns:**
    - `Promise<Proto.WebMessageInfo>`: A promise that resolves to the sent message object.

- **Example:**
    ```javascript
    await buddy.send(m, 'This is a message!'); 
    ```

### `buddy.react(m, emoji)`

Reacts to a message using an emoji.

- **Parameters:**
    - `m`: The original message object to react to.
    - `emoji`: The emoji character to use as a reaction.

- **Returns:**
    - `Promise<Proto.WebMessageInfo>`: A promise that resolves to the sent reaction message object.

- **Example:**
    ```javascript
    await buddy.react(m, '👍'); 
    ```

### `buddy.editMsg(m, sentMessage, newMessage)`

Edits a previously sent message.

- **Parameters:**
    - `m`: The original message object (used for context).
    - `sentMessage`: The `Proto.WebMessageInfo` object of the message to edit.
    - `newMessage`: The new text content for the message.

- **Returns:**
    - `Promise<Proto.WebMessageInfo>`: A promise that resolves to the edit message object.

- **Example:**
    ```javascript
    const sentMsg = await buddy.send(m, 'Initial message');
    // ... some time later ...
    await buddy.editMsg(m, sentMsg, 'Updated message!');
    ```

### `buddy.deleteMsg(m)`

Deletes a message. This requires the bot to be an admin in the group.

- **Parameters:**
    - `m`: The message object to delete (must be a reply to the target message).

- **Returns:**
    - `Promise<Proto.WebMessageInfo>`: A promise that resolves to the delete confirmation message object.

- **Throws:**
    - `Error`: If the bot is not an admin or the message is not a reply.

- **Example:**
    ```javascript
    // Assuming 'm' is a reply to a message the bot can delete:
    try {
        await buddy.deleteMsg(m); 
    } catch (err) {
        console.error('Error deleting message:', err);
    }
    ```

### `buddy.sendSticker(m, bufferOrUrl)`

Sends a sticker.

- **Parameters:**
    - `m`: The original message object (used for context).
    - `bufferOrUrl`: The sticker data as a buffer or a URL string.

- **Returns:**
    - `Promise<Proto.WebMessageInfo>`: A promise that resolves to the sent sticker message object.

- **Example:**
    ```javascript
    // Sending from a buffer:
    const stickerBuffer = await fs.readFile('./my_sticker.webp'); 
    await buddy.sendSticker(m, stickerBuffer);

    // Sending from a URL:
    const stickerUrl = 'https://example.com/cool_sticker.webp'; 
    await buddy.sendSticker(m, stickerUrl); 
    ```

### `buddy.sendImage(m, bufferOrUrl, caption)`

Sends an image.

- **Parameters:**
    - `m`: The original message object (used for context).
    - `bufferOrUrl`: The image data as a buffer or a URL string.
    - `caption` (optional): The caption for the image.

- **Returns:**
    - `Promise<Proto.WebMessageInfo>`: A promise that resolves to the sent image message object.

- **Example:**
    ```javascript
    // From buffer:
    const imageBuffer = await fs.readFile('./my_image.jpg');
    await buddy.sendImage(m, imageBuffer, 'This is my image!');

    // From URL:
    await buddy.sendImage(m, 'https://example.com/nice_pic.png', 'Cool pic!');
    ```

### `buddy.sendVideo(m, bufferOrUrl, caption)`

Sends a video.

- **Parameters:**
    - `m`: The original message object (used for context).
    - `bufferOrUrl`: The video data as a buffer or a URL string.
    - `caption` (optional): The caption for the video.

- **Returns:**
    - `Promise<Proto.WebMessageInfo>`: A promise that resolves to the sent video message object.

- **Example:**
    ```javascript
    // Similar to sendImage, you can send from a buffer or URL.
    ```

### `buddy.sendDocument(m, bufferOrUrl, mimetype, fileName, caption)`

Sends a document.

- **Parameters:**
    - `m`: The original message object (used for context).
    - `bufferOrUrl`: The document data as a buffer or a URL string.
    - `mimetype`: The MIME type of the document (e.g., 'application/pdf').
    - `fileName`: The file name for the document.
    - `caption` (optional): The caption for the document.

- **Returns:**
    - `Promise<Proto.WebMessageInfo>`: A promise that resolves to the sent document message object.

- **Example:**
    ```javascript
    // From buffer:
    const pdfBuffer = await fs.readFile('./my_document.pdf');
    await buddy.sendDocument(m, pdfBuffer, 'application/pdf', 'My Document.pdf', 'Important stuff!'); 
    ```

### `buddy.sendAudio(m, bufferOrUrl, ptt = false)`

Sends an audio message.

- **Parameters:**
    - `m`: The original message object (used for context).
    - `bufferOrUrl`: The audio data as a buffer or a URL string.
    - `ptt` (optional): Set to `true` to send as a push-to-talk (voice note) message, default is `false`.

- **Returns:**
    - `Promise<Proto.WebMessageInfo>`: A promise that resolves to the sent audio message object.

- **Example:**
    ```javascript
    // Send as a voice note:
    await buddy.sendAudio(m, './my_voice_message.mp3', true); 
    ```

### `buddy.sendGif(m, bufferOrUrl, playback = true)`

Sends a GIF.

- **Parameters:**
    - `m`: The original message object (used for context).
    - `bufferOrUrl`: The GIF data as a buffer or a URL string.
    - `playback` (optional): Set to `true` for GIF to play automatically, default is `true`.

- **Returns:**
    - `Promise<Proto.WebMessageInfo>`: A promise that resolves to the sent GIF message object.

- **Example:**
    ```javascript
    await buddy.sendGif(m, './funny_gif.gif'); 
    ```

### `buddy.externalAdReply(m, head, title, body, mediaType, thumbnailPath)`

Replies with an external advertisement message.

- **Parameters:**
    - `m`: The original message object (used for context).
    - `head`: The header text for the advertisement.
    - `title`: The title of the advertisement.
    - `body`: The body text of the advertisement.
    - `mediaType`: The type of media in the advertisement (e.g., 'VIDEO', 'IMAGE').
    - `thumbnailPath`: The path or URL to the thumbnail image.

- **Returns:**
    - `Promise<Proto.WebMessageInfo>`: A promise that resolves to the sent advertisement message object.

- **Example:**
    ```javascript
    await buddy.externalAdReply(m, 
        'Check this out!',
        'Amazing Product',
        'Get yours now!',
        'IMAGE',
        './product_thumbnail.jpg'
    );
    ```

### `buddy.replyWithMention(m, text, users)`

Replies to a message with mentions to specific users.

- **Parameters:**
    - `m`: The original message object (used for context).
    - `text`: The text message to send.
    - `users`: An array of user JIDs (phone numbers with '@s.whatsapp.net' suffix) to mention.

- **Returns:**
    - `Promise<Proto.WebMessageInfo>`: A promise that resolves to the sent message object.

- **Example:**
    ```javascript
    const userJid1 = '1234567890@s.whatsapp.net';
    const userJid2 = '9876543210@s.whatsapp.net'; 
    await buddy.replyWithMention(m, 'Hey guys!', [userJid1, userJid2]); 
    ```

### `buddy.forwardMessage(jid, messageToForward, options)`

Forwards a message to another chat.

- **Parameters:**
    - `jid`: The JID of the chat to forward the message to.
    - `messageToForward`: The `Proto.WebMessageInfo` object of the message to forward.
    - `options` (optional): Additional options for forwarding (refer to Baileys documentation).

- **Returns:**
    - `Promise<Proto.WebMessageInfo>`: A promise that resolves to the forwarded message object.

- **Example:**
    ```javascript
    const anotherChatJid = '1234567890-1612345678@g.us'; // Example group JID
    await buddy.forwardMessage(anotherChatJid, m); 
    ```

### `buddy.getQuotedMessage(m)`

Retrieves the quoted message object (if any) from a message.

- **Parameters:**
    - `m`: The message object.

- **Returns:**
    - `Proto.Message | null`: The quoted message object if found, otherwise `null`.

- **Example:**
    ```javascript
    const quotedMsg = await buddy.getQuotedMessage(m);
    if (quotedMsg) {
        console.log('Quoted message text:', quotedMsg.conversation); 
    }
    ```

### `buddy.getQuotedText(m)`

Retrieves the text content of a quoted message (if any).

- **Parameters:**
    - `m`: The message object.

- **Returns:**
    - `string | null`: The quoted message text if found, otherwise `null`.

- **Example:**
    ```javascript
    const quotedText = await buddy.getQuotedText(m);
    if (quotedText) {
        console.log('Quoted text:', quotedText); 
    }
    ```

### `buddy.getQuotedMedia(m)`

Retrieves information about the quoted media (image, video, audio, document) if a message quotes a media message.

- **Parameters:**
    - `m`: The message object.

- **Returns:**
    - `{ type: string, message: Proto.Message } | false`: An object containing the media type and the media message object if found, otherwise `false`.

- **Example:**
    ```javascript
    const quotedMedia = await buddy.getQuotedMedia(m);
    if (quotedMedia) {
        console.log('Quoted media type:', quotedMedia.type); 
        // You can access the media message object using quotedMedia.message
    }
    ```

### `buddy.getMessageType(m)`

Gets the type of the received message (e.g., 'conversation', 'imageMessage', 'videoMessage').

- **Parameters:**
    - `m`: The message object.

- **Returns:**
    - `string | null`: The message type if found, otherwise `null`.

- **Example:**
    ```javascript
    const messageType = await buddy.getMessageType(m);
    console.log('Message type:', messageType); 
    ```

### `buddy.getQuotedMessageType(m)`

Gets the quoted message type within a message.

- **Parameters:**
    - `m`: The message object.

- **Returns:**
    - `Proto.Message | null`: The quoted message object (which contains the type information) or `null` if no quoted message.

- **Example:**
    ```javascript
    const quotedMsgType = await buddy.getQuotedMessageType(m); 
    if (quotedMsgType) {
        console.log('Quoted message type:', Object.keys(quotedMsgType)[0]); 
    }
    ```

### `buddy.getCaptionMessage(m)`

Retrieves the message object that contains the caption (if any).

- **Parameters:**
    - `m`: The message object.

- **Returns:**
    - `Proto.Message | null`: The message object containing the caption if found, otherwise `null`.

- **Example:**
    ```javascript
    const captionMessage = await buddy.getCaptionMessage(m);
    if (captionMessage) {
        console.log('Caption:', captionMessage.caption); 
    }
    ```

### `buddy.getResponseText(key, sentMessage, timeout)`

Waits for and retrieves the text response to a specific sent message.

- **Parameters:**
    - `key`: The message key of the message you are waiting a response to.
    - `sentMessage`: The `Proto.WebMessageInfo` object of the sent message.
    - `timeout` (optional): Timeout in milliseconds, after which the promise will reject.

- **Returns:**
    - `Promise<{ key: Proto.IMessageKey, message: Proto.IMessage, response: string }>`: 
        - Resolves to an object containing:
            - `key`: The key of the received response message.
            - `message`: The full response message object.
            - `response`: The text content of the response.

- **Throws:**
    - `Error`: If the timeout is exceeded.

- **Example:**
    ```javascript
    const question = 'What is your name?';
    const sentQuestion = await buddy.send(m, question);

    try {
        const response = await buddy.getResponseText(m.key, sentQuestion, 5000); // Wait up to 5 seconds 
        console.log('User responded with:', response.response); 
    } catch (err) {
        console.log('No response received within timeout.');
    }
    ```

### `buddy.downloadQuotedMedia(m)`

Downloads the quoted media (if any) from a message.

- **Parameters:**
    - `m`: The message object.

- **Returns:**
    - `Promise<{ buffer: Buffer, extension: string, filename: string }>`: A promise that resolves to an object containing:
        - `buffer`: The downloaded media data as a buffer.
        - `extension`: The file extension of the media.
        - `filename`: The suggested filename for the media.

- **Throws:**
    - `Error`: If there is no quoted media message.

- **Example:**
    ```javascript
    try {
        const mediaData = await buddy.downloadQuotedMedia(m); 
        await fs.writeFile(`./downloaded_media.${mediaData.extension}`, mediaData.buffer);
        console.log('Quoted media downloaded successfully!');
    } catch (err) {
        console.error('Error downloading quoted media:', err);
    }
    ```

### `buddy.downloadMediaMsg(m)`

Downloads media from a message (image, video, audio, document).

- **Parameters:**
    - `m`: The message object.

- **Returns:**
    - `Promise<{ buffer: Buffer, extension: string } | string>`: 
        - Resolves to an object containing:
            - `buffer`: The downloaded media data as a buffer.
            - `extension`: The file extension of the media.
        - Returns the string "Provide a valid message (quoted messages are not valid)" if the message type is not valid.

- **Example:**
    ```javascript
    const media = await buddy.downloadMediaMsg(m);
    if (typeof media === 'string') {
      console.log(media); // Output: Provide a valid message (quoted messages are not valid)
    } else {
      await fs.writeFile(`./downloaded_media.${media.extension}`, media.buffer);
      console.log('Media downloaded successfully!');
    }
    ```

### `buddy.changeFont(text, font)`

Changes the font of the given text using fancy characters.

- **Parameters:**
    - `text`: The text to change the font of.
    - `font`: The name of the font to apply (from the available fonts in `./BuddyFonts.js`).

- **Returns:**
    - `Promise<string>`: A promise that resolves to the text with the changed font.

- **Throws:**
    - `Error`: If invalid input types are provided or the specified font is not available.

- **Example:**
    ```javascript
    const fancyText = await buddy.changeFont('Hello World!', 'smallCaps');
    console.log(fancyText); // Output: ʜᴇʟʟᴏ ᴡᴏʀʟᴅ!
    ```

### `buddy.getFileSizeInMB(m)`

Get the file size of a message attachment in megabytes (MB).

- **Parameters:**
    - `m`: The message object.

- **Returns:**
    - `Promise<number | null>`: The file size in MB if available, otherwise `null`.

- **Example:**
    ```javascript
    const fileSize = await buddy.getFileSizeInMB(m);
    if (fileSize) {
      console.log(`File size: ${fileSize} MB`);
    } else {
      console.log('File size not available.');
    }
    ```

### `buddy.saveFileToTemp(bufferData, filename)`

Saves a file to a temporary directory.

- **Parameters:**
    - `bufferData`: The file data as a Buffer.
    - `filename`: The desired filename for the saved file.

- **Returns:**
    - `Promise<string>`: The full path to the saved temporary file.

- **Example:**
    ```javascript
    const tempFilePath = await buddy.saveFileToTemp(mediaData.buffer, 'downloaded_image.jpg');
    console.log('File saved to:', tempFilePath);
    ```

## Important Notes

- This module is designed to work specifically with the Baileys WhatsApp library. 
- The `buddy` object's functions are asynchronous and return promises, so use `await` or `.then()` to handle their results.
- Error handling is essential. Use `try...catch` blocks to gracefully handle potential errors, such as network issues or incorrect message formats.
- Always refer to the Baileys library documentation ([https://whiskeysockets.github.io/Baileys/](https://whiskeysockets.github.io/Baileys/)) for in-depth information about message objects, events, and Baileys' functionalities.

This documentation provides a comprehensive overview of the `buddyMsg.js` module. By understanding its functions, you can streamline your WhatsApp bot development process and create more efficient and feature-rich bots.

