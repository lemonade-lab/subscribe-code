import { useMessage, Text } from 'alemonjs';
import { setPause, setPauseById } from '../../models/github.sub.status.js';
import { selects } from '../index.js';
import { isOwner, isAdmin } from '../../utils/config.js';
import { listAllSubscriptionsByType } from '../../models/github.sub.data.js';
import { Regular } from 'alemonjs/utils';

const startAllReg = /^(!|！|\/)?(开启|启动|打开)?(仓库|github仓库|GitHub仓库|GitHub代码仓库)推送$/;
const startByIdReg = /^(!|！|\/)?(开启|启动|打开)编号仓库\s*([a-z0-9]{8})$/i;
const regular = Regular.or(startAllReg, startByIdReg);
var res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    if (!(isOwner(e) || isAdmin(e.UserKey))) {
        message.send(format(Text('只有主人或管理员可以暂停订阅')));
        return;
    }
    if (startAllReg.test(e.MessageText)) {
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
    }
    if (startByIdReg.test(e.MessageText)) {
        const match = e.MessageText.match(startByIdReg);
        let subs = [];
        if (e.name === 'message.create' && e.MessageId) {
            subs = await listAllSubscriptionsByType('message.create');
        }
        else if (e.name === 'private.message.create' && e.MessageId) {
            subs = await listAllSubscriptionsByType('private.message.create');
        }
        const subIds = subs.flatMap(sub => sub.repos.map(repo => repo.id));
        if (match && match[3] && subIds.includes(match[3])) {
            const subId = match[3];
            await setPauseById(subId, false);
            message.send(format(Text(`✅ 已恢复本聊天的一个仓库订阅，编号为：\n ${subId}`)));
            return;
        }
        else {
            message.send(format(Text('⚠ 无效的订阅编号，请提供正确的订阅编号')));
            return;
        }
    }
});

export { res as default, regular };
