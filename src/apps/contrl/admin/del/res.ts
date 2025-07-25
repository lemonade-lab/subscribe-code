import vPlatform, { selects } from '@src/apps/index';
import { useMention, useMessage } from 'alemonjs';
import { removeCodeMaster, isCodeMastet, isMaster } from '@src/models/config';
import { ResultCode, Text } from 'alemonjs';

export const regular = /^(\/code|!|！)m\s+del/;

const res = onResponse(selects, async e => {
    const [message] = useMessage(e);
    if (!isMaster(e.UserKey)) {
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
    if (!isCodeMastet(userKey)) {
        message.send(format(Text('该用户不是管理员，无需删除')));
        return;
    }
    removeCodeMaster(userKey);
    message.send(format(Text('已移除该用户的管理员身份')));
});

export default onResponse(selects, [vPlatform.current, res.current]);
