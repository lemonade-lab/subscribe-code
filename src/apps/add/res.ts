import { platform as discord } from '@alemonjs/discord';
import { platform as kook } from '@alemonjs/kook';
import { platform as onebot } from '@alemonjs/onebot';
import { selects } from '@src/apps/index';
import SubscriptionService from '@src/models/github.sub.operation';
import PermissionService, { Action, SubscriptionPool } from '@src/models/github.sub.permissoin';
import { Text, useMessage } from 'alemonjs';
import { Regular } from 'alemonjs/utils';

const addSubRegex =
    /^([!！/])?(添加|订阅|add)(本聊天)?(仓库|github仓库|GitHub仓库|GitHub代码仓库)?\s*(https?:\/\/)?(github\.com\/)?[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;
const addRepoPoolRegex =
    /^([!！/])?(添加|订阅|add)(仓库池|github仓库池|GitHub代码仓库池)\s*(https?:\/\/)?(github\.com\/)?[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;

export const regular = Regular.or(addSubRegex, addRepoPoolRegex);

function extractRepoUrl(text: string): string | null {
    const match = text.trim().match(/(github\.com\/)?([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/);
    return match ? match[2] : null;
}

export default onResponse(selects, async e => {
    const [message] = useMessage(e);
    const checkPlatform = (r: string) => [onebot, discord, kook].includes(r);
    if (!checkPlatform(e.Platform)) {
        message.send(format(Text(`本仓库推送功能目前仅支持OneBot、Discord、Kook！${e.Platform}平台暂不支持`)));
        return;
    }

    /**添加订阅 */
    if (addSubRegex.test(e.MessageText)) {
        // 群聊添加订阅
        if (e.name === 'message.create' && e.MessageId) {
            if (
                !(
                    PermissionService.isOwner(e) ||
                    PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_group_pool)
                )
            ) {
                message.send(format(Text('只有主人或管理员可以添加订阅')));
                return;
            }
            const repoUrl = extractRepoUrl(e.MessageText);
            const chatId = e.SpaceId;
            if (repoUrl && (await SubscriptionService.hasRepo(repoUrl))) {
                if (await SubscriptionService.addSubscription(SubscriptionPool.Group, chatId, repoUrl, e.UserKey)) {
                    message.send(format(Text(`订阅成功：${repoUrl}`)));
                } else {
                    message.send(format(Text(`该群聊已经订阅过该仓库：${repoUrl}`)));
                    return;
                }
            } else if (repoUrl && !(await SubscriptionService.hasRepo(repoUrl))) {
                message.send(format(Text('请先联系管理员添加该仓库地址到仓库池，再群聊添加订阅')));
            } else {
                message.send(format(Text('请输入正确的GitHub仓库地址')));
            }
            return;
        }

        // 私聊添加订阅
        if (e.name === 'private.message.create' && e.MessageId) {
            if (
                !(
                    PermissionService.isOwner(e) ||
                    !PermissionService.checkPermission(e.UserKey, e.ChatId, Action.manage_private_pool)
                )
            ) {
                message.send(format(Text('只有主人或被授权的白名单用户可以私聊添加订阅')));
                return;
            }
            const repoUrl = extractRepoUrl(e.MessageText);
            const chatId = e.OpenId;
            if (repoUrl && (await SubscriptionService.hasRepo(repoUrl))) {
                if (await SubscriptionService.addSubscription(SubscriptionPool.Private, chatId, repoUrl, e.UserKey)) {
                    message.send(format(Text(`订阅成功：${repoUrl}`)));
                } else {
                    message.send(format(Text(`该聊天你已经订阅过该仓库：${repoUrl}`)));
                }
            } else if (repoUrl && !(await SubscriptionService.hasRepo(repoUrl))) {
                message.send(format(Text('请先联系管理员添加该仓库地址到仓库池，再私聊添加订阅')));
            } else {
                message.send(format(Text('请输入正确的GitHub仓库地址')));
            }
            return;
        }
    }

    /**添加仓库池 */
    if (addRepoPoolRegex.test(e.MessageText)) {
        if (
            !(
                PermissionService.isOwner(e) ||
                PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_repo_pool)
            )
        ) {
            message.send(format(Text('只有主人或管理员可以添加仓库池')));
            return;
        }
        const repoUrl = extractRepoUrl(e.MessageText);
        if (repoUrl && !(await SubscriptionService.hasRepo(repoUrl))) {
            if (await SubscriptionService.addRepo(repoUrl)) {
                message.send(format(Text(`添加仓库池成功：${repoUrl}`)));
            } else {
                message.send(format(Text(`添加仓库池失败：${repoUrl}`)));
            }
        }
    }
});
