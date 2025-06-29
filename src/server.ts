import { getCodeConfig } from '@src/utils/config';
import { createWebhookServer } from './webhook';
import { connectWebsokcetServer } from './websocket';

/**
 * 启动入口，根据配置自动选择 webhook 或 websocket 中转模式
 */
const codeValue = getCodeConfig();
const wsSecret = codeValue.ws_secret || '';

if (!codeValue.ws_server_url) {
    // webhook模式
    const PORT = codeValue.webhook_port || 18666;
    const GITHUB_SECRET = codeValue.github_secret;
    if (!GITHUB_SECRET) {
        logger.error('未设置 GitHub Webhook Secret，请在配置中设置 github_secret，配置后重启。');
        logger.error('详情查看仓库主页：https://github.com/lemonade-lab/subscribe-code');
        process.exit(1); // 关键配置缺失时直接退出
    } else {
        createWebhookServer({
            port: PORT,
            githubSecret: GITHUB_SECRET,
            wsSecret: wsSecret // 可选
        });
    }
} else {
    // websocket中转模式
    const wsServerUrl = codeValue.ws_server_url || 'ws://127.0.0.1:18666';
    connectWebsokcetServer({
        wsServerUrl: wsServerUrl,
        wsSecret: wsSecret // 可选
    });
}
