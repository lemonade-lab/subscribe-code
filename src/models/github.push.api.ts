import { sendToChannel, sendToUser, Text } from 'alemonjs';

export async function sendMessage(chatType: string, chatId: string, message: string) {
    const data = format(Text(message));
    switch (chatType) {
        case 'message.create':
            await sendToChannel(chatId, data);
            break;
        case 'private.message.create':
            await sendToUser(chatId, data);
            break;
        default:
            throw new Error('Unsupported platform');
    }
}
