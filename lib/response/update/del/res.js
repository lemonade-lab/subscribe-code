import vPlatform, { selects } from '../../index.js';
import { useMessage, Text } from 'alemonjs';
import { findByRepoAndChatId, remove } from '../../../models/code.data.js';
import { isMaster, isCodeMaster, isWhiteUser } from '../../../models/config.js';

const regular = /^(\/code|!|！)\s+del\s+(-g\s+)?(https?:\/\/)?(www\.)?(github\.com\/)?([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(\s+-g)?(\s|$)/;
const extractRepoParts = (text) => {
    const match = text.trim().match(/(?:https?:\/\/(?:www\.)?(github\.com)\/)?([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
    if (!match) {
        return null;
    }
    return {
        origin: match[1] || 'github.com',
        belong: match[2],
        name: match[3]
    };
};
const res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    if (e.name === 'message.create') {
        if (!isMaster(e.UserKey, e.UserId) && !e.IsMaster && !isCodeMaster(e.UserKey, e.UserId)) {
            void message.send(format(Text('你没有权限执行此操作')));
            return;
        }
        const repo = extractRepoParts(e.MessageText);
        if (!repo) {
            void message.send(format(Text('请输入正确的GitHub仓库地址')));
            return;
        }
        const exist = await findByRepoAndChatId(repo.origin, repo.belong, repo.name, 'g', e.SpaceId);
        if (!exist) {
            void message.send(format(Text(`该群聊未订阅该仓库：${repo.belong}/${repo.name}`)));
            return;
        }
        await remove(exist);
        void message.send(format(Text(`删除：${repo.belong}/${repo.name}`)));
        return;
    }
    if (e.name === 'private.message.create') {
        if (!isMaster(e.UserKey, e.UserId) && !e.IsMaster && !isCodeMaster(e.UserKey, e.UserId) && !isWhiteUser(e.UserKey)) {
            return;
        }
        const repo = extractRepoParts(e.MessageText);
        if (!repo) {
            return;
        }
        const exist = await findByRepoAndChatId(repo.origin, repo.belong, repo.name, 'w', e.OpenId);
        if (!exist) {
            void message.send(format(Text(`你未订阅该仓库：${repo.belong}/${repo.name}`)));
            return;
        }
        await remove(exist);
        void message.send(format(Text(`删除：${repo.belong}/${repo.name}`)));
    }
});
var res$1 = onResponse(selects, [vPlatform.current, res.current]);

export { res$1 as default, regular };
