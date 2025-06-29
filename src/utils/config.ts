import { getConfigValue, getConfig } from 'alemonjs';
import { PublicEventMessageCreate, PrivateEventMessageCreate } from 'alemonjs';

export const getCodeConfig = () => {
    const value = getConfigValue() || {};
    return value['alemonjs-code'] || {};
};

export const saveCodeConfig = data => {
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

/**
 * 判断是否是管理员
 * @param userKey 用户ID或用户名 e.UserKey
 * @returns  boolean
 */
export function isAdmin(userKey: string): boolean {
    const codeValue = getCodeConfig();
    const admins = codeValue?.admins_id || [];
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
