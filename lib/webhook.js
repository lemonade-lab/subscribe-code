import { formatGithubEvent } from './models/github.make.msg.js';
import { sendMessage } from './models/github.push.api.js';
import { getSubscriptionsByRepo, genSubId } from './models/github.sub.data.js';
import { isPaused, isPausedById } from './models/github.sub.status.js';
import chalk from 'chalk';
import Koa from 'koa';
import Router from 'koa-router';
import koaBody from 'koa-bodyparser';
import cors from '@koa/cors';
import { WebSocketServer } from 'ws';
import getRawBody from 'raw-body';
import crypto, { randomUUID } from 'crypto';
import url from 'url';

const createWebhookServer = async (options) => {
    const { port: PORT = 18666, githubSecret: GITHUB_SECRET, wsSecret: WS_SECRET } = options;
    const app = new Koa();
    const router = new Router();
    app.use(cors());
    app.use(koaBody());
    const clients = new Set();
    function verifySignature(secret, rawBody, signature256) {
        if (!secret || !signature256)
            return false;
        if (!signature256.startsWith('sha256='))
            return false;
        const sig = signature256.slice(7);
        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(Buffer.from(rawBody, 'utf8')).digest('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(digest, 'hex'));
        }
        catch {
            return false;
        }
    }
    router.post('/github/webhook', async (ctx) => {
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
            }
            else if (contentType.includes('application/x-www-form-urlencoded')) {
                const params = new URLSearchParams(rawBody);
                const payloadStr = params.get('payload');
                if (!payloadStr)
                    throw new Error('no payload');
                payload = JSON.parse(payloadStr);
            }
            else {
                throw new Error('unsupported content-type');
            }
        }
        catch {
            ctx.status = 400;
            ctx.body = { status: 'invalid payload' };
            console.log(chalk.bgRed.white('[GitHub Webhook]'), chalk.red('Payload 解析失败，content-type:'), chalk.yellow(contentType));
            return;
        }
        const event = ctx.headers['x-github-event'];
        const delivery = ctx.headers['x-github-delivery'];
        const signature256 = ctx.headers['x-hub-signature-256'];
        const userAgent = ctx.headers['user-agent'];
        console.log(chalk.bgCyan.black('[GitHub Webhook]'), chalk.cyan(`Event:`), chalk.bold(event), chalk.cyan(`Delivery:`), chalk.bold(delivery), chalk.cyan(`UA:`), chalk.gray(userAgent));
        console.log(chalk.bgMagenta.black('[GitHub Webhook]'), chalk.magenta('secret:'), chalk.gray(GITHUB_SECRET));
        if (GITHUB_SECRET) {
            const verifySignatureValue = verifySignature(GITHUB_SECRET, rawBody, signature256);
            console.log(chalk.bgBlue.black('[GitHub Webhook]'), chalk.blue('verify Secret:'), verifySignatureValue
                ? chalk.green('✔ 通过')
                : chalk.red('✘ 未通过，请检查配置项github_secret是否与github webhook配置一致'));
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
        const message = formatGithubEvent(event, payload);
        if (!message) {
            ctx.status = 202;
            ctx.body = { status: 'message not generated, ignored' };
            console.log(chalk.bgGray.black('[GitHub Webhook]'), chalk.gray('事件未生成消息，已忽略'));
            return;
        }
        const subs = await getSubscriptionsByRepo(repo);
        if (!subs || subs.length === 0) {
            ctx.status = 202;
            ctx.body = { status: 'no subscription', message: 'bot未有任何聊天订阅该仓库，消息未发送' };
            console.log(chalk.bgYellow.black('[GitHub Webhook]'), chalk.yellow('没有订阅该仓库，消息未发送：'), chalk.gray(repo));
            return;
        }
        for (const sub of subs) {
            const subId = genSubId(sub.chatType, sub.chatId, repo);
            if (await isPaused(sub.chatType, sub.chatId)) {
                console.log(chalk.bgYellow.black('[GitHub Webhook]'), chalk.yellow('该聊天的推送已暂停，跳过发送：'), `[${sub.chatType}] [${sub.chatId}]`, chalk.gray(repo));
                continue;
            }
            if (await isPausedById(subId)) {
                console.log(chalk.bgYellow.black('[GitHub Webhook]'), chalk.yellow('该编号仓库推送已暂停，跳过发送：'), `[${sub.chatType}] [${sub.chatId}] [${subId}]`, chalk.gray(repo));
                continue;
            }
            console.log(chalk.bgGreen.black('[GitHub Webhook]'), chalk.green('发送消息:'), chalk.bold(message), chalk.green('from repo:'), chalk.bold(repo));
            await sendMessage(sub.chatType, sub.chatId, message);
        }
        ctx.body = { status: 'ok' };
    });
    app.use(router.routes()).use(router.allowedMethods());
    const server = app.listen(PORT, () => {
        console.log(chalk.bgBlue.white('[GitHub Webhook Server]'), chalk.blue('服务已启动:'), chalk.bold(`http://localhost:${PORT}`));
    });
    const wss = new WebSocketServer({ server: server });
    server.on('upgrade', (req, socket, head) => {
        const pathname = url.parse(req.url || '').pathname;
        if (pathname === '/ws-client') {
            wss.handleUpgrade(req, socket, head, ws => {
                wss.emit('connection', ws, req);
            });
        }
        else {
            socket.destroy();
        }
    });
    wss.on('connection', ws => {
        const challenge = randomUUID();
        ws.send(JSON.stringify({ type: 'challenge', challenge }));
        console.log(chalk.bgCyan.black('[WebSocket]'), chalk.cyan('已下发 challenge 给新客户端，等待认证...'));
        let authed = false;
        let clientId = undefined;
        let timeout;
        const curWs = ws;
        const getExpected = () => {
            return crypto.createHmac('sha256', WS_SECRET).update(challenge).digest('hex');
        };
        curWs.on('message', msg => {
            try {
                const data = JSON.parse(msg.toString());
                if (!authed) {
                    if (data.type === 'auth' && typeof data.signature === 'string') {
                        const expected = getExpected();
                        if (data.signature === expected) {
                            authed = true;
                            clientId = randomUUID();
                            curWs.clientId = clientId;
                            clients.add(curWs);
                            curWs.send(JSON.stringify({ type: 'clientId', clientId }));
                            console.log(chalk.bgGreen.black('[WebSocket]'), chalk.green(`认证通过，分配客户端Id: ${clientId}，当前连接数:`), clients.size);
                            console.log(chalk.bgGreen.black('[WebSocket]'), chalk.green(`新客户端已连接: ${clientId}，当前连接数:`), clients.size);
                        }
                        else {
                            curWs.send(JSON.stringify({ type: 'error', message: 'ws_secret 签名校验失败' }));
                            curWs.close();
                            console.log(chalk.bgRed.white('[WebSocket]'), chalk.red('ws_secret 签名校验失败，已断开连接。请检查客户端 ws_secret 配置是否与服务端一致。'));
                        }
                    }
                    else {
                        curWs.close();
                        console.log(chalk.bgRed.white('[WebSocket]'), chalk.red('未收到有效认证消息，已断开连接。'));
                    }
                    return;
                }
            }
            catch {
                curWs.close();
                console.log(chalk.bgRed.white('[WebSocket]'), chalk.red('认证消息解析异常，已断开连接。'));
            }
        });
        curWs.on('close', () => {
            clients.delete(curWs);
            clearTimeout(timeout);
            console.log(chalk.bgRed.white('[WebSocket]'), chalk.red(`客户端[${clientId ?? '未知'}]已断开连接，当前连接数:`), clients.size);
        });
        curWs.on('error', () => {
            clients.delete(curWs);
            clearTimeout(timeout);
            console.log(chalk.bgRed.white('[WebSocket]'), chalk.red(`客户端[${clientId ?? '未知'}]发生错误，已断开连接，当前连接数:`), clients.size);
        });
    });
};

export { createWebhookServer };
