import { selects } from '@src/apps/index';
import SubscriptionService from '@src/models/github.sub.operation';
import PermissionService, {
    Action,
    SubscriptionPool,
    SubscriptionStatus,
    UserRole
} from '@src/models/github.sub.permissoin';
import { Text, useMessage } from 'alemonjs';
import { Regular } from 'alemonjs/utils';

const listRepoReg = /^(!|！|\/)?(本聊天)?(仓库|github仓库|GitHub仓库|GitHub代码仓库)列表$/;
const listAllRepoReg = /^(!|！|\/)?(仓库|github仓库|GitHub仓库|GitHub代码仓库)全部列表$/;
const viewRepoPoolReg = /^(!|！|\/)?(仓库|github仓库|GitHub仓库|GitHub代码仓库|repo)池列表$/;
const checkRepoReg =
    /^(!|！|\/)?检查(仓库|github仓库|GitHub仓库|GitHub代码仓库)\s*(https?:\/\/)?(github\.com\/)?[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

export const regular = Regular.or(listRepoReg, listAllRepoReg, viewRepoPoolReg, checkRepoReg);

export default onResponse(selects, async e => {
    const [message] = useMessage(e);

    function extractRepoUrl(text: string): string | null {
        const match = text.trim().match(/(github\.com\/)?([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/);
        return match ? match[2] : null;
    }

    // 查看本聊天的订阅列表
    if (listRepoReg.test(e.MessageText)) {
        // 群聊触发则，记录群聊。
        if (e.name === 'message.create' && e.MessageId) {
            const chatType = 'message.create';
            const chatId = e.SpaceId;

            logger.info('查看当前群聊订阅', chatType, chatId);
            const subs = await SubscriptionService.getSubDataBySpaceID(chatId);
            const usedAll = await SubscriptionService.isAllSubscriptionsEnabled(subs);
            const chatStatus = usedAll ? '✅' : '⚠';

            const lines: string[] = [];
            for (const sub of subs) {
                const used = usedAll ? (sub.status === SubscriptionStatus.Enabled ? '✅' : '⚠') : '⚠';
                lines.push(`${used} ${sub.id}：${sub.repoUrl}`);
            }
            lines.push(`\n⚠：暂停推送，✅：正常推送`);
            message.send(
                format(
                    Text(`👪本聊天${chatStatus}订阅的GitHub仓库列表：\n\n${lines.length ? lines.join('\n') : '无订阅'}`)
                )
            );
        }
        // 私聊触发则，记录用户。
        if (e.name === 'private.message.create' && e.MessageId) {
            const chatType = 'private.message.create';
            const chatId = e.OpenId;

            logger.info('查看当前私聊订阅', chatType, chatId);
            const subs = await SubscriptionService.getSubDataByOpenID(chatId);
            const usedAll = await SubscriptionService.isAllSubscriptionsEnabled(subs);
            const chatStatus = usedAll ? '✅' : '⚠';

            const lines: string[] = [];
            for (const sub of subs) {
                const used = usedAll ? (sub.status === SubscriptionStatus.Enabled ? '✅' : '⚠') : '⚠';
                lines.push(`${used} ${sub.id}：${sub.repoUrl}`);
            }
            lines.push(`\n⚠：暂停推送，✅：正常推送`);
            message.send(
                format(Text(`🧑你${chatStatus}订阅的GitHub仓库列表：\n\n${lines.length ? lines.join('\n') : '无订阅'}`))
            );
        }
        return;
    }

    // 查看全部订阅列表
    if (listAllRepoReg.test(e.MessageText)) {
        if (
            !(
                PermissionService.isOwner(e) ||
                (await PermissionService.getUserRole(e.UserKey)) === UserRole.GlobalCodeMaster
            )
        ) {
            message.send(format(Text('你无全局管理员权限，无法查看全部仓库订阅')));
            return;
        }
        if ((e.name === 'message.create' || e.name === 'private.message.create') && e.MessageId) {
            const msgs = [`订阅的全部GitHub仓库列表：\n`];
            logger.info('执行查看全部仓库订阅');
            const groupSubs = await SubscriptionService.getSubscriptionsByPoolType(SubscriptionPool.Group);
            if (groupSubs.length !== 0) {
                msgs.push(`--------------------\n👪群聊订阅：`);
                for (const sub of groupSubs) {
                    const forEachGroupSubs = groupSubs.filter(item => item.id === sub.id);
                    const usedAll = await SubscriptionService.isAllSubscriptionsEnabled(forEachGroupSubs);
                    const chatStatus = usedAll ? '✅' : '⚠';
                    const lines = await Promise.all(
                        forEachGroupSubs.map(async r => {
                            const used = usedAll ? (r.status === SubscriptionStatus.Enabled ? '✅' : '⚠') : '⚠';
                            return `${used} ${r.id}：${r.repoUrl}`;
                        })
                    );
                    msgs.push(`\n${sub.chatId}${chatStatus}：\n${lines.join('\n')}\n`);
                }
            }
            const privateSubs = await SubscriptionService.getSubscriptionsByPoolType(SubscriptionPool.Private);
            if (privateSubs.length !== 0) {
                msgs.push(`--------------------\n🧑私聊订阅：`);
                for (const sub of privateSubs) {
                    const forEachPrivateSubs = groupSubs.filter(item => item.id === sub.id);
                    const usedAll = await SubscriptionService.isAllSubscriptionsEnabled(forEachPrivateSubs);
                    const chatStatus = usedAll ? '✅' : '⚠';
                    const lines = await Promise.all(
                        forEachPrivateSubs.map(async r => {
                            const used = usedAll ? (r.status === SubscriptionStatus.Enabled ? '✅' : '⚠') : '⚠';
                            return `${used} ${r.id}：${r.repoUrl}`;
                        })
                    );
                    msgs.push(`\n${sub.chatId}${chatStatus}：\n${lines.join('\n')}\n`);
                }
            }
            msgs.push(`\n⚠：暂停推送，✅：正常推送`);
            message.send(format(Text(`${msgs.join('') || '无订阅'}`)));
        }
        return;
    }

    // 查看仓库池
    if (viewRepoPoolReg.test(e.MessageText)) {
        let role: string = UserRole.User;
        let chatId: string;
        if (e.name === 'message.create' && e.MessageId) {
            chatId = e.SpaceId;
            role = await PermissionService.getUserRole(e.UserKey, chatId, e);
        } else if (e.name === 'private.message.create') {
            chatId = e.OpenId;
            role = await PermissionService.getUserRole(e.UserKey, chatId, e);
        }
        if (!PermissionService.checkPermission(e.UserKey, chatId, Action.view_repo_pool, e)) {
            message.send(format(Text('你无管理员权限，无法查看仓库池列表')));
            return;
        }

        const msgs = [`📝仓库池列表：\n────────────────\n`];
        logger.info('执行查看仓库池');
        const repoList = await SubscriptionService.listRepos();
        if (repoList && repoList.length > 0) {
            const lines = repoList.map(repo => `• ${repo}`);
            msgs.push(lines.join('\n'));
        }
        message.send(format(Text(`${msgs.join('') || '仓库池为空'}`)));
        return;
    }

    // 检查指定仓库是否已经订阅
    if (checkRepoReg.test(e.MessageText)) {
        const repoUrl = extractRepoUrl(e.MessageText);
        if (!repoUrl) {
            message.send(format(Text('请在指令末尾提供要检查的仓库名称')));
            return;
        }

        let chatId: string;
        if (e.name === 'message.create') {
            chatId = e.SpaceId;
        } else if (e.name === 'private.message.create') {
            chatId = e.OpenId;
        }

        logger.info(`检查仓库 ${repoUrl} 是否在聊天 ${chatId} 中订阅`);
        const subs = await SubscriptionService.getSubIdByRepo(repoUrl);
        const isSubscribed = subs.map(sub => sub.chatId).includes(chatId);

        if (isSubscribed) {
            message.send(format(Text(`仓库 ${repoUrl} 在本聊天中已订阅`)));
        } else {
            message.send(format(Text(`仓库 ${repoUrl} 未在本聊天中订阅`)));
        }
        return;
    }
});
