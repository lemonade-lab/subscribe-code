import { platform as platform$1 } from '@alemonjs/discord';
import { platform as platform$2 } from '@alemonjs/kook';
import { platform } from '@alemonjs/onebot';
import { selects } from '../index.js';
import SubscriptionService from '../../models/github.sub.operation.js';
import PermissionService, { Action } from '../../models/github.sub.permissoin.js';
import { useMessage, Text } from 'alemonjs';
import { Regular } from 'alemonjs/utils';

const removeSubByUrlReg = /^([!|！|/])?(取消订阅仓库|codes-del|codes-d)\s*(https?:\/\/)?(www.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;
const removeByIdReg = /^(!|！|\/)?(取消订阅编号仓库|codessid-del|codessid-d)\s*([a-z0-9]{8})$/;
const removeRepoFromPoolRegex = /^([!！/])?(移除仓库池仓库|codep-del|codep-d)\s*(https?:\/\/)?(www.)?(github\.com\/)?[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;
const removeRepoFromPoolByIdRegex = /^([!！/])?(移除仓库池索引仓库|codeprid-del|codeprid-d)\s*([a-z0-9]{4})$/i;
const regular = Regular.or(removeSubByUrlReg, removeByIdReg, removeRepoFromPoolRegex, removeRepoFromPoolByIdRegex);
var res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    const checkPlatform = (r) => [platform, platform$1, platform$2].includes(r);
    if (!checkPlatform(e.Platform)) {
        message.send(format(Text(`本仓库推送功能目前仅支持OneBot、Discord、Kook！${e.Platform}平台暂不支持`)));
        return;
    }
    function extractRepoUrl(text) {
        const match = text.trim().match(/github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/);
        return match ? match[1] : null;
    }
    if (removeSubByUrlReg.test(e.MessageText)) {
        if (e.name === 'message.create' && e.MessageId) {
            if (!(PermissionService.isOwner(e) ||
                PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_group_pool))) {
                message.send(format(Text('只有主人或管理员可以移除本聊天的该仓库订阅')));
                return;
            }
            const repoUrl = extractRepoUrl(e.MessageText);
            const chatId = e.SpaceId;
            if (repoUrl) {
                const subsData = await SubscriptionService.getSubDataBySpaceID(chatId);
                const toRemoveSubId = subsData.find(sub => sub.repoUrl === repoUrl)?.SubId;
                const removed = await SubscriptionService.removeSubscription(toRemoveSubId);
                if (removed) {
                    logger.info('已成功删除repo：', repoUrl);
                    message.send(format(Text(`订阅删除成功：${repoUrl}`)));
                }
                else {
                    message.send(format(Text('未找到该仓库订阅，请输入已订阅的完整的GitHub仓库地址')));
                    return;
                }
            }
        }
        if (e.name === 'private.message.create' && e.MessageId) {
            if (!(PermissionService.isOwner(e) ||
                PermissionService.checkPermission(e.UserKey, e.OpenId, Action.manage_private_pool))) {
                message.send(format(Text('只有主人或白名单用户可以私聊删除订阅')));
                return;
            }
            const repoUrl = extractRepoUrl(e.MessageText);
            const chatId = e.OpenId;
            if (repoUrl) {
                const subsData = await SubscriptionService.getSubDataByOpenID(chatId);
                const toRemoveSubId = subsData.find(sub => sub.repoUrl === repoUrl)?.SubId;
                const removed = await SubscriptionService.removeSubscription(toRemoveSubId);
                if (removed) {
                    logger.info('已成功删除repo：', repoUrl);
                    message.send(format(Text(`订阅删除成功：${repoUrl}`)));
                }
            }
            else {
                message.send(format(Text('未找到该仓库订阅，请输入已订阅的完整的GitHub仓库地址')));
            }
        }
        return;
    }
    if (removeByIdReg.test(e.MessageText)) {
        const match = e.MessageText.match(removeByIdReg);
        if (match && match[3]) {
            const subId = match[3];
            if (e.name === 'message.create' && e.MessageId) {
                const groupSubsIds = await SubscriptionService.getSubIdBySpaceID(e.SpaceId);
                if (groupSubsIds.includes(subId)) {
                    if (!(PermissionService.isOwner(e) ||
                        (await PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_group_pool)))) {
                        message.send(format(Text('只有主人或管理员可以删除本聊天的该repo')));
                        return;
                    }
                    const removed = await SubscriptionService.removeSubscription(subId);
                    if (removed) {
                        logger.info('已成功删除repo：', subId);
                        message.send(format(Text(`本聊天的订阅删除成功：${subId}`)));
                    }
                    else {
                        logger.info('删除repo失败：', subId);
                        return;
                    }
                }
                else {
                    const otherChatSubData = await SubscriptionService.getSubscription(subId);
                    const otherChatSubId = otherChatSubData?.chatId;
                    if (otherChatSubId) {
                        if (!(PermissionService.isOwner(e) ||
                            (await PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_all_group_pool)))) {
                            message.send(format(Text('只有主人或全局管理员可以跨聊天删除此repo')));
                            return;
                        }
                        const removed = await SubscriptionService.removeSubscription(otherChatSubId);
                        if (removed) {
                            logger.info('已成功跨聊天删除repo：', otherChatSubId);
                            message.send(format(Text(`跨聊天订阅删除成功：${otherChatSubId}`)));
                        }
                        else {
                            logger.info('跨聊天删除repo失败：', otherChatSubId);
                            return;
                        }
                    }
                    else {
                        message.send(format(Text('⚠ 要删除的对应编号的仓库不存在，请检查已订阅的仓库编号')));
                    }
                }
            }
            if (e.name === 'private.message.create' && e.MessageId) {
                const privateSubsIds = await SubscriptionService.getSubIdByOpenID(e.OpenId);
                if (privateSubsIds.includes(subId)) {
                    if (!(PermissionService.isOwner(e) ||
                        (await PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_private_pool)))) {
                        message.send(format(Text('只有主人或白名单用户可以删除自己的私聊repo')));
                        return;
                    }
                    const removed = await SubscriptionService.removeSubscription(subId);
                    if (removed) {
                        logger.info('已成功私聊删除repo：', subId);
                        message.send(format(Text(`私聊订阅删除成功：${subId}`)));
                    }
                    else {
                        logger.info('私聊删除repo失败：', subId);
                        return;
                    }
                }
                else {
                    message.send(format(Text('⚠ 要删除的对应编号的仓库不存在，请检查已订阅的仓库编号')));
                }
            }
        }
        else {
            message.send(format(Text('⚠ 无效的仓库编号，请提供正确的仓库编号')));
        }
    }
    if (removeRepoFromPoolRegex.test(e.MessageText)) {
        if (!(PermissionService.isOwner(e) ||
            PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_repo_pool))) {
            message.send(format(Text('只有主人或管理员可以删除仓库池仓库')));
            return;
        }
        const repoUrl = extractRepoUrl(e.MessageText);
        if (repoUrl && (await SubscriptionService.hasPoolRepoByUrl(repoUrl))) {
            if (await SubscriptionService.removePoolRepo(repoUrl)) {
                message.send(format(Text(`从仓库池删除repo成功：${repoUrl}`)));
            }
            else {
                message.send(format(Text(`从仓库池删除repo失败：${repoUrl}`)));
            }
        }
        else {
            message.send(format(Text(`仓库池无该repo：${repoUrl}`)));
        }
    }
    if (removeRepoFromPoolByIdRegex.test(e.MessageText)) {
        if (!(PermissionService.isOwner(e) ||
            PermissionService.checkPermission(e.UserKey, e.SpaceId, Action.manage_repo_pool))) {
            message.send(format(Text('只有主人或管理员可以删除仓库池索引仓库')));
            return;
        }
        const match = e.MessageText.match(removeRepoFromPoolByIdRegex);
        if (match && match[3]) {
            const repoId = match[3];
            if (await SubscriptionService.hasPoolRepoById(repoId)) {
                const repoUrl = await SubscriptionService.getPoolRepoUrlById(repoId);
                if (await SubscriptionService.removePoolRepo(repoUrl)) {
                    message.send(format(Text(`从仓库池删除repo成功：${repoUrl}`)));
                }
                else {
                    message.send(format(Text(`从仓库池删除repo失败：${repoUrl}`)));
                }
            }
            else {
                message.send(format(Text(`仓库池无该索引号：${repoId}`)));
            }
        }
        else {
            message.send(format(Text('⚠ 无效的仓库池索引号')));
        }
    }
    return;
});

export { res as default, regular };
