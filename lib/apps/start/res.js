import { selects } from '../index.js';
import SubscriptionService from '../../models/github.sub.operation.js';
import PermissionService, { Action } from '../../models/github.sub.permissoin.js';
import { useMessage, Text } from 'alemonjs';
import { Regular } from 'alemonjs/utils';

const startAllReg = /^(!|！|\/)?(启用|开启|启动|打开)本聊天所有(仓库|github仓库|GitHub仓库|GitHub代码仓库)推送$/;
const startByIdReg = /^(!|！|\/)?(启用|开启|启动|打开)编号仓库\s*([a-z0-9]{8})$/i;
const regular = Regular.or(startAllReg, startByIdReg);
var res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    if (startAllReg.test(e.MessageText)) {
        if (e.name === 'message.create' && e.MessageId) {
            if (!(PermissionService.isOwner(e) ||
                PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_group_pool))) {
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
            if (!(PermissionService.isOwner(e) ||
                PermissionService.checkPermission(e.UserKey, e.OpenId, Action.manage_private_pool))) {
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
    if (startByIdReg.test(e.MessageText)) {
        const match = e.MessageText.match(startByIdReg);
        if (match && match[3]) {
            const subId = match[3];
            if (e.name === 'message.create' && e.MessageId) {
                const groupSubsIds = await SubscriptionService.getSubIdBySpaceID(e.SpaceId);
                if (groupSubsIds.includes(subId)) {
                    if (!(PermissionService.isOwner(e) ||
                        (await PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_group_pool)))) {
                        message.send(format(Text('只有主人或管理员可以启用本聊天的该订阅')));
                        return;
                    }
                    const isUse = await SubscriptionService.enableSubscription(subId);
                    logger.info(`启用编号订阅 ${subId}: ${isUse}`);
                    if (isUse === true) {
                        message.send(format(Text(`成功启用本聊天的该订阅：${subId}`)));
                    }
                    else {
                        message.send(format(Text(`启用本聊天的该订阅失败：${subId}`)));
                    }
                }
                else {
                    const otherChatSubData = await SubscriptionService.getSubscription(subId);
                    const otherChatSubId = otherChatSubData?.chatId;
                    if (otherChatSubId) {
                        if (!(PermissionService.isOwner(e) ||
                            (await PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_all_group_pool)))) {
                            message.send(format(Text('只有主人或全局管理员可以跨聊天启用此repo')));
                            return;
                        }
                        const isUse = await SubscriptionService.enableSubscription(subId);
                        if (isUse) {
                            message.send(format(Text(`成功跨聊天启用该订阅：${subId}`)));
                        }
                        else {
                            message.send(format(Text(`跨聊天启用该订阅失败：${subId}`)));
                        }
                    }
                    else {
                        message.send(format(Text('⚠ 要启用的对应编号的仓库不存在，请检查已订阅的仓库编号')));
                    }
                }
            }
            if (e.name === 'private.message.create' && e.MessageId) {
                const privateSubsIds = await SubscriptionService.getSubIdByOpenID(e.OpenId);
                if (privateSubsIds.includes(subId)) {
                    if (!(PermissionService.isOwner(e) ||
                        (await PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_private_pool)))) {
                        message.send(format(Text('只有主人或白名单用户可以启用自己的私聊repo')));
                        return;
                    }
                    const isUse = await SubscriptionService.enableSubscription(subId);
                    if (isUse) {
                        message.send(format(Text(`成功启用该订阅：${subId}`)));
                    }
                    else {
                        message.send(format(Text(`启用该订阅失败：${subId}`)));
                    }
                }
                else {
                    message.send(format(Text('⚠ 要启用的对应编号的仓库不存在，请检查已订阅的仓库编号')));
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

export { res as default, regular };
