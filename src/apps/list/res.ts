import { Text, useMessage } from 'alemonjs';
import { listSubscriptions } from '@src/models/github.sub.data';
import { selects } from '@src/apps/index';
export const regular = /^(!|！|\/)?(仓库|github仓库|GitHub仓库|GitHub代码仓库)列表$/;
export default onResponse(selects, async e => {
    const [message] = useMessage(e);
    // 群聊触发则，记录群聊。
    if (e.name === 'message.create' && e.MessageId) {
        const chatType = 'message.create';
        const chatId = e.SpaceId;

        console.log('查看群聊订阅', chatType, chatId);
        const subs = await listSubscriptions(chatType, chatId);
        message.send(format(Text(`订阅的GitHub仓库列表：\n${subs.map(sub => sub).join(',\n') || '无订阅'}`)));
    }
    // 私聊触发则，记录用户。
    if (e.name === 'private.message.create' && e.MessageId) {
        const chatType = 'private.message.create';
        const chatId = e.OpenId;

        console.log('查看私聊订阅', chatType, chatId);
        const subs = await listSubscriptions(chatType, chatId);
        message.send(format(Text(`订阅的GitHub仓库列表：\n${subs.map(sub => sub).join(',\n') || '无订阅'}`)));
    }
    return;
});
