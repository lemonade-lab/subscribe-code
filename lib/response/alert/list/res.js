import { isMaster, isCodeMaster, listAlertChats } from '../../../models/config.js';
import vPlatform, { selects } from '../../index.js';
import { useMessage, Text } from 'alemonjs';

const regular = /^(\/code|!|！)u\s+(-al|al)\s+(list|l)/;
const res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    if (!isMaster(e.UserKey, e.UserId) && !e.IsMaster && !isCodeMaster(e.UserKey, e.UserId)) {
        message.send(format(Text('你没有权限执行此操作')));
        return;
    }
    if (e.name === 'message.create') {
        e.SpaceId;
    }
    else if (e.name === 'private.message.create') {
        e.OpenId;
    }
    const allAlertData = listAlertChats();
    const privateAlertData = allAlertData['private.message.create'];
    const publicAlertData = allAlertData['message.create'];
    if (privateAlertData.length === 0 && publicAlertData.length === 0) {
        message.send(format(Text('没有启用任何聊天的阿柠檬机器人异常警告推送')));
    }
    const privateAlertMsg = privateAlertData.map(chatId => `私聊推送：${chatId}`).join('\n');
    const publicAlertMsg = publicAlertData.map(chatId => `群聊推送：${chatId}`).join('\n');
    const alertMsg = privateAlertMsg + '------------------\n' + publicAlertMsg;
    message.send(format(Text(alertMsg)));
});
var res$1 = onResponse(selects, [vPlatform.current, res.current]);

export { res$1 as default, regular };
