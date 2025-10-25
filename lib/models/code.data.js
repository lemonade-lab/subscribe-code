import { getIoRedis } from '@alemonjs/db';

const keyPrefix = 'alemonjs-code';
const subscriptionsPrefix = `${keyPrefix}:subscriptions`;
const indexPrefix = `${keyPrefix}:index`;
const createRepoKey = (origin, belong, name) => {
    return `${origin}/${belong}/${name}`;
};
const createSubscriptionKey = (id) => {
    return `${subscriptionsPrefix}:${id}`;
};
const createIndexKeys = (data) => {
    return {
        byRepo: `${indexPrefix}:repo:${data.origin}/${data.belong}/${data.name}`,
        byChatId: `${indexPrefix}:chatId:${data.chatId}`,
        byType: `${indexPrefix}:type:${data.type}`,
        byRepoAndType: `${indexPrefix}:repo:${data.origin}/${data.belong}/${data.name}:type:${data.type}`,
        byChatIdAndType: `${indexPrefix}:chatId:${data.chatId}:type:${data.type}`
    };
};
const add = async (origin, belong, name, type, chatId) => {
    const ioredis = getIoRedis();
    const repoKey = createRepoKey(origin, belong, name);
    const existingId = await findByRepoAndChatId(origin, belong, name, type, chatId);
    if (existingId) {
        return existingId;
    }
    const id = Date.now().toString();
    const subscriptionKey = createSubscriptionKey(id);
    const data = {
        id,
        repo: repoKey,
        type,
        chatId,
        createdAt: Date.now(),
        origin,
        belong,
        name
    };
    const indexKeys = createIndexKeys(data);
    try {
        const multi = ioredis.multi();
        multi.set(subscriptionKey, JSON.stringify(data));
        Object.values(indexKeys).forEach(indexKey => {
            multi.sadd(indexKey, id);
        });
        await multi.exec();
        return id;
    }
    catch (error) {
        console.error('添加订阅失败:', error);
        return null;
    }
};
const findByRepoAndChatId = async (origin, belong, name, type, chatId) => {
    const ioredis = getIoRedis();
    const repoIndexKey = `${indexPrefix}:repo:${origin}/${belong}/${name}`;
    const chatIdIndexKey = `${indexPrefix}:chatId:${chatId}`;
    const typeIndexKey = `${indexPrefix}:type:${type}`;
    const ids = await ioredis.sinter(repoIndexKey, chatIdIndexKey, typeIndexKey);
    return ids.length > 0 ? ids[0] : null;
};
const findByRepo = async (origin, belong, name, activeOnly) => {
    const ioredis = getIoRedis();
    const indexKey = `${indexPrefix}:repo:${origin}/${belong}/${name}`;
    const ids = await ioredis.smembers(indexKey);
    if (ids.length === 0) {
        return [];
    }
    const subscriptions = await Promise.all(ids.map(async (id) => {
        const data = await ioredis.get(createSubscriptionKey(id));
        return data ? JSON.parse(data) : null;
    }));
    return filterActive(subscriptions.filter(Boolean), activeOnly);
};
const findByChatId = async (chatId, activeOnly) => {
    const ioredis = getIoRedis();
    const indexKey = `${indexPrefix}:chatId:${chatId}`;
    const ids = await ioredis.smembers(indexKey);
    if (ids.length === 0) {
        return [];
    }
    const subscriptions = await Promise.all(ids.map(async (id) => {
        const data = await ioredis.get(createSubscriptionKey(id));
        return data ? JSON.parse(data) : null;
    }));
    return filterActive(subscriptions.filter(Boolean), activeOnly);
};
const findByType = async (type, activeOnly) => {
    const ioredis = getIoRedis();
    const indexKey = `${indexPrefix}:type:${type}`;
    const ids = await ioredis.smembers(indexKey);
    if (ids.length === 0) {
        return [];
    }
    const subscriptions = await Promise.all(ids.map(async (id) => {
        const data = await ioredis.get(createSubscriptionKey(id));
        return data ? JSON.parse(data) : null;
    }));
    return filterActive(subscriptions.filter(Boolean), activeOnly);
};
const findByRepoAndType = async (origin, belong, name, type, activeOnly) => {
    const ioredis = getIoRedis();
    const repoIndexKey = `${indexPrefix}:repo:${origin}/${belong}/${name}`;
    const typeIndexKey = `${indexPrefix}:type:${type}`;
    const ids = await ioredis.sinter(repoIndexKey, typeIndexKey);
    if (ids.length === 0) {
        return [];
    }
    const subscriptions = await Promise.all(ids.map(async (id) => {
        const data = await ioredis.get(createSubscriptionKey(id));
        return data ? JSON.parse(data) : null;
    }));
    return filterActive(subscriptions.filter(Boolean), activeOnly);
};
const remove = async (id) => {
    const ioredis = getIoRedis();
    const subscriptionKey = createSubscriptionKey(id);
    const dataStr = await ioredis.get(subscriptionKey);
    if (!dataStr) {
        return false;
    }
    const data = JSON.parse(dataStr);
    const indexKeys = createIndexKeys(data);
    try {
        const multi = ioredis.multi();
        multi.del(subscriptionKey);
        Object.values(indexKeys).forEach(indexKey => {
            multi.srem(indexKey, id);
        });
        await multi.exec();
        return true;
    }
    catch (error) {
        console.error('删除订阅失败:', error);
        return false;
    }
};
const enable = async (id) => {
    const ioredis = getIoRedis();
    const subscriptionKey = createSubscriptionKey(id);
    const dataStr = await ioredis.get(subscriptionKey);
    if (!dataStr) {
        return false;
    }
    const data = JSON.parse(dataStr);
    data.isActive = true;
    await ioredis.set(subscriptionKey, JSON.stringify(data));
    return true;
};
const disable = async (id) => {
    const ioredis = getIoRedis();
    const subscriptionKey = createSubscriptionKey(id);
    const dataStr = await ioredis.get(subscriptionKey);
    if (!dataStr) {
        return false;
    }
    const data = JSON.parse(dataStr);
    data.isActive = false;
    await ioredis.set(subscriptionKey, JSON.stringify(data));
    return true;
};
const findWithPagination = async (filters, page = 1, pageSize = 10) => {
    const ioredis = getIoRedis();
    const conditions = [];
    if (filters.origin && filters.belong && filters.name) {
        conditions.push(`${indexPrefix}:repo:${filters.origin}/${filters.belong}/${filters.name}`);
    }
    if (filters.type) {
        conditions.push(`${indexPrefix}:type:${filters.type}`);
    }
    if (filters.chatId) {
        conditions.push(`${indexPrefix}:chatId:${filters.chatId}`);
    }
    let ids = [];
    if (conditions.length === 0) {
        const allKeys = await ioredis.keys(`${subscriptionsPrefix}:*`);
        ids = allKeys.map(key => key.replace(`${subscriptionsPrefix}:`, ''));
    }
    else if (conditions.length === 1) {
        ids = await ioredis.smembers(conditions[0]);
    }
    else {
        ids = await ioredis.sinter(...conditions);
    }
    const total = ids.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedIds = ids.slice(startIndex, endIndex);
    const subscriptions = await Promise.all(paginatedIds.map(async (id) => {
        const data = await ioredis.get(createSubscriptionKey(id));
        return data ? JSON.parse(data) : null;
    }));
    return {
        data: subscriptions.filter(Boolean),
        total
    };
};
function filterActive(subs, activeOnly) {
    if (!activeOnly) {
        return subs;
    }
    return subs.filter(sub => sub.isActive !== false);
}

export { add, disable, enable, findByChatId, findByRepo, findByRepoAndChatId, findByRepoAndType, findByType, findWithPagination, remove };
