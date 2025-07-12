import { getCodeConfig, setCodeConfig } from './models/config.js';
import { WebhookWebsocketServer } from './webhook.websocket.server.js';
import { WebsokcetClient } from './websocket.client.js';
import chalk from 'chalk';
import crypto from 'crypto';

const config = getCodeConfig();
const WS_SECRET = config?.ws_secret || '';
const WS_SERVER_URL = config?.ws_server_url;
if (!WS_SERVER_URL) {
    const PORT = config.webhook_port || 18666;
    let GITHUB_SECRET = config.github_secret;
    if (!GITHUB_SECRET) {
        const randomBytes = crypto.randomBytes(12).toString('hex');
        logger.warn(`未配置 GitHub Webhook Secret，已自动生成随机密钥: ${randomBytes}`);
        logger.warn(`请确保 GitHub 官网仓库的 Webhook 配置中设置的 Secret 与本项目的配置中的相同Secret相同，否则无法接收到来自 GitHub 的 Webhook 事件。`);
        GITHUB_SECRET = randomBytes;
        setCodeConfig('github_secret', GITHUB_SECRET);
    }
    logger.info(chalk.rgb(0, 190, 255)(`未配置 ws_server_url，webhook server本地模式 + websocket Server 模式开始加载`));
    WebhookWebsocketServer({
        port: PORT,
        githubSecret: GITHUB_SECRET,
        wsSecret: WS_SECRET
    });
    logger.info(chalk.rgb(0, 190, 255)(`★ webhook server本地模式 + websocket Server 模式加载完成~`));
}
else if (WS_SERVER_URL.startsWith('ws://')) {
    WebsokcetClient({
        wsServerUrl: WS_SERVER_URL,
        wsSecret: WS_SECRET
    });
    logger.info(chalk.rgb(0, 190, 255)(`★ websocket Client 模式加载完成~`));
}
else if (!WS_SERVER_URL.startsWith('ws://')) {
    logger.error('ws_server_url 配置错误，正确示例：ws://127.0.0.1:18666');
    process.exit(1);
}
else {
    logger.error('运行模式设置错误：');
    logger.error('不配置 ws_server_url： webhook server本地模式 + websocket Server 模式。');
    logger.error('配  置 ws_server_url： websocket Client 中转模式。');
    process.exit(1);
}
