import { selects } from '@src/response/index';
import { Text, useMessage } from 'alemonjs';
import vPlatform from '@src/response/index';
import * as CodeData from '@src/models/code.data';
import { isCodeMastet, isMaster, isWhiteUser } from '@src/models/config';

export const regular =
    /^(\/code|!|！)\s+add\s+(-g\s+)?(https?:\/\/)?(www\.)?(github\.com\/)?([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(\s+-g)?(\s|$)/;

const extractRepoParts = (text: string): { origin: string; belong: string; name: string } | null => {
    // 匹配完整URL或简短格式
    const match = text.trim().match(/(?:https?:\/\/(?:www\.)?(github\.com)\/)?([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);

    if (!match) return null;

    return {
        origin: match[1] || 'github.com', // 提取域名或默认github.com
        belong: match[2], // 用户/组织名
        name: match[3] // 仓库名
    };
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
        if (exist) {
            message.send(format(Text(`该群聊已经订阅过该仓库：${repo.belong}/${repo.name}`)));
            return;
        }
        await CodeData.add(repo.origin, repo.belong, repo.name, 'g', e.SpaceId);
        message.send(format(Text(`订阅成功：${repo.belong}/${repo.name}`)));
        return;
    }
    // 私聊
    if (e.name === 'private.message.create') {
        if (!isMaster(e.UserKey) && !isCodeMastet(e.UserKey) && !isWhiteUser(e.UserKey)) {
            message.send(format(Text('你没有权限执行此操作')));
            return;
        }
        const repo = extractRepoParts(e.MessageText);
        if (!repo) {
            return;
        }
        const exist = await CodeData.findByRepoAndChatId(repo.origin, repo.belong, repo.name, 'w', e.OpenId);
        if (exist) {
            message.send(format(Text(`你已经订阅过该仓库：${repo.belong}/${repo.name}`)));
            return;
        }
        await CodeData.add(repo.origin, repo.belong, repo.name, 'w', e.OpenId);
        message.send(format(Text(`订阅成功：${repo.belong}/${repo.name}`)));
        return;
    }
});

export default onResponse(selects, [vPlatform.current, res.current]);
