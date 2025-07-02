import { getConfig, getConfigValue } from 'alemonjs';
import crypto from 'crypto';

const config = getConfig();
const configValue = getConfigValue();
const getCodeConfig = () => {
    const value = getConfigValue() || {};
    return value['alemonjs-code'] || {};
};
const keyHashData = (key, data) => {
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
function ensureDefaultConfig() {
    const val = config.value;
    if (!val['alemonjs-code']) {
        val['alemonjs-code'] = { ...defaultAlemonjsCodeConfig };
    }
    else {
        for (const key in defaultAlemonjsCodeConfig) {
            if (!(key in val['alemonjs-code'])) {
                val['alemonjs-code'][key] = defaultAlemonjsCodeConfig[key];
            }
        }
    }
    if (!val['onebot']) {
        val['onebot'] = { ...defaultOneBotConfig };
    }
    else {
        for (const key in defaultOneBotConfig) {
            if (!(key in val['onebot'])) {
                val['onebot'][key] = defaultOneBotConfig[key];
            }
        }
    }
    config.saveValue(val);
}
function enhancedConfigUpdate(topKey, value, options = { merge: true, unique: true }) {
    const val = config.value;
    let newValue = typeof value === 'function' ? value(val[topKey]) : value;
    if (options?.merge && typeof val[topKey] === 'object' && typeof newValue === 'object') {
        newValue = { ...val[topKey], ...newValue };
    }
    if (Array.isArray(newValue) && options?.unique) {
        newValue = Array.from(new Set(newValue));
    }
    val[topKey] = newValue;
    config.saveValue(val);
    return val;
}
function isAdmin(userKey) {
    if (!configValue?.['alemonjs-code']?.admins_id) {
        enhancedConfigUpdate('alemonjs-code', { admins_id: [] });
    }
    const admins = configValue?.['alemonjs-code']?.admins_id || [];
    return admins.includes(userKey);
}
function isOwner(e) {
    return !!e.IsMaster;
}

export { configValue, enhancedConfigUpdate, ensureDefaultConfig, getCodeConfig, isAdmin, isOwner, keyHashData };
