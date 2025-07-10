import { selects } from '@src/apps/index';
import SubscriptionService from '@src/models/github.sub.operation';
import PermissionService, { Action } from '@src/models/github.sub.permissoin';
import { Text, useMessage } from 'alemonjs';
import { Regular } from 'alemonjs/utils';

const startAllReg = /^(!|！|\/)?(开启推送|启动推送|启用推送|codes-start)$/;
const startByIdReg = /^(!|！|\/)?(开启推送编号|启动推送编号|启用推送编号|codessid-start)\s*([a-z0-9]{8})$/i;

export const regular = Regular.or(startAllReg, startByIdReg);

export default onResponse(selects, async e => {
    const [message] = useMessage(e);

    // 启用所在群聊的订阅推送
    if (startAllReg.test(e.MessageText)) {
        if (e.name === 'message.create' && e.MessageId) {
            if (
                !(
                    PermissionService.isOwner(e) ||
                    PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_group_pool)
                )
            ) {
                message.send(format(Text('只有主人或管理员可以启用订阅')));
                return;
            }
            const chatId = e.SpaceId;
            const subIds = await SubscriptionService.getSubIdBySpaceID(chatId);
            await SubscriptionService.makeAllSubscriptionsEnabled(subIds);
            message.send(format(Text('✅ 本群GitHub订阅服务已恢复')));
            return;
        }
        if (e.name === 'private.message.create' && e.MessageId) {
            if (
                !(
                    PermissionService.isOwner(e) ||
                    PermissionService.checkPermission(e.UserKey, e.OpenId, Action.manage_private_pool)
                )
            ) {
                message.send(format(Text('只有主人或白名单用户可以暂停本私聊订阅')));
                return;
            }
            const chatId = e.OpenId;
            const subIds = await SubscriptionService.getSubIdByOpenID(chatId);
            await SubscriptionService.makeAllSubscriptionsEnabled(subIds);
            message.send(format(Text('✅ 本私聊GitHub订阅服务已恢复')));
            return;
        }
    }

    /**启用指定订阅编号的订阅 */
    if (startByIdReg.test(e.MessageText)) {
        const match = e.MessageText.match(startByIdReg);
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
                        message.send(format(Text('只有主人或管理员可以启用本聊天的该订阅')));
                        return;
                    }
                    const isUse = await SubscriptionService.enableSubscription(subId);
                    logger.info(`启用编号订阅 ${subId}: ${isUse}`);
                    if (isUse === true) {
                        message.send(format(Text(`成功启用该订阅：${subId}`)));
                    } else {
                        message.send(format(Text(`启用该订阅失败：${subId}`)));
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
                            message.send(format(Text('只有主人或全局管理员可以跨聊天启用此repo')));
                            return;
                        }
                        const isUse = await SubscriptionService.enableSubscription(subId);
                        if (isUse) {
                            message.send(format(Text(`成功跨聊天启用该订阅：${subId}`)));
                        } else {
                            message.send(format(Text(`跨聊天启用该订阅失败：${subId}`)));
                        }
                    } else {
                        message.send(format(Text('⚠ 要启用的对应编号的仓库不存在，请检查已订阅的仓库编号')));
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
                        message.send(format(Text('只有主人或白名单用户可以启用自己的私聊repo')));
                        return;
                    }
                    const isUse = await SubscriptionService.enableSubscription(subId);
                    if (isUse) {
                        message.send(format(Text(`成功启用该订阅：${subId}`)));
                    } else {
                        message.send(format(Text(`启用该订阅失败：${subId}`)));
                    }
                } else {
                    message.send(format(Text('⚠ 要启用的对应编号的仓库不存在，请检查已订阅的仓库编号')));
                }
            }
        } else {
            message.send(format(Text('⚠ 无效的订阅编号，请提供正确的订阅编号')));
            return;
        }
    }
    return;
});
