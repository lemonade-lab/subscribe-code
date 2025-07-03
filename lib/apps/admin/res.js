import { selects } from '../index.js';
import { isOwner, configValue, enhancedConfigUpdate } from '../../utils/config.js';
import { useMessage, useMention, Text } from 'alemonjs';
import { Regular } from 'alemonjs/utils';

const addAdminReg = /^(!|！|\/)?新增仓库订阅管理员\s*([a-zA-Z0-9_.-]+)?$/;
const delAdminReg = /^(!|！|\/)?删除仓库订阅管理员\s*([a-zA-Z0-9_.-]+)?$/;
const canPriviteSubscribeReg = /^(!|！|\/)?授权私信订阅\s*([a-zA-Z0-9_.-]+)?$/;
const noPriviteSubscribeReg = /^(!|！|\/)?取消授权私信订阅\s*([a-zA-Z0-9_.-]+)?$/;
const regular = Regular.or(addAdminReg, delAdminReg, canPriviteSubscribeReg, noPriviteSubscribeReg);
var res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    const [mention] = useMention(e);
    const mentionUsers = await mention?.findOne();
    let mentionUserKey;
    if (mentionUsers?.code === 2000 && mentionUsers?.data) {
        mentionUserKey = mentionUsers.data.UserKey;
        logger.info(`提取到被艾特的用户UserKey: ${JSON.stringify(mentionUserKey)}`);
    }
    else {
        logger.error('无法提取被艾特用户的 UserKey:', mentionUsers);
    }
    if (addAdminReg.test(e.MessageText)) {
        logger.info(`解析：${JSON.stringify(e)}`);
        if (!isOwner(e)) {
            message.send(format(Text('只有主人可以添加管理员')));
            return;
        }
        const match = e.MessageText.match(addAdminReg);
        let newAdmin;
        if (!mentionUserKey) {
            if (match[2] === null || match[2] === undefined) {
                message.send(format(Text('请使用正确的格式：\n!新增仓库订阅管理员 用户UserKey\n或 !新增仓库订阅管理员 艾特用户')));
                return;
            }
            newAdmin = match[2];
        }
        else if (mentionUserKey) {
            newAdmin = mentionUserKey;
        }
        const admins = configValue?.['alemonjs-code']?.admins_id || [];
        if (admins.includes(newAdmin)) {
            message.send(format(Text('该账号已是管理员')));
            return;
        }
        enhancedConfigUpdate('alemonjs-code', { admins_id: [...admins, newAdmin] }, { merge: true, unique: true });
        message.send(format(Text(`已添加管理员: ${newAdmin}`)));
    }
    if (delAdminReg.test(e.MessageText)) {
        if (!isOwner(e)) {
            message.send(format(Text('只有主人可以删除管理员')));
            return;
        }
        const match = e.MessageText.match(delAdminReg);
        let delAdmin;
        if (!mentionUserKey) {
            if (match[2] === null || match[2] === undefined) {
                message.send(format(Text('请使用正确的格式：\n删除仓库订阅管理员 用户UserKey')));
                return;
            }
            delAdmin = match[2];
        }
        else if (mentionUserKey) {
            delAdmin = mentionUserKey;
        }
        let admins = configValue?.['alemonjs-code']?.admins_id || [];
        if (!admins.includes(delAdmin)) {
            message.send(format(Text('该账号不是管理员')));
            return;
        }
        admins = admins.filter((id) => id !== delAdmin);
        message.send(format(Text(`已删除管理员: ${delAdmin}`)));
        enhancedConfigUpdate('alemonjs-code', { admins_id: admins }, { merge: true, unique: true });
    }
    if (canPriviteSubscribeReg.test(e.MessageText)) {
        if (!isOwner(e)) {
            message.send(format(Text('只有主人可以设置是否授权用户私信订阅')));
            return;
        }
        const match = e.MessageText.match(canPriviteSubscribeReg);
        let newCanSubscribeUser;
        if (!mentionUserKey) {
            if (match[2] === null || match[2] === undefined) {
                message.send(format(Text('请使用正确的格式：\n!授权私信订阅 用户UserKey,\n或 !授权私信订阅 艾特用户')));
                return;
            }
            newCanSubscribeUser = match[2];
        }
        else if (mentionUserKey) {
            newCanSubscribeUser = mentionUserKey;
        }
        const canPrivateSubscribeUsers = configValue?.['alemonjs-code']?.can_private_subscribe_users || [];
        if (canPrivateSubscribeUsers.includes(newCanSubscribeUser)) {
            message.send(format(Text('该账号已被授权私信订阅')));
            return;
        }
        canPrivateSubscribeUsers.push(newCanSubscribeUser);
        message.send(format(Text(`已授权该用户私信订阅: ${newCanSubscribeUser}`)));
        enhancedConfigUpdate('alemonjs-code', { can_private_subscribe_users: [...canPrivateSubscribeUsers, newCanSubscribeUser] }, { merge: true, unique: true });
    }
    if (noPriviteSubscribeReg.test(e.MessageText)) {
        if (!isOwner(e)) {
            message.send(format(Text('只有主人可以取消授权用户私信订阅')));
        }
        const match = e.MessageText.match(noPriviteSubscribeReg);
        let notSubscribeUser;
        if (!mentionUserKey) {
            if (match[2] === null || match[2] === undefined) {
                message.send(format(Text('请使用正确的格式：\n!取消授权私信订阅 用户UserKey,\n或 !取消授权私信订阅 艾特用户')));
                return;
            }
            notSubscribeUser = match[2];
        }
        else if (mentionUserKey) {
            notSubscribeUser = mentionUserKey;
        }
        let canPrivateSubscribeUsers = configValue?.['alemonjs-code']?.can_private_subscribe_users || [];
        if (!canPrivateSubscribeUsers.includes(notSubscribeUser)) {
            message.send(format(Text('该账号未被授权私信订阅')));
            return;
        }
        canPrivateSubscribeUsers = canPrivateSubscribeUsers.filter((id) => id !== notSubscribeUser);
        message.send(format(Text(`已取消授权该用户私信订阅: ${notSubscribeUser}`)));
        enhancedConfigUpdate('alemonjs-code', { can_private_subscribe_users: canPrivateSubscribeUsers }, { merge: true, unique: true });
    }
    return;
});

export { res as default, regular };
