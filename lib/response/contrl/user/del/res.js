import vPlatform, { selects } from '../../../index.js';
import { useMessage, Text, useMention, ResultCode } from 'alemonjs';
import { isMaster, isCodeMaster, isWhiteUser, removeWhiteUser } from '../../../../models/config.js';

const regular = /^(\/code|!|！)u\s+add/;
const res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    if (!isMaster(e.UserKey, e.UserId) && !e.IsMaster && !isCodeMaster(e.UserKey, e.UserId)) {
        void message.send(format(Text('你没有权限执行此操作')));
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
    if (!isWhiteUser(userKey)) {
        void message.send(format(Text('该用户不在白名单，无需删除')));
        return;
    }
    removeWhiteUser(userKey);
    void message.send(format(Text('已移除该用户的白名单身份')));
});
var res$1 = onResponse(selects, [vPlatform.current, res.current]);

export { res$1 as default, regular };
