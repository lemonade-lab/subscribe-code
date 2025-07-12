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

export function isCodeMastet(userKey: string): boolean {
    const value = getCodeConfig() || {};
    const masterKey = value?.master_key || [];
    return masterKey.includes(userKey);
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

export function isMaster(userKey: string): boolean {
    const value = getConfigValue() || {};
    const masterKey = value?.master_key || [];
    return masterKey.includes(userKey);
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
