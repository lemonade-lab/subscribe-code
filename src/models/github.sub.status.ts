import { getIoRedis } from '@alemonjs/db';

const pauseStatusKey = 'alemonjs:githubBot:pauseStatus';

// 设置暂停
export async function setPause(chatType: string, chatId: string, pause: boolean) {
    const ioRedis = getIoRedis();
    await ioRedis.hset(pauseStatusKey, `${chatType}:${chatId}`, pause ? '1' : '0');
}

// 查询是否暂停
export async function isPaused(chatType: string, chatId: string): Promise<boolean> {
    const ioRedis = getIoRedis();
    const v = await ioRedis.hget(pauseStatusKey, `${chatType}:${chatId}`);
    return v === '1';
}

/**
 * 通过id设置某个仓库暂停状态
 * @param subId 订阅ID
 * @param pause 是否暂停
 */
export async function setPauseById(subId: string, pause: boolean) {
    const ioRedis = getIoRedis();
    await ioRedis.hset(pauseStatusKey, subId, pause ? '1' : '0');
}

/**
 * 通过id获取某个仓库暂停状态
 * @param subId 订阅ID
 * @returns 返回是否暂停
 */
export async function isPausedById(subId: string): Promise<boolean> {
    const ioRedis = getIoRedis();
    const v = await ioRedis.hget(pauseStatusKey, subId);
    return v === '1';
}

/**
 * 删除某个订阅id的暂停状态
 * @param subId 订阅ID
 */
export async function removePauseById(subId: string) {
    const ioRedis = getIoRedis();
    await ioRedis.hdel(pauseStatusKey, subId);
}
