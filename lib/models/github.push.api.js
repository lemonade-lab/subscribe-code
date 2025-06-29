import { Text, sendToUser, sendToChannel } from 'alemonjs';

async function sendMessage(chatType, chatId, message) {
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

export { sendMessage };
