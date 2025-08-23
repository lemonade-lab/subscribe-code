import vPlatform, { selects } from '../../../index.js';
import { useMessage, useMention, ResultCode, Text } from 'alemonjs';
import { isMaster, isCodeMastet, addCodeMaster } from '../../../../models/config.js';

const regular = /^(\/code|!|！)m\s+add/;
const res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    if (!isMaster(e.UserKey, e.UserId)) {
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
    if (isCodeMastet(userKey, e.UserId)) {
        message.send(format(Text('该用户已是管理员')));
        return;
    }
    addCodeMaster(userKey);
    message.send(format(Text('已添加该用户为管理员')));
});
var res$1 = onResponse(selects, [vPlatform.current, res.current]);

export { res$1 as default, regular };
