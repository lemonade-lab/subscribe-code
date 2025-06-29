import { formatGithubEvent } from '@src/models/github.make.msg';
import { sendMessage } from '@src/models/github.push.api';
import { genSubId, getSubscriptionsByRepo } from '@src/models/github.sub.data';
import { isPaused, isPausedById } from '@src/models/github.sub.status';
import chalk from 'chalk';
import crypto from 'crypto';
import WebSocket from 'ws';

/**
 * @param options
 */
export const connectWebsokcetServer = async (options: { wsServerUrl?: string; wsSecret?: string }) => {
    const { wsServerUrl: WS_SERVER_URL, wsSecret: WS_SECRET } = options;

    // WebSocket 客户端
    let ws: WebSocket | null = null;
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let clientId: string | null = null;

    function connectWS() {
        ws = new WebSocket(WS_SERVER_URL!);

        ws.on('open', () => {
            logger.info({
                message: '[WebSocket Client] 连接成功'
            });

            heartbeat();
        });

        ws.on('message', async (data: WebSocket.RawData) => {
            try {
                const msg = JSON.parse(data.toString());

                // 处理 challenge 消息
                if (msg.type === 'challenge' && msg.challenge) {
                    logger.info(
                        chalk.bgCyan.black('[WebSocket Client]'),
                        chalk.cyan('收到 challenge，准备发送认证信息...')
                    );
                    const signature = crypto.createHmac('sha256', WS_SECRET).update(msg.challenge).digest('hex');
                    ws.send(JSON.stringify({ type: 'auth', signature }));
                    return;
                }

                // 处理 error 消息
                if (msg.type === 'error' && msg.message) {
                    console.log(
                        chalk.bgRed.white('[WebSocket Client]'),
                        chalk.red('认证失败:'),
                        chalk.yellow(msg.message),
                        chalk.red('请检查本地 ws_secret 配置是否与服务端一致。')
                    );
                    ws.close();
                    return;
                }

                // 处理 clientId 分配（认证成功）
                if (msg.type === 'clientId' && msg.clientId) {
                    clientId = msg.clientId;
                    console.log(
                        chalk.bgGreen.black('[WebSocket Client]'),
                        chalk.green('认证通过，分配到客户端Id:'),
                        chalk.bold(clientId)
                    );
                    return;
                }

                // 只对业务推送消息做签名校验
                const { event, rawBody } = msg;
                if (!event || !rawBody) {
                    // 非业务消息，忽略
                    return;
                }

                console.log(chalk.bgGreen.black('[WebSocket Client]'), chalk.green('收到消息:'), chalk.bold(event));
                const payload = JSON.parse(rawBody);
                // 兼容原有处理逻辑
                const repo = payload.repository?.full_name;
                if (!repo) {
                    console.log(chalk.bgRed.white('[WebSocket Client]'), chalk.red('未找到仓库信息，忽略本次推送'));
                    return;
                }
                const message = formatGithubEvent(event, payload);
                if (!message) {
                    console.log(chalk.bgGray.black('[WebSocket Client]'), chalk.gray('事件未生成消息，已忽略'));
                    return;
                }
                const subs = await getSubscriptionsByRepo(repo);
                if (!subs || subs.length === 0) {
                    console.log(
                        chalk.bgYellow.black('[WebSocket Client]'),
                        chalk.yellow('没有订阅该仓库，消息未发送：'),
                        chalk.gray(repo)
                    );
                    return;
                }
                for (const sub of subs) {
                    const subId = genSubId(sub.chatType, sub.chatId, repo);
                    if (await isPaused(sub.chatType, sub.chatId)) {
                        console.log(
                            chalk.bgYellow.black('[WebSocket Client]'),
                            chalk.yellow('该聊天的推送已暂停，跳过发送：'),
                            `[${sub.chatType}] [${sub.chatId}]`,
                            chalk.gray(repo)
                        );
                        continue;
                    }
                    if (await isPausedById(subId)) {
                        console.log(
                            chalk.bgYellow.black('[WebSocket Client]'),
                            chalk.yellow('该编号仓库推送已暂停，跳过发送：'),
                            `[${sub.chatType}] [${sub.chatId}] [${subId}]`,
                            chalk.gray(repo)
                        );
                        continue;
                    }
                    console.log(
                        chalk.bgGreen.black('[WebSocket Client]'),
                        chalk.green('发送消息:'),
                        chalk.bold(message),
                        chalk.green('from repo:'),
                        chalk.bold(repo)
                    );
                    await sendMessage(sub.chatType, sub.chatId, message);
                }
            } catch (e) {
                console.log(chalk.bgRed.white('[WebSocket Client]'), chalk.red('消息处理异常:'), e);
            }
        });

        ws.on('close', () => {
            console.log(chalk.bgRed.white('[WebSocket Client]'), chalk.red('连接已关闭，5秒后重连...'));
            clearHeartbeat();
            reconnect();
        });

        ws.on('error', err => {
            console.log(chalk.bgRed.white('[WebSocket Client]'), chalk.red('连接异常:'), err);
            ws?.close();
        });

        ws.on('pong', () => {
            console.log(chalk.bgCyan.black('[WebSocket Client]'), chalk.cyan('收到webhook中转服务器心跳反馈'));
            heartbeat();
        });
    }

    function heartbeat() {
        clearHeartbeat();
        heartbeatTimer = setTimeout(() => {
            ws?.ping();
            console.log(chalk.bgCyan.black('[WebSocket Client]'), chalk.cyan('已发送心跳到webhook中转服务器'));
            heartbeat();
        }, 25000);
    }

    function clearHeartbeat() {
        if (heartbeatTimer) clearTimeout(heartbeatTimer);
    }

    function reconnect() {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
            connectWS();
        }, 5000);
    }

    connectWS();
};
