import crypto from 'crypto';
import Koa from 'koa';
import Router from 'koa-router';
import getRawBody from 'raw-body';
import { formatGithubEvent } from './models/github.make.msg';
import { getSubscriptionsByRepo } from './models/github.sub.data';
import { sendMessage } from '@src/models/github.push.api';
import { getConfig } from '@src/utils/config';
import { isPaused } from '@src/models/github.sub.status';

// 读取并解析 github_secret
let GITHUB_SECRET = getConfig()?.github_secret || 'alemonjs-github-sub-secret';

const app = new Koa();
const router = new Router();

// 校验 GitHub Webhook 签名（严格按官方文档）
function verifySignature(secret: string, rawBody: string, signature256: string | undefined): boolean {
    if (!secret || !signature256) return false;
    if (!signature256.startsWith('sha256=')) return false;
    const sig = signature256.slice(7);
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(Buffer.from(rawBody, 'utf8')).digest('hex');
    // 使用 timingSafeEqual 进行恒定时间比较
    try {
        return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(digest, 'hex'));
    } catch {
        return false;
    }
}

// 兼容 application/json 和 x-www-form-urlencoded
router.post('/github/webhook', async (ctx, next) => {
    // 限制 payload 大小
    if (ctx.request.length && ctx.request.length > 25 * 1024 * 1024) {
        ctx.status = 413;
        ctx.body = { status: 'payload too large' };
        return;
    }

    // 捕获原始 body
    const rawBody = await getRawBody(ctx.req, { encoding: 'utf8' });
    ctx.request.rawBody = rawBody;

    // 解析 JSON
    let payload: any;
    try {
        payload = JSON.parse(rawBody);
    } catch (e) {
        ctx.status = 400;
        ctx.body = { status: 'invalid json' };
        return;
    }

    const event = ctx.headers['x-github-event'] as string;
    const delivery = ctx.headers['x-github-delivery'];
    const signature256 = ctx.headers['x-hub-signature-256'] as string | undefined;
    const userAgent = ctx.headers['user-agent'];

    // 记录请求头
    console.log(`[GitHub Webhook] Event: ${event}, Delivery: ${delivery}, UA: ${userAgent}`);

    // 校验签名
    console.log(`[GitHub Webhook] secret: ${GITHUB_SECRET}`);
    if (GITHUB_SECRET) {
        const verifySignatureValue = verifySignature(GITHUB_SECRET, rawBody, signature256);
        console.log(`[GitHub Webhook] verifySignatureValue: ${verifySignatureValue}`);
        if (!verifySignatureValue) {
            ctx.status = 401;
            ctx.body = { status: 'invalid signature' };
            return;
        }
    }

    const repo = payload.repository?.full_name;
    if (!repo) {
        ctx.body = { status: 'no repo' };
        return;
    }
    const message = formatGithubEvent(event, payload);
    if (!message) {
        ctx.body = { status: 'ignored' };
        return;
    }
    console.log(`发送消息： ${message} from repo: ${repo}`);
    const subs = await getSubscriptionsByRepo(repo);
    for (const sub of subs) {
        // 判断是否暂停
        if (await isPaused(sub.chatType, sub.chatId)) {
            console.log(`订阅已暂停，跳过发送： [${sub.chatType}] [${sub.chatId}]`, `${repo}`);
            continue;
        }
        await sendMessage(sub.chatType, sub.chatId, message);
    }
    ctx.body = { status: 'ok' };
});

// Add the router to the app
app.use(router.routes()).use(router.allowedMethods());
// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`GitHub Subscribe Server is running on http://localhost:${PORT}`);
});
