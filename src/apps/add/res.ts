import { platform as onebot } from '@alemonjs/onebot';
import { selects } from '@src/apps/index';
import { addSubscription } from '@src/models/github.sub.data';
import { isAdmin, isOwner, canPrivateSubscribe } from '@src/utils/config';
import { Text, useMessage } from 'alemonjs';

export const regular =
    /^([!！/])?(添加|订阅|add)(仓库|github仓库|GitHub仓库|GitHub代码仓库)?\s*(https?:\/\/)?(github\.com\/)?[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;

function extractRepoUrl(text: string): string | null {
    const match = text.trim().match(/(github\.com\/)?([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/);
    return match ? match[2] : null;
}

export default onResponse(selects, async e => {
    const [message] = useMessage(e);
    if (e.Platform !== onebot) {
        message.send(format(Text('非onebot平台，暂不支持')));
        return;
    }

    // 群聊处理
    if (e.name === 'message.create' && e.MessageId) {
        if (!(isOwner(e) || isAdmin(e.UserKey))) {
            message.send(format(Text('只有主人或管理员可以添加订阅')));
            return;
        }
        const repoUrl = extractRepoUrl(e.MessageText);
        const chatType = 'message.create';
        const chatId = e.SpaceId;
        if (repoUrl) {
            await addSubscription(chatType, chatId, repoUrl);
            message.send(format(Text(`订阅成功：${repoUrl}`)));
        } else {
            message.send(format(Text('请输入正确的GitHub仓库地址')));
        }
        return;
    }

    // 私聊处理
    if (e.name === 'private.message.create' && e.MessageId) {
        if (!(isOwner(e) || canPrivateSubscribe(e.UserKey))) {
            message.send(format(Text('只有主人或被授权的用户可以私聊添加订阅')));
            return;
        }
        const repoUrl = extractRepoUrl(e.MessageText);
        const chatType = 'private.message.create';
        const chatId = e.OpenId;
        if (repoUrl) {
            await addSubscription(chatType, chatId, repoUrl);
            message.send(format(Text(`订阅成功：${repoUrl}`)));
        } else {
            message.send(format(Text('请输入正确的GitHub仓库地址')));
        }
        return;
        return;
    }
});
