import { addAlertToken, isCodeMastet, isMaster } from '@src/models/config';
import { sendMessage } from '@src/models/github.push.api';
import vPlatform, { selects } from '@src/response/index';
import { Text, useMessage } from 'alemonjs';
import crypto from 'crypto';

export const regular = /^(\/code|!|！)u\s+(-al|al)\s+add/;

/**
 * 根据chatId、chatType和时间戳生成12位token
 * @param chatId 聊天ID
 * @param chatType 聊天类型
 * @returns 12位字符串token
 */
function generateAlertToken(chatId: string, chatType: string): string {
    // 获取当前时间戳
    const timestamp = Date.now().toString();

    // 组合所有参数
    const data = `${chatId}-${chatType}-${timestamp}`;

    // 使用SHA256哈希算法
    const hash = crypto.createHash('sha256').update(data).digest('hex');

    // 截取前12位作为token
    return hash.substring(0, 12);
}

const res = onResponse(selects, async e => {
    const [message] = useMessage(e);
    // 需要是 主人 / 管理员
    if (!isMaster(e.UserKey, e.UserId) && !e.IsMaster && !isCodeMastet(e.UserKey, e.UserId)) {
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
    const token = generateAlertToken(chatId, chatType);
    if (addAlertToken({ chatId: chatId, token: token, type: chatType })) {
        message.send(format(Text(`已启用该聊天用于阿柠檬机器人异常警告推送，Token已私发`)));
        sendMessage(chatType, e.OpenId, `阿柠檬机器人异常警告推送设置：\nChatId: ${chatId}\nToken: ${token}`);
    } else {
        message.send(format(Text(`已存在该聊天的阿柠檬机器人异常警告推送设置项，\n如需重新设置请先删除原设置项`)));
    }
});

export default onResponse(selects, [vPlatform.current, res.current]);
