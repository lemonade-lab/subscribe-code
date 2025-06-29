import { getCodeConfig } from './utils/config.js';
import { createWebhookServer } from './webhook.js';
import { connectWebsokcetServer } from './websocket.js';

const codeValue = getCodeConfig();
const wsSecret = codeValue.ws_secret;
if (!codeValue.ws_server_url) {
    const PORT = codeValue.webhook_port || 18666;
    const GITHUB_SECRET = codeValue.github_secret;
    if (!GITHUB_SECRET) {
        logger.error({
            message: '未设置 GitHub Webhook Secret，请在配置中设置 github_secret',
            error: new Error('GitHub Webhook Secret is not set')
        });
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
    const wsServerUrl = codeValue.ws_server_url || 'ws://127.0.0.1:18555';
    connectWebsokcetServer({
        wsServerUrl: wsServerUrl,
        wsSecret: wsSecret
    });
}
