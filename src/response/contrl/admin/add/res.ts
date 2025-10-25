import vPlatform, { selects } from '@src/response/index';
import { useMention, useMessage } from 'alemonjs';
import { addCodeMaster, isCodeMaster, isMaster } from '@src/models/config';
import { ResultCode, Text } from 'alemonjs';

export const regular = /^(\/code|!|！)m\s+add/;

const res = onResponse(selects, async e => {
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
  if (isCodeMaster(userKey, e.UserId)) {
    void message.send(format(Text('该用户已是管理员')));

    return;
  }
  addCodeMaster(userKey);
  void message.send(format(Text('已添加该用户为管理员')));
});

export default onResponse(selects, [vPlatform.current, res.current]);
