import { platform as discord } from '@alemonjs/discord';
import { platform as kook } from '@alemonjs/kook';
import { platform as onebot } from '@alemonjs/onebot';
import { selects } from '@src/apps/index';
import PermissionService, { Action, UserRole } from '@src/models/github.sub.permissoin';
import { Text, useMention, useMessage } from 'alemonjs';
import { Regular } from 'alemonjs/utils';

const addAdminReg = /^(!|！|\/)?新增(群聊|群组)(仓库|github)管理员\s*([a-zA-Z0-9_.-]+)?$/;
const delAdminReg = /^(!|！|\/)?删除(群聊|群组)(仓库|github)管理员\s*([a-zA-Z0-9_.-]+)?$/;
const addGlobalAdminReg = /^(!|！|\/)?新增(全局|全域)(仓库|github)管理员\s*([a-zA-Z0-9_.-]+)?$/;
const delGlobalAdminReg = /^(!|！|\/)?删除(全局|全域)(仓库|github)管理员\s*([a-zA-Z0-9_.-]+)?$/;
const removeAdminAllRolesReg = /^(!|！|\/)?删除(仓库|github)?管理员\s*([a-zA-Z0-9_.-]+)?$/;
const listAllAdminsReg = /^(!|！|\/)?(列出所有|所有|all|ALL)?(仓库|仓库订阅)管理员$/;
const cleanAllAdminsReg = /^(!|！|\/)?(重置)(仓库|仓库订阅)管理员系统$/;
const canPriviteSubscribeReg = /^(!|！|\/)?添加私信订阅白名单\s*([a-zA-Z0-9_.-]+)?$/;
const noPriviteSubscribeReg = /^(!|！|\/)?删除私信订阅白名单\s*([a-zA-Z0-9_.-]+)?$/;
const listAllPriviteSubsReg = /^(!|！|\/)?(列出所有|所有|all|ALL)?白名单(用户)?$/;
const myPermissionReg = /^(!|！|\/)?(我的|检查)(仓库|github|GitHub)权限$/;

export const regular = Regular.or(
    addAdminReg,
    delAdminReg,
    addGlobalAdminReg,
    delGlobalAdminReg,
    removeAdminAllRolesReg,
    listAllAdminsReg,
    cleanAllAdminsReg,
    canPriviteSubscribeReg,
    noPriviteSubscribeReg,
    listAllPriviteSubsReg,
    myPermissionReg
);

export default onResponse(selects, async e => {
    const [message] = useMessage(e);
    const [mention] = useMention(e);
    const checkPlatform = (r: string) => [onebot, discord, kook].includes(r);
    if (!checkPlatform(e.Platform)) {
        message.send(format(Text(`本仓库推送功能目前仅支持OneBot、Discord、Kook！${e.Platform}平台暂不支持`)));
        return;
    }
    const mentionUsers: any = await mention?.findOne();
    let mentionUserKey: string | undefined;
    if (mentionUsers?.code === 2000 && mentionUsers?.data) {
        mentionUserKey = mentionUsers.data.UserKey;
        logger.info(`提取到被艾特的用户UserKey: ${JSON.stringify(mentionUserKey)}`);
    } else {
        logger.error('无法提取被艾特用户的 UserKey:', mentionUsers);
    }

    // 新增单个所在群聊的订阅管理员
    if (addAdminReg.test(e.MessageText)) {
        if (e.name !== 'message.create' && e.MessageId) {
            message.send(format(Text('只有群聊可以执行新增普通管理员')));
            return;
        }

        if (!PermissionService.isOwner(e)) {
            message.send(format(Text('只有主人可以添加管理员')));
            return;
        }

        const match = e.MessageText.match(addAdminReg);
        let newAdmin: string | undefined;
        if (!mentionUserKey) {
            if (match[2] === null || match[2] === undefined) {
                message.send(
                    format(Text('请使用正确的格式：\n!新增群聊仓库管理员 用户UserKey\n或 !新增群聊仓库管理员 艾特用户'))
                );
                return;
            }
            newAdmin = match[2];
        } else if (mentionUserKey) {
            newAdmin = mentionUserKey;
        }

        if ((await PermissionService.getUserRole(newAdmin, e.SpaceId)) === UserRole.CodeMaster) {
            message.send(format(Text('该账号已是管理员')));
            return;
        }
        await PermissionService.setUserRole(newAdmin, UserRole.CodeMaster, e.SpaceId);
        message.send(format(Text(`已添加管理员: ${newAdmin}`)));
    }

    // 删除单个所在群聊的管理员
    if (delAdminReg.test(e.MessageText)) {
        if (e.name !== 'message.create' && e.MessageId) {
            message.send(format(Text('只有群聊可以执行删除普通管理员')));
            return;
        }
        if (!PermissionService.isOwner(e)) {
            message.send(format(Text('只有主人可以删除管理员')));
            return;
        }
        const match = e.MessageText.match(delAdminReg);
        let delAdmin: string | undefined;
        if (!mentionUserKey) {
            if (match[2] === null || match[2] === undefined) {
                message.send(format(Text('请使用正确的格式：\n!删除群聊仓库管理员 用户UserKey')));
                return;
            }
            delAdmin = match[2];
        } else if (mentionUserKey) {
            delAdmin = mentionUserKey;
        }

        if (!((await PermissionService.getUserRole(delAdmin, e.SpaceId)) === UserRole.CodeMaster)) {
            message.send(format(Text('该账号不是管理员')));
            return;
        }

        await PermissionService.removeGroupAdminRole(delAdmin, e.SpaceId);
        message.send(format(Text(`已删除群聊订阅管理员: ${delAdmin}`)));
    }

    // 新增全局管理员
    if (addGlobalAdminReg.test(e.MessageText)) {
        if (!PermissionService.isOwner(e)) {
            message.send(format(Text('只有主人可以添加管理员')));
            return;
        }

        const match = e.MessageText.match(addAdminReg);
        let newAdmin: string | undefined;
        if (!mentionUserKey) {
            if (match[2] === null || match[2] === undefined) {
                message.send(
                    format(Text('请使用正确的格式：\n!新增全局仓库管理员 用户UserKey\n或 !新增全局仓库管理员 艾特用户'))
                );
                return;
            }
            newAdmin = match[2];
        } else if (mentionUserKey) {
            newAdmin = mentionUserKey;
        }

        if ((await PermissionService.getUserRole(newAdmin)) === UserRole.GlobalCodeMaster) {
            message.send(format(Text('该账号已是全局管理员')));
            return;
        }
        await PermissionService.setGlobalRole(newAdmin, UserRole.GlobalCodeMaster);
        message.send(format(Text(`已添加全域订阅管理员: ${newAdmin}`)));
    }

    // 删除单个全局管理员
    if (delGlobalAdminReg.test(e.MessageText)) {
        if (!PermissionService.isOwner(e)) {
            message.send(format(Text('只有主人可以删除管理员')));
            return;
        }
        const match = e.MessageText.match(delAdminReg);
        let delAdmin: string | undefined;
        if (!mentionUserKey) {
            if (match[2] === null || match[2] === undefined) {
                message.send(format(Text('请使用正确的格式：\n!删除全局仓库管理员 用户UserKey')));
                return;
            }
            delAdmin = match[2];
        } else if (mentionUserKey) {
            delAdmin = mentionUserKey;
        }

        if (!((await PermissionService.getUserRole(delAdmin)) === UserRole.GlobalCodeMaster)) {
            message.send(format(Text('该账号不是全局管理员')));
            return;
        }

        await PermissionService.removeGlobalAdminRole(delAdmin);
        message.send(format(Text(`已删除全域订阅管理员: ${delAdmin}`)));
    }

    // 删除某用户的全部聊天的管理员权限
    if (removeAdminAllRolesReg.test(e.MessageText)) {
        if (!PermissionService.isOwner(e)) {
            message.send(format(Text('只有主人可以删除管理员')));
            return;
        }
        const match = e.MessageText.match(delAdminReg);
        let delUserAdmin: string | undefined;
        if (!mentionUserKey) {
            if (match[2] === null || match[2] === undefined) {
                message.send(format(Text('请使用正确的格式：\n!删除仓库管理员 用户UserKey')));
                return;
            }
            delUserAdmin = match[2];
        } else if (mentionUserKey) {
            delUserAdmin = mentionUserKey;
        }

        if (
            !((await PermissionService.getUserRole(delUserAdmin)) === UserRole.GlobalCodeMaster) &&
            !((await PermissionService.getUserRole(delUserAdmin)) === UserRole.CodeMaster)
        ) {
            message.send(format(Text('该账号既不是管理员，也不是全局管理员')));
            return;
        }

        await PermissionService.removeAllAdminRoles(delUserAdmin);
        message.send(format(Text(`已删除该用户的在所有聊天的管理员权限: ${delUserAdmin}`)));
    }

    // 列出所有管理员
    if (listAllAdminsReg.test(e.MessageText)) {
        if (!PermissionService.isOwner(e)) {
            message.send(format(Text('只有主人可以获取所有管理员')));
            return;
        }
        const allAdmins = await PermissionService.listAllAdmins();
        const msg = ['管理员列表:\n------------\n'];
        if (allAdmins.length > 0) {
            for (const admin of allAdmins) {
                msg.push(
                    `${admin.userKey} : ${admin.role === UserRole.CodeMaster ? (admin.chatId !== '' ? '群管理员' : '全局管理员') : '普通用户'}`
                );
            }
        } else {
            msg.push('暂无管理员');
        }
        message.send(format(Text(allAdmins.map(admin => `${admin.userKey} (${admin.role})`).join('\n'))));
    }

    // 清空全部管理员，包括全局
    if (cleanAllAdminsReg.test(e.MessageText)) {
        if (!PermissionService.isOwner(e)) {
            message.send(format(Text('只有主人可以清空全部管理员')));
            return;
        }

        if (PermissionService.clearAllAdmins()) {
            message.send(format(Text('全部管理员已清空')));
            return;
        }
    }

    //设置白名单
    if (canPriviteSubscribeReg.test(e.MessageText)) {
        if (!PermissionService.isOwner(e)) {
            message.send(format(Text('只有主人可以设置是否授权用户私信订阅')));
            return;
        }
        const match = e.MessageText.match(canPriviteSubscribeReg);
        let newCanSubscribeUser: string | undefined;
        if (!mentionUserKey) {
            if (match[2] === null || match[2] === undefined) {
                message.send(format(Text('请使用正确的格式：\n!授权私信订阅 用户UserKey,\n或 !授权私信订阅 艾特用户')));
                return;
            }
            newCanSubscribeUser = match[2];
        } else if (mentionUserKey) {
            newCanSubscribeUser = mentionUserKey;
        }

        if (PermissionService.isWhitelisted(newCanSubscribeUser)) {
            message.send(format(Text('该账号已在白名单，可以使用私信订阅')));
            return;
        }
        await PermissionService.addToWhitelist(newCanSubscribeUser);
        message.send(format(Text(`已授权该用户私信订阅: ${newCanSubscribeUser}`)));
    }

    //取消白名单
    if (noPriviteSubscribeReg.test(e.MessageText)) {
        if (!PermissionService.isOwner(e)) {
            message.send(format(Text('只有主人可以取消授权用户私信订阅')));
        }
        const match = e.MessageText.match(noPriviteSubscribeReg);
        let notSubscribeUser: string | undefined;
        if (!mentionUserKey) {
            if (match[2] === null || match[2] === undefined) {
                message.send(
                    format(Text('请使用正确的格式：\n!取消授权私信订阅 用户UserKey,\n或 !取消授权私信订阅 艾特用户'))
                );
                return;
            }
            notSubscribeUser = match[2];
        } else if (mentionUserKey) {
            notSubscribeUser = mentionUserKey;
        }

        if (!PermissionService.isWhitelisted(notSubscribeUser)) {
            message.send(format(Text('该账号未被授权私信订阅')));
            return;
        }
        await PermissionService.removeFromWhitelist(notSubscribeUser);
        message.send(format(Text(`已取消授权该用户私信订阅: ${notSubscribeUser}`)));
    }

    // 列出白名单
    if (listAllPriviteSubsReg.test(e.MessageText)) {
        let chatId: string | null = null;
        if (e.name === 'private.message.create' && e.MessageId) {
            chatId = e.SpaceId;
        } else if (e.name === 'message.create' && e.MessageId) {
            chatId = e.OpenId;
        }
        if (
            !PermissionService.isOwner(e) ||
            !(await PermissionService.checkPermission(e.UserKey, chatId, Action.view_whitelist))
        ) {
            message.send(format(Text('只有管理员可以获取所有白名单用户')));
            return;
        }
        const msgs = [`白名单列表：\n------------\n`];
        const allWhitelisted = await PermissionService.listAllWhitelisted();
        if (allWhitelisted.length > 0) {
            for (const userKey of allWhitelisted) {
                msgs.push(`${userKey}，\n`);
            }
        } else {
            msgs.push('无白名单用户\n');
        }
        message.send(format(Text(`${msgs}`)));
    }

    /**获取用户权限 */
    if (myPermissionReg.test(e.MessageText)) {
        const Role = await PermissionService.getUserRole(e.UserKey, e.ChatId);
        const globalRole = await PermissionService.getUserRole(e.UserKey);
        const isOwner = await PermissionService.isOwner(e);
        const myRole =
            isOwner === true
                ? '主人'
                : globalRole === UserRole.GlobalCodeMaster
                  ? '全局管理员'
                  : Role === UserRole.CodeMaster
                    ? '群管理员'
                    : '普通用户';
        message.send(format(Text(`你的仓库订阅权限是: ${myRole}`)));
    }
    return;
});
