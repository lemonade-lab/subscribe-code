import { getConfigValue, getConfig } from 'alemonjs';

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

export { getCodeConfig, isAdmin, isOwner, saveCodeConfig };
