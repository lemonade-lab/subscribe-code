import { configValue, updateConfig, ensureDefaultConfig } from '@src/utils/config';
import chalk from 'chalk';

// 启动时自动补全配置项
ensureDefaultConfig();

let SERVER_MODE = configValue?.['alemonjs-code']?.server_mode;
if (!SERVER_MODE) {
    SERVER_MODE = 'webhook'; // 默认模式为 webhook
    await updateConfig('alemonjs-code', {
        server_mode: `${SERVER_MODE} #本地监听github webhook模式：webhook；作为客户端使用中转服务模式：wsClient`
    });
    console.log(
        chalk.bgYellow.black('[Code Server]'),
        chalk.yellow('未设置server_mode，已自动设置为本机监听github webhook模式')
    );
} else {
    console.log(chalk.bgGreen.black('[Code Server]'), chalk.green('已读取server_mode'), chalk.yellow(SERVER_MODE));
}
export default defineChildren({
    async onCreated() {
        import(`./${SERVER_MODE}`).catch(err => {
            logger.error({
                message: 'code 机器人启动失败',
                error: err
            });
        });
    }
});
