import { selects } from '@src/response/index';
import { Text, useMessage } from 'alemonjs';
import vPlatform from '@src/response/index';
import { isCodeMaster, isMaster, isWhiteUser } from '@src/models/config';
import * as CodeData from '@src/models/code.data';

export const regular = /^(\/code|!|！)\s+(-g\s+)?list(\s|$)/;

const res = onResponse(selects, async e => {
  const [message] = useMessage(e);

  // 群聊
  if (e.name === 'message.create') {
    if (!isMaster(e.UserKey, e.UserId) && !isCodeMaster(e.UserKey, e.UserId)) {
      void message.send(format(Text('你没有权限执行此操作')));

      return;
    }

    // 检查是否有 -g 参数
    const isGlobal = /-g/.test(e.MessageText);
    let subs = [];

    if (isGlobal) {
      // 查询所有群的订阅
      subs = await CodeData.findByType('g');
      if (!subs.length) {
        void message.send(format(Text('暂无任何群聊订阅仓库')));

        return;
      }
      const list = subs.map(s => `${s.belong}/${s.name}（群:${s.chatId}）`).join('\n');

      void message.send(format(Text('所有群聊订阅仓库：\n' + list)));

      return;
    } else {
      // 查询当前群的订阅
      subs = await CodeData.findByChatId(e.SpaceId || e.ChatId);
      if (!subs.length) {
        void message.send(format(Text('本群暂无订阅仓库')));

        return;
      }
      const list = subs.map(s => `${s.belong}/${s.name}`).join('\n');

      void message.send(format(Text('本群订阅仓库：\n' + list)));

      return;
    }
  }
  // 私聊
  if (e.name === 'private.message.create') {
    if (!isMaster(e.UserKey, e.UserId) && !e.IsMaster && !isCodeMaster(e.UserKey, e.UserId) && !isWhiteUser(e.UserKey)) {
      void message.send(format(Text('你没有权限执行此操作')));

      return;
    }
    // 查询当前用户的所有订阅
    const subs = await CodeData.findByChatId(e.UserKey);

    if (!subs.length) {
      void message.send(format(Text('你暂无订阅仓库')));

      return;
    }
    const list = subs.map(s => `${s.belong}/${s.name}`).join('\n');

    void message.send(format(Text('你的订阅仓库：\n' + list)));
  }
});

export default onResponse(selects, [vPlatform.current, res.current]);
