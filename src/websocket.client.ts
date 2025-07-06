import { formatGithubEvent } from '@src/models/github.make.msg';
import { sendMessage } from '@src/models/github.push.api';
import SubscriptionService from '@src/models/github.sub.operation';
import { SubscriptionStatus } from '@src/models/github.sub.permissoin';
import { keyHashData } from '@src/utils/config';
import chalk from 'chalk';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import WebSocket from 'ws';

/**
 * WebSocket 客户端，进行连接 WebSocket 服务器（中转模式，ws_secret 可选）
 * @param options.wsServerUrl WebSocket服务器地址
 * @param options.wsSecret    认证密钥（可选，建议生产环境设置）
 */
export const WebsokcetClient = async (options: { wsServerUrl?: string; wsSecret?: string }) => {
    const { wsServerUrl: WS_SERVER_URL, wsSecret: WS_SECRET } = options;
    let ws: WebSocket | null = null;
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let clientId: string | null = null;

    function connectWS() {
        ws = new WebSocket(WS_SERVER_URL);
        const fingerPrint = crypto
            .createHash('sha256')
            .update(path.join(os.homedir(), 'websocket.client'))
            .digest('hex');
        ws.on('open', () => {
            logger.info(
                chalk.bgBlue.white('[WebSocket Client]'),
                chalk.blue('已连接到服务端:'),
                chalk.bold(`${WS_SERVER_URL}`)
            );
            heartbeat();
        });

        ws.on('message', async (data: WebSocket.RawData) => {
            try {
                const msg = JSON.parse(data.toString());

                if (msg.type === 'challenge' && msg.challenge) {
                    if (WS_SECRET) {
                        logger.info(
                            chalk.bgCyan.black('[WebSocket Client]'),
                            chalk.cyan('收到 challenge，准备发送认证信息...')
                        );
                        const signature = keyHashData(WS_SECRET, msg.challenge);
                        ws.send(JSON.stringify({ type: 'auth', signature: signature, fingerPrint: fingerPrint }));
                    } else {
                        logger.warn(
                            chalk.bgYellow.black('[WebSocket Client]'),
                            chalk.yellow('收到 challenge，但未配置 ws_secret，跳过认证流程')
                        );
                        ws.send(JSON.stringify({ type: 'auth', signature: '', fingerPrint: fingerPrint }));
                    }
                    return;
                }
                if (msg.type === 'error' && msg.message) {
                    logger.error(
                        chalk.bgRed.white('[WebSocket Client]'),
                        chalk.red('认证失败:'),
                        chalk.yellow(msg.message),
                        chalk.red('请检查本地 ws_secret 配置是否与服务端一致。')
                    );
                    ws.close();
                    return;
                }
                if (msg.type === 'clientId' && msg.clientId) {
                    clientId = msg.clientId;
                    logger.info(
                        chalk.bgGreen.black('[WebSocket Client]'),
                        chalk.green('认证通过，分配到客户端Id:'),
                        chalk.bold(clientId)
                    );
                    return;
                }

                // 业务推送
                const { event, rawBody } = msg;
                if (!event || !rawBody) {
                    // 非业务消息，忽略
                    return;
                }
                logger.info(chalk.bgGreen.black('[WebSocket Client]'), chalk.green('收到消息:'), chalk.bold(event));
                const payload = JSON.parse(rawBody);
                const repo = payload.repository?.full_name;
                if (!repo) {
                    logger.warn(chalk.bgRed.white('[WebSocket Client]'), chalk.red('未找到仓库信息，忽略本次推送'));
                    return;
                }
                const message = formatGithubEvent(event, payload);
                if (!message) {
                    logger.info(chalk.bgGray.black('[WebSocket Client]'), chalk.gray('事件未生成消息，已忽略'));
                    return;
                }
                const subs = await SubscriptionService.getSubIdByRepo(repo);
                if (!subs || subs.length === 0) {
                    logger.info(
                        chalk.bgYellow.black('[WebSocket Client]'),
                        chalk.yellow('没有订阅该仓库，消息未发送：'),
                        chalk.gray(repo)
                    );
                    return;
                }
                for (const sub of subs) {
                    const subId = sub.id;
                    if (!SubscriptionService.isAllSubscriptionsEnabled(subs.filter(s => s.id === subId))) {
                        logger.info(
                            chalk.bgYellow.black('[WebSocket Client]'),
                            chalk.yellow('该聊天的推送已暂停，跳过发送：'),
                            `[${sub.poolType}] [${sub.chatId}]`,
                            chalk.gray(repo)
                        );
                        continue;
                    }
                    if (sub.status === SubscriptionStatus.Disabled) {
                        logger.info(
                            chalk.bgYellow.black('[WebSocket Client]'),
                            chalk.yellow('该编号仓库推送已暂停，跳过发送：'),
                            `[${sub.poolType}] [${sub.chatId}] [${subId}]`,
                            chalk.gray(repo)
                        );
                        continue;
                    }

                    logger.info(
                        chalk.bgGreen.black('[WebSocket Client]'),
                        chalk.green('发送消息:'),
                        chalk.bold(message),
                        chalk.green('from repo:'),
                        chalk.bold(repo)
                    );
                    await sendMessage(sub.poolType, sub.chatId, message);
                }
            } catch (e) {
                logger.error('[WebSocket Client] 消息处理异常:', e);
            }
        });

        ws.on('close', () => {
            logger.info(chalk.bgRed.white('[WebSocket Client]'), chalk.red('连接已关闭，5秒后重连...'));
            clearHeartbeat();
            reconnect();
        });

        ws.on('error', err => {
            logger.error(chalk.bgRed.white('[WebSocket Client]'), chalk.red('连接异常:'), err);
            ws?.close();
        });

        ws.on('pong', () => {
            logger.info(chalk.bgCyan.black('[WebSocket Client]'), chalk.cyan('收到webhook中转服务器心跳反馈'));
            heartbeat();
        });
    }

    function heartbeat() {
        clearHeartbeat();
        heartbeatTimer = setTimeout(() => {
            ws?.ping();
            heartbeat();
        }, 25000);
    }

    // 发送心跳包，保持连接
    function clearHeartbeat() {
        if (heartbeatTimer) clearTimeout(heartbeatTimer);
    }
    // 断线重连
    function reconnect() {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
            connectWS();
        }, 5000);
    }

    connectWS();
};
