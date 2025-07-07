import { getIoRedis } from '@alemonjs/db';

var UserRole;
(function (UserRole) {
    UserRole["Master"] = "master";
    UserRole["CodeMaster"] = "code_master";
    UserRole["GlobalCodeMaster"] = "global_code_master";
    UserRole["User"] = "user";
})(UserRole || (UserRole = {}));
var SubscriptionPool;
(function (SubscriptionPool) {
    SubscriptionPool["Repo"] = "repo";
    SubscriptionPool["Group"] = "message.create";
    SubscriptionPool["Private"] = "private.message.create";
})(SubscriptionPool || (SubscriptionPool = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["Enabled"] = "enabled";
    SubscriptionStatus["Disabled"] = "disabled";
})(SubscriptionStatus || (SubscriptionStatus = {}));
var ChatType;
(function (ChatType) {
    ChatType["Group"] = "message.create";
    ChatType["Private"] = "private.message.create";
})(ChatType || (ChatType = {}));
const PERMISSION_MATRIX = {
    manage_code_masters: [UserRole.Master],
    manage_repo_pool: [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster],
    view_repo_pool: [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster],
    manage_group_pool: [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster],
    view_group_pool: [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster, UserRole.User],
    manage_all_group_pool: [UserRole.Master, UserRole.GlobalCodeMaster],
    toggle_group_pool: [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster],
    manage_private_pool: [UserRole.User],
    view_private_pool: [UserRole.User],
    manage_whitelist: [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster],
    view_whitelist: [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster]
};
var Action;
(function (Action) {
    Action["manage_code_masters"] = "manage_code_masters";
    Action["manage_repo_pool"] = "manage_repo_pool";
    Action["view_repo_pool"] = "view_repo_pool";
    Action["manage_group_pool"] = "manage_group_pool";
    Action["manage_all_group_pool"] = "manage_all_group_pool";
    Action["toggle_group_pool"] = "toggle_group_pool";
    Action["manage_private_pool"] = "manage_private_pool";
    Action["view_private_pool"] = "view_private_pool";
    Action["manage_whitelist"] = "manage_whitelist";
    Action["view_whitelist"] = "view_whitelist";
    Action["view_group_pool"] = "view_group_pool";
})(Action || (Action = {}));
class PermissionService {
    _redis;
    PERMISSION_KEY = 'alemonjs:githubBot:permissions';
    GLOBLE_PERMISSION_KEY = 'alemonjs:githubBot:globalPermissions';
    WHITELIST_KEY = 'alemonjs:githubBot:whitelist';
    get redis() {
        if (!this._redis) {
            this._redis = getIoRedis();
        }
        return this._redis;
    }
    async getUserRole(userKey, chatId, e) {
        if (e && (await this.isOwner(e))) {
            return UserRole.Master;
        }
        const groupRole = chatId ? await this.redis.hget(this.PERMISSION_KEY, `${userKey}:${chatId}`) : null;
        const globalRole = await this.redis.hget(this.GLOBLE_PERMISSION_KEY, userKey);
        const userRole = globalRole === UserRole.GlobalCodeMaster
            ? globalRole
            : groupRole === UserRole.CodeMaster
                ? groupRole
                : UserRole.User;
        return userRole;
    }
    async setUserRole(userKey, role, chatId) {
        const field = `${userKey}:${chatId}`;
        await this.redis.hset(this.PERMISSION_KEY, field, role);
    }
    async setGlobalRole(userKey, role) {
        await this.redis.hset(this.GLOBLE_PERMISSION_KEY, userKey, role);
    }
    async removeAllAdminRoles(userKey) {
        await this.redis.hdel(this.GLOBLE_PERMISSION_KEY, userKey);
        const allGroupRoles = await this.redis.hgetall(this.PERMISSION_KEY);
        const fieldsToDelete = [];
        for (const field in allGroupRoles) {
            if (field.startsWith(`${userKey}:`)) {
                fieldsToDelete.push(field);
            }
        }
        if (fieldsToDelete.length > 0) {
            await this.redis.hdel(this.PERMISSION_KEY, ...fieldsToDelete);
        }
    }
    async removeGlobalAdminRole(userKey) {
        await this.redis.hdel(this.GLOBLE_PERMISSION_KEY, userKey);
    }
    async removeGroupAdminRole(userKey, chatId) {
        const field = `${userKey}:${chatId}`;
        const role = await this.redis.hget(this.PERMISSION_KEY, field);
        if (role === UserRole.Master || role === UserRole.CodeMaster) {
            await this.redis.hdel(this.PERMISSION_KEY, field);
        }
    }
    async clearAllAdmins() {
        await this.redis.del(this.GLOBLE_PERMISSION_KEY);
        const allGroupAdmins = await this.redis.hgetall(this.PERMISSION_KEY);
        const fieldsToDelete = [];
        for (const field in allGroupAdmins) {
            const role = allGroupAdmins[field];
            if (role === UserRole.CodeMaster) {
                fieldsToDelete.push(field);
            }
        }
        if (fieldsToDelete.length > 0) {
            await this.redis.hdel(this.PERMISSION_KEY, ...fieldsToDelete);
        }
        return true;
    }
    async listAllAdmins() {
        const result = [];
        const globalAdmins = await this.redis.hgetall(this.GLOBLE_PERMISSION_KEY);
        for (const [userKey, role] of Object.entries(globalAdmins)) {
            result.push({ userKey, chatId: null, role: role });
        }
        const groupAdmins = await this.redis.hgetall(this.PERMISSION_KEY);
        for (const [field, role] of Object.entries(groupAdmins)) {
            const [userKey, chatId] = field.split(':');
            result.push({ userKey, chatId, role: role });
        }
        return result;
    }
    async addToWhitelist(userKey) {
        await this.redis.sadd(this.WHITELIST_KEY, userKey);
    }
    async removeFromWhitelist(userKey) {
        await this.redis.srem(this.WHITELIST_KEY, userKey);
    }
    async isWhitelisted(userKey) {
        return Boolean(await this.redis.sismember(this.WHITELIST_KEY, userKey));
    }
    async listAllWhitelisted() {
        return await this.redis.smembers(this.WHITELIST_KEY);
    }
    async checkPermission(userKey, chatId, action, e) {
        const role = await this.getUserRole(userKey, chatId, e);
        const allowedRoles = PERMISSION_MATRIX[action] || [];
        if (e && (await this.isOwner(e))) {
            return true;
        }
        if (allowedRoles.find(r => r === role)) {
            return true;
        }
        if (action.startsWith('manage_private_pool') || action.startsWith('view_private_pool')) {
            return await this.isWhitelisted(userKey);
        }
        return false;
    }
    async logAction(userKey, action, target) {
        const logEntry = JSON.stringify({
            timestamp: new Date().toISOString(),
            userKey,
            action,
            target
        });
        await this.redis.xadd('audit_log', '*', 'entry', logEntry);
    }
    async isOwner(e) {
        return !!e.IsMaster;
    }
}
var PermissionService$1 = new PermissionService();

export { Action, ChatType, SubscriptionPool, SubscriptionStatus, UserRole, PermissionService$1 as default };
