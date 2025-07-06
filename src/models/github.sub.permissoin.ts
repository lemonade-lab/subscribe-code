import { getIoRedis } from '@alemonjs/db';
import { PrivateEventMessageCreate, PublicEventMessageCreate } from 'alemonjs';
import { Redis } from 'ioredis';

export enum UserRole {
    Master = 'master',
    CodeMaster = 'code_master',
    GlobalCodeMaster = 'global_code_master',
    User = 'user'
}

export enum SubscriptionPool {
    Repo = 'repo',
    Group = 'message.create',
    Private = 'private.message.create'
}

export enum SubscriptionStatus {
    Enabled = 'enabled',
    Disabled = 'disabled'
}

export enum ChatType {
    Group = 'message.create',
    Private = 'private.message.create'
}

export interface Subscription {
    id: string;
    poolType: SubscriptionPool;
    chatId: string;
    repoUrl: string;
    status: SubscriptionStatus;
    createdBy: string;
    createdAt: Date;
}

export interface Permission {
    userKey: string;
    role: UserRole;
}

export interface GitHubEvent {
    repoUrl: string;
    eventType: string;
    payload: any;
}

const PERMISSION_MATRIX = {
    /**管理管理员 */
    manage_code_masters: [UserRole.Master],
    /**管理与查看仓库池 */
    manage_repo_pool: [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster],
    view_repo_pool: [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster],
    /**管理所在群聊池 */
    manage_group_pool: [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster],
    /**查看所在群聊订阅 */
    view_group_pool: [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster, UserRole.User],
    /**管理与查看all群聊池 */
    manage_all_group_pool: [UserRole.Master, UserRole.GlobalCodeMaster],
    /**暂停所在群聊的单个订阅 */
    toggle_group_pool: [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster],
    /**管理与查看私聊订阅池 */
    manage_private_pool: [UserRole.User],
    view_private_pool: [UserRole.User],
    /**白名单 */
    manage_whitelist: [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster],
    view_whitelist: [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster]
};

export enum Action {
    manage_code_masters = 'manage_code_masters',
    manage_repo_pool = 'manage_repo_pool',
    view_repo_pool = 'view_repo_pool',
    manage_group_pool = 'manage_group_pool',
    manage_all_group_pool = 'manage_all_group_pool',
    toggle_group_pool = 'toggle_group_pool',
    manage_private_pool = 'manage_private_pool',
    view_private_pool = 'view_private_pool',
    manage_whitelist = 'manage_whitelist',
    view_whitelist = 'view_whitelist',
    view_group_pool = 'view_group_pool'
}

class PermissionService {
    private _redis?: Redis;
    private readonly PERMISSION_KEY = 'alemonjs:githubBot:permissions';
    private readonly GLOBLE_PERMISSION_KEY = 'alemonjs:githubBot:globalPermissions';
    private readonly WHITELIST_KEY = 'alemonjs:githubBot:whitelist';

    private get redis(): Redis {
        if (!this._redis) {
            this._redis = getIoRedis();
        }
        return this._redis;
    }

    /**
     * 获取用户权限角色
     * @param userKey
     * @param chatId 聊天id，查询普通管理员必需
     * @param e 消息对象，查询主人权限必需
     * @returns
     */
    async getUserRole(
        userKey: string,
        chatId?: string,
        e?: PublicEventMessageCreate | PrivateEventMessageCreate
    ): Promise<string> {
        // 1. 检查是否是主人
        if (e && (await this.isOwner(e))) {
            return UserRole.Master;
        }

        // 2. 检查群聊权限 (如果有chatId)
        const groupRole = chatId ? await this.redis.hget(this.PERMISSION_KEY, `${userKey}:${chatId}`) : null;

        // 3. 检查全局权限
        const globalRole = await this.redis.hget(this.GLOBLE_PERMISSION_KEY, userKey);

        const userRole =
            globalRole === UserRole.GlobalCodeMaster
                ? globalRole
                : groupRole === UserRole.CodeMaster
                  ? groupRole
                  : UserRole.User;
        return userRole;
    }

    /**
     * 设置单个聊天的普通管理员或普通角色权限
     * 通过 ${userKey}:${chatId} 实现群聊级权限隔离
     * @param userKey
     * @param chatId
     * @returns
     */
    async setUserRole(userKey: string, role: UserRole, chatId: string): Promise<void> {
        const field = `${userKey}:${chatId}`;
        await this.redis.hset(this.PERMISSION_KEY, field, role);
    }

    /**
     * 设置全局权限
     * @param userKey
     * @param role 角色
     */
    async setGlobalRole(userKey: string, role: UserRole): Promise<void> {
        await this.redis.hset(this.GLOBLE_PERMISSION_KEY, userKey, role);
    }
    /**删除某用户在所有聊天的管理员权限 */
    async removeAllAdminRoles(userKey: string): Promise<void> {
        // 删除全局权限
        await this.redis.hdel(this.GLOBLE_PERMISSION_KEY, userKey);

        // 删除群组权限
        const allGroupRoles = await this.redis.hgetall(this.PERMISSION_KEY);
        const fieldsToDelete: string[] = [];
        for (const field in allGroupRoles) {
            if (field.startsWith(`${userKey}:`)) {
                fieldsToDelete.push(field);
            }
        }
        if (fieldsToDelete.length > 0) {
            await this.redis.hdel(this.PERMISSION_KEY, ...fieldsToDelete);
        }
    }

    /**只删除全局管理员权限 */
    async removeGlobalAdminRole(userKey: string): Promise<void> {
        await this.redis.hdel(this.GLOBLE_PERMISSION_KEY, userKey);
    }

    /**只删除某个群聊的某个用户的管理员权限 */
    async removeGroupAdminRole(userKey: string, chatId: string): Promise<void> {
        const field = `${userKey}:${chatId}`;
        const role = await this.redis.hget(this.PERMISSION_KEY, field);
        if (role === UserRole.Master || role === UserRole.CodeMaster) {
            await this.redis.hdel(this.PERMISSION_KEY, field);
        }
    }

    /**
     * 清空所有管理员权限（重置权限系统）
     * @returns Promise<void>
     */
    async clearAllAdmins(): Promise<boolean> {
        // 清空全局权限
        await this.redis.del(this.GLOBLE_PERMISSION_KEY);

        // 清空群组权限
        const allGroupAdmins = await this.redis.hgetall(this.PERMISSION_KEY);
        const fieldsToDelete: string[] = [];
        for (const field in allGroupAdmins) {
            const role = allGroupAdmins[field] as UserRole;
            if (role === UserRole.CodeMaster) {
                fieldsToDelete.push(field);
            }
        }
        if (fieldsToDelete.length > 0) {
            await this.redis.hdel(this.PERMISSION_KEY, ...fieldsToDelete);
        }

        return true;
    }
    /**查询所有有管理员权限的用户 */
    async listAllAdmins(): Promise<{ userKey: string; chatId: string | null; role: UserRole }[]> {
        const result: { userKey: string; chatId: string | null; role: UserRole }[] = [];

        // 1. 查询全局管理员
        const globalAdmins = await this.redis.hgetall(this.GLOBLE_PERMISSION_KEY);
        for (const [userKey, role] of Object.entries(globalAdmins)) {
            result.push({ userKey, chatId: null, role: role as UserRole });
        }

        // 2. 查询群组管理员
        const groupAdmins = await this.redis.hgetall(this.PERMISSION_KEY);
        for (const [field, role] of Object.entries(groupAdmins)) {
            const [userKey, chatId] = field.split(':');
            result.push({ userKey, chatId, role: role as UserRole });
        }

        return result;
    }

    /**
     * 添加用户是到白名单中
     * @param userKey
     * @returns
     */
    async addToWhitelist(userKey: string): Promise<void> {
        await this.redis.sadd(this.WHITELIST_KEY, userKey);
    }

    /**
     * 从白名单中移除用户
     * @param userKey 用户key
     */
    async removeFromWhitelist(userKey: string): Promise<void> {
        await this.redis.srem(this.WHITELIST_KEY, userKey);
    }

    /**
     * 检查用户是否在白名单中
     * @param userKey
     * @returns
     */
    async isWhitelisted(userKey: string): Promise<boolean> {
        return Boolean(await this.redis.sismember(this.WHITELIST_KEY, userKey));
    }

    /**
     * 获取所有白名单
     * @returns
     */
    async listAllWhitelisted(): Promise<Array<string>> {
        return await this.redis.smembers(this.WHITELIST_KEY);
    }

    /**
     * 检查操作权限
     * @param userKey 用户key
     * @param chatId 聊天id
     * @param action 操作
     * @param e 消息对象，检查主人权限需传入
     * @returns boolean
     */
    async checkPermission(
        userKey: string,
        chatId: string | null,
        action: Action,
        e?: PublicEventMessageCreate | PrivateEventMessageCreate
    ): Promise<boolean> {
        const role = await this.getUserRole(userKey, chatId, e);
        const allowedRoles = PERMISSION_MATRIX[action] || [];

        // 主人拥有全部权限
        if (e && (await this.isOwner(e))) {
            return true;
        }

        // 检查权限矩阵
        if (allowedRoles.find(r => r === role)) {
            return true;
        }

        // 特殊处理私聊权限
        if (action.startsWith('manage_private_pool') || action.startsWith('view_private_pool')) {
            return await this.isWhitelisted(userKey);
        }

        return false;
    }

    /**审计日志，未启用 */
    async logAction(userKey: string, action: Action, target?: string): Promise<void> {
        const logEntry = JSON.stringify({
            timestamp: new Date().toISOString(),
            userKey,
            action,
            target
        });
        await this.redis.xadd('audit_log', '*', 'entry', logEntry);
    }

    /**
     * 判断是否是所有者
     * @param e 消息对象
     * @returns boolean
     */
    async isOwner(e: PublicEventMessageCreate | PrivateEventMessageCreate): Promise<boolean> {
        return !!e.IsMaster;
    }
}

export default new PermissionService();
