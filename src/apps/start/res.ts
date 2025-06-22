import { Text, useMessage } from 'alemonjs';
import { setPause } from '@src/models/github.sub.status';
import { selects } from '@src/apps/index';
export const regular = /^(!|！|\/)?(开启|启动|打开)?(仓库|github仓库|GitHub仓库|GitHub代码仓库)订阅服务$/;

export default onResponse(selects, async e => {
    const [message] = useMessage(e);
    if (!e.IsMaster) {
        message.send(format(Text('只有管理员可以暂停订阅')));
        return;
    }
    if (e.name === 'message.create' && e.MessageId) {
        const chatType = 'message.create';
        const chatId = e.SpaceId;
        await setPause(chatType, chatId, false);
        message.send(format(Text('✅ 本群GitHub订阅服务已恢复')));
        return;
    }
    if (e.name === 'private.message.create' && e.MessageId) {
        const chatType = 'private.message.create';
        const chatId = e.OpenId;
        await setPause(chatType, chatId, false);
        message.send(format(Text('✅ 本私聊GitHub订阅服务已恢复')));
        return;
    }
});
