import { getIoRedis } from '@alemonjs/db';
import { SubscriptionPool, SubscriptionStatus } from './github.sub.permissoin.js';
import crypto from 'crypto';

class SubscriptionService {
    _redis;
    ALEMONJS_CODE_ROOT_KEY = 'alemonjs:githubBot:';
    REPO_POOL_KEY = 'alemonjs:githubBot:repo_pool';
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
    async addSubscription(poolType, chatId, repoUrl, userKey) {
        if (!(await this.hasRepo(repoUrl))) {
            return null;
        }
        const existing = poolType === SubscriptionPool.Group
            ? await this.getSubDataBySpaceID(chatId)
            : await this.getSubDataByOpenID(chatId);
        if (existing.some(sub => sub.repoUrl === repoUrl && sub.poolType === poolType)) {
            return null;
        }
        const id = await this.genSubId(poolType, chatId, repoUrl);
        const newSub = {
            id,
            poolType,
            chatId,
            repoUrl,
            status: SubscriptionStatus.Enabled,
            createdBy: userKey,
            createdAt: new Date()
        };
        await this.redis.hset(`${this.ALEMONJS_CODE_ROOT_KEY}subs_data:${id}`, {
            ...newSub,
            createdAt: newSub.createdAt.toISOString()
        });
        await this.redis.sadd(`${this.ALEMONJS_CODE_ROOT_KEY}${poolType}_pool_index`, id);
        if (poolType === SubscriptionPool.Group) {
            await this.redis.sadd(`${this.ALEMONJS_CODE_ROOT_KEY}group_subs_index:${chatId}`, id);
        }
        if (poolType === SubscriptionPool.Private) {
            await this.redis.sadd(`${this.ALEMONJS_CODE_ROOT_KEY}private_subs_index:${userKey}`, id);
        }
        await this.redis.sadd(`${this.ALEMONJS_CODE_ROOT_KEY}repo_url_subs_index:${repoUrl}`, id);
        return newSub;
    }
    async removeSubscription(id) {
        const sub = await this.getSubscription(id);
        if (!sub) {
            return false;
        }
        if (sub.poolType === SubscriptionPool.Group) {
            await this.redis.srem(`${this.ALEMONJS_CODE_ROOT_KEY}group_subs_index:${sub.chatId}`, id);
        }
        if (sub.poolType === SubscriptionPool.Private) {
            await this.redis.srem(`${this.ALEMONJS_CODE_ROOT_KEY}private_subs_index:${sub.chatId}`, id);
        }
        await this.redis.srem(`${this.ALEMONJS_CODE_ROOT_KEY}repo_url_subs_index:${sub.repoUrl}`, id);
        await this.redis.del(`${this.ALEMONJS_CODE_ROOT_KEY}subs_data:${id}`);
        return true;
    }
    async getSubscription(id) {
        const data = await this.redis.hgetall(`${this.ALEMONJS_CODE_ROOT_KEY}subs_data:${id}`);
        if (!data || !data.id) {
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
        const subs = await Promise.all(subIds.map(id => this.getSubscription(id)));
        return subs.filter(Boolean);
    }
    async getSubIdByOpenID(chatId) {
        return (await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}private_subs_index:${chatId}`)) || [];
    }
    async getSubDataByOpenID(chatId) {
        const subIds = await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}private_subs_index:${chatId}`);
        if (!subIds.length)
            return [];
        const subs = await Promise.all(subIds.map(id => this.getSubscription(id)));
        return subs.filter(Boolean);
    }
    async getSubIdByRepo(repoUrl) {
        const subIds = await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}repo_url_subs_index:${repoUrl}`);
        if (!subIds.length)
            return [];
        const subs = await Promise.all(subIds.map(id => this.getSubscription(id)));
        return subs.filter(Boolean);
    }
    async getAllRepoSubs(poolType) {
        const subIds = await this.redis.smembers(`${this.ALEMONJS_CODE_ROOT_KEY}${poolType}_pool_index`);
        if (!subIds.length) {
            return [];
        }
        const subs = await Promise.all(subIds.map(id => this.getSubscription(id)));
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
        subscriptionIds.forEach(id => {
            pipeline.hset(`${this.ALEMONJS_CODE_ROOT_KEY}subs_data:${id}`, 'status', SubscriptionStatus.Disabled);
        });
        const results = await pipeline.exec();
        return results.filter(result => result[0] === null).length;
    }
    async makeAllSubscriptionsEnabled(subscriptionIds) {
        if (!subscriptionIds.length)
            return 0;
        const pipeline = this.redis.pipeline();
        subscriptionIds.forEach(id => {
            pipeline.hset(`${this.ALEMONJS_CODE_ROOT_KEY}subs_data:${id}`, 'status', SubscriptionStatus.Enabled);
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
    async addRepo(repoUrl) {
        return (await this.redis.sadd(this.REPO_POOL_KEY, repoUrl)) > 0;
    }
    async removeRepo(repoUrl) {
        return (await this.redis.srem(this.REPO_POOL_KEY, repoUrl)) > 0;
    }
    async listRepos() {
        return await this.redis.smembers(this.REPO_POOL_KEY);
    }
    async hasRepo(repoUrl) {
        return (await this.redis.sismember(this.REPO_POOL_KEY, repoUrl)) === 1;
    }
}
var SubscriptionService$1 = new SubscriptionService();

export { SubscriptionService$1 as default };
