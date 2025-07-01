import { Text, useMessage } from 'alemonjs';
import { setPause, setPauseById } from '@src/models/github.sub.status';
import { selects } from '@src/apps/index';
import { isAdmin, isOwner } from '@src/utils/config';
import { listAllSubscriptionsByType } from '@src/models/github.sub.data';
import { Regular } from 'alemonjs/utils';

export const pauseAllReg = /^(!|！|\/)?(暂停|停止|关闭)?(仓库|github仓库|GitHub仓库|GitHub代码仓库)推送$/;
const pauseByIdReg = /^(!|！|\/)?(暂停|停止|关闭)编号仓库\s*([a-z0-9]{8})$/i;

export const regular = Regular.or(pauseAllReg, pauseByIdReg);

export default onResponse(selects, async e => {
    const [message] = useMessage(e);
    if (!(isOwner(e) || isAdmin(e.UserKey))) {
        message.send(format(Text('只有主人或管理员可以暂停订阅')));
        return;
    }

    // 处理暂停所有订阅
    if (pauseAllReg.test(e.MessageText)) {
        if (e.name === 'message.create' && e.MessageId) {
            const chatType = 'message.create';
            const chatId = e.SpaceId;
            if (regular.test(e.MessageText)) {
                await setPause(chatType, chatId, true);
                message.send(format(Text('❌ 本群GitHub推送服务已暂停')));
                return;
            }
        }
        if (e.name === 'private.message.create' && e.MessageId) {
            const chatType = 'private.message.create';
            const chatId = e.OpenId;
            if (regular.test(e.MessageText)) {
                await setPause(chatType, chatId, true);
                message.send(format(Text('❌ 本私聊GitHub推送服务已暂停')));
                return;
            }
        }
    }

    // 处理暂停指定订阅
    if (pauseByIdReg.test(e.MessageText)) {
        const match = e.MessageText.match(pauseByIdReg);
        let subs: { chatId: string; repos: { repo: string; id: string }[] }[] = [];
        if (e.name === 'message.create' && e.MessageId) {
            subs = await listAllSubscriptionsByType('message.create');
        } else if (e.name === 'private.message.create' && e.MessageId) {
            subs = await listAllSubscriptionsByType('private.message.create');
        }
        const subIds = subs.flatMap(sub => sub.repos.map(repo => repo.id));
        if (match && match[3] && subIds.includes(match[3])) {
            const subId = match[3];
            await setPauseById(subId, true);
            message.send(format(Text(`❌ 已暂停本聊天的一个仓库订阅，编号为：\n ${subId}`)));
            return;
        } else {
            message.send(format(Text('⚠ 无效的订阅编号，请提供正确的订阅编号')));
            return;
        }
    }
});
