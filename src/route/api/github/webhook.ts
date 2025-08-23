import { formatGithubEvent, GithubEventPayload } from '@src/models/github.make.msg';
import { sendMessage } from '@src/models/github.push.api';
import * as CodeData from '@src/models/code.data';
import { getCodeConfig } from '@src/models/config';
import chalk from 'chalk';
import crypto from 'crypto';
import getRawBody from 'raw-body';
import { Context } from 'koa';

// 扩展Context类型以支持rawBody
interface ExtendedContext extends Context {
    request: Context['request'] & {
        rawBody?: string;
    };
}

// 获取配置
const config = getCodeConfig();
const GITHUB_SECRET: string = config?.github_secret || '';

/**
 * GitHub webhook 验证签名
 */
function verifySignature(secret: string, rawBody: string, signature256: string | undefined): boolean {
    if (!secret || !signature256) {
        return false;
    }
    if (!signature256.startsWith('sha256=')) {
        return false;
    }
    const sig = signature256.slice(7);
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(Buffer.from(rawBody, 'utf8')).digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(digest, 'hex'));
    } catch {
        return false;
    }
}

/**
 * GitHub Webhook 处理函数
 * 路径: /github/webhook
 * 方法: POST
 */
export const POST = async (ctx: ExtendedContext) => {
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

        // 解析payload
        let payload: GithubEventPayload;
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
            logger.error(
                chalk.bgRed.white('[GitHub Webhook]'),
                chalk.red('Payload 解析失败，content-type:'),
                chalk.yellow(contentType)
            );
            return;
        }

        // 获取GitHub事件信息
        const event = ctx.headers['x-github-event'] as string;
        const delivery = ctx.headers['x-github-delivery'];
        const signature256 = ctx.headers['x-hub-signature-256'] as string | undefined;
        const userAgent = ctx.headers['user-agent'];

        logger.info(
            chalk.bgCyan.black('[GitHub Webhook]'),
            chalk.cyan('Event:'),
            chalk.bold(event),
            chalk.cyan('Delivery:'),
            chalk.bold(delivery),
            chalk.cyan('UA:'),
            chalk.gray(userAgent)
        );

        // 验证签名
        if (GITHUB_SECRET) {
            const verifySignatureValue = verifySignature(GITHUB_SECRET, rawBody, signature256);
            logger.info(
                chalk.bgBlue.black('[GitHub Webhook]'),
                chalk.blue('verify Secret:'),
                verifySignatureValue ? chalk.green('✔ 通过') : chalk.red('✘ 未通过')
            );
            if (!verifySignatureValue) {
                ctx.status = 401;
                ctx.body = { status: 'invalid signature' };
                return;
            }
        }

        // 处理仓库信息
        const repo = payload.repository?.full_name;
        if (!repo) {
            ctx.status = 202;
            ctx.body = { status: 'no repo found, ignored' };
            logger.warn(chalk.bgRed.white('[GitHub Webhook]'), chalk.red('未找到仓库信息，忽略本次推送'));
            return;
        }

        // 格式化GitHub事件消息
        const message = formatGithubEvent(event, payload);
        if (!message) {
            ctx.status = 202;
            ctx.body = { status: 'message not generated, ignored' };
            logger.info(chalk.bgGray.black('[GitHub Webhook]'), chalk.gray('事件未生成消息，已忽略'));
            return;
        }

        // 查找订阅并发送消息
        const [belong, name] = repo.split('/');
        const subs = await CodeData.findByRepo('github.com', belong, name, true); // 只查激活的
        if (!subs || subs.length === 0) {
            ctx.status = 202;
            ctx.body = { status: 'no subscription', message: 'bot未有任何聊天订阅该仓库，消息未发送' };
            logger.info(
                chalk.bgYellow.black('[GitHub Webhook]'),
                chalk.yellow('没有订阅该仓库，消息未发送：'),
                chalk.gray(repo)
            );
            return;
        }

        // 发送消息到所有订阅者
        for (const sub of subs) {
            logger.info(
                chalk.bgGreen.black('[GitHub Webhook]'),
                chalk.green('发送消息:'),
                chalk.bold(message),
                chalk.green('from repo:'),
                chalk.bold(repo)
            );
            await sendMessage(sub.type === 'g' ? 'message.create' : 'private.message.create', sub.chatId, message);
        }

        ctx.body = { status: 'ok' };
    } catch (err) {
        logger.error(chalk.bgRed.white('[GitHub Webhook]'), chalk.red('处理异常:'), err);
        ctx.status = 500;
        ctx.body = { status: 'internal error' };
    }
};
