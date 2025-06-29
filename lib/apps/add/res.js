import { useMessage, Text } from 'alemonjs';
import { platform } from '@alemonjs/onebot';
import { selects } from '../index.js';
import { addSubscription } from '../../models/github.sub.data.js';
import { isOwner, isAdmin } from '../../utils/config.js';

const regular = /^([!！/])?(添加|订阅|add)(仓库|github仓库|GitHub仓库|GitHub代码仓库)?\s*(https?:\/\/)?(github\.com\/)?[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;
function extractRepoUrl(text) {
    const match = text.trim().match(/(github\.com\/)?([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/);
    return match ? match[2] : null;
}
var res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    if (e.Platform !== platform) {
        message.send(format(Text('非onebot平台，暂不支持')));
        return;
    }
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
        }
        else {
            message.send(format(Text('请输入正确的GitHub仓库地址')));
        }
        return;
    }
    if (e.name === 'private.message.create' && e.MessageId) {
        message.send(format(Text('私聊不支持添加订阅')));
        return;
    }
});

export { res as default, regular };
