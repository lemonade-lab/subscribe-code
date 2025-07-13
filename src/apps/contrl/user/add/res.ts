import vPlatform, { selects } from '@src/apps/index';
import { useMention, useMessage, ResultCode, Text } from 'alemonjs';
import { addWhiteUser, isCodeMastet, isMaster, isWhiteUser } from '@src/models/config';

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
        message.send(format(Text('未找到用户信息')));
        return;
    }
    const userKey = user.data?.UserKey;
    if (!userKey) {
        message.send(format(Text('未找到用户Key')));
        return;
    }
    if (isWhiteUser(userKey)) {
        message.send(format(Text('该用户已在白名单中')));
        return;
    }
    addWhiteUser(userKey);
    message.send(format(Text('已添加该用户为白名单用户')));
});

export default onResponse(selects, [vPlatform.current, res.current]);
