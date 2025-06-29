import crypto from 'crypto';
import { getIoRedis } from '@alemonjs/db';

const REDIS_KEY = 'alemonjs:githubBot:subsData';
async function loadSubscriptions() {
    const ioRedis = getIoRedis();
    const data = await ioRedis.get(REDIS_KEY);
    if (!data)
        return [];
    try {
        return JSON.parse(data);
    }
    catch {
        return [];
    }
}
function genSubId(chatType, chatId, repoUrl) {
    const str = `${chatType}:${chatId}:${repoUrl}`;
    return crypto.createHash('md5').update(str).digest('hex').slice(0, 8);
}
async function saveSubscriptions(subs) {
    const ioRedis = getIoRedis();
    await ioRedis.set(REDIS_KEY, JSON.stringify(subs));
}
async function getSubscriptionsByRepo(repo) {
    const subs = await loadSubscriptions();
    return subs.filter(s => s.repos.some(r => r.repo === repo)).map(s => ({ chatType: s.chatType, chatId: s.chatId }));
}
async function addSubscription(chatType, chatId, repo) {
    const subs = await loadSubscriptions();
    let sub = subs.find(s => s.chatType === chatType && s.chatId === chatId);
    const id = genSubId(chatType, chatId, repo);
    if (!sub) {
        sub = { chatType, chatId, repos: [{ repo, id }] };
        subs.push(sub);
    }
    else if (!sub.repos.some(r => r.repo === repo)) {
        sub.repos.push({ repo, id });
    }
    await saveSubscriptions(subs);
}
async function removeSubscriptionByUrl(chatType, chatId, repo) {
    const subs = await loadSubscriptions();
    const sub = subs.find(s => s.chatType === chatType && s.chatId === chatId);
    if (sub) {
        sub.repos = sub.repos.filter(r => r.repo !== repo);
        if (sub.repos.length === 0) {
            const idx = subs.indexOf(sub);
            subs.splice(idx, 1);
        }
        await saveSubscriptions(subs);
        return true;
    }
    else {
        return false;
    }
}
async function removeSubscriptionById(id) {
    const subs = await loadSubscriptions();
    let found = false;
    for (const sub of subs) {
        const index = sub.repos.findIndex(r => r.id === id);
        if (index !== -1) {
            sub.repos.splice(index, 1);
            found = true;
        }
    }
    for (let i = subs.length - 1; i >= 0; i--) {
        if (subs[i].repos.length === 0) {
            subs.splice(i, 1);
        }
    }
    if (found) {
        await saveSubscriptions(subs);
    }
    return found;
}
async function listSubscriptions(chatType, chatId) {
    const subs = await loadSubscriptions();
    const sub = subs.find(s => s.chatType === chatType && s.chatId === chatId);
    return sub ? sub.repos : [];
}
async function listAllSubscriptionsByType(chatType) {
    const subs = await loadSubscriptions();
    return subs
        .filter(s => s.chatType === chatType)
        .map(s => ({
        chatId: s.chatId,
        repos: s.repos
    }));
}

export { addSubscription, genSubId, getSubscriptionsByRepo, listAllSubscriptionsByType, listSubscriptions, removeSubscriptionById, removeSubscriptionByUrl };
