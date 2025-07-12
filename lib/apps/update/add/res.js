import vPlatform, { selects } from '../../index.js';
import { useMessage, Text } from 'alemonjs';
import { findByRepoAndChatId, add } from '../../../models/code.data.js';
import { isMaster, isCodeMastet, isWhiteUser } from '../../../models/config.js';

const regular = /^(\/code|!|！)\s+add\s+(-g\s+)?(https?:\/\/)?(www\.)?(github\.com\/)?[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\s+-g)?(\s|$)/;
const extractRepoParts = (text) => {
    const match = text.trim().match(/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
    if (!match)
        return null;
    return { origin: 'github.com', belong: match[1], name: match[2] };
};
const res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    if (e.name === 'message.create') {
        if (!isMaster(e.UserKey) && !isCodeMastet(e.UserKey)) {
            message.send(format(Text('你没有权限执行此操作')));
            return;
        }
        const repo = extractRepoParts(e.MessageText);
        if (!repo) {
            message.send(format(Text('请输入正确的GitHub仓库地址')));
            return;
        }
        const exist = await findByRepoAndChatId(repo.origin, repo.belong, repo.name, 'g', e.SpaceId);
        if (exist) {
            message.send(format(Text(`该群聊已经订阅过该仓库：${repo.belong}/${repo.name}`)));
            return;
        }
        await add(repo.origin, repo.belong, repo.name, 'g', e.SpaceId);
        message.send(format(Text(`订阅成功：${repo.belong}/${repo.name}`)));
        return;
    }
    if (e.name === 'private.message.create') {
        if (!isMaster(e.UserKey) && !isCodeMastet(e.UserKey) && !isWhiteUser(e.UserKey)) {
            message.send(format(Text('你没有权限执行此操作')));
            return;
        }
        const repo = extractRepoParts(e.MessageText);
        if (!repo) {
            return;
        }
        const exist = await findByRepoAndChatId(repo.origin, repo.belong, repo.name, 'w', e.OpenId);
        if (exist) {
            message.send(format(Text(`你已经订阅过该仓库：${repo.belong}/${repo.name}`)));
            return;
        }
        await add(repo.origin, repo.belong, repo.name, 'w', e.OpenId);
        message.send(format(Text(`订阅成功：${repo.belong}/${repo.name}`)));
        return;
    }
});
var res$1 = onResponse(selects, [vPlatform.current, res.current]);

export { res$1 as default, regular };
