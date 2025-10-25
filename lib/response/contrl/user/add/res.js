import vPlatform, { selects } from '../../../index.js';
import { useMessage, Text, useMention, ResultCode } from 'alemonjs';
import { isMaster, isCodeMaster, isWhiteUser, addWhiteUser } from '../../../../models/config.js';

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
        void message.send(format(Text('未找到用户信息')));
        return;
    }
    const userKey = user.data?.UserKey;
    if (!userKey) {
        void message.send(format(Text('未找到用户Key')));
        return;
    }
    if (isWhiteUser(userKey)) {
        void message.send(format(Text('该用户已在白名单中')));
        return;
    }
    addWhiteUser(userKey);
    void message.send(format(Text('已添加该用户为白名单用户')));
});
var res$1 = onResponse(selects, [vPlatform.current, res.current]);

export { res$1 as default, regular };
