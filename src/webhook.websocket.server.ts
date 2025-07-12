import * as CodeData from '@src/models/code.data';
import { formatGithubEvent, GithubEventPayload } from '@src/models/github.make.msg';
import { sendMessage } from '@src/models/github.push.api';
import { keyHashData } from '@src/models/config';
import chalk from 'chalk';
import crypto from 'crypto';
import Koa from 'koa';
import Router from 'koa-router';
import getRawBody from 'raw-body';
import WebSocket, { WebSocketServer } from 'ws';

/**
 * 启动 Webhook 及 WebSocket 服务端
 * @param options.port         监听端口
 * @param options.githubSecret github webhook 签名密钥
 * @param options.wsSecret     ws认证密钥（可选）
 */
export const WebhookWebsocketServer = async (options: { port?: number; githubSecret?: string; wsSecret?: string }) => {
    const { port: PORT, githubSecret: GITHUB_SECRET, wsSecret: WS_SECRET } = options;

    const app = new Koa();
    const router = new Router();
    const clients = new Set<WebSocket>();

    /** github webhook 验证签名
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

    router.post('/github/webhook', async ctx => {
        try {
            if (ctx.request.length && ctx.request.length > 25 * 1024 * 1024) {
                ctx.status = 413;
                ctx.body = { status: 'payload too large' };
                return;
            }
            const rawBody = await getRawBody(ctx.req, { encoding: 'utf8' });
            ctx.request.rawBody = rawBody;

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

            // 1. 本地直发
            const repo = payload.repository?.full_name;
            if (!repo) {
                ctx.status = 202;
                ctx.body = { status: 'no repo found, ignored' };
                logger.warn(chalk.bgRed.white('[GitHub Webhook]'), chalk.red('未找到仓库信息，忽略本次推送'));
                return;
            }
            const message = formatGithubEvent(event, payload);
            if (!message) {
                ctx.status = 202;
                ctx.body = { status: 'message not generated, ignored' };
                logger.info(chalk.bgGray.black('[GitHub Webhook]'), chalk.gray('事件未生成消息，已忽略'));
                return;
            }
            // 查找所有订阅（只推送激活的）
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

            // 2. 广播转发
            if (clients.size > 0) {
                const wsMsg = { event: event, rawBody: rawBody };
                for (const ws of clients) {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(wsMsg));
                    }
                }
            }
            ctx.body = { status: 'ok' };
        } catch (err) {
            logger.error(chalk.bgRed.white('[GitHub Webhook]'), chalk.red('处理异常:'), err);
            ctx.status = 500;
            ctx.body = { status: 'internal error' };
        }
    });

    app.use(router.routes()).use(router.allowedMethods());

    const server = app.listen(PORT, () => {
        logger.info(
            chalk.bgBlue.white('[Webhook Server]'),
            chalk.blue('服务已启动:'),
            chalk.bold(`http://localhost:${PORT}`)
        );
        logger.info(
            chalk.bgMagenta.white('[WebSocket Server]'),
            chalk.magenta('WebSocket 客户端连接地址:'),
            chalk.bold(`ws://localhost:${PORT}`)
        );
    });

    // WS转发服务端
    const wss = new WebSocketServer({ server });
    wss.on('connection', w => {
        const challenge = crypto.randomUUID();
        let authed = false;
        let clientId: string | undefined = undefined;
        let timeout: NodeJS.Timeout;
        const curWs = w as WebSocket & { clientId?: string };

        /*
         * 已配置 wsSecret 时，下发 wsSecret 认证 challenge，客户端必须通过 wsSecret 认证后方可连接
         */
        if (WS_SECRET) {
            curWs.send(JSON.stringify({ type: 'challenge', challenge }));
        }

        curWs.on('message', msg => {
            try {
                const data = JSON.parse(msg.toString());
                if (!authed && WS_SECRET) {
                    if (data.type === 'auth' && typeof data.signature === 'string') {
                        const expected = keyHashData(WS_SECRET, challenge);
                        if (data.signature === expected) {
                            authed = true;
                            clientId = crypto
                                .createHash('sha256')
                                .update(data.fingerPrint)
                                .digest('hex')
                                .substring(0, 6);
                            curWs.clientId = clientId;
                            clients.add(curWs);
                            curWs.send(JSON.stringify({ type: 'clientId', clientId }));
                            logger.info(
                                chalk.bgGreen.black('[WebSocket]'),
                                chalk.green('认证通过，分配客户端Id:'),
                                chalk.bold(clientId),
                                chalk.green('当前连接数:'),
                                clients.size
                            );
                            logger.info(
                                chalk.bgGreen.black('[WebSocket]'),
                                chalk.green('新客户端已连接:'),
                                chalk.bold(clientId),
                                chalk.green('当前连接数:'),
                                clients.size
                            );
                        } else {
                            curWs.send(JSON.stringify({ type: 'error', message: 'ws_secret 签名校验失败' }));
                            logger.error(
                                chalk.bgRed.white('[WebSocket]'),
                                chalk.red('ws_secret 签名校验失败，已断开连接。')
                            );
                            curWs.close();
                        }
                    } else {
                        logger.error(`ws auth error: ${msg.toString()}`);
                        curWs.close();
                    }
                    return;
                } else if (!authed && !WS_SECRET) {
                    authed = true;
                    clientId = crypto.createHash('sha256').update(data.fingerPrint).digest('hex');
                    curWs.clientId = clientId;
                    clients.add(curWs);
                    curWs.send(JSON.stringify({ type: 'clientId', clientId }));
                }
            } catch {
                curWs.close();
            }
        });

        curWs.on('close', err => {
            clients.delete(curWs);
            clearTimeout(timeout);
            logger.warn(
                chalk.bgRed.white('[WebSocket]'),
                chalk.red(`客户端[${clientId ?? '未知'}]已断开连接，当前连接数:`),
                clients.size,
                err
            );
        });
        curWs.on('error', err => {
            clients.delete(curWs);
            clearTimeout(timeout);
            logger.error(
                chalk.bgRed.white('[WebSocket]'),
                chalk.red(`客户端[${clientId ?? '未知'}]发生错误，已断开连接，当前连接数:`),
                clients.size,
                err
            );
        });
    });
};
