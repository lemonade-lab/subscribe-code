import { isMaster, isCodeMaster, removeAlertToken, removeAlertChat } from '../../../models/config.js';
import vPlatform, { selects } from '../../index.js';
import { useMessage, Text } from 'alemonjs';

const regular = /^(\/code|!|！)u\s+(-al|al)\s+del\s+([a-zA-Z0-9](:|：)\s*[a-zA-Z0-9]{12})?$/;
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
    const match = e.MessageText.match(regular);
    if (match && match[3]) {
        const parts = match[3].split(/[:：]/);
        const delChatId = parts[0].trim();
        const delToken = parts[1].trim();
        if (removeAlertToken({ chatId: delChatId, token: delToken })) {
            message.send(format(Text(`阿柠檬机器人异常警告推送设置：\nChatId: ${delChatId}\nToken: ${delToken}\n已删除`)));
        }
        else {
            message.send(format(Text('对应聊天未设置阿柠檬机器人异常警告推送，无需删除')));
        }
    }
    else {
        if (removeAlertChat({ chatId: chatId, type: chatType })) {
            message.send(format(Text(`本聊天群的阿柠檬机器人异常警告推送设置：\nChatId: ${chatId}已删除`)));
        }
        else {
            message.send(format(Text('本聊天群未设置阿柠檬机器人异常警告推送，无需删除')));
        }
    }
});
var res$1 = onResponse(selects, [vPlatform.current, res.current]);

export { res$1 as default, regular };
