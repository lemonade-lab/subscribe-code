import { sendToChannel, sendToUser, Text } from 'alemonjs';

export async function sendMessage(
    chatType: 'message.create' | 'private.message.create',
    chatId: string,
    message: string
) {
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
