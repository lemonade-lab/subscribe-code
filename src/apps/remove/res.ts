import { platform as onebot } from '@alemonjs/onebot';
import { selects } from '@src/apps/index';
import SubscriptionService from '@src/models/github.sub.operation';
import PermissionService, { Action } from '@src/models/github.sub.permissoin';
import { Text, useMessage } from 'alemonjs';
import { Regular } from 'alemonjs/utils';

const removeSubByUrlReg =
    /^(!|！|\/)?(移除|取消|删除|del|DEL|delete|DELETE)(本聊天)?(仓库|github仓库|GitHub仓库|GitHub代码仓库)\s*(https?:\/\/)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;
const removeByIdReg = /^(!|！|\/)?(移除|取消|删除|del|DEL|delete|DELETE)编号仓库\s*([a-z0-9]{8})$/i;
const removeRepoPoolRegex =
    /^([!！/])?(移除|取消|删除|del|DEL|delete|DELETE)(仓库池|github仓库池|GitHub代码仓库池)\s*(https?:\/\/)?(github\.com\/)?[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;

export const regular = Regular.or(removeSubByUrlReg, removeByIdReg, removeRepoPoolRegex);

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

    /**通过repor_url移除该聊天的某个仓库订阅 */
    if (removeSubByUrlReg.test(e.MessageText)) {
        // 群聊触发则，记录群聊。
        if (e.name === 'message.create' && e.MessageId) {
            if (
                !(
                    PermissionService.isOwner(e) ||
                    PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_group_pool)
                )
            ) {
                message.send(format(Text('只有主人或管理员可以移除本聊天的该仓库订阅')));
                return;
            }
            const repoUrl = extractRepoUrl(e.MessageText);
            const chatId = e.SpaceId;
            if (repoUrl) {
                const subsData = await SubscriptionService.getSubDataBySpaceID(chatId);
                const toRemoveSubId = subsData.find(sub => sub.repoUrl === repoUrl)?.id;
                const removed = await SubscriptionService.removeSubscription(toRemoveSubId);
                if (removed) {
                    logger.info('已成功删除repo：', repoUrl);
                    message.send(format(Text(`订阅删除成功：${repoUrl}`)));
                } else {
                    message.send(format(Text('未找到该仓库订阅，请输入已订阅的完整的GitHub仓库地址')));
                    return;
                }
            }
        }
        // 私聊触发则，记录用户。
        if (e.name === 'private.message.create' && e.MessageId) {
            if (
                !(
                    PermissionService.isOwner(e) ||
                    PermissionService.checkPermission(e.UserKey, e.OpenId, Action.manage_private_pool)
                )
            ) {
                message.send(format(Text('只有主人或白名单用户可以私聊删除订阅')));
                return;
            }
            const repoUrl = extractRepoUrl(e.MessageText);
            const chatId = e.OpenId;
            if (repoUrl) {
                const subsData = await SubscriptionService.getSubDataByOpenID(chatId);
                const toRemoveSubId = subsData.find(sub => sub.repoUrl === repoUrl)?.id;
                const removed = await SubscriptionService.removeSubscription(toRemoveSubId);
                if (removed) {
                    logger.info('已成功删除repo：', repoUrl);
                    message.send(format(Text(`订阅删除成功：${repoUrl}`)));
                }
            } else {
                message.send(format(Text('未找到该仓库订阅，请输入已订阅的完整的GitHub仓库地址')));
            }
        }
        return;
    }

    /**通过订阅编号删除订阅 */
    if (removeByIdReg.test(e.MessageText)) {
        const match = e.MessageText.match(removeByIdReg);
        if (match && match[3]) {
            const subId = match[3];
            if (e.name === 'message.create' && e.MessageId) {
                const groupSubsIds = await SubscriptionService.getSubIdBySpaceID(e.SpaceId);
                if (groupSubsIds.includes(subId)) {
                    if (
                        !(
                            PermissionService.isOwner(e) ||
                            (await PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_group_pool))
                        )
                    ) {
                        message.send(format(Text('只有主人或管理员可以删除本聊天的该repo')));
                        return;
                    }
                    const removed = await SubscriptionService.removeSubscription(subId);
                    if (removed) {
                        logger.info('已成功删除repo：', subId);
                        message.send(format(Text(`本聊天的订阅删除成功：${subId}`)));
                    } else {
                        logger.info('删除repo失败：', subId);
                        return;
                    }
                } else {
                    const otherChatSubData = await SubscriptionService.getSubscription(subId);
                    const otherChatSubId = otherChatSubData?.chatId;
                    if (otherChatSubId) {
                        if (
                            !(
                                PermissionService.isOwner(e) ||
                                (await PermissionService.checkPermission(
                                    e.UserKey,
                                    e.SpaceId,
                                    Action.manage_all_group_pool
                                ))
                            )
                        ) {
                            message.send(format(Text('只有主人或全局管理员可以跨聊天删除此repo')));
                            return;
                        }
                        const removed = await SubscriptionService.removeSubscription(otherChatSubId);
                        if (removed) {
                            logger.info('已成功跨聊天删除repo：', otherChatSubId);
                            message.send(format(Text(`跨聊天订阅删除成功：${otherChatSubId}`)));
                        } else {
                            logger.info('跨聊天删除repo失败：', otherChatSubId);
                            return;
                        }
                    } else {
                        message.send(format(Text('⚠ 要删除的对应编号的仓库不存在，请检查已订阅的仓库编号')));
                    }
                }
            }

            if (e.name === 'private.message.create' && e.MessageId) {
                const privateSubsIds = await SubscriptionService.getSubIdByOpenID(e.OpenId);
                if (privateSubsIds.includes(subId)) {
                    if (
                        !(
                            PermissionService.isOwner(e) ||
                            (await PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_private_pool))
                        )
                    ) {
                        message.send(format(Text('只有主人或白名单用户可以删除自己的私聊repo')));
                        return;
                    }
                    const removed = await SubscriptionService.removeSubscription(subId);
                    if (removed) {
                        logger.info('已成功私聊删除repo：', subId);
                        message.send(format(Text(`私聊订阅删除成功：${subId}`)));
                    } else {
                        logger.info('私聊删除repo失败：', subId);
                        return;
                    }
                } else {
                    message.send(format(Text('⚠ 要删除的对应编号的仓库不存在，请检查已订阅的仓库编号')));
                }
            }
        } else {
            message.send(format(Text('⚠ 无效的仓库编号，请提供正确的仓库编号')));
        }
    }

    /**从仓库池删除repo */
    if (removeRepoPoolRegex.test(e.MessageText)) {
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
        if (repoUrl && (await SubscriptionService.hasRepo(repoUrl))) {
            if (await SubscriptionService.removeRepo(repoUrl)) {
                message.send(format(Text(`删除仓库池成功：${repoUrl}`)));
            } else {
                message.send(format(Text(`删除仓库池失败：${repoUrl}`)));
            }
        } else {
            message.send(format(Text(`仓库池不存在：${repoUrl}`)));
        }
    }
    return;
});
