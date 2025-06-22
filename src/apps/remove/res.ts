import { Text, useMessage } from 'alemonjs';
import { platform as onebot } from '@alemonjs/onebot';
import { removeSubscription } from '@src/models/github.sub.data';
import { selects } from '@src/apps/index';
export const regular =
    /^(!|！|\/)?(移除|取消|删除|del|DEL|delete|DELETE)(仓库|github仓库|GitHub仓库|GitHub代码仓库)?\s*(https?:\/\/)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;
export default onResponse(selects, async e => {
    const [message] = useMessage(e);
    if (e.Platform !== onebot) {
        message.send(format(Text('暂不支持')));
        return;
    }

    function extractRepoUrl(text: string): string | null {
        const match = text.trim().match(/github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/);
        return match ? match[1] : null;
    }

    // 群聊触发则，记录群聊。
    if (e.name === 'message.create' && e.MessageId) {
        if (!e.IsMaster) {
            message.send(format(Text('只有管理员可以添加订阅')));
            return;
        }
        const repoUrl = extractRepoUrl(e.MessageText);
        const chatType = 'message.create';
        const chatId = e.SpaceId;
        if (repoUrl) {
            await removeSubscription(chatType, chatId, repoUrl);
            console.log('已成功删除repo：', repoUrl);
            message.send(format(Text('订阅删除成功')));
        } else {
            message.send(format(Text('请输入正确的GitHub仓库地址')));
        }
    }
    // 私聊触发则，记录用户。
    if (e.name === 'private.message.create' && e.MessageId) {
        if (!e.IsMaster) {
            message.send(format(Text('只有管理员可以添加订阅')));
            return;
        }
        const repoUrl = extractRepoUrl(e.MessageText);
        const chatType = 'private.message.create';
        const chatId = e.OpenId;
        if (repoUrl) {
            await removeSubscription(chatType, chatId, repoUrl);
            console.log('已成功删除repo：', repoUrl);
            message.send(format(Text('订阅删除成功')));
        } else {
            message.send(format(Text('请输入正确的GitHub仓库地址')));
        }
    }
    return;
});
