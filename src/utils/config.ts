import { getConfig, getConfigValue, PrivateEventMessageCreate, PublicEventMessageCreate } from 'alemonjs';
import crypto from 'crypto';

/**
 * 整个配置文件操作方法
 */
const config = getConfig();

/**
 * 读取整个配置文件内容
 */
export const configValue = getConfigValue();

/**
 * 获取配置文件指定顶层内容：alemonjs-code
 */
export const getCodeConfig = () => {
    const value = getConfigValue() || {};
    return value['alemonjs-code'] || {};
};

/**
 * 带密SHA256数据摘要
 * @param key
 * @param data
 * @returns
 */
export const keyHashData = (key: string, data: string) => {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
};

const defaultAlemonjsCodeConfig = {
    github_secret: '',
    webhook_port: '',
    admins_id: [],
    ws_secret: '',
    ws_server_url: ''
};

const defaultOneBotConfig = {
    url: '',
    token: '',
    reverse_enable: false,
    reverse_port: 17158,
    master_key: []
};

export function ensureDefaultConfig() {
    const val = config.value;
    if (!val['alemonjs-code']) {
        val['alemonjs-code'] = { ...defaultAlemonjsCodeConfig };
    } else {
        for (const key in defaultAlemonjsCodeConfig) {
            if (!(key in val['alemonjs-code'])) {
                val['alemonjs-code'][key] = defaultAlemonjsCodeConfig[key];
            }
        }
    }
    if (!val['onebot']) {
        val['onebot'] = { ...defaultOneBotConfig };
    } else {
        for (const key in defaultOneBotConfig) {
            if (!(key in val['onebot'])) {
                val['onebot'][key] = defaultOneBotConfig[key];
            }
        }
    }
    config.saveValue(val);
}

/**
 * 封装增强配置更新方法
 * @param topKey 顶层配置项键名
 * @param value  新值或更新函数
 * @param options 可选参数：{ merge: boolean，unique?: boolean }，value属于对象时是否合并，以及value属于数组时是否去重，默认 merge 为 true，unique 为 true
 * */
export function enhancedConfigUpdate(
    topKey: string,
    value: any | ((oldValue: any) => any),
    options: { merge?: boolean; unique?: boolean } = { merge: true, unique: true }
) {
    const val = config.value;
    let newValue = typeof value === 'function' ? value(val[topKey]) : value;

    // 如果是要合并对象配置项，则进行合并处理，默认开启
    if (options?.merge && typeof val[topKey] === 'object' && typeof newValue === 'object') {
        newValue = { ...val[topKey], ...newValue };
    }

    // 如果是要更新数组配置项，并指定了 unique 为 true，则进行去重处理，默认开启
    if (Array.isArray(newValue) && options?.unique) {
        newValue = Array.from(new Set(newValue));
    }

    val[topKey] = newValue;
    config.saveValue(val);
    return val;
}

/**
 * 判断是否是管理员
 * @param userKey 用户ID或用户名 e.UserKey
 * @returns  boolean
 */
export function isAdmin(userKey: string): boolean {
    if (!configValue?.['alemonjs-code']?.admins_id) {
        enhancedConfigUpdate('alemonjs-code', { admins_id: [] });
    }
    const admins = configValue?.['alemonjs-code']?.admins_id || [];
    return admins.includes(userKey);
}

/**
 * 判断是否是所有者
 * @param e 消息对象
 * @returns boolean
 */
export function isOwner(e: PublicEventMessageCreate | PrivateEventMessageCreate): boolean {
    return !!e.IsMaster;
}
