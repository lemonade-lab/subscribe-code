import { getIoRedis } from '@alemonjs/db';
import { SubscriptionPool, SubscriptionStatus } from './github.sub.permissoin.js';
import crypto from 'crypto';

class SubscriptionService {
    _redis;
    ALEMONJS_CODE_ROOT_KEY = 'alemonjs:githubBot:';
    SUBS_DATA_KEY = 'alemonjs:githubBot:subs_data';
    GROUP_SUBS_INDEX_KEY = 'alemonjs:githubBot:group_subs_index';
    PRIVATE_SUBS_INDEX_KEY = 'alemonjs:githubBot:private_subs_index';
    REPO_URL_SUBS_INDEX_KEY = 'alemonjs:githubBot:repo_url_subs_index';
    REPO_ID_TO_URL_KEY = 'alemonjs:githubBot:repo_id_to_url';
    REPO_URL_TO_ID_KEY = 'alemonjs:githubBot:repo_url_to_id';
    get redis() {
        if (!this._redis) {
            this._redis = getIoRedis();
        }
        return this._redis;
    }
    async genSubId(chatType, chatId, repoUrl) {
        const str = `${chatType}:${chatId}:${repoUrl}`;
        return crypto.createHash('md5').update(str).digest('hex').slice(0, 8);
    }
    async genRepoId(str) {
        const st = `${str}`;
        return crypto.createHash('md5').update(st).digest('hex').slice(0, 4);
    }
    async addSubscription(poolType, chatId, userKey, repoUrl) {
        if (repoUrl && !(await this.hasPoolRepoByUrl(repoUrl))) {
            await this.addRepoToPool(repoUrl);
        }
        const existing = poolType === SubscriptionPool.Group
            ? await this.getSubDataBySpaceID(chatId)
            : await this.getSubDataByOpenID(chatId);
        if (existing.some(sub => sub.repoUrl === repoUrl && sub.poolType === poolType)) {
            return null;
        }
        const repoId = await this.getPoolRepoIdByUrl(repoUrl);
        const SubId = await this.genSubId(repoUrl, poolType, chatId);
        const newSub = {
            repoId,
            SubId,
            poolType,
            chatId,
            repoUrl,
            status: SubscriptionStatus.Enabled,
            createdBy: userKey,
            createdAt: new Date()
        };
        await this.redis.hset(`${this.SUBS_DATA_KEY}:${SubId}`, {
            ...newSub,
            createdAt: newSub.createdAt.toISOString()
        });
        await this.redis.sadd(`${this.ALEMONJS_CODE_ROOT_KEY}${poolType}_pool_index`, SubId);
        if (poolType === SubscriptionPool.Group) {
            await this.redis.sadd(`${this.GROUP_SUBS_INDEX_KEY}:${chatId}`, SubId);
        }
        if (poolType === SubscriptionPool.Private) {
            await this.redis.sadd(`${this.PRIVATE_SUBS_INDEX_KEY}:${userKey}`, SubId);
        }
        await this.redis.sadd(`${this.REPO_URL_SUBS_INDEX_KEY}:${repoUrl}`, SubId);
        return newSub;
    }
    async removeSubscription(SubId) {
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
    async getSubscription(SubId) {
        const data = await this.redis.hgetall(`${this.SUBS_DATA_KEY}:${SubId}`);
        if (!data || !data.SubId) {
            return null;
        }
        return {
            ...data,
            poolType: data.poolType,
            status: data.status,
            createdAt: new Date(data.createdAt)
        };
    }
    async getSubIdBySpaceID(chatId) {
        return (await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}group_subs_index:${chatId}`)) || [];
    }
    async getSubDataBySpaceID(chatId) {
        const subIds = await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}group_subs_index:${chatId}`);
        if (!subIds.length)
            return [];
        const subs = await Promise.all(subIds.map(SubId => this.getSubscription(SubId)));
        return subs.filter(Boolean);
    }
    async getSubIdByOpenID(chatId) {
        return (await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}private_subs_index:${chatId}`)) || [];
    }
    async getSubDataByOpenID(chatId) {
        const subIds = await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}private_subs_index:${chatId}`);
        if (!subIds.length)
            return [];
        const subs = await Promise.all(subIds.map(SubId => this.getSubscription(SubId)));
        return subs.filter(Boolean);
    }
    async getSubDataByRepo(repoUrl) {
        const subIds = await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}repo_url_subs_index:${repoUrl}`);
        if (!subIds.length)
            return [];
        const subs = await Promise.all(subIds.map(SubId => this.getSubscription(SubId)));
        return subs.filter(Boolean);
    }
    async getAllRepoSubs(poolType) {
        const subIds = await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}${poolType}_pool_index`);
        if (!subIds.length) {
            return [];
        }
        const subs = await Promise.all(subIds.map(SubId => this.getSubscription(SubId)));
        return subs.filter((sub) => !!sub && sub.poolType === poolType);
    }
    async getSubscriptionsByPoolType(poolType) {
        return this.getAllRepoSubs(poolType);
    }
    async isAllSubscriptionsEnabled(subscriptions) {
        return subscriptions.every(sub => sub.status === SubscriptionStatus.Enabled);
    }
    async makeAllSubscriptionsDisabled(subscriptionIds) {
        if (!subscriptionIds.length)
            return 0;
        const pipeline = this.redis.pipeline();
        subscriptionIds.forEach(SubId => {
            pipeline.hset(`${this.SUBS_DATA_KEY}:${SubId}`, 'status', SubscriptionStatus.Disabled);
        });
        const results = await pipeline.exec();
        return results.filter(result => result[0] === null).length;
    }
    async makeAllSubscriptionsEnabled(subscriptionIds) {
        if (!subscriptionIds.length)
            return 0;
        const pipeline = this.redis.pipeline();
        subscriptionIds.forEach(SubId => {
            pipeline.hset(`${this.SUBS_DATA_KEY}:${SubId}`, 'status', SubscriptionStatus.Enabled);
        });
        const results = await pipeline.exec();
        return results.filter(result => result[0] === null).length;
    }
    async disableSubscription(subscriptionId) {
        try {
            await this.redis.hset(`${this.ALEMONJS_CODE_ROOT_KEY}subs_data:${subscriptionId}`, 'status', SubscriptionStatus.Disabled);
            return true;
        }
        catch (error) {
            logger.error('Error enabling subscription:', error);
            return false;
        }
    }
    async enableSubscription(subscriptionId) {
        try {
            await this.redis.hset(`${this.ALEMONJS_CODE_ROOT_KEY}subs_data:${subscriptionId}`, 'status', SubscriptionStatus.Enabled);
            return true;
        }
        catch (error) {
            logger.error('Error disabling subscription:', error);
            return false;
        }
    }
    async addRepoToPool(repoUrl) {
        const repoId = await this.genRepoId(repoUrl);
        const pipeline = this.redis.pipeline();
        pipeline.hset(this.REPO_ID_TO_URL_KEY, repoId, repoUrl);
        pipeline.hset(this.REPO_URL_TO_ID_KEY, repoUrl, repoId);
        const results = await pipeline.exec();
        return results.every(res => res[0] === null);
    }
    async getPoolRepoUrlById(repoId) {
        return await this.redis.hget(this.REPO_ID_TO_URL_KEY, repoId);
    }
    async getPoolRepoIdByUrl(repoUrl) {
        return await this.redis.hget(this.REPO_URL_TO_ID_KEY, repoUrl);
    }
    async removePoolRepo(repoUrl) {
        const repoId = await this.getPoolRepoIdByUrl(repoUrl);
        if (!repoId)
            return false;
        const pipeline = this.redis.pipeline();
        pipeline.hdel(this.REPO_ID_TO_URL_KEY, repoId);
        pipeline.hdel(this.REPO_URL_TO_ID_KEY, repoUrl);
        const results = await pipeline.exec();
        return results.every(res => res[0] === null);
    }
    async listPoolRepos() {
        const idToUrl = await this.redis.hgetall(this.REPO_ID_TO_URL_KEY);
        return Object.entries(idToUrl).map(([repoId, repoUrl]) => ({ repoId, repoUrl }));
    }
    async hasPoolRepoByUrl(repoUrl) {
        return (await this.redis.hexists(this.REPO_URL_TO_ID_KEY, repoUrl)) === 1;
    }
    async hasPoolRepoById(repoId) {
        return (await this.redis.hexists(this.REPO_ID_TO_URL_KEY, repoId)) === 1;
    }
}
var SubscriptionService$1 = new SubscriptionService();

export { SubscriptionService$1 as default };
