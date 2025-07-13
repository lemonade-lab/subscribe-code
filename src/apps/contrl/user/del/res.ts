import vPlatform, { selects } from '@src/apps/index';
import { useMention, useMessage, ResultCode, Text } from 'alemonjs';
import { removeWhiteUser, isWhiteUser, isMaster, isCodeMastet } from '@src/models/config';

// 删除 code w user 身份
export const regular = /^(\/code|!|！)u\s+add/;

const res = onResponse(selects, async e => {
    const [message] = useMessage(e);
    // 需要是 主人 / 管理员
    if (!isMaster(e.UserKey) && !isCodeMastet(e.UserKey)) {
        message.send(format(Text('你没有权限执行此操作')));
        return;
    }
    const [mention] = useMention(e);
    const user = await mention.findOne();
    if (!user || user?.code !== ResultCode.Ok) {
        return;
    }
    const userKey = user.data?.UserKey;
    if (!userKey) {
        return;
    }
    // 删除用户的 code w user 身份
    if (!isWhiteUser(userKey)) {
        message.send(format(Text('该用户不在白名单，无需删除')));
        return;
    }
    removeWhiteUser(userKey);
    message.send(format(Text('已移除该用户的白名单身份')));
});

export default onResponse(selects, [vPlatform.current, res.current]);
