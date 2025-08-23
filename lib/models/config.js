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
function isCodeMastet(userKey, userId) {
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
    if (val[appName] && val[appName].master_key) {
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
    if (val[appName] && val[appName].white_key) {
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

export { addCodeMaster, addWhiteUser, alemonjsCodeVersion, appName, getCodeConfig, isCodeMastet, isMaster, isWhiteUser, keyHashData, removeCodeMaster, removeWhiteUser, setCodeConfig };
