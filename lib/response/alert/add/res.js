import { isMaster, isCodeMaster, addAlertToken } from '../../../models/config.js';
import { sendMessage } from '../../../models/github.push.api.js';
import vPlatform, { selects } from '../../index.js';
import { useMessage, Text } from 'alemonjs';
import crypto from 'crypto';

const regular = /^(\/code|!|！)u\s+(-al|al)\s+add/;
function generateAlertToken(chatId, chatType) {
    const timestamp = Date.now().toString();
    const data = `${chatId}-${chatType}-${timestamp}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return hash.substring(0, 12);
}
const res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    if (!isMaster(e.UserKey, e.UserId) && !e.IsMaster && !isCodeMaster(e.UserKey, e.UserId)) {
        message.send(format(Text('你没有权限执行此操作')));
        return;
    }
    let chatId, chatType;
    if (e.name === 'message.create') {
        chatId = e.SpaceId;
        chatType = 'message.create';
    }
    else if (e.name === 'private.message.create') {
        chatId = e.OpenId;
        chatType = 'private.message.create';
    }
    const token = generateAlertToken(chatId, chatType);
    if (addAlertToken({ chatId: chatId, token: token, type: chatType })) {
        message.send(format(Text('已启用该聊天用于阿柠檬机器人异常警告推送，Token已私发')));
        logger.info(`阿柠檬机器人异常警告推送设置：\nChatId: ${chatId}\nToken: ${token}`);
        sendMessage(chatType, e.OpenId, `阿柠檬机器人异常警告推送设置：\nChatId: ${chatId}\nToken: ${token}`);
    }
    else {
        message.send(format(Text('已存在该聊天的阿柠檬机器人异常警告推送设置项，\n如需重新设置请先删除原设置项')));
    }
});
var res$1 = onResponse(selects, [vPlatform.current, res.current]);

export { res$1 as default, regular };
