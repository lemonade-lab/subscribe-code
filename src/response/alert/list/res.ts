import { isCodeMaster, isMaster, listAlertChats } from '@src/models/config';
import vPlatform, { selects } from '@src/response/index';
import { Text, useMessage } from 'alemonjs';

// 指令格式：/code -al list
export const regular = /^(\/code|!|！)u\s+(-al|al)\s+(list|l)/;

const res = onResponse(selects, async e => {
  const [message] = useMessage(e);

  // 需要是 主人 / 管理员
  if (!isMaster(e.UserKey, e.UserId) && !e.IsMaster && !isCodeMaster(e.UserKey, e.UserId)) {
    message.send(format(Text('你没有权限执行此操作')));

    return;
  }
  let chatId: string, chatType: 'message.create' | 'private.message.create';

  if (e.name === 'message.create') {
    chatId = e.SpaceId;
    chatType = 'message.create';
  } else if (e.name === 'private.message.create') {
    chatId = e.OpenId;
    chatType = 'private.message.create';
  }
  const allAlertData = listAlertChats();
  const privateAlertData = allAlertData['private.message.create'];
  const publicAlertData = allAlertData['message.create'];

  if (privateAlertData.length === 0 && publicAlertData.length === 0) {
    message.send(format(Text('没有启用任何聊天的阿柠檬机器人异常警告推送')));
  }
  const privateAlertMsg = privateAlertData.map(chatId => `私聊推送：${chatId}`).join('\n');
  const publicAlertMsg = publicAlertData.map(chatId => `群聊推送：${chatId}`).join('\n');
  const alertMsg = privateAlertMsg + '------------------\n' + publicAlertMsg;

  message.send(format(Text(alertMsg)));
});

export default onResponse(selects, [vPlatform.current, res.current]);
