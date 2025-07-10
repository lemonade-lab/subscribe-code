import { getIoRedis } from '@alemonjs/db';
import { Subscription, SubscriptionPool, SubscriptionStatus } from '@src/models/github.sub.permissoin';
import crypto from 'crypto';
import { Redis } from 'ioredis';

class SubscriptionService {
    private _redis?: Redis;
    private readonly ALEMONJS_CODE_ROOT_KEY = 'alemonjs:githubBot:';
    private readonly SUBS_DATA_KEY = 'alemonjs:githubBot:subs_data';
    private readonly GROUP_SUBS_INDEX_KEY = 'alemonjs:githubBot:group_subs_index';
    private readonly PRIVATE_SUBS_INDEX_KEY = 'alemonjs:githubBot:private_subs_index';
    private readonly REPO_URL_SUBS_INDEX_KEY = 'alemonjs:githubBot:repo_url_subs_index';
    private readonly REPO_ID_TO_URL_KEY = 'alemonjs:githubBot:repo_id_to_url';
    private readonly REPO_URL_TO_ID_KEY = 'alemonjs:githubBot:repo_url_to_id';
    private get redis(): Redis {
        if (!this._redis) {
            this._redis = getIoRedis();
        }
        return this._redis;
    }

    /**
     * 生成subId
     * @param repoUrl 仓库url
     * @param chatType 聊天类型, 群聊/私聊
     * @param chatId 空间ID
     * @returns 返回生成的订阅编号
     */
    async genSubId(chatType: string, chatId: string, repoUrl: string): Promise<string> {
        const str = `${chatType}:${chatId}:${repoUrl}`;
        return crypto.createHash('md5').update(str).digest('hex').slice(0, 8);
    }

    /**
     * 生成RepoId
     * @param str 字符串
     * @returns 返回生成的订阅编号
     */
    async genRepoId(str: string): Promise<string> {
        const st = `${str}`;
        return crypto.createHash('md5').update(st).digest('hex').slice(0, 4);
    }

    /**
     * 添加订阅数据并建立索引
     * @param poolType
     * @param chatId
     * @param userKey
     * @param repoUrl
     * @param repoId
     * @returns
     */
    async addSubscription(
        poolType: SubscriptionPool,
        chatId: string,
        userKey: string,
        repoUrl: string
    ): Promise<Subscription | null> {
        // 检查仓库池是否已存在该仓库url`
        if (repoUrl && !(await this.hasPoolRepoByUrl(repoUrl))) {
            await this.addRepoToPool(repoUrl);
        }

        // 检查仓库是否已在该聊天中订阅
        const existing =
            poolType === SubscriptionPool.Group
                ? await this.getSubDataBySpaceID(chatId)
                : await this.getSubDataByOpenID(chatId);
        if (existing.some(sub => sub.repoUrl === repoUrl && sub.poolType === poolType)) {
            return null;
        }

        const repoId = await this.getPoolRepoIdByUrl(repoUrl);
        const SubId = await this.genSubId(repoUrl, poolType, chatId);
        const newSub: Subscription = {
            repoId,
            SubId,
            poolType,
            chatId,
            repoUrl,
            status: SubscriptionStatus.Enabled,
            createdBy: userKey,
            createdAt: new Date()
        };
        /** 保存订阅信息 */
        await this.redis.hset(`${this.SUBS_DATA_KEY}:${SubId}`, {
            ...newSub,
            createdAt: newSub.createdAt.toISOString()
        });
        /**保存群/私聊订阅索引池 */
        await this.redis.sadd(`${this.ALEMONJS_CODE_ROOT_KEY}${poolType}_pool_index`, SubId);
        /**建立指定群订阅索引索引 */
        if (poolType === SubscriptionPool.Group) {
            await this.redis.sadd(`${this.GROUP_SUBS_INDEX_KEY}:${chatId}`, SubId);
        }
        /**建立指定私聊订阅索引 */
        if (poolType === SubscriptionPool.Private) {
            await this.redis.sadd(`${this.PRIVATE_SUBS_INDEX_KEY}:${userKey}`, SubId);
        }
        await this.redis.sadd(`${this.REPO_URL_SUBS_INDEX_KEY}:${repoUrl}`, SubId);
        return newSub;
    }

    /**
     * 移除指定订阅编号的订阅
     * @param SubId
     * @returns
     */
    async removeSubscription(SubId: string): Promise<boolean> {
        const sub = await this.getSubscription(SubId);
        if (!sub) {
            return false;
        }
        if (sub.poolType === SubscriptionPool.Group) {
            await this.redis.srem(`${this.GROUP_SUBS_INDEX_KEY}:${sub.chatId}`, SubId);
        }
        if (sub.poolType === SubscriptionPool.Private) {
            await this.redis.srem(`${this.PRIVATE_SUBS_INDEX_KEY}:${sub.chatId}`, SubId);
        }
        await this.redis.srem(`${this.REPO_URL_SUBS_INDEX_KEY}:${sub.repoUrl}`, SubId);
        await this.redis.del(`${this.SUBS_DATA_KEY}:${SubId}`);
        return true;
    }

    /**
     * 读取指定订阅编号的订阅数据
     * @param SubId
     * @returns
     */
    async getSubscription(SubId: string): Promise<Subscription | null> {
        const data = await this.redis.hgetall(`${this.SUBS_DATA_KEY}:${SubId}`);
        if (!data || !data.SubId) {
            return null;
        }
        return {
            ...data,
            poolType: data.poolType as SubscriptionPool,
            status: data.status as SubscriptionStatus,
            createdAt: new Date(data.createdAt)
        } as Subscription;
    }

    /**
     * 获取指定群聊的订阅编号列表
     * @param chatId
     * @returns
     */
    async getSubIdBySpaceID(chatId: string): Promise<string[]> {
        return (await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}group_subs_index:${chatId}`)) || [];
    }

    /**
     * 获取指定群聊订阅的所有订阅数据
     * @param chatId
     * @returns
     */
    async getSubDataBySpaceID(chatId: string): Promise<Subscription[]> {
        const subIds = await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}group_subs_index:${chatId}`);
        if (!subIds.length) return [];
        const subs = await Promise.all(subIds.map(SubId => this.getSubscription(SubId)));
        return subs.filter(Boolean) as Subscription[];
    }

    /**
     * 获取指定私聊的订阅编号列表
     * @param chatId
     * @returns
     */
    async getSubIdByOpenID(chatId: string): Promise<string[]> {
        return (await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}private_subs_index:${chatId}`)) || [];
    }

    /**
     * 获取指定私聊订阅的所有订阅数据
     * @param chatId
     * @returns
     */
    async getSubDataByOpenID(chatId: string): Promise<Subscription[]> {
        const subIds = await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}private_subs_index:${chatId}`);
        if (!subIds.length) return [];
        const subs = await Promise.all(subIds.map(SubId => this.getSubscription(SubId)));
        return subs.filter(Boolean) as Subscription[];
    }

    /**
     * 获取指定仓库url的的所有订阅数据
     * @param repoUrl
     * @returns
     */
    async getSubDataByRepo(repoUrl: string): Promise<Subscription[]> {
        const subIds = await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}repo_url_subs_index:${repoUrl}`);
        if (!subIds.length) return [];
        const subs = await Promise.all(subIds.map(SubId => this.getSubscription(SubId)));
        return subs.filter(Boolean) as Subscription[];
    }

    /**
     * 读取指定仓库池类型的已被订阅的订阅数据
     * @param poolType 订阅池类型
     * @returns
     */
    async getAllRepoSubs(poolType: SubscriptionPool): Promise<Subscription[]> {
        const subIds = await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}${poolType}_pool_index`);
        if (!subIds.length) {
            return [];
        }
        const subs = await Promise.all(subIds.map(SubId => this.getSubscription(SubId)));
        return subs.filter((sub): sub is Subscription => !!sub && sub.poolType === poolType);
    }

    /**
     * 获取指定类型的所有订阅数据（群聊/私聊）
     * @param poolType 订阅池类型
     * @returns Promise<Subscription[]> 订阅数据数组
     */
    async getSubscriptionsByPoolType(poolType: SubscriptionPool): Promise<Subscription[]> {
        return this.getAllRepoSubs(poolType);
    }
    /**
     * 检查订阅列表是否全部处于启用状态
     * @param subscriptions 订阅数据数组
     * @returns 全部启用返回 true，否则返回 false
     */
    async isAllSubscriptionsEnabled(subscriptions: Subscription[]): Promise<boolean> {
        return subscriptions.every(sub => sub.status === SubscriptionStatus.Enabled);
    }
    /**
     * 批量禁用订阅（设置状态为 disabled）
     * @param subscriptionIds 要禁用的订阅ID数组
     * @returns Promise<number> 返回成功禁用的订阅数量
     */
    async makeAllSubscriptionsDisabled(subscriptionIds: string[]): Promise<number> {
        if (!subscriptionIds.length) return 0;

        const pipeline = this.redis.pipeline();
        subscriptionIds.forEach(SubId => {
            pipeline.hset(`${this.SUBS_DATA_KEY}:${SubId}`, 'status', SubscriptionStatus.Disabled);
        });

        const results = await pipeline.exec();
        return results.filter(result => result[0] === null).length; // 统计成功操作的数量
    }

    /**
     * 批量启用订阅（设置状态为 enabled）
     * @param subscriptionIds 要启用的订阅ID数组
     * @returns Promise<number> 返回成功启用的订阅数量
     */
    async makeAllSubscriptionsEnabled(subscriptionIds: string[]): Promise<number> {
        if (!subscriptionIds.length) return 0;

        const pipeline = this.redis.pipeline();
        subscriptionIds.forEach(SubId => {
            pipeline.hset(`${this.SUBS_DATA_KEY}:${SubId}`, 'status', SubscriptionStatus.Enabled);
        });

        const results = await pipeline.exec();
        return results.filter(result => result[0] === null).length; // 统计成功操作的数量
    }

    /**
     * 禁用单个订阅（设置状态为 disabled）
     * @param subscriptionId 要禁用的订阅ID
     * @returns Promise<boolean> 是否禁用成功
     */
    async disableSubscription(subscriptionId: string): Promise<boolean> {
        try {
            await this.redis.hset(
                `${this.ALEMONJS_CODE_ROOT_KEY}subs_data:${subscriptionId}`,
                'status',
                SubscriptionStatus.Disabled
            );
            return true;
        } catch (error) {
            logger.error('Error enabling subscription:', error);
            return false;
        }
    }

    /**
     * 启用单个订阅（设置状态为 enabled）
     * @param subscriptionId 要启用的订阅ID
     * @returns Promise<boolean> 是否启用成功
     */
    async enableSubscription(subscriptionId: string): Promise<boolean> {
        try {
            await this.redis.hset(
                `${this.ALEMONJS_CODE_ROOT_KEY}subs_data:${subscriptionId}`,
                'status',
                SubscriptionStatus.Enabled
            );
            return true;
        } catch (error) {
            logger.error('Error disabling subscription:', error);
            return false;
        }
    }

    /**
     * 添加仓库url到仓库池 repo_pool
     * @param repoUrl
     * @returns
     */
    async addRepoToPool(repoUrl: string): Promise<boolean> {
        const repoId = await this.genRepoId(repoUrl);

        // 使用事务保证原子性
        const pipeline = this.redis.pipeline();
        pipeline.hset(this.REPO_ID_TO_URL_KEY, repoId, repoUrl);
        pipeline.hset(this.REPO_URL_TO_ID_KEY, repoUrl, repoId);

        const results = await pipeline.exec();
        return results.every(res => res[0] === null); // 全部成功才返回true
    }

    /**
     * 通过repoId获取pool对应的的repo URL
     * @param repoId
     */
    async getPoolRepoUrlById(repoId: string): Promise<string | null> {
        return await this.redis.hget(this.REPO_ID_TO_URL_KEY, repoId);
    }

    /**
     * 通过repoUrl获取pool对应的repoId
     * @param repoId
     */
    async getPoolRepoIdByUrl(repoUrl: string): Promise<string | null> {
        return await this.redis.hget(this.REPO_URL_TO_ID_KEY, repoUrl);
    }
    /**
     * 移除仓库url从仓库池 repo_pool
     * @param repoUrl
     * @returns
     */
    async removePoolRepo(repoUrl: string): Promise<boolean> {
        const repoId = await this.getPoolRepoIdByUrl(repoUrl);
        if (!repoId) return false;

        const pipeline = this.redis.pipeline();
        pipeline.hdel(this.REPO_ID_TO_URL_KEY, repoId);
        pipeline.hdel(this.REPO_URL_TO_ID_KEY, repoUrl);

        const results = await pipeline.exec();
        return results.every(res => res[0] === null);
    }

    /**
     * 获取仓库池 repo_pool 中的所有仓库的repoId和repoUrl
     * @returns
     */
    async listPoolRepos(): Promise<{ repoId: string; repoUrl: string }[]> {
        const idToUrl = await this.redis.hgetall(this.REPO_ID_TO_URL_KEY);
        return Object.entries(idToUrl).map(([repoId, repoUrl]) => ({ repoId, repoUrl }));
    }

    /**
     * 判断仓库池 repo_pool 中是否存在指定仓库url
     * @param repoUrl
     * @returns
     */
    async hasPoolRepoByUrl(repoUrl: string): Promise<boolean> {
        return (await this.redis.hexists(this.REPO_URL_TO_ID_KEY, repoUrl)) === 1;
    }

    /**
     * 判断仓库池 repo_pool 中是否存在指定仓库索引
     * @param repoId
     * @returns
     */
    async hasPoolRepoById(repoId: string): Promise<boolean> {
        return (await this.redis.hexists(this.REPO_ID_TO_URL_KEY, repoId)) === 1;
    }
}

export default new SubscriptionService();
