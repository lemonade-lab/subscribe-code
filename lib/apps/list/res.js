import { selects } from '../index.js';
import SubscriptionService from '../../models/github.sub.operation.js';
import PermissionService, { SubscriptionStatus, UserRole, SubscriptionPool, Action } from '../../models/github.sub.permissoin.js';
import { useMessage, Text } from 'alemonjs';
import { Regular } from 'alemonjs/utils';

const listRepoReg = /^(!|！|\/)?(订阅列表|codes-list|codes-l)$/;
const listAllRepoReg = /^(!|！|\/)?(全部订阅列表|codesg-list|codesg-l)$/;
const viewRepoPoolReg = /^(!|！|\/)?(仓库池列表|codep-list|codep-l)$/;
const checkRepoReg = /^(!|！|\/)?(检查仓库|codes-check|codes-c)\s*(https?:\/\/)?(github\.com\/)?[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const checkByRepoIdReg = /^(!|！|\/)?(检查索引仓库|codesrid-check|codesrid-c)\s*([a-z0-9]{4})$/i;
const regular = Regular.or(listRepoReg, listAllRepoReg, viewRepoPoolReg, checkRepoReg, checkByRepoIdReg);
var res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    function extractRepoUrl(text) {
        const match = text.trim().match(/(github\.com\/)?([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/);
        return match ? match[2] : null;
    }
    if (listRepoReg.test(e.MessageText)) {
        if (e.name === 'message.create' && e.MessageId) {
            const chatType = 'message.create';
            const chatId = e.SpaceId;
            logger.info('查看当前群聊订阅', chatType, chatId);
            const subs = await SubscriptionService.getSubDataBySpaceID(chatId);
            const usedAll = await SubscriptionService.isAllSubscriptionsEnabled(subs);
            const chatStatus = usedAll ? '✅' : '⚠';
            const lines = [];
            for (const sub of subs) {
                const used = usedAll ? (sub.status === SubscriptionStatus.Enabled ? '✅' : '⚠') : '⚠';
                lines.push(`${used} ${sub.SubId} : ${sub.repoUrl}`);
            }
            lines.push(`\n⚠：暂停推送，✅：正常推送`);
            message.send(format(Text(`👪本聊天${chatStatus}订阅的GitHub仓库列表：\n\n< subId : repoUrl >\n\n${lines.length ? lines.join('\n') : '无订阅'}`)));
        }
        if (e.name === 'private.message.create' && e.MessageId) {
            const chatType = 'private.message.create';
            const chatId = e.OpenId;
            logger.info('查看当前私聊订阅', chatType, chatId);
            const subs = await SubscriptionService.getSubDataByOpenID(chatId);
            const usedAll = await SubscriptionService.isAllSubscriptionsEnabled(subs);
            const chatStatus = usedAll ? '✅' : '⚠';
            const lines = [];
            for (const sub of subs) {
                const used = usedAll ? (sub.status === SubscriptionStatus.Enabled ? '✅' : '⚠') : '⚠';
                lines.push(`${used} ${sub.SubId} : ${sub.repoUrl}`);
            }
            lines.push(`\n⚠：暂停推送，✅：正常推送`);
            message.send(format(Text(`🧑你${chatStatus}订阅的GitHub仓库列表：\n\n< subId : repoUrl >\n\n${lines.length ? lines.join('\n') : '无订阅'}`)));
        }
        return;
    }
    if (listAllRepoReg.test(e.MessageText)) {
        if (!(PermissionService.isOwner(e) ||
            (await PermissionService.getUserRole(e.UserKey)) === UserRole.GlobalCodeMaster)) {
            message.send(format(Text('你无全局管理员权限，无法查看全部仓库订阅')));
            return;
        }
        if ((e.name === 'message.create' || e.name === 'private.message.create') && e.MessageId) {
            const msgs = [`订阅的全部GitHub仓库列表：\n`];
            logger.info('执行查看全部仓库订阅');
            const groupSubs = await SubscriptionService.getSubscriptionsByPoolType(SubscriptionPool.Group);
            if (groupSubs.length !== 0) {
                msgs.push(`────────────────\n👪群聊订阅：\n\n< subId : repoUrl >\n\n`);
                for (const sub of groupSubs) {
                    const forEachGroupSubs = groupSubs.filter(item => item.SubId === sub.SubId);
                    const usedAll = await SubscriptionService.isAllSubscriptionsEnabled(forEachGroupSubs);
                    const chatStatus = usedAll ? '✅' : '⚠';
                    const lines = await Promise.all(forEachGroupSubs.map(async (r) => {
                        const used = usedAll ? (r.status === SubscriptionStatus.Enabled ? '✅' : '⚠') : '⚠';
                        return `${used} ${r.SubId} : ${r.repoUrl}`;
                    }));
                    msgs.push(`\n${sub.chatId}${chatStatus}：\n${lines.join('\n')}\n`);
                }
            }
            const privateSubs = await SubscriptionService.getSubscriptionsByPoolType(SubscriptionPool.Private);
            if (privateSubs.length !== 0) {
                msgs.push(`────────────────\n🧑私聊订阅：\n\n< subId : repoUrl >\n\n`);
                for (const sub of privateSubs) {
                    const forEachPrivateSubs = groupSubs.filter(item => item.SubId === sub.SubId);
                    const usedAll = await SubscriptionService.isAllSubscriptionsEnabled(forEachPrivateSubs);
                    const chatStatus = usedAll ? '✅' : '⚠';
                    const lines = await Promise.all(forEachPrivateSubs.map(async (r) => {
                        const used = usedAll ? (r.status === SubscriptionStatus.Enabled ? '✅' : '⚠') : '⚠';
                        return `${used} ${r.SubId} : ${r.repoUrl}`;
                    }));
                    msgs.push(`\n${sub.chatId}${chatStatus}：\n${lines.join('\n')}\n`);
                }
            }
            msgs.push(`\n⚠：暂停推送，✅：正常推送`);
            message.send(format(Text(`${msgs.join('') || '无订阅'}`)));
        }
        return;
    }
    if (viewRepoPoolReg.test(e.MessageText)) {
        UserRole.User;
        let chatId;
        if (e.name === 'message.create' && e.MessageId) {
            chatId = e.SpaceId;
            await PermissionService.getUserRole(e.UserKey, chatId, e);
        }
        else if (e.name === 'private.message.create') {
            chatId = e.OpenId;
            await PermissionService.getUserRole(e.UserKey, chatId, e);
        }
        if (!PermissionService.checkPermission(e.UserKey, chatId, Action.view_repo_pool, e)) {
            message.send(format(Text('你无管理员权限，无法查看仓库池列表')));
            return;
        }
        const msgs = [`📝仓库池列表：\n────────────────\n< repoId : repoUrl >\n\n`];
        logger.info('执行查看仓库池');
        const repoList = await SubscriptionService.listPoolRepos();
        if (repoList && repoList.length > 0) {
            const lines = repoList.map(repo => `${repo.repoId} : ${repo.repoUrl}`);
            msgs.push(lines.join('\n'));
        }
        message.send(format(Text(`${msgs.join('') || '仓库池为空'}`)));
        return;
    }
    if (checkRepoReg.test(e.MessageText)) {
        const repoUrl = extractRepoUrl(e.MessageText);
        if (!repoUrl) {
            message.send(format(Text('请在指令末尾提供要检查的仓库名称')));
            return;
        }
        let chatId;
        if (e.name === 'message.create') {
            chatId = e.SpaceId;
        }
        else if (e.name === 'private.message.create') {
            chatId = e.OpenId;
        }
        logger.info(`检查仓库 ${repoUrl} 是否在聊天 ${chatId} 中订阅`);
        const subs = await SubscriptionService.getSubDataByRepo(repoUrl);
        const isSubscribed = subs.map(sub => sub.chatId).includes(chatId);
        if (isSubscribed) {
            const repoId = await SubscriptionService.getPoolRepoIdByUrl(repoUrl);
            message.send(format(Text(`仓库在本聊天中已订阅：\n\n✅${repoId} : ${repoUrl}`)));
        }
        else {
            message.send(format(Text(`仓库未在本聊天中订阅：\n\n❌${repoUrl}`)));
        }
        return;
    }
    if (checkByRepoIdReg.test(e.MessageText)) {
        const repoId = e.MessageText.match(checkByRepoIdReg)[3];
        let chatId;
        if (e.name === 'message.create') {
            chatId = e.SpaceId;
        }
        else if (e.name === 'private.message.create') {
            chatId = e.OpenId;
        }
        logger.info(`检查索引仓库 ${repoId} 是否在聊天 ${chatId} 中订阅`);
        if (repoId) {
            const repoUrl = await SubscriptionService.getPoolRepoUrlById(repoId);
            const subs = await SubscriptionService.getSubDataByRepo(repoUrl);
            const isSubscribed = subs.map(sub => sub.chatId).includes(chatId);
            if (isSubscribed) {
                message.send(format(Text(`仓库在本聊天中已订阅：\n\n✅${repoId} : ${repoUrl}`)));
            }
            else {
                message.send(format(Text(`仓库未在本聊天中订阅：\n\n❌${repoId} : ${repoUrl}`)));
            }
        }
        else {
            message.send(format(Text('索引仓库不存在，请输入正确的索引id')));
        }
    }
});

export { res as default, regular };
