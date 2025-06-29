import { getConfigValue, getConfig } from 'alemonjs';
import crypto from 'crypto';

const getCodeConfig = () => {
    const value = getConfigValue() || {};
    return value['alemonjs-code'] || {};
};
const saveCodeConfig = data => {
    const config = getConfig();
    const value = config.value || {};
    const codeValue = value['alemonjs-code'] || {};
    config.saveValue({
        ...config,
        'alemonjs-code': {
            ...codeValue,
            ...data
        }
    });
};
function isAdmin(userKey) {
    const codeValue = getCodeConfig();
    const admins = codeValue?.admins_id || [];
    return admins.includes(userKey);
}
function isOwner(e) {
    return !!e.IsMaster;
}
const getExpected = (WS_SECRET, challenge) => {
    console.log(`[getExpected] challenge: ${challenge}, WS_SECRET: ${WS_SECRET}`);
    return crypto.createHmac('sha256', WS_SECRET).update(challenge).digest('hex');
};

export { getCodeConfig, getExpected, isAdmin, isOwner, saveCodeConfig };
