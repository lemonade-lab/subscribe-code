import { platform } from '@alemonjs/onebot';
import { selects } from '../index.js';
import SubscriptionService from '../../models/github.sub.operation.js';
import PermissionService, { Action, SubscriptionPool } from '../../models/github.sub.permissoin.js';
import { useMessage, Text } from 'alemonjs';
import { Regular } from 'alemonjs/utils';

const addSubRegex = /^([!！/])?(添加|订阅|add)(本聊天)?(仓库|github仓库|GitHub仓库|GitHub代码仓库)?\s*(https?:\/\/)?(github\.com\/)?[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;
const addRepoPoolRegex = /^([!！/])?(添加|订阅|add)(仓库池|github仓库池|GitHub代码仓库池)\s*(https?:\/\/)?(github\.com\/)?[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;
const regular = Regular.or(addSubRegex, addRepoPoolRegex);
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
    if (addSubRegex.test(e.MessageText)) {
        if (e.name === 'message.create' && e.MessageId) {
            if (!(PermissionService.isOwner(e) ||
                PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_group_pool))) {
                message.send(format(Text('只有主人或管理员可以添加订阅')));
                return;
            }
            const repoUrl = extractRepoUrl(e.MessageText);
            const chatId = e.SpaceId;
            if (repoUrl && (await SubscriptionService.hasRepo(repoUrl))) {
                if (await SubscriptionService.addSubscription(SubscriptionPool.Group, chatId, repoUrl, e.UserKey)) {
                    message.send(format(Text(`订阅成功：${repoUrl}`)));
                }
                else {
                    message.send(format(Text(`该群聊已经订阅过该仓库：${repoUrl}`)));
                    return;
                }
            }
            else if (repoUrl && !(await SubscriptionService.hasRepo(repoUrl))) {
                message.send(format(Text('请先联系管理员添加该仓库地址到仓库池，再群聊添加订阅')));
            }
            else {
                message.send(format(Text('请输入正确的GitHub仓库地址')));
            }
            return;
        }
        if (e.name === 'private.message.create' && e.MessageId) {
            if (!(PermissionService.isOwner(e) ||
                !PermissionService.checkPermission(e.UserKey, e.ChatId, Action.manage_private_pool))) {
                message.send(format(Text('只有主人或被授权的白名单用户可以私聊添加订阅')));
                return;
            }
            const repoUrl = extractRepoUrl(e.MessageText);
            const chatId = e.OpenId;
            if (repoUrl && (await SubscriptionService.hasRepo(repoUrl))) {
                if (await SubscriptionService.addSubscription(SubscriptionPool.Private, chatId, repoUrl, e.UserKey)) {
                    message.send(format(Text(`订阅成功：${repoUrl}`)));
                }
                else {
                    message.send(format(Text(`该聊天你已经订阅过该仓库：${repoUrl}`)));
                }
            }
            else if (repoUrl && !(await SubscriptionService.hasRepo(repoUrl))) {
                message.send(format(Text('请先联系管理员添加该仓库地址到仓库池，再私聊添加订阅')));
            }
            else {
                message.send(format(Text('请输入正确的GitHub仓库地址')));
            }
            return;
        }
    }
    if (addRepoPoolRegex.test(e.MessageText)) {
        if (!(PermissionService.isOwner(e) ||
            PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_repo_pool))) {
            message.send(format(Text('只有主人或管理员可以添加仓库池')));
            return;
        }
        const repoUrl = extractRepoUrl(e.MessageText);
        if (repoUrl && !(await SubscriptionService.hasRepo(repoUrl))) {
            if (await SubscriptionService.addRepo(repoUrl)) {
                message.send(format(Text(`添加仓库池成功：${repoUrl}`)));
            }
            else {
                message.send(format(Text(`添加仓库池失败：${repoUrl}`)));
            }
        }
    }
});

export { res as default, regular };
