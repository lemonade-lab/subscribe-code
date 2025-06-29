import { formatGithubEvent } from '@src/models/github.make.msg';
import { sendMessage } from '@src/models/github.push.api';
import { genSubId, getSubscriptionsByRepo } from '@src/models/github.sub.data';
import { isPaused, isPausedById } from '@src/models/github.sub.status';
import chalk from 'chalk';
import Koa from 'koa';
import Router from 'koa-router';
// import koaBody from 'koa-bodyparser';
import cors from '@koa/cors';
import WebSocket, { WebSocketServer } from 'ws';
import getRawBody from 'raw-body';
import crypto, { randomUUID } from 'crypto';
// import url from 'url';
import { getExpected } from './utils/config';

/**
 * @param PORT
 */
export const createWebhookServer = async (options: { port?: number; githubSecret?: string; wsSecret?: string }) => {
    const { port: PORT = 18666, githubSecret: GITHUB_SECRET, wsSecret: WS_SECRET } = options;
    const app = new Koa();
    const router = new Router();
    // 跨域
    app.use(cors());
    // body
    // app.use(koaBody());

    // 维护所有已连接的客户端
    const clients = new Set<WebSocket>();

    /** 校验 GitHub Webhook 签名
     * @param secret 签名密钥
     * @param rawBody 原始请求体
     * @param signature 签名
     * @returns 是否通过签名校验
     */
    function verifySignature(secret: string, rawBody: string, signature256: string | undefined): boolean {
        if (!secret || !signature256) return false;
        if (!signature256.startsWith('sha256=')) return false;
        const sig = signature256.slice(7);
        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(Buffer.from(rawBody, 'utf8')).digest('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(digest, 'hex'));
        } catch {
            return false;
        }
    }

    // 兼容 application/json 和 x-www-form-urlencoded
    router.post('/github/webhook', async ctx => {
        if (ctx.request.length && ctx.request.length > 25 * 1024 * 1024) {
            ctx.status = 413;
            ctx.body = { status: 'payload too large' };
            return;
        }

        const rawBody = await getRawBody(ctx.req, { encoding: 'utf8' });
        ctx.request.rawBody = rawBody;

        let payload = null;
        const contentType = ctx.headers['content-type'] || '';
        try {
            if (contentType.includes('application/json')) {
                payload = JSON.parse(rawBody);
            } else if (contentType.includes('application/x-www-form-urlencoded')) {
                const params = new URLSearchParams(rawBody);
                const payloadStr = params.get('payload');
                if (!payloadStr) throw new Error('no payload');
                payload = JSON.parse(payloadStr);
            } else {
                throw new Error('unsupported content-type');
            }
        } catch {
            ctx.status = 400;
            ctx.body = { status: 'invalid payload' };
            console.log(
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

        // 记录请求头
        console.log(
            chalk.bgCyan.black('[GitHub Webhook]'),
            chalk.cyan(`Event:`),
            chalk.bold(event),
            chalk.cyan(`Delivery:`),
            chalk.bold(delivery),
            chalk.cyan(`UA:`),
            chalk.gray(userAgent)
        );

        // 校验签名
        console.log(chalk.bgMagenta.black('[GitHub Webhook]'), chalk.magenta('secret:'), chalk.gray(GITHUB_SECRET));
        if (GITHUB_SECRET) {
            const verifySignatureValue = verifySignature(GITHUB_SECRET, rawBody, signature256);
            console.log(
                chalk.bgBlue.black('[GitHub Webhook]'),
                chalk.blue('verify Secret:'),
                verifySignatureValue
                    ? chalk.green('✔ 通过')
                    : chalk.red('✘ 未通过，请检查配置项github_secret是否与github webhook配置一致')
            );
            if (!verifySignatureValue) {
                ctx.status = 401;
                ctx.body = { status: 'invalid signature' };
                return;
            }
        }

        const repo = payload.repository?.full_name;
        if (!repo) {
            ctx.status = 202;
            ctx.body = { status: 'no repo found, ignored' };
            console.log(chalk.bgRed.white('[GitHub Webhook]'), chalk.red('未找到仓库信息，忽略本次推送'));
            return;
        }

        if (process.env.ALEMONJS_CODE_MODE === 'bot') {
            const message = formatGithubEvent(event, payload);
            if (!message) {
                ctx.status = 202;
                ctx.body = { status: 'message not generated, ignored' };
                console.log(chalk.bgGray.black('[GitHub Webhook]'), chalk.gray('事件未生成消息，已忽略'));
                return;
            }
            const subs = await getSubscriptionsByRepo(repo);
            if (!subs || subs.length === 0) {
                ctx.status = 202; // 明确告知已接受但未处理
                ctx.body = { status: 'no subscription', message: 'bot未有任何聊天订阅该仓库，消息未发送' };
                console.log(
                    chalk.bgYellow.black('[GitHub Webhook]'),
                    chalk.yellow('没有订阅该仓库，消息未发送：'),
                    chalk.gray(repo)
                );
                return;
            }
            for (const sub of subs) {
                // 相同参数生成恒定唯一订阅编号进行查询
                const subId = genSubId(sub.chatType, sub.chatId, repo);
                if (await isPaused(sub.chatType, sub.chatId)) {
                    console.log(
                        chalk.bgYellow.black('[GitHub Webhook]'),
                        chalk.yellow('该聊天的推送已暂停，跳过发送：'),
                        `[${sub.chatType}] [${sub.chatId}]`,
                        chalk.gray(repo)
                    );
                    continue;
                }
                if (await isPausedById(subId)) {
                    console.log(
                        chalk.bgYellow.black('[GitHub Webhook]'),
                        chalk.yellow('该编号仓库推送已暂停，跳过发送：'),
                        `[${sub.chatType}] [${sub.chatId}] [${subId}]`,
                        chalk.gray(repo)
                    );
                    continue;
                }
                console.log(
                    chalk.bgGreen.black('[GitHub Webhook]'),
                    chalk.green('发送消息:'),
                    chalk.bold(message),
                    chalk.green('from repo:'),
                    chalk.bold(repo)
                );
                await sendMessage(sub.chatType, sub.chatId, message);
            }
        } else {
            // 广播给所有已连接客户端
            const wsMsg = {
                event: event,
                rawBody: rawBody
            };
            for (const ws of clients) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(wsMsg));
                }
            }
        }

        ctx.body = { status: 'ok' };
    });

    // Add the router to the app
    app.use(router.routes()).use(router.allowedMethods());

    // Start the server
    const server = app.listen(PORT, () => {
        console.log(
            chalk.bgBlue.white('[GitHub Webhook Server]'),
            chalk.blue('服务已启动:'),
            chalk.bold(`http://localhost:${PORT}`)
        );
    });

    // 创建 WebSocketServer 并监听同一个端口
    const wss = new WebSocketServer({ server: server });

    // server.on('upgrade', (req, socket, head) => {
    //     const pathname = url.parse(req.url || '').pathname;
    //     // 限制？
    //     if (pathname === '/ws-client') {
    //         wss.handleUpgrade(req, socket, head, ws => {
    //             wss.emit('connection', ws, req);
    //         });
    //     } else {
    //         socket.destroy();
    //     }
    // });

    wss.on('connection', ws => {
        const challenge = randomUUID();
        ws.send(JSON.stringify({ type: 'challenge', challenge }));
        console.log(chalk.bgCyan.black('[WebSocket]'), chalk.cyan('已下发 challenge 给新客户端，等待认证...'));

        let authed = false;
        let clientId: string | undefined = undefined;
        let timeout: NodeJS.Timeout;

        const curWs = ws as WebSocket & { clientId?: string };

        curWs.on('message', msg => {
            try {
                const data = JSON.parse(msg.toString());
                if (!authed) {
                    if (data.type === 'auth' && typeof data.signature === 'string') {
                        const expected = getExpected(WS_SECRET, challenge);
                        if (data.signature === expected) {
                            authed = true;
                            clientId = randomUUID();
                            curWs.clientId = clientId;
                            clients.add(curWs);
                            curWs.send(JSON.stringify({ type: 'clientId', clientId }));
                            console.log(
                                chalk.bgGreen.black('[WebSocket]'),
                                chalk.green(`认证通过，分配客户端Id: ${clientId}，当前连接数:`),
                                clients.size
                            );
                            // 认证通过后再输出“新客户端已连接”日志
                            console.log(
                                chalk.bgGreen.black('[WebSocket]'),
                                chalk.green(`新客户端已连接: ${clientId}，当前连接数:`),
                                clients.size
                            );
                        } else {
                            curWs.send(JSON.stringify({ type: 'error', message: 'ws_secret 签名校验失败' }));
                            curWs.close();
                            console.log(
                                chalk.bgRed.white('[WebSocket]'),
                                chalk.red(
                                    'ws_secret 签名校验失败，已断开连接。请检查客户端 ws_secret 配置是否与服务端一致。'
                                )
                            );
                        }
                    } else {
                        curWs.close();
                        console.log(chalk.bgRed.white('[WebSocket]'), chalk.red('未收到有效认证消息，已断开连接。'));
                    }
                    return;
                }
                // ...后续消息处理...
            } catch {
                curWs.close();
                console.log(chalk.bgRed.white('[WebSocket]'), chalk.red('认证消息解析异常，已断开连接。'));
            }
        });

        curWs.on('close', err => {
            clients.delete(curWs);
            clearTimeout(timeout);
            console.error(err);
            console.log(
                chalk.bgRed.white('[WebSocket]'),
                chalk.red(`客户端[${clientId ?? '未知'}]已断开连接，当前连接数:`),
                clients.size
            );
        });

        curWs.on('error', err => {
            clients.delete(curWs);
            clearTimeout(timeout);
            console.error(err);
            console.log(
                chalk.bgRed.white('[WebSocket]'),
                chalk.red(`客户端[${clientId ?? '未知'}]发生错误，已断开连接，当前连接数:`),
                clients.size
            );
        });
    });
};
