import { Text, useMessage } from 'alemonjs';
import { listAllSubscriptionsByType } from '@src/models/github.sub.data';
import { selects } from '@src/apps/index';
export const regular = /^(!|！|\/)?(仓库|github仓库|GitHub仓库|GitHub代码仓库)全部列表$/;
export default onResponse(selects, async e => {
    const [message] = useMessage(e);
    if (!e.IsMaster) {
        message.send(format(Text('你无管理员权限，无法查看全部仓库订阅')));
        return;
    }
    if ((e.name === 'message.create' || e.name === 'private.message.create') && e.MessageId) {
        let msgs = [`订阅的全部GitHub仓库列表：\n`];
        console.log('执行查看全部仓库订阅');
        const groupSubs = await listAllSubscriptionsByType('message.create');
        if (groupSubs.length !== 0) {
            msgs.push(`--------------------\n👪群聊订阅：`);
            for (const sub of groupSubs) {
                msgs.push(`\n${sub.chatId}：\n${sub.repos.map(r => `- ${r}`).join('\n')}\n`);
            }
        }
        const privateSubs = await listAllSubscriptionsByType('private.message.create');
        if (privateSubs.length !== 0) {
            msgs.push(`--------------------\n🧑私聊订阅：`);
            for (const sub of privateSubs) {
                msgs.push(`\n${sub.chatId}：\n${sub.repos.map(r => `- ${r}`).join('\n')}\n`);
            }
        }
        message.send(format(Text(`${msgs.join('') || '无订阅'}`)));
    }
    return;
});
