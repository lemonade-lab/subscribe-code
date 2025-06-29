import { getCodeConfig } from './utils/config.js';
import { createWebhookServer } from './webhook.js';
import { connectWebsokcetServer } from './websocket.js';

const codeValue = getCodeConfig();
const wsSecret = codeValue.ws_secret || '';
if (!codeValue.ws_server_url) {
    const PORT = codeValue.webhook_port || 18666;
    const GITHUB_SECRET = codeValue.github_secret;
    if (!GITHUB_SECRET) {
        logger.error('未设置 GitHub Webhook Secret，请在配置中设置 github_secret，配置后重启。');
        logger.error('详情查看仓库主页：https://github.com/lemonade-lab/subscribe-code');
        process.exit(1);
    }
    else {
        createWebhookServer({
            port: PORT,
            githubSecret: GITHUB_SECRET,
            wsSecret: wsSecret
        });
    }
}
else {
    const wsServerUrl = codeValue.ws_server_url || 'ws://127.0.0.1:18666';
    connectWebsokcetServer({
        wsServerUrl: wsServerUrl,
        wsSecret: wsSecret
    });
}
