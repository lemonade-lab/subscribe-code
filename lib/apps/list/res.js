import { selects } from '../index.js';
import { listSubscriptions, listAllSubscriptionsByType } from '../../models/github.sub.data.js';
import { isPaused, isPausedById } from '../../models/github.sub.status.js';
import { isOwner, isAdmin } from '../../utils/config.js';
import { useMessage, Text } from 'alemonjs';
import { Regular } from 'alemonjs/utils';

const listReg = /^(!|！|\/)?(仓库|github仓库|GitHub仓库|GitHub代码仓库)列表$/;
const listAllReg = /^(!|！|\/)?(仓库|github仓库|GitHub仓库|GitHub代码仓库)全部列表$/;
const checkRepoReg = /^(!|！|\/)?检查(仓库|github仓库|GitHub仓库|GitHub代码仓库)\s*(https?:\/\/)?(github\.com\/)?[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const regular = Regular.or(listReg, listAllReg, checkRepoReg);
var res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    function extractRepoUrl(text) {
        const match = text.trim().match(/(github\.com\/)?([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/);
        return match ? match[2] : null;
    }
    if (listReg.test(e.MessageText)) {
        if (e.name === 'message.create' && e.MessageId) {
            const chatType = 'message.create';
            const chatId = e.SpaceId;
            console.log('查看当前群聊订阅', chatType, chatId);
            const subs = await listSubscriptions(chatType, chatId);
            const pausedAll = await isPaused(chatType, chatId);
            const chatStatus = pausedAll ? '⚠' : '✅';
            const lines = [];
            for (const sub of subs) {
                const paused = pausedAll ? '⚠' : (await isPausedById(sub.id)) ? '⚠' : '✅';
                lines.push(`${paused} ${sub.id}：${sub.repo}`);
            }
            lines.push(`\n⚠：暂停推送，✅：正常推送`);
            message.send(format(Text(`👪本聊天${chatStatus}订阅的GitHub仓库列表：\n\n${lines.length ? lines.join('\n') : '无订阅'}`)));
        }
        if (e.name === 'private.message.create' && e.MessageId) {
            const chatType = 'private.message.create';
            const chatId = e.OpenId;
            console.log('查看当前私聊订阅', chatType, chatId);
            const subs = await listSubscriptions(chatType, chatId);
            const pausedAll = await isPaused(chatType, chatId);
            const chatStatus = pausedAll ? '⚠' : '✅';
            const lines = [];
            for (const sub of subs) {
                const paused = pausedAll ? '⚠' : (await isPausedById(sub.id)) ? '⚠' : '✅';
                lines.push(`${paused} ${sub.id}：${sub.repo}`);
            }
            lines.push(`\n⚠：暂停推送，✅：正常推送`);
            message.send(format(Text(`🧑你${chatStatus}订阅的GitHub仓库列表：\n\n${lines.length ? lines.join('\n') : '无订阅'}`)));
        }
        return;
    }
    if (listAllReg.test(e.MessageText)) {
        if (!(isOwner(e) || isAdmin(e.UserKey))) {
            message.send(format(Text('你无管理员权限，无法查看全部仓库订阅')));
            return;
        }
        if ((e.name === 'message.create' || e.name === 'private.message.create') && e.MessageId) {
            const msgs = [`订阅的全部GitHub仓库列表：\n`];
            console.log('执行查看全部仓库订阅');
            const groupSubs = await listAllSubscriptionsByType('message.create');
            if (groupSubs.length !== 0) {
                msgs.push(`--------------------\n👪群聊订阅：`);
                for (const sub of groupSubs) {
                    const pausedAll = await isPaused('message.create', sub.chatId);
                    const chatStatus = pausedAll ? '⚠' : '✅';
                    const lines = await Promise.all(sub.repos.map(async (r) => {
                        const paused = pausedAll ? '⚠' : (await isPausedById(r.id)) ? '⚠' : '✅';
                        return `${paused} ${r.id}：${r.repo}`;
                    }));
                    msgs.push(`\n${sub.chatId}${chatStatus}：\n${lines.join('\n')}\n`);
                }
            }
            const privateSubs = await listAllSubscriptionsByType('private.message.create');
            if (privateSubs.length !== 0) {
                msgs.push(`--------------------\n🧑私聊订阅：`);
                for (const sub of privateSubs) {
                    const pausedAll = await isPaused('private.message.create', sub.chatId);
                    const chatStatus = pausedAll ? '⚠' : '✅';
                    const lines = await Promise.all(sub.repos.map(async (r) => {
                        const paused = pausedAll ? '⚠' : (await isPausedById(r.id)) ? '⚠' : '✅';
                        return `${paused} ${r.id}：${r.repo}`;
                    }));
                    msgs.push(`\n${sub.chatId}${chatStatus}：\n${lines.join('\n')}\n`);
                }
            }
            msgs.push(`\n⚠：暂停推送，✅：正常推送`);
            message.send(format(Text(`${msgs.join('') || '无订阅'}`)));
        }
        return;
    }
    if (checkRepoReg.test(e.MessageText)) {
        const repoUrl = extractRepoUrl(e.MessageText);
        if (!repoUrl) {
            message.send(format(Text('请在指令末尾提供要检查的仓库名称')));
            return;
        }
        let chatType, chatId;
        if (e.name === 'message.create') {
            chatType = 'message.create';
            chatId = e.SpaceId;
        }
        else if (e.name === 'private.message.create') {
            chatType = 'private.message.create';
            chatId = e.OpenId;
        }
        console.log(`检查仓库 ${repoUrl} 是否在聊天 ${chatId} 中订阅`);
        const subs = await listSubscriptions(chatType, chatId);
        const isSubscribed = subs.map(sub => sub.repo).includes(repoUrl);
        if (isSubscribed) {
            message.send(format(Text(`仓库 ${repoUrl} 在本聊天中已订阅`)));
        }
        else {
            message.send(format(Text(`仓库 ${repoUrl} 未在本聊天中订阅`)));
        }
        return;
    }
});

export { res as default, regular };
