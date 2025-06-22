import { getIoRedis } from '@alemonjs/db';

const ioRedis = getIoRedis();

export interface Subscription {
    chatType: string;
    chatId: string;
    repos: string[];
}

const REDIS_KEY = 'alemonjs:githubBot:subsData';

// 异步加载所有订阅
async function loadSubscriptions(): Promise<Subscription[]> {
    const data = await ioRedis.get(REDIS_KEY);
    if (!data) return [];
    try {
        return JSON.parse(data) as Subscription[];
    } catch {
        return [];
    }
}

// 异步保存所有订阅
async function saveSubscriptions(subs: Subscription[]) {
    await ioRedis.set(REDIS_KEY, JSON.stringify(subs));
}

/** 获取订阅某仓库的所有群聊
 * @param repo 仓库名
 * @returns 返回订阅该仓库的所有群聊信息
 */
export async function getSubscriptionsByRepo(repo: string): Promise<{ chatType: string; chatId: string }[]> {
    const subs = await loadSubscriptions();
    return subs.filter(s => s.repos.includes(repo)).map(s => ({ chatType: s.chatType, chatId: s.chatId }));
}

/**
 * 添加订阅
 * @param chatType 聊天类型
 * @param chatId 空间ID
 * @param repo 仓库名
 */
export async function addSubscription(chatType: string, chatId: string, repo: string) {
    const subs = await loadSubscriptions();
    let sub = subs.find(s => s.chatType === chatType && s.chatId === chatId);
    if (!sub) {
        sub = { chatType, chatId, repos: [repo] };
        subs.push(sub);
    } else if (!sub.repos.includes(repo)) {
        sub.repos.push(repo);
    }
    await saveSubscriptions(subs);
}

/**
 * 删除订阅
 * @param chatType 聊天类型
 * @param chatId 空间ID
 * @param repo 仓库名
 */
export async function removeSubscription(chatType: string, chatId: string, repo: string) {
    const subs = await loadSubscriptions();
    const sub = subs.find(s => s.chatType === chatType && s.chatId === chatId);
    if (sub) {
        sub.repos = sub.repos.filter(r => r !== repo);
        if (sub.repos.length === 0) {
            const idx = subs.indexOf(sub);
            subs.splice(idx, 1);
        }
        await saveSubscriptions(subs);
    }
}

/**
 * 查看订阅
 * @param chatType 聊天类型
 * @param chatId 空间ID
 * @return 返回订阅的仓库列表
 */
export async function listSubscriptions(chatType: string, chatId: string): Promise<string[]> {
    const subs = await loadSubscriptions();
    const sub = subs.find(s => s.chatType === chatType && s.chatId === chatId);
    return sub ? sub.repos : [];
}
