import { getCodeConfig } from '@src/utils/config';
import { createWebhookServer } from './webhook';
import { connectWebsokcetServer } from './websocket';

const codeValue = getCodeConfig();
const serverMode = codeValue.server_mode || 'webhook'; // 默认模式为 webhook

const wsSecret = codeValue.ws_secret;
const wsServerUrl = codeValue.ws_server_url || 'ws://127.0.0.1:18555'; // 不需要路由

if (serverMode === 'webhook') {
    const PORT = codeValue.webhook_port || 18666;
    const GITHUB_SECRET = codeValue.github_secret;
    if (!GITHUB_SECRET) {
        logger.error({
            message: '未设置 GitHub Webhook Secret，请在配置中设置 github_secret',
            error: new Error('GitHub Webhook Secret is not set')
        });
    } else {
        createWebhookServer({
            port: PORT,
            githubSecret: GITHUB_SECRET,
            wsSecret: wsSecret
        });
    }
} else {
    connectWebsokcetServer({
        wsServerUrl: wsServerUrl,
        wsSecret: wsSecret
    });
}
