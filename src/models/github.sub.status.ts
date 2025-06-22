import { getIoRedis } from '@alemonjs/db';
const ioRedis = getIoRedis();

const pauseStatusKey = 'alemonjs:githubBot:pauseStatus';

// 设置暂停
export async function setPause(chatType: string, chatId: string, pause: boolean) {
    await ioRedis.hset(pauseStatusKey, `${chatType}:${chatId}`, pause ? '1' : '0');
}

// 查询是否暂停
export async function isPaused(chatType: string, chatId: string): Promise<boolean> {
    const v = await ioRedis.hget(pauseStatusKey, `${chatType}:${chatId}`);
    return v === '1';
}
