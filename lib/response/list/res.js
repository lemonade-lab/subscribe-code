import vPlatform, { selects } from '../index.js';
import { useMessage, Text } from 'alemonjs';
import { isMaster, isCodeMastet, isWhiteUser } from '../../models/config.js';
import { findByType, findByChatId } from '../../models/code.data.js';

const regular = /^(\/code|!|！)\s+(-g\s+)?list(\s|$)/;
const res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    if (e.name === 'message.create') {
        if (!isMaster(e.UserKey, e.UserId) && !isCodeMastet(e.UserKey, e.UserId)) {
            message.send(format(Text('你没有权限执行此操作')));
            return;
        }
        const isGlobal = /-g/.test(e.MessageText);
        let subs = [];
        if (isGlobal) {
            subs = await findByType('g');
            if (!subs.length) {
                message.send(format(Text('暂无任何群聊订阅仓库')));
                return;
            }
            const list = subs.map(s => `${s.belong}/${s.name}（群:${s.chatId}）`).join('\n');
            message.send(format(Text('所有群聊订阅仓库：\n' + list)));
            return;
        }
        else {
            subs = await findByChatId(e.SpaceId || e.ChatId);
            if (!subs.length) {
                message.send(format(Text('本群暂无订阅仓库')));
                return;
            }
            const list = subs.map(s => `${s.belong}/${s.name}`).join('\n');
            message.send(format(Text('本群订阅仓库：\n' + list)));
            return;
        }
    }
    if (e.name === 'private.message.create') {
        if (!isMaster(e.UserKey, e.UserId) &&
            !e.IsMaster &&
            !isCodeMastet(e.UserKey, e.UserId) &&
            !isWhiteUser(e.UserKey)) {
            message.send(format(Text('你没有权限执行此操作')));
            return;
        }
        const subs = await findByChatId(e.UserKey);
        if (!subs.length) {
            message.send(format(Text('你暂无订阅仓库')));
            return;
        }
        const list = subs.map(s => `${s.belong}/${s.name}`).join('\n');
        message.send(format(Text('你的订阅仓库：\n' + list)));
        return;
    }
});
var res$1 = onResponse(selects, [vPlatform.current, res.current]);

export { res$1 as default, regular };
