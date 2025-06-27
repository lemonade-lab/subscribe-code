import Koa from 'koa';
import Router from 'koa-router';
import WebSocket, { WebSocketServer } from 'ws';
import { configValue, updateConfig } from '@src/utils/config';
import getRawBody from 'raw-body';
import chalk from 'chalk';
import crypto, { randomUUID } from 'crypto';
import http from 'http';
import url from 'url';

const app = new Koa();
const router = new Router();

// 读取github_secret
let GITHUB_SECRET = configValue?.['alemonjs-code-wss']?.github_secret;
if (!GITHUB_SECRET) {
    GITHUB_SECRET = crypto.randomBytes(12).toString('hex');
    updateConfig('alemonjs-code-wss', { github_secret: GITHUB_SECRET });
    console.log(
        chalk.bgYellow.black('[GitHub Webhook]'),
        chalk.yellow('未设置github_secret，已自动生成并保存:'),
        chalk.bold(GITHUB_SECRET)
    );
} else {
    console.log(
        chalk.bgGreen.black('[GitHub Webhook]'),
        chalk.green('已读取github_secret'),
        chalk.yellow(GITHUB_SECRET)
    );
}

// WebSocket 服务端口
let WSS_PORT: number = configValue?.['alemonjs-code-wss']?.ws_server_port;
if (!WSS_PORT) {
    WSS_PORT = 18555;
    updateConfig('alemonjs-code-wss', { ws_server_port: WSS_PORT });
    console.log(
        chalk.bgYellow.black('[WebSocket Server]'),
        chalk.yellow('未设置ws_server_port，已自动设置为默认端口:'),
        chalk.bold(WSS_PORT)
    );
}

// 获取/生成 ws_secret
let WS_SECRET: string = configValue?.['alemonjs-code-wss']?.ws_secret;
if (!WS_SECRET || WS_SECRET === '') {
    WS_SECRET = crypto.randomBytes(12).toString('hex');
    updateConfig('alemonjs-code-wss', { ws_secret: WS_SECRET });
    console.log(
        chalk.bgYellow.black('[WebSocket]'),
        chalk.yellow('未设置ws_secret，已自动生成并保存:'),
        chalk.bold(WS_SECRET)
    );
} else {
    console.log(chalk.bgGreen.black('[WebSocket]'), chalk.green('已读取ws_secret'), chalk.yellow(WS_SECRET));
}
// HTTP 服务端口
let HTTP_PORT = WSS_PORT;

// 维护所有已连接的客户端
const clients = new Set<WebSocket>();

// 心跳包相关设置
const HEARTBEAT_INTERVAL = 30000; // 30秒
const HEARTBEAT_TIMEOUT = 60000; // 60秒
function heartbeat(this: WebSocket) {
    // 标记为存活
    (this as any).isAlive = true;
}

// 创建 HTTP 服务（用于 Koa 和 WebSocket 协议升级）
const server = http.createServer(app.callback());

// 创建 WebSocket 服务，监听 /ws-client 路由
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
    const pathname = url.parse(req.url || '').pathname;
    if (pathname === '/ws-client') {
        wss.handleUpgrade(req, socket, head, ws => {
            wss.emit('connection', ws, req);
        });
    } else {
        socket.destroy();
    }
});

wss.on('connection', ws => {
    const challenge = randomUUID();
    ws.send(JSON.stringify({ type: 'challenge', challenge }));
    console.log(chalk.bgCyan.black('[WebSocket]'), chalk.cyan('已下发 challenge 给新客户端，等待认证...'));

    let authed = false;
    let clientId: string | undefined = undefined;
    let timeout: NodeJS.Timeout;

    ws.on('message', msg => {
        try {
            const data = JSON.parse(msg.toString());
            if (!authed) {
                if (data.type === 'auth' && typeof data.signature === 'string') {
                    const expected = crypto.createHmac('sha256', WS_SECRET).update(challenge).digest('hex');
                    if (data.signature === expected) {
                        authed = true;
                        clientId = randomUUID();
                        (ws as any).clientId = clientId;
                        clients.add(ws);
                        ws.send(JSON.stringify({ type: 'clientId', clientId }));
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
                        resetTimeout();
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: 'ws_secret 签名校验失败' }));
                        ws.close();
                        console.log(
                            chalk.bgRed.white('[WebSocket]'),
                            chalk.red(
                                'ws_secret 签名校验失败，已断开连接。请检查客户端 ws_secret 配置是否与服务端一致。'
                            )
                        );
                    }
                } else {
                    ws.close();
                    console.log(chalk.bgRed.white('[WebSocket]'), chalk.red('未收到有效认证消息，已断开连接。'));
                }
                return;
            }
            // ...后续消息处理...
        } catch (e) {
            ws.close();
            console.log(chalk.bgRed.white('[WebSocket]'), chalk.red('认证消息解析异常，已断开连接。'));
        }
    });

    // 心跳标记
    (ws as any).isAlive = true;
    function resetTimeout() {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            ws.terminate();
            clients.delete(ws);
            console.log(
                chalk.bgRed.white('[WebSocket]'),
                chalk.red(`客户端[${clientId ?? '未知'}]心跳超时，已断开，当前连接数:`),
                clients.size
            );
        }, HEARTBEAT_TIMEOUT);
    }

    ws.on('pong', function () {
        heartbeat.call(ws);
        if (authed && clientId) {
            console.log(chalk.bgGreen.white('[WebSocket]'), chalk.green(`客户端[${clientId}]心跳正常`));
        }
        resetTimeout();
    });

    ws.on('close', () => {
        clients.delete(ws);
        clearTimeout(timeout);
        console.log(
            chalk.bgRed.white('[WebSocket]'),
            chalk.red(`客户端[${clientId ?? '未知'}]已断开连接，当前连接数:`),
            clients.size
        );
    });
    ws.on('error', () => {
        clients.delete(ws);
        clearTimeout(timeout);
        console.log(
            chalk.bgRed.white('[WebSocket]'),
            chalk.red(`客户端[${clientId ?? '未知'}]发生错误，已断开连接，当前连接数:`),
            clients.size
        );
    });
});

// 定时检测心跳
setInterval(() => {
    for (const ws of clients) {
        if ((ws as any).isAlive === false) {
            ws.terminate();
            clients.delete(ws);
            continue;
        }
        (ws as any).isAlive = false;
        ws.ping();
    }
}, HEARTBEAT_INTERVAL);

// 生成ws签名
function signPayload(rawBody: string) {
    return crypto.createHmac('sha256', WS_SECRET).update(rawBody).digest('hex');
}

// 校验 GitHub Webhook 签名（严格按官方文档）
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

// Webhook 路由
router.post('/github/webhook', async ctx => {
    const rawBody = await getRawBody(ctx.req, { encoding: 'utf8' });
    ctx.request.rawBody = rawBody;
    let payload: any;
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
    } catch (e) {
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
            chalk.blue('verifySignatureValue:'),
            verifySignatureValue ? chalk.green('✔ 通过') : chalk.red('✘ 未通过')
        );
        if (!verifySignatureValue) {
            ctx.status = 401;
            ctx.body = { status: 'invalid signature' };
            return;
        }
    }
    const signature = signPayload(rawBody);
    const wsMsg = {
        event: event,
        rawBody: rawBody,
        signature: signature
    };
    // 广播给所有已连接客户端
    for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(wsMsg));
        }
    }
    ctx.body = { status: 'ok' };
});

app.use(router.routes()).use(router.allowedMethods());
let webhook_port = configValue?.['alemonjs-code-wss']?.webhook_port;
if (!webhook_port) {
    webhook_port = 18666; // 默认端口
    updateConfig('alemonjs-code-wss', { webhook_port: webhook_port });
    console.log(
        chalk.bgYellow.black('[GitHub Webhook Server]'),
        chalk.yellow('未设置webhook_port，已自动设置为默认端口:'),
        chalk.bold(webhook_port)
    );
}
app.listen(webhook_port, () => {
    console.log(
        chalk.bgBlue.white('[GitHub Webhook Server]'),
        chalk.blue('服务已启动:'),
        chalk.bold(`http://localhost:${webhook_port}`)
    );
});

// 启动 HTTP+WebSocket 服务
server.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(
        chalk.bgBlue.white('[GitHub Webhook Server]'),
        chalk.blue('服务已启动:'),
        chalk.bold(`http://0.0.0.0:${HTTP_PORT}`)
    );
    console.log(
        chalk.bgMagenta.white('[WebSocket Server]'),
        chalk.magenta('GitHub Webhook Server中转服务已启动:'),
        chalk.bold(`客户端连接地址: ws://[ws_server_public_ip_address]:${WSS_PORT}/ws-client`)
    );
});
