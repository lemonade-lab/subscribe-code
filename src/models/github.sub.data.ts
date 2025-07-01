import crypto from 'crypto';
import { getIoRedis } from '@alemonjs/db';

export interface Subscription {
    chatType: string;
    chatId: string;
    repos: { repo: string; id: string }[];
}

const REDIS_KEY = 'alemonjs:githubBot:subsData';

/** * 从Redis加载所有订阅
 * @returns 返回订阅列表
 * @throws 如果数据解析失败，则返回空数组
 */
async function loadSubscriptions(): Promise<Subscription[]> {
    const ioRedis = getIoRedis();
    const data = await ioRedis.get(REDIS_KEY);
    if (!data) return [];
    try {
        return JSON.parse(data) as Subscription[];
    } catch {
        return [];
    }
}

/**
 * 生成订阅ID
 * @param chatType 聊天类型
 * @param chatId 空间ID
 * @param repoUrl 仓库URL
 * @returns 返回生成的订阅ID
 */
export function genSubId(chatType: string, chatId: string, repoUrl: string): string {
    const str = `${chatType}:${chatId}:${repoUrl}`;
    return crypto.createHash('md5').update(str).digest('hex').slice(0, 8);
}

/**异步保存所有订阅 */
async function saveSubscriptions(subs: Subscription[]) {
    const ioRedis = getIoRedis();
    await ioRedis.set(REDIS_KEY, JSON.stringify(subs));
}

/** 获取订阅某仓库的所有群聊
 * @param repo 仓库名
 * @returns 返回订阅该仓库的所有群聊信息
 */
export async function getSubscriptionsByRepo(repo: string): Promise<{ chatType: string; chatId: string }[]> {
    const subs = await loadSubscriptions();
    return subs.filter(s => s.repos.some(r => r.repo === repo)).map(s => ({ chatType: s.chatType, chatId: s.chatId }));
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
    const id = genSubId(chatType, chatId, repo);
    if (!sub) {
        sub = { chatType, chatId, repos: [{ repo, id }] };
        subs.push(sub);
    } else if (!sub.repos.some(r => r.repo === repo)) {
        sub.repos.push({ repo, id });
    }
    await saveSubscriptions(subs);
}

/**
 * 删除订阅
 * @param chatType 聊天类型
 * @param chatId 空间ID
 * @param repo 仓库名
 */
export async function removeSubscriptionByUrl(chatType: string, chatId: string, repo: string) {
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
    } else {
        return false;
    }
}

/**
 * 通过订阅编号id删除某个订阅
 * @param id 订阅编号
 * @returns 是否删除成功
 */
export async function removeSubscriptionById(id: string): Promise<boolean> {
    const subs = await loadSubscriptions();
    let found = false;

    // 遍历所有订阅，查找并移除包含该id的repo
    for (const sub of subs) {
        const index = sub.repos.findIndex(r => r.id === id);
        if (index !== -1) {
            sub.repos.splice(index, 1);
            found = true;
        }
    }

    // 移除repos为空的订阅项
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

/**
 * 查看订阅
 * @param chatType 聊天类型
 * @param chatId 空间ID
 * @return 返回订阅的仓库列表（带id）
 */
export async function listSubscriptions(chatType: string, chatId: string): Promise<{ repo: string; id: string }[]> {
    const subs = await loadSubscriptions();
    const sub = subs.find(s => s.chatType === chatType && s.chatId === chatId);
    return sub ? sub.repos : [];
}

/**
 * 查看某类型下全部订阅
 * @param chatType 聊天类型
 * @return 返回该类型下所有订阅 [{ chatId, repos }]
 */
export async function listAllSubscriptionsByType(
    chatType: string
): Promise<{ chatId: string; repos: { repo: string; id: string }[] }[]> {
    const subs = await loadSubscriptions();
    return subs
        .filter(s => s.chatType === chatType)
        .map(s => ({
            chatId: s.chatId,
            repos: s.repos
        }));
}
