import { selects } from '@src/apps/index';
import { configValue, enhancedConfigUpdate, isOwner } from '@src/utils/config';
import { Text, useMention, useMessage } from 'alemonjs';
import { Regular } from 'alemonjs/utils';

const addAdminReg = /^(!|！|\/)?新增仓库订阅管理员\s*([a-zA-Z0-9_.-]+)?$/;
const delAdminReg = /^(!|！|\/)?删除仓库订阅管理员\s*([a-zA-Z0-9_.-]+)?$/;

export const regular = Regular.or(addAdminReg, delAdminReg);

export default onResponse(selects, async e => {
    const [message] = useMessage(e);
    const [mention] = useMention(e);

    const mentionUsers: any = await mention?.findOne();
    let mentionUserKey: string | undefined;
    if (mentionUsers?.code === 2000 && mentionUsers?.data) {
        mentionUserKey = mentionUsers.data.UserKey;
        console.log(`提取到被艾特的用户UserKey: ${JSON.stringify(mentionUserKey)}`);
    } else {
        console.error('无法提取被艾特用户的 UserKey:', mentionUsers);
    }

    // 新增管理员
    if (addAdminReg.test(e.MessageText)) {
        console.log(`解析：${JSON.stringify(e)}`);
        if (!isOwner(e)) {
            message.send(format(Text('只有主人可以添加管理员')));
            return;
        }

        const match = e.MessageText.match(addAdminReg);
        let newAdmin: string | undefined;
        if (!mentionUserKey) {
            if (match[2] === null || match[2] === undefined) {
                message.send(
                    format(Text('请使用正确的格式：\n!新增仓库订阅管理员 用户UserKey\n或 !新增仓库订阅管理员 艾特用户'))
                );
                return;
            }
            newAdmin = match[2];
        } else if (mentionUserKey) {
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

    // 删除管理员
    if (delAdminReg.test(e.MessageText)) {
        if (!isOwner(e)) {
            message.send(format(Text('只有主人可以删除管理员')));
            return;
        }
        const match = e.MessageText.match(delAdminReg);
        let delAdmin: string | undefined;
        if (!mentionUserKey) {
            if (match[2] === null || match[2] === undefined) {
                message.send(format(Text('请使用正确的格式：\n删除仓库订阅管理员 用户UserKey')));
                return;
            }
            delAdmin = match[2];
        } else if (mentionUserKey) {
            delAdmin = mentionUserKey;
        }

        let admins = configValue?.['alemonjs-code']?.admins_id || [];
        if (!admins.includes(delAdmin)) {
            message.send(format(Text('该账号不是管理员')));
            return;
        }
        admins = admins.filter((id: string) => id !== delAdmin);
        message.send(format(Text(`已删除管理员: ${delAdmin}`)));
        enhancedConfigUpdate('alemonjs-code', { admins_id: admins }, { merge: true, unique: true });
    }

    return;
});
