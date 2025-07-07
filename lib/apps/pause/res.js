import { selects } from '../index.js';
import SubscriptionService from '../../models/github.sub.operation.js';
import PermissionService, { Action } from '../../models/github.sub.permissoin.js';
import { useMessage, Text } from 'alemonjs';
import { Regular } from 'alemonjs/utils';

const pauseAllReg = /^(!|！|\/)?(暂停|停止|关闭)本聊天所有(仓库|github仓库|GitHub仓库|GitHub代码仓库)推送$/;
const pauseByIdReg = /^(!|！|\/)?(暂停|停止|关闭)编号仓库\s*([a-z0-9]{8})$/i;
const regular = Regular.or(pauseAllReg, pauseByIdReg);
var res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    if (pauseAllReg.test(e.MessageText)) {
        if (e.name === 'message.create' && e.MessageId) {
            if (!(PermissionService.isOwner(e) ||
                PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_group_pool))) {
                message.send(format(Text('只有主人或管理员可以暂停订阅')));
                return;
            }
            const chatId = e.SpaceId;
            const subIds = await SubscriptionService.getSubIdBySpaceID(chatId);
            await SubscriptionService.makeAllSubscriptionsDisabled(subIds);
            message.send(format(Text('❌ 本群GitHub推送服务已暂停')));
            return;
        }
        if (e.name === 'private.message.create' && e.MessageId) {
            if (!(PermissionService.isOwner(e) ||
                PermissionService.checkPermission(e.UserKey, e.OpenId, Action.manage_private_pool))) {
                message.send(format(Text('只有主人或管理员可以暂停订阅')));
                return;
            }
            const chatId = e.OpenId;
            const subIds = await SubscriptionService.getSubIdByOpenID(chatId);
            await SubscriptionService.makeAllSubscriptionsDisabled(subIds);
            message.send(format(Text('❌ 本私聊GitHub推送服务已暂停')));
            return;
        }
    }
    if (pauseByIdReg.test(e.MessageText)) {
        const match = e.MessageText.match(pauseByIdReg);
        if (match && match[3]) {
            const subId = match[3];
            if (e.name === 'message.create' && e.MessageId) {
                const groupSubsIds = await SubscriptionService.getSubIdBySpaceID(e.SpaceId);
                if (groupSubsIds.includes(subId)) {
                    if (!(PermissionService.isOwner(e) ||
                        (await PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_group_pool)))) {
                        message.send(format(Text('只有主人或管理员可以暂停本聊天的该订阅')));
                        return;
                    }
                    const isPaused = await SubscriptionService.disableSubscription(subId);
                    logger.info(`停用编号订阅 ${subId}: ${isPaused}`);
                    if (isPaused === true) {
                        message.send(format(Text(`成功暂停本聊天的该订阅：${subId}`)));
                    }
                    else {
                        message.send(format(Text(`暂停本聊天的该订阅失败：${subId}`)));
                        return;
                    }
                }
                else {
                    const otherChatSubData = await SubscriptionService.getSubscription(subId);
                    const otherChatSubId = otherChatSubData?.chatId;
                    if (otherChatSubId) {
                        if (!(PermissionService.isOwner(e) ||
                            (await PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_all_group_pool)))) {
                            message.send(format(Text('只有主人或全局管理员可以跨聊天暂停此repo')));
                            return;
                        }
                        const isUse = await SubscriptionService.disableSubscription(subId);
                        if (isUse) {
                            message.send(format(Text(`成功跨聊天暂停该订阅：${subId}`)));
                        }
                        else {
                            message.send(format(Text(`跨聊天暂停该订阅失败：${subId}`)));
                            return;
                        }
                    }
                    else {
                        message.send(format(Text('⚠ 要暂停的对应编号的仓库不存在，请检查已订阅的仓库编号')));
                        return;
                    }
                }
            }
            if (e.name === 'private.message.create' && e.MessageId) {
                const privateSubsIds = await SubscriptionService.getSubIdByOpenID(e.OpenId);
                if (privateSubsIds.includes(subId)) {
                    if (!(PermissionService.isOwner(e) ||
                        (await PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_private_pool)))) {
                        message.send(format(Text('只有主人或白名单用户可以暂停自己的私聊repo')));
                        return;
                    }
                    const isUse = await SubscriptionService.enableSubscription(subId);
                    if (isUse) {
                        message.send(format(Text(`成功私聊暂停该订阅：${subId}`)));
                    }
                    else {
                        message.send(format(Text(`私聊暂停该订阅失败：${subId}`)));
                    }
                }
                else {
                    message.send(format(Text('⚠ 要暂停的对应编号的仓库不存在，请检查已订阅的仓库编号')));
                    return;
                }
            }
        }
        else {
            message.send(format(Text('⚠ 无效的订阅编号，请提供正确的订阅编号')));
            return;
        }
    }
    return;
});

export { res as default, pauseAllReg, regular };
