// lib/route/api/alert/warning.js
import { sendMessage } from '../../../models/github.push.api.js';
import chalk from 'chalk';
import { getCodeConfig } from '@src/models/config';
import getRawBody from 'raw-body';

// 获取配置
const config = getCodeConfig();
const ALERT_TOKEN: Array<{ chatId: string; token: string; type: 'message.create' | 'private.message.create' }> = config?.alert_token || [];

const POST = async ctx => {
  try {
    // 检查请求体大小限制
    if (ctx.request.length && ctx.request.length > 25 * 1024 * 1024) {
      ctx.status = 413;
      ctx.body = { status: 'payload too large' };

      return;
    }
    // 获取原始请求体
    const rawBody = await getRawBody(ctx.req, { encoding: 'utf8' });

    ctx.request.rawBody = rawBody;

    let payload: {
      title?: string;
      message?: string;
      level?: string;
      timestamp?: string;
    };

    const contentType = ctx.headers['content-type'] || '';

    try {
      if (contentType.includes('application/json')) {
        payload = JSON.parse(rawBody);
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(rawBody);
        const payloadStr = params.get('payload');

        if (!payloadStr) {
          throw new Error('no payload');
        }
        payload = JSON.parse(payloadStr);
      } else {
        throw new Error('unsupported content-type');
      }
    } catch {
      ctx.status = 400;
      ctx.body = { status: 'invalid payload' };
      logger.error(chalk.bgRed.white('[Bot warning report]'), chalk.red('Payload 解析失败，content-type:'), chalk.yellow(contentType));

      return;
    }

    const verifyToken = ctx.headers['x-warning-report-token'] as string | undefined;

    if (verifyToken && ALERT_TOKEN.some(item => item.token === verifyToken)) {
      for (const chatSummary of ALERT_TOKEN) {
        if (chatSummary.token === verifyToken) {
          const { title, message, level, timestamp } = payload;

          if (!title || !message) {
            ctx.status = 400;
            ctx.body = { status: 'missing required fields' };

            return;
          }

          if (!message || message.length === 0) {
            ctx.status = 202;
            ctx.body = { status: 'no message posted, ignored' };

            return;
          }
          const alertMessage = [
            '🚨 机器人异常警告',
            '────────────────',
            `📦 标题：${title}`,
            `⚠️ 级别：${level}`,
            `🕒 时间：${timestamp || new Date().toISOString()}`,
            `📝 详情：${message}`,
            '────────────────'
          ].join('\n');

          await sendMessage(chatSummary.type === 'message.create' ? 'message.create' : 'private.message.create', chatSummary.chatId, alertMessage);
          ctx.status = 200;
          ctx.body = { status: 'ok' };
        }
      }
    } else {
      ctx.status = 401;
      ctx.body = { status: 'cannot find chatId that match this token' };
      logger.error(chalk.bgRed.white('[Alert Warning]'), chalk.red('请求header中携带的token未找到匹配的开发群组：'), verifyToken);
    }
  } catch (err) {
    logger.error(chalk.bgRed.white('[Alert Warning]'), chalk.red('处理异常:'), err);
    ctx.status = 500;
    ctx.body = { status: 'internal error' };
  }
};

export { POST };
