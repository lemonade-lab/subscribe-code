import { getIoRedis } from '@alemonjs/db';

const keyPrefix = 'alemonjs-code';
const subscriptionsPrefix = `${keyPrefix}:subscriptions`;
const indexPrefix = `${keyPrefix}:index`;

type DataType = {
    // 编号
    id: string;
    // 仓库地址
    repo: string;
    // chatId类型
    type: 'g' | 'w';
    // chatId
    chatId: string;
    // 创建时间
    createdAt: number;
    // 仓库信息
    origin: string;
    // 仓库所属
    belong: string;
    // 仓库名称
    name: string;
    // 是否启动推送
    isActive?: boolean;
};

const createRepoKey = (origin: string, belong: string, name: string) => {
    return `${origin}/${belong}/${name}`;
};

const createSubscriptionKey = (id: string) => {
    return `${subscriptionsPrefix}:${id}`;
};

// 索引键生成函数
const createIndexKeys = (data: DataType) => {
    return {
        byRepo: `${indexPrefix}:repo:${data.origin}/${data.belong}/${data.name}`,
        byChatId: `${indexPrefix}:chatId:${data.chatId}`,
        byType: `${indexPrefix}:type:${data.type}`,
        byRepoAndType: `${indexPrefix}:repo:${data.origin}/${data.belong}/${data.name}:type:${data.type}`,
        byChatIdAndType: `${indexPrefix}:chatId:${data.chatId}:type:${data.type}`
    };
};

// 添加订阅
export const add = async (origin: string, belong: string, name: string, type: 'g' | 'w', chatId: string) => {
    const ioredis = getIoRedis();
    const repoKey = createRepoKey(origin, belong, name);

    // 检查是否已存在相同的订阅
    const existingId = await findByRepoAndChatId(origin, belong, name, type, chatId);
    if (existingId) {
        return existingId;
    }

    // 生成新的订阅ID
    const id = Date.now().toString();
    const subscriptionKey = createSubscriptionKey(id);

    const data: DataType = {
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
        // 使用事务确保数据一致性
        const multi = ioredis.multi();

        // 存储主数据
        multi.set(subscriptionKey, JSON.stringify(data));

        // 建立索引
        Object.values(indexKeys).forEach(indexKey => {
            multi.sadd(indexKey, id);
        });

        await multi.exec();
        return id;
    } catch (error) {
        console.error('添加订阅失败:', error);
        return null;
    }
};

// 根据仓库和聊天ID查找订阅
export const findByRepoAndChatId = async (
    origin: string,
    belong: string,
    name: string,
    type: 'g' | 'w',
    chatId: string
): Promise<string | null> => {
    const ioredis = getIoRedis();
    const repoIndexKey = `${indexPrefix}:repo:${origin}/${belong}/${name}`;
    const chatIdIndexKey = `${indexPrefix}:chatId:${chatId}`;
    const typeIndexKey = `${indexPrefix}:type:${type}`;

    // 使用Redis的集合交集操作
    const ids = await ioredis.sinter(repoIndexKey, chatIdIndexKey, typeIndexKey);
    return ids.length > 0 ? ids[0] : null;
};

// 根据仓库查找所有订阅
export const findByRepo = async (
    origin: string,
    belong: string,
    name: string,
    activeOnly?: boolean
): Promise<DataType[]> => {
    const ioredis = getIoRedis();
    const indexKey = `${indexPrefix}:repo:${origin}/${belong}/${name}`;
    const ids = await ioredis.smembers(indexKey);

    if (ids.length === 0) return [];

    const subscriptions = await Promise.all(
        ids.map(async id => {
            const data = await ioredis.get(createSubscriptionKey(id));
            return data ? (JSON.parse(data) as DataType) : null;
        })
    );

    return filterActive(subscriptions.filter(Boolean) as DataType[], activeOnly);
};

// 根据聊天ID查找订阅
export const findByChatId = async (chatId: string, activeOnly?: boolean): Promise<DataType[]> => {
    const ioredis = getIoRedis();
    const indexKey = `${indexPrefix}:chatId:${chatId}`;
    const ids = await ioredis.smembers(indexKey);

    if (ids.length === 0) return [];

    const subscriptions = await Promise.all(
        ids.map(async id => {
            const data = await ioredis.get(createSubscriptionKey(id));
            return data ? (JSON.parse(data) as DataType) : null;
        })
    );

    return filterActive(subscriptions.filter(Boolean) as DataType[], activeOnly);
};

// 根据类型查找订阅
export const findByType = async (type: 'g' | 'w', activeOnly?: boolean): Promise<DataType[]> => {
    const ioredis = getIoRedis();
    const indexKey = `${indexPrefix}:type:${type}`;
    const ids = await ioredis.smembers(indexKey);

    if (ids.length === 0) return [];

    const subscriptions = await Promise.all(
        ids.map(async id => {
            const data = await ioredis.get(createSubscriptionKey(id));
            return data ? (JSON.parse(data) as DataType) : null;
        })
    );

    return filterActive(subscriptions.filter(Boolean) as DataType[], activeOnly);
};

// 复合查询：仓库 + 类型
export const findByRepoAndType = async (
    origin: string,
    belong: string,
    name: string,
    type: 'g' | 'w',
    activeOnly?: boolean
): Promise<DataType[]> => {
    const ioredis = getIoRedis();
    const repoIndexKey = `${indexPrefix}:repo:${origin}/${belong}/${name}`;
    const typeIndexKey = `${indexPrefix}:type:${type}`;
    const ids = await ioredis.sinter(repoIndexKey, typeIndexKey);

    if (ids.length === 0) return [];

    const subscriptions = await Promise.all(
        ids.map(async id => {
            const data = await ioredis.get(createSubscriptionKey(id));
            return data ? (JSON.parse(data) as DataType) : null;
        })
    );

    return filterActive(subscriptions.filter(Boolean) as DataType[], activeOnly);
};

// 删除订阅
export const remove = async (id: string): Promise<boolean> => {
    const ioredis = getIoRedis();
    const subscriptionKey = createSubscriptionKey(id);

    // 先获取数据以便清理索引
    const dataStr = await ioredis.get(subscriptionKey);
    if (!dataStr) return false;

    const data = JSON.parse(dataStr) as DataType;
    const indexKeys = createIndexKeys(data);

    try {
        const multi = ioredis.multi();

        // 删除主数据
        multi.del(subscriptionKey);

        // 清理索引
        Object.values(indexKeys).forEach(indexKey => {
            multi.srem(indexKey, id);
        });

        await multi.exec();
        return true;
    } catch (error) {
        console.error('删除订阅失败:', error);
        return false;
    }
};

// 启用订阅
export const enable = async (id: string): Promise<boolean> => {
    const ioredis = getIoRedis();
    const subscriptionKey = createSubscriptionKey(id);
    const dataStr = await ioredis.get(subscriptionKey);
    if (!dataStr) return false;
    const data = JSON.parse(dataStr) as DataType;
    data.isActive = true;
    await ioredis.set(subscriptionKey, JSON.stringify(data));
    return true;
};

// 禁用订阅
export const disable = async (id: string): Promise<boolean> => {
    const ioredis = getIoRedis();
    const subscriptionKey = createSubscriptionKey(id);
    const dataStr = await ioredis.get(subscriptionKey);
    if (!dataStr) return false;
    const data = JSON.parse(dataStr) as DataType;
    data.isActive = false;
    await ioredis.set(subscriptionKey, JSON.stringify(data));
    return true;
};

// 分页查询
export const findWithPagination = async (
    filters: {
        origin?: string;
        belong?: string;
        name?: string;
        type?: 'g' | 'w';
        chatId?: string;
    },
    page: number = 1,
    pageSize: number = 10
): Promise<{ data: DataType[]; total: number }> => {
    const ioredis = getIoRedis();

    // 构建查询条件
    const conditions: string[] = [];

    if (filters.origin && filters.belong && filters.name) {
        conditions.push(`${indexPrefix}:repo:${filters.origin}/${filters.belong}/${filters.name}`);
    }
    if (filters.type) {
        conditions.push(`${indexPrefix}:type:${filters.type}`);
    }
    if (filters.chatId) {
        conditions.push(`${indexPrefix}:chatId:${filters.chatId}`);
    }

    let ids: string[] = [];

    if (conditions.length === 0) {
        // 如果没有条件，获取所有订阅ID
        const allKeys = await ioredis.keys(`${subscriptionsPrefix}:*`);
        ids = allKeys.map(key => key.replace(`${subscriptionsPrefix}:`, ''));
    } else if (conditions.length === 1) {
        ids = await ioredis.smembers(conditions[0]);
    } else {
        // 多条件交集查询
        ids = await ioredis.sinter(...conditions);
    }

    const total = ids.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedIds = ids.slice(startIndex, endIndex);

    const subscriptions = await Promise.all(
        paginatedIds.map(async id => {
            const data = await ioredis.get(createSubscriptionKey(id));
            return data ? (JSON.parse(data) as DataType) : null;
        })
    );

    return {
        data: subscriptions.filter(Boolean) as DataType[],
        total
    };
};

// 过滤启用状态
function filterActive(subs: DataType[], activeOnly?: boolean) {
    if (!activeOnly) return subs;
    return subs.filter(sub => sub.isActive !== false);
}
