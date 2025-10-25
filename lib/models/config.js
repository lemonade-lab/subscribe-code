import { getConfigValue, getConfig } from 'alemonjs';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const alemonjsCodeVersion = require('../../package.json').version;
const appName = require('../../package.json').name;
const getCodeConfig = () => {
    const value = getConfigValue() || {};
    return value[appName] || {};
};
const setCodeConfig = (key, value) => {
    const config = getConfig();
    const val = config.value;
    if (!val[appName]) {
        val[appName] = {};
    }
    val[appName][key] = value;
    config.saveValue(val);
};
function isCodeMaster(userKey, userId) {
    const value = getCodeConfig() || {};
    const masterKey = value?.master_key || [];
    const masterUserId = value?.master_id || [];
    return masterKey.includes(userKey) || masterUserId.includes(userId);
}
function addCodeMaster(userKey) {
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
function removeCodeMaster(userKey) {
    const config = getConfig();
    const val = config.value;
    if (val[appName]?.master_key) {
        val[appName].master_key = val[appName].master_key.filter((key) => key !== userKey);
        config.saveValue(val);
    }
}
function isWhiteUser(userKey) {
    const value = getCodeConfig() || {};
    const whiteList = value?.white_key || [];
    return whiteList.includes(userKey);
}
function addWhiteUser(userKey) {
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
function removeWhiteUser(userKey) {
    const config = getConfig();
    const val = config.value;
    if (val[appName]?.white_key) {
        val[appName].white_key = val[appName].white_key.filter((key) => key !== userKey);
        config.saveValue(val);
    }
}
function isMaster(userKey, userId) {
    const value = getConfigValue() || {};
    const masterKey = value?.master_key || [];
    const masterUserId = value?.master_id || [];
    return masterKey.includes(userKey) || masterUserId.includes(userId);
}
const keyHashData = (key, data) => {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
};
function addAlertToken(alertTokenItem) {
    const config = getConfig();
    const val = config.value;
    const keyName = 'alert_token';
    if (!val[appName]) {
        val[appName] = {};
    }
    if (!val[appName][keyName]) {
        val[appName][keyName] = [];
    }
    const exists = val[appName][keyName].some((item) => item.chatId === alertTokenItem.chatId &&
        item.type === alertTokenItem.type);
    if (!exists) {
        val[appName][keyName].push(alertTokenItem);
        config.saveValue(val);
        return true;
    }
    else {
        return false;
    }
}
function listAlertChats() {
    const config = getConfig();
    const val = config.value;
    const keyName = 'alert_token';
    const result = {
        'message.create': [],
        'private.message.create': []
    };
    if (!val[appName]?.[keyName]) {
        return result;
    }
    val[appName][keyName].forEach((item) => {
        if (item.type === 'message.create') {
            result['message.create'].push(item.chatId);
        }
        else if (item.type === 'private.message.create') {
            result['private.message.create'].push(item.chatId);
        }
    });
    return result;
}
function isAlertChat(chatId, type) {
    const alertChats = listAlertChats();
    return alertChats[type].includes(chatId);
}
function removeAlertToken(alertTokenItem) {
    const config = getConfig();
    const val = config.value;
    const keyName = 'alert_token';
    if (!val[appName]?.[keyName]) {
        return false;
    }
    const filteredTokens = val[appName][keyName].filter((item) => !(item.chatId === alertTokenItem.chatId && item.token === alertTokenItem.token));
    if (val[appName][keyName] === filteredTokens) {
        return false;
    }
    val[appName][keyName] = filteredTokens;
    config.saveValue(val);
    return true;
}
function removeAlertChat(alertChatIdItem) {
    const config = getConfig();
    const val = config.value;
    const keyName = 'alert_token';
    if (!val[appName]?.[keyName]) {
        return false;
    }
    const filteredTokens = val[appName][keyName].filter((item) => !(item.chatId === alertChatIdItem.chatId && item.type === alertChatIdItem.type));
    if (val[appName][keyName] === filteredTokens) {
        return false;
    }
    val[appName][keyName] = filteredTokens;
    config.saveValue(val);
    return true;
}
function addActionToken(actionTokenItem) {
    const config = getConfig();
    const val = config.value;
    const keyName = 'action_token';
    if (!val[appName]) {
        val[appName] = {};
    }
    if (!val[appName][keyName]) {
        val[appName][keyName] = [];
    }
    const existingIndex = val[appName][keyName].findIndex((item) => item.userRepoName === actionTokenItem.userRepoName && item.token === actionTokenItem.token);
    if (existingIndex > -1) {
        const existingWorkflows = [...val[appName][keyName][existingIndex].workflows];
        actionTokenItem.workflows.forEach(newWorkflow => {
            const workflowIndex = existingWorkflows.findIndex(w => w.branch === newWorkflow.branch);
            if (workflowIndex > -1) {
                existingWorkflows[workflowIndex] = newWorkflow;
            }
            else {
                existingWorkflows.push(newWorkflow);
            }
        });
        val[appName][keyName][existingIndex].workflows = existingWorkflows;
    }
    else {
        val[appName][keyName].push(actionTokenItem);
    }
    config.saveValue(val);
    return true;
}
function removeActionToken(actionTokenItem) {
    const config = getConfig();
    const val = config.value;
    const keyName = 'action_token';
    if (!val[appName]?.[keyName]) {
        return false;
    }
    if (actionTokenItem.branch) {
        const index = val[appName][keyName].findIndex(item => item.userRepoName === actionTokenItem.userRepoName);
        if (index > -1) {
            val[appName][keyName][index].workflows = val[appName][keyName][index].workflows.filter(w => w.branch !== actionTokenItem.branch);
            if (val[appName][keyName][index].workflows.length === 0) {
                val[appName][keyName].splice(index, 1);
            }
            config.saveValue(val);
            return true;
        }
        return false;
    }
    const filteredTokens = val[appName][keyName].filter(item => item.userRepoName !== actionTokenItem.userRepoName);
    if (filteredTokens.length === val[appName][keyName].length) {
        return false;
    }
    val[appName][keyName] = filteredTokens;
    config.saveValue(val);
    return true;
}
function getRepoActionToken(actionTokenItem) {
    const config = getConfig();
    const val = config.value;
    const keyName = 'action_token';
    if (!val[appName]?.[keyName]) {
        return false;
    }
    const exists = val[appName][keyName].find(item => item.userRepoName === actionTokenItem.userRepoName);
    return exists ? exists.token : false;
}
function getRepoWorkflowsData(actionTokenItem) {
    const config = getConfig();
    const val = config.value;
    const keyName = 'action_token';
    if (!val[appName]?.[keyName]) {
        return false;
    }
    const exists = val[appName][keyName].find(item => item.userRepoName === actionTokenItem.userRepoName);
    return exists ? exists.workflows : false;
}

export { addActionToken, addAlertToken, addCodeMaster, addWhiteUser, alemonjsCodeVersion, appName, getCodeConfig, getRepoActionToken, getRepoWorkflowsData, isAlertChat, isCodeMaster, isMaster, isWhiteUser, keyHashData, listAlertChats, removeActionToken, removeAlertChat, removeAlertToken, removeCodeMaster, removeWhiteUser, setCodeConfig };
