import { platform as discord } from '@alemonjs/discord';
import { platform as kook } from '@alemonjs/kook';
import { platform as onebot } from '@alemonjs/onebot';
import { selects } from '@src/apps/index';
import SubscriptionService from '@src/models/github.sub.operation';
import PermissionService, { Action, SubscriptionPool } from '@src/models/github.sub.permissoin';
import { Text, useMessage } from 'alemonjs';
import { Regular } from 'alemonjs/utils';

const addSubByUrlRegex =
    /^([!！/])?(订阅仓库|sub|SUB|codes-sub|codes-s)?\s*(https?:\/\/)?(www.)?(github\.com\/)?[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;

const addSubByRepoIdRegex =
    /^(!|！|\/)?(订阅索引仓库|sub-index-pool|subRepoId|subrepoid|sub-repo-id|SUBREPOID|SUB-REPO-ID|codesrid-sub|codesrid-s)\s*([a-z0-9]{4})$/i;

const addRepoPoolRegex =
    /^([!！/])?(添加仓库池|addpool|ADDPOOL|add-pool|Add-Pool|ADDPOOL|ADD-POOL|codep-add|codep-a)\s*(https?:\/\/)?(www.)?(github\.com\/)?[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;

export const regular = Regular.or(addSubByUrlRegex, addSubByRepoIdRegex, addRepoPoolRegex);

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

    /**
     * 通过仓库url订阅仓库到聊天
     */
    if (addSubByUrlRegex.test(e.MessageText)) {
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
            if (repoUrl) {
                if (await SubscriptionService.addSubscription(SubscriptionPool.Group, chatId, e.UserKey, repoUrl)) {
                    message.send(format(Text(`订阅成功：${repoUrl}`)));
                } else {
                    message.send(format(Text(`该群聊已经订阅过该仓库：${repoUrl}`)));
                    return;
                }
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
            if (repoUrl) {
                if (await SubscriptionService.addSubscription(SubscriptionPool.Private, chatId, e.UserKey, repoUrl)) {
                    message.send(format(Text(`订阅成功：${repoUrl}`)));
                } else {
                    message.send(format(Text(`该聊天你已经订阅过该仓库：${repoUrl}`)));
                }
            } else {
                message.send(format(Text('请输入正确的GitHub仓库地址')));
            }
            return;
        }
    }

    /**
     * 通过仓库索引id订阅仓库到聊天
     */
    if (addSubByRepoIdRegex.test(e.MessageText)) {
        const match = e.MessageText.match(addSubByRepoIdRegex);
        // 群聊
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
            const chatId = e.SpaceId;
            if (match && match[3]) {
                const repoId = match[3];
                if (await SubscriptionService.hasPoolRepoById(repoId)) {
                    const repoUrl = await SubscriptionService.getPoolRepoUrlById(repoId);
                    if (
                        repoUrl &&
                        (await SubscriptionService.addSubscription(SubscriptionPool.Group, chatId, e.UserKey, repoUrl))
                    ) {
                        message.send(format(Text(`订阅成功：${repoUrl}`)));
                    } else {
                        message.send(format(Text(`该群聊已经订阅过该仓库：${repoUrl}`)));
                    }
                } else {
                    message.send(format(Text(`没有找到该仓库索引：${repoId}`)));
                }
            }
            return;
        }
        // 私聊
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
            const chatId = e.OpenId;
            if (match && match[3]) {
                const repoId = match[3];
                if (await SubscriptionService.hasPoolRepoById(repoId)) {
                    const repoUrl = await SubscriptionService.getPoolRepoUrlById(repoId);
                    if (
                        repoUrl &&
                        (await SubscriptionService.addSubscription(
                            SubscriptionPool.Private,
                            chatId,
                            e.UserKey,
                            repoUrl
                        ))
                    ) {
                        message.send(format(Text(`订阅成功：${repoUrl}`)));
                    } else {
                        message.send(format(Text(`该群聊已经订阅过该仓库：${repoUrl}`)));
                    }
                } else {
                    message.send(format(Text(`没有找到该仓库索引：${repoId}`)));
                }
            }
            return;
        }
        return;
    }

    /**添加url到仓库池，并建立索引id */
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
        if (repoUrl && !(await SubscriptionService.hasPoolRepoByUrl(repoUrl))) {
            if (await SubscriptionService.addRepoToPool(repoUrl)) {
                const repoId = await SubscriptionService.getPoolRepoIdByUrl(repoUrl);
                message.send(format(Text(`添加到仓库池成功：\n索引id : repoURL\n${repoId} : ${repoUrl}`)));
            } else {
                message.send(format(Text(`添加到仓库池失败：${repoUrl}`)));
            }
        } else if (repoUrl && (await SubscriptionService.hasPoolRepoByUrl(repoUrl))) {
            message.send(format(Text(`该仓库已添加到仓库池`)));
        }
    }
});
