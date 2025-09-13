import { getConfig, getConfigValue } from 'alemonjs';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export const alemonjsCodeVersion = require('../../package.json').version;
export const appName = require('../../package.json').name;

/**
 * 获取配置文件指定顶层内容：alemonjs-code
 */
export const getCodeConfig = () => {
    const value = getConfigValue() || {};
    return value[appName] || {};
};

/**
 *
 * @param key
 * @param value
 */
export const setCodeConfig = (key: string, value: string | number) => {
    const config = getConfig();
    const val = config.value;
    if (!val[appName]) {
        val[appName] = {};
    }
    val[appName][key] = value;
    config.saveValue(val);
};

export function isCodeMastet(userKey: string, userId: string): boolean {
    const value = getCodeConfig() || {};
    const masterKey = value?.master_key || [];
    const masterUserId = value?.master_id || [];
    return masterKey.includes(userKey) || masterUserId.includes(userId);
}

export function addCodeMaster(userKey: string): void {
    const config = getConfig();
    const val = config.value;
    const keyName = 'master_key';
    if (!val[appName]) {
        val[appName] = {};
    }
    if (!val[appName][keyName]) {
        val[appName][keyName] = [];
    }
    if (!val[appName][keyName].includes(userKey)) {
        val[appName][keyName].push(userKey);
        config.saveValue(val);
    }
}

export function removeCodeMaster(userKey: string): void {
    const config = getConfig();
    const val = config.value;
    if (val[appName] && val[appName].master_key) {
        val[appName].master_key = val[appName].master_key.filter((key: string) => key !== userKey);
        config.saveValue(val);
    }
}

export function isWhiteUser(userKey: string): boolean {
    const value = getCodeConfig() || {};
    const whiteList = value?.white_key || [];
    return whiteList.includes(userKey);
}

export function addWhiteUser(userKey: string) {
    const config = getConfig();
    const val = config.value;
    const keyName = 'white_key';
    if (!val[appName]) {
        val[appName] = {};
    }
    if (!val[appName][keyName]) {
        val[appName][keyName] = [];
    }
    if (!val[appName][keyName].includes(userKey)) {
        val[appName][keyName].push(userKey);
        config.saveValue(val);
    }
}

export function removeWhiteUser(userKey: string) {
    const config = getConfig();
    const val = config.value;
    if (val[appName] && val[appName].white_key) {
        val[appName].white_key = val[appName].white_key.filter((key: string) => key !== userKey);
        config.saveValue(val);
    }
}

export function isMaster(userKey: string, userId: string): boolean {
    const value = getConfigValue() || {};
    const masterKey = value?.master_key || [];
    const masterUserId = value?.master_id || [];
    return masterKey.includes(userKey) || masterUserId.includes(userId);
}

/**
 * 带密SHA256数据摘要
 * @param key
 * @param data
 * @returns
 */
export const keyHashData = (key: string, data: string) => {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
};

/**
 * 添加绑定群聊的异常警告推送token
 * @param alertTokenItem
 */
export function addAlertToken(alertTokenItem: {
    chatId: string;
    token: string;
    type: 'message.create' | 'private.message.create';
}): boolean {
    const config = getConfig();
    const val = config.value;
    const keyName = 'alert_token';
    if (!val[appName]) {
        val[appName] = {};
    }
    if (!val[appName][keyName]) {
        val[appName][keyName] = [] as Array<{
            chatId: string;
            token: string;
            type: 'message.create' | 'private.message.create';
        }>;
    }

    // 检查是否已存在相同的项（基于chatId、token和type）
    const exists = val[appName][keyName].some(
        (item: { chatId: string; token: string; type: 'message.create' | 'private.message.create' }) =>
            item.chatId === alertTokenItem.chatId &&
            //item.token === alertTokenItem.token &&
            item.type === alertTokenItem.type
    );

    // 只有在不存在相同项时才添加
    if (!exists) {
        val[appName][keyName].push(alertTokenItem);
        config.saveValue(val);
        return true;
    } else {
        return false;
    }
}

/**
 * 获取所有启用了异常警告推送的聊天ID列表
 * @returns 包含两种类型聊天ID的映射对象
 */
export function listAlertChats(): {
    'message.create': string[];
    'private.message.create': string[];
} {
    const config = getConfig();
    const val = config.value;
    const keyName = 'alert_token';

    // 初始化结果结构
    const result = {
        'message.create': [],
        'private.message.create': []
    };

    // 检查是否存在配置和alert_token数组
    if (!val[appName] || !val[appName][keyName]) {
        return result;
    }

    // 遍历所有alert_token项并分类
    val[appName][keyName].forEach(
        (item: { chatId: string; token: string; type: 'message.create' | 'private.message.create' }) => {
            if (item.type === 'message.create') {
                result['message.create'].push(item.chatId);
            } else if (item.type === 'private.message.create') {
                result['private.message.create'].push(item.chatId);
            }
        }
    );

    return result;
}

// 检查某个聊天ID是否存在于异常警告推送列表中
export function isAlertChat(chatId: string, type: 'message.create' | 'private.message.create'): boolean {
    const alertChats = listAlertChats();
    return alertChats[type].includes(chatId);
}

/**
 * 删除绑定群聊的异常警告推送token
 * @param alertTokenItem 需要删除的token项
 */
export function removeAlertToken(alertTokenItem: { chatId: string; token: string }): boolean {
    const config = getConfig();
    const val = config.value;
    const keyName = 'alert_token';

    // 检查是否存在该应用配置和alert_token数组
    if (!val[appName] || !val[appName][keyName]) {
        return false;
    }

    // 过滤掉匹配的项
    const filteredTokens = val[appName][keyName].filter(
        (item: { chatId: string; token: string; type: 'message.create' | 'private.message.create' }) =>
            !(item.chatId === alertTokenItem.chatId && item.token === alertTokenItem.token)
    );

    if (val[appName][keyName] === filteredTokens) {
        return false;
    }

    // 更新配置并保存
    val[appName][keyName] = filteredTokens;
    config.saveValue(val);
    return true;
}

/**
 * 删除群聊的异常警告推送
 * @param alertChatIdItem 需要删除的本群id
 */
export function removeAlertChat(alertChatIdItem: {
    chatId: string;
    type: 'message.create' | 'private.message.create';
}): boolean {
    const config = getConfig();
    const val = config.value;
    const keyName = 'alert_token';

    // 检查是否存在该应用配置和alert_token数组
    if (!val[appName] || !val[appName][keyName]) {
        return false;
    }

    // 过滤掉匹配的项
    const filteredTokens = val[appName][keyName].filter(
        (item: { chatId: string; token: string; type: 'message.create' | 'private.message.create' }) =>
            !(item.chatId === alertChatIdItem.chatId && item.type === alertChatIdItem.type)
    );

    if (val[appName][keyName] === filteredTokens) {
        return false;
    }

    // 更新配置并保存
    val[appName][keyName] = filteredTokens;
    config.saveValue(val);
    return true;
}

/**
 * 添加绑定仓库的action token（增量更新版）
 * @param actionTokenItem
 */
export function addActionToken(actionTokenItem: {
    userRepoName: string;
    token: string;
    workflows: Array<{ name: string; branch: string; pathFile: string; url: string }>;
}): boolean {
    const config = getConfig();
    const val = config.value;
    const keyName = 'action_token';

    // 初始化结构
    if (!val[appName]) {
        val[appName] = {};
    }
    if (!val[appName][keyName]) {
        val[appName][keyName] = [] as Array<{
            userRepoName: string;
            token: string;
            workflows: Array<{ name: string; branch: string; pathFile: string; url: string }>;
        }>;
    }

    // 查找已存在项
    const existingIndex = val[appName][keyName].findIndex(
        (item: {
            userRepoName: string;
            token: string;
            workflows: Array<{ name: string; branch: string; pathFile: string; url: string }>;
        }) => item.userRepoName === actionTokenItem.userRepoName && item.token === actionTokenItem.token
    );

    if (existingIndex > -1) {
        // 已存在则进行分支级合并
        const existingWorkflows = [...val[appName][keyName][existingIndex].workflows];

        actionTokenItem.workflows.forEach(newWorkflow => {
            const workflowIndex = existingWorkflows.findIndex(w => w.branch === newWorkflow.branch);

            if (workflowIndex > -1) {
                // 分支存在则替换
                existingWorkflows[workflowIndex] = newWorkflow;
            } else {
                // 新分支则添加
                existingWorkflows.push(newWorkflow);
            }
        });

        // 更新工作流列表
        val[appName][keyName][existingIndex].workflows = existingWorkflows;
    } else {
        // 全新添加
        val[appName][keyName].push(actionTokenItem);
    }

    config.saveValue(val);
    return true;
}

/**
 * 删除绑定仓库的action token（支持分支级删除）
 * @param actionTokenItem 包含userRepoName和可选branch参数
 */
export function removeActionToken(actionTokenItem: { userRepoName: string; branch?: string }): boolean {
    const config = getConfig();
    const val = config.value;
    const keyName = 'action_token';

    if (!val[appName] || !val[appName][keyName]) {
        return false;
    }

    // 如果指定分支
    if (actionTokenItem.branch) {
        const index = val[appName][keyName].findIndex(item => item.userRepoName === actionTokenItem.userRepoName);

        if (index > -1) {
            // 过滤掉指定分支
            val[appName][keyName][index].workflows = val[appName][keyName][index].workflows.filter(
                w => w.branch !== actionTokenItem.branch
            );

            // 如果workflows为空则删除整个仓库配置
            if (val[appName][keyName][index].workflows.length === 0) {
                val[appName][keyName].splice(index, 1);
            }

            config.saveValue(val);
            return true;
        }
        return false;
    }

    // 否则删除整个仓库配置
    const filteredTokens = val[appName][keyName].filter(item => item.userRepoName !== actionTokenItem.userRepoName);

    if (filteredTokens.length === val[appName][keyName].length) {
        return false;
    }

    val[appName][keyName] = filteredTokens;
    config.saveValue(val);
    return true;
}

/**
 * 获取仓库的action token
 * @param actionTokenItem 包含userRepoName的对象
 * @returns token字符串或false（如果未找到）
 */
export function getRepoActionToken(actionTokenItem: { userRepoName: string }): boolean | string {
    const config = getConfig();
    const val = config.value;
    const keyName = 'action_token';

    if (!val[appName] || !val[appName][keyName]) {
        return false;
    }

    const exists = val[appName][keyName].find(item => item.userRepoName === actionTokenItem.userRepoName);

    return exists ? exists.token : false;
}

/**
 * 获取仓库的workflows列表数据
 * @param actionTokenItem 包含userRepoName的对象
 * @returns workflows列表数据或false（如果未找到）
 */
export function getRepoWorkflowsData(actionTokenItem: {
    userRepoName: string;
}): Array<{ name: string; branch: string; pathFile: string; url: string }> | false {
    const config = getConfig();
    const val = config.value;
    const keyName = 'action_token';

    if (!val[appName] || !val[appName][keyName]) {
        return false;
    }

    const exists = val[appName][keyName].find(item => item.userRepoName === actionTokenItem.userRepoName);

    return exists ? exists.workflows : false;
}
