import { formatGithubEvent } from '@src/models/github.make.msg';
import { sendMessage } from '@src/models/github.push.api';
import { genSubId, getSubscriptionsByRepo } from '@src/models/github.sub.data';
import { isPaused, isPausedById } from '@src/models/github.sub.status';
import chalk from 'chalk';
import WebSocket from 'ws';
import { getExpected } from './utils/config';

/**
 * 连接 WebSocket 服务器（中转模式，ws_secret 可选）
 * @param options.wsServerUrl WebSocket服务器地址
 * @param options.wsSecret    认证密钥（可选，建议生产环境设置）
 */
export const connectWebsokcetServer = async (options: { wsServerUrl?: string; wsSecret?: string }) => {
    const { wsServerUrl: WS_SERVER_URL, wsSecret: WS_SECRET } = options;

    let ws: WebSocket | null = null;
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let clientId: string | null = null;

    function connectWS() {
        if (!WS_SERVER_URL) {
            logger.error('[WebSocket Client] wsServerUrl 未配置，无法连接');
            return;
        }
        ws = new WebSocket(WS_SERVER_URL);

        logger.info(
            chalk.bgYellow.black('[webSocket Client]'),
            chalk.yellow('客户端已启动:'),
            chalk.bold(`${WS_SERVER_URL}`)
        );

        ws.on('open', () => {
            logger.info('[WebSocket Client] 连接成功', { url: WS_SERVER_URL });
            heartbeat();
        });

        ws.on('message', async (data: WebSocket.RawData) => {
            try {
                const msg = JSON.parse(data.toString());

                // 认证流程：服务端配置了 wsSecret 并下发非空challenge，客户端需同步配置 WS_SECRET 进行认证
                if (msg.type === 'challenge' && msg.challenge) {
                    if (WS_SECRET) {
                        logger.info(
                            chalk.bgCyan.black('[WebSocket Client]'),
                            chalk.cyan('收到 challenge，准备发送认证信息...')
                        );
                        const signature = getExpected(WS_SECRET, msg.challenge);
                        ws.send(JSON.stringify({ type: 'auth', signature }));
                    } else {
                        logger.warn(
                            chalk.bgYellow.black('[WebSocket Client]'),
                            chalk.yellow('收到 challenge，但未配置 ws_secret，跳过认证流程')
                        );
                        // 直接发送空认证或忽略
                        ws.send(JSON.stringify({ type: 'auth', signature: '' }));
                    }
                    return;
                }

                // 认证失败
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

                // 认证成功，分配 clientId
                if (msg.type === 'clientId' && msg.clientId) {
                    clientId = msg.clientId;
                    logger.info(
                        chalk.bgGreen.black('[WebSocket Client]'),
                        chalk.green('认证通过，分配到客户端Id:'),
                        chalk.bold(clientId)
                    );
                    return;
                }

                // 业务推送消息
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
                const subs = await getSubscriptionsByRepo(repo);
                if (!subs || subs.length === 0) {
                    logger.info(
                        chalk.bgYellow.black('[WebSocket Client]'),
                        chalk.yellow('没有订阅该仓库，消息未发送：'),
                        chalk.gray(repo)
                    );
                    return;
                }
                for (const sub of subs) {
                    const subId = genSubId(sub.chatType, sub.chatId, repo);
                    if (await isPaused(sub.chatType, sub.chatId)) {
                        logger.info(
                            chalk.bgYellow.black('[WebSocket Client]'),
                            chalk.yellow('该聊天的推送已暂停，跳过发送：'),
                            `[${sub.chatType}] [${sub.chatId}]`,
                            chalk.gray(repo)
                        );
                        continue;
                    }
                    if (await isPausedById(subId)) {
                        logger.info(
                            chalk.bgYellow.black('[WebSocket Client]'),
                            chalk.yellow('该编号仓库推送已暂停，跳过发送：'),
                            `[${sub.chatType}] [${sub.chatId}] [${subId}]`,
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
                    await sendMessage(sub.chatType, sub.chatId, message);
                }
            } catch (e) {
                logger.error(chalk.bgRed.white('[WebSocket Client]'), chalk.red('消息处理异常:'), e);
            }
        });

        ws.on('close', err => {
            logger.warn(chalk.bgRed.white('[WebSocket Client]'), chalk.red('连接已关闭，错误信息:'), err);
            logger.info(chalk.bgRed.white('[WebSocket Client]'), chalk.red('连接已关闭，5秒后重连...'));
            clearHeartbeat();
            reconnect();
        });

        ws.on('error', err => {
            logger.error(chalk.bgRed.white('[WebSocket Client]'), chalk.red('连接异常:'), err);
            ws?.close();
        });

        ws.on('pong', () => {
            logger.debug(chalk.bgCyan.black('[WebSocket Client]'), chalk.cyan('收到webhook中转服务器心跳反馈'));
            heartbeat();
        });
    }

    // 发送心跳包，保持连接
    function heartbeat() {
        clearHeartbeat();
        heartbeatTimer = setTimeout(() => {
            ws?.ping();
            logger.debug(chalk.bgCyan.black('[WebSocket Client]'), chalk.cyan('已发送心跳到webhook中转服务器'));
            heartbeat();
        }, 25000);
    }

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
