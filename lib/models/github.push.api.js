import { Text, sendToUser, sendToChannel } from 'alemonjs';

async function sendMessage(chatType, chatId, message) {
    const data = format(Text(message));
    const map = {
        'message.create': sendToChannel,
        'private.message.create': sendToUser
    };
    const fun = map[chatType];
    if (!fun) {
        throw new Error(`Unsupported chat type: ${chatType}`);
    }
    map[chatType](chatId, data);
}

export { sendMessage };
