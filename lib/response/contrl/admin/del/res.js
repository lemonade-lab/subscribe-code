import vPlatform, { selects } from '../../../index.js';
import { useMessage, useMention, ResultCode, Text } from 'alemonjs';
import { isMaster, isCodeMaster, removeCodeMaster } from '../../../../models/config.js';

const regular = /^(\/code|!|！)m\s+del/;
const res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    if (!isMaster(e.UserKey, e.UserId) && !e.IsMaster) {
        return;
    }
    const [mention] = useMention(e);
    const user = await mention.findOne();
    if (!user || user?.code !== ResultCode.Ok) {
        void message.send(format(Text('未找到用户信息')));
        return;
    }
    const userKey = user.data?.UserKey;
    if (!userKey) {
        void message.send(format(Text('未找到用户Key')));
        return;
    }
    if (!isCodeMaster(userKey, e.UserId)) {
        void message.send(format(Text('该用户不是管理员，无需删除')));
        return;
    }
    removeCodeMaster(userKey);
    void message.send(format(Text('已移除该用户的管理员身份')));
});
var res$1 = onResponse(selects, [vPlatform.current, res.current]);

export { res$1 as default, regular };
