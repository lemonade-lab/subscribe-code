import { Text, useMessage } from 'alemonjs';
import { platform as onebot } from '@alemonjs/onebot';
import { selects } from '@src/apps/index';
import { addSubscription } from '@src/models/github.sub.data';

// 优化后的正则表达式，强制要求后面有 github 仓库地址
export const regular =
    /^([!！/])?(添加|订阅|add)(仓库|github仓库|GitHub仓库|GitHub代码仓库)?\s*(https?:\/\/)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;

function extractRepoUrl(text: string): string | null {
    const match = text.trim().match(/github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/);
    return match ? match[1] : null;
}

export default onResponse(selects, async e => {
    const [message] = useMessage(e);
    if (e.Platform !== onebot) {
        message.send(format(Text('非onebot平台，暂不支持')));
        return;
    }

    // 群聊处理
    if (e.name === 'message.create' && e.MessageId) {
        if (!e.IsMaster) {
            message.send(format(Text('只有管理员可以添加订阅')));
            return;
        }
        const repoUrl = extractRepoUrl(e.MessageText);
        const chatType = 'message.create';
        const chatId = e.SpaceId;
        if (repoUrl) {
            console.log('添加订阅', chatType, chatId, repoUrl);
            await addSubscription(chatType, chatId, repoUrl);
            message.send(format(Text('订阅成功')));
        } else {
            message.send(format(Text('请输入正确的GitHub仓库地址')));
        }
        return;
    }

    // 私聊处理
    if (e.name === 'private.message.create' && e.MessageId) {
        if (!e.IsMaster) {
            message.send(format(Text('只有管理员可以添加订阅')));
            return;
        }
        const repoUrl = extractRepoUrl(e.MessageText);
        const chatType = 'private.message.create';
        const chatId = e.OpenId;
        if (repoUrl) {
            console.log('添加订阅', chatType, chatId, repoUrl);
            await addSubscription(chatType, chatId, repoUrl);
            message.send(format(Text('订阅成功')));
        } else {
            message.send(format(Text('请输入正确的GitHub仓库地址')));
        }
        return;
    }

    return;
});
