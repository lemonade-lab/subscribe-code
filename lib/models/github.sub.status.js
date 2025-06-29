import { getIoRedis } from '@alemonjs/db';

const pauseStatusKey = 'alemonjs:githubBot:pauseStatus';
async function setPause(chatType, chatId, pause) {
    const ioRedis = getIoRedis();
    await ioRedis.hset(pauseStatusKey, `${chatType}:${chatId}`, pause ? '1' : '0');
}
async function isPaused(chatType, chatId) {
    const ioRedis = getIoRedis();
    const v = await ioRedis.hget(pauseStatusKey, `${chatType}:${chatId}`);
    return v === '1';
}
async function setPauseById(subId, pause) {
    const ioRedis = getIoRedis();
    await ioRedis.hset(pauseStatusKey, subId, pause ? '1' : '0');
}
async function isPausedById(subId) {
    const ioRedis = getIoRedis();
    const v = await ioRedis.hget(pauseStatusKey, subId);
    return v === '1';
}
async function removePauseById(subId) {
    const ioRedis = getIoRedis();
    await ioRedis.hdel(pauseStatusKey, subId);
}

export { isPaused, isPausedById, removePauseById, setPause, setPauseById };
