import { selects } from '@src/apps/index';
import { Text, useMessage } from 'alemonjs';
import vPlatform from '@src/apps/index';
import * as CodeData from '@src/models/code.data';
import { isCodeMastet, isMaster, isWhiteUser } from '@src/models/config';

export const regular =
    /^(\/code|!|！)\s+del\s+(-g\s+)?(https?:\/\/)?(www\.)?(github\.com\/)?[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\s+-g)?(\s|$)/;

const extractRepoParts = (text: string): { origin: string; belong: string; name: string } | null => {
    const match = text.trim().match(/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
    if (!match) return null;
    return { origin: 'github.com', belong: match[1], name: match[2] };
};

const res = onResponse(selects, async e => {
    const [message] = useMessage(e);
    // 群聊
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
        const exist = await CodeData.findByRepoAndChatId(repo.origin, repo.belong, repo.name, 'g', e.SpaceId);
        if (!exist) {
            message.send(format(Text(`该群聊未订阅该仓库：${repo.belong}/${repo.name}`)));
            return;
        }
        await CodeData.remove(exist);
        message.send(format(Text(`删除：${repo.belong}/${repo.name}`)));
        return;
    }
    // 私聊
    if (e.name === 'private.message.create') {
        if (!isMaster(e.UserKey) && !isCodeMastet(e.UserKey) && !isWhiteUser(e.UserKey)) {
            return;
        }
        const repo = extractRepoParts(e.MessageText);
        if (!repo) {
            return;
        }
        const exist = await CodeData.findByRepoAndChatId(repo.origin, repo.belong, repo.name, 'w', e.OpenId);
        if (!exist) {
            message.send(format(Text(`你未订阅该仓库：${repo.belong}/${repo.name}`)));
            return;
        }
        await CodeData.remove(exist);
        message.send(format(Text(`删除：${repo.belong}/${repo.name}`)));
        return;
    }
});

export default onResponse(selects, [vPlatform.current, res.current]);
