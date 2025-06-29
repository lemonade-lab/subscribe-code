import { platform as onebot } from '@alemonjs/onebot';
import { selects } from '@src/apps/index';
import {
    listAllSubscriptionsByType,
    removeSubscriptionById,
    removeSubscriptionByUrl
} from '@src/models/github.sub.data';
import { removePauseById } from '@src/models/github.sub.status';
import { isAdmin, isOwner } from '@src/utils/config';
import { Text, useMessage } from 'alemonjs';

import { Regular } from 'alemonjs/utils';

const removeByUrlReg =
    /^(!|！|\/)?(移除|取消|删除|del|DEL|delete|DELETE)(仓库|github仓库|GitHub仓库|GitHub代码仓库)?\s*(https?:\/\/)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;
const removeByIdReg = /^(!|！|\/)?(移除|取消|删除|del|DEL|delete|DELETE)编号仓库\s*([a-z0-9]{8})$/i;

export const regular = Regular.or(removeByUrlReg, removeByIdReg);

export default onResponse(selects, async e => {
    const [message] = useMessage(e);
    if (e.Platform !== onebot) {
        message.send(format(Text('非OneBot平台，暂不支持')));
        return;
    }

    function extractRepoUrl(text: string): string | null {
        const match = text.trim().match(/github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/);
        return match ? match[1] : null;
    }

    if (removeByUrlReg.test(e.MessageText)) {
        // 群聊触发则，记录群聊。
        if (e.name === 'message.create' && e.MessageId) {
            if (!(isOwner(e) || isAdmin(e.UserKey))) {
                message.send(format(Text('只有主人或管理员可以添加订阅')));
                return;
            }
            const repoUrl = extractRepoUrl(e.MessageText);
            const chatType = 'message.create';
            const chatId = e.SpaceId;
            const subs = await listAllSubscriptionsByType(chatType);
            if (repoUrl) {
                const repoId = subs
                    .find(sub => sub.repos.some(repo => repo.repo === repoUrl))
                    ?.repos.find(repo => repo.repo === repoUrl)?.id;
                const removed = await removeSubscriptionByUrl(chatType, chatId, repoUrl);
                if (removed) {
                    await removePauseById(repoId); // 删除对应的暂停状态
                    console.log('已成功删除repo：', repoUrl);
                    message.send(format(Text(`订阅删除成功：${repoUrl}`)));
                } else {
                    message.send(format(Text('请输入完整的GitHub仓库地址')));
                }
            }
        }
        // 私聊触发则，记录用户。
        if (e.name === 'private.message.create' && e.MessageId) {
            if (!(isOwner(e) || isAdmin(e.UserKey))) {
                message.send(format(Text('只有主人或管理员可以添加订阅')));
                return;
            }
            const repoUrl = extractRepoUrl(e.MessageText);
            const chatType = 'private.message.create';
            const chatId = e.OpenId;
            const subs = await listAllSubscriptionsByType(chatType);
            if (repoUrl) {
                const repoId = subs
                    .find(sub => sub.repos.some(repo => repo.repo === repoUrl))
                    ?.repos.find(repo => repo.repo === repoUrl)?.id;
                const removed = await removeSubscriptionByUrl(chatType, chatId, repoUrl);
                if (removed) {
                    await removePauseById(repoId); // 删除对应的暂停状态
                    console.log('已成功删除repo：', repoUrl);
                    message.send(format(Text(`订阅删除成功：${repoUrl}`)));
                }
            } else {
                message.send(format(Text('请输入完整的GitHub仓库地址')));
            }
        }
    }

    if (removeByIdReg.test(e.MessageText)) {
        const match = e.MessageText.match(removeByIdReg);
        if (match && match[3]) {
            const subId = match[3];
            const found = await removeSubscriptionById(subId);
            if (found) {
                await removePauseById(subId);
                message.send(format(Text(`订阅仓库删除成功，编号为：\n ${subId}`)));
            } else {
                message.send(format(Text('⚠ 要删除的对应编号的仓库不存在，请检查已订阅的仓库编号')));
            }
        } else {
            message.send(format(Text('⚠ 无效的仓库编号，请提供正确的仓库编号')));
        }
    }
    return;
});
