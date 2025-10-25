import { Text, sendToUser, sendToChannel } from 'alemonjs';

function sendMessage(chatType, chatId, message) {
    const data = format(Text(message));
    const map = {
        'message.create': sendToChannel,
        'private.message.create': sendToUser
    };
    const fun = map[chatType];
    if (!fun) {
        throw new Error(`Unsupported chat type: ${chatType}`);
    }
    void map[chatType](chatId, data);
}

export { sendMessage };
