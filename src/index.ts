import chalk from 'chalk';
import { alemonjsCodeVersion } from '@src/utils/config';
export default defineChildren({
    async onCreated() {
        /**
         * app 的 环境变量命名约定
         * ALEMONJS_[appName]_[key] = value
         */
        await import('./server.client.switch')
            .then(() => {
                logger.info(chalk.rgb(0, 190, 255)(`-----------------------------------------`));
                logger.info(chalk.rgb(255, 225, 255)(`github动态订阅bot初始化~`));
                logger.info(chalk.rgb(255, 245, 255)(`作者：snowtafir, ningmengchongshui`));
                logger.info(chalk.rgb(255, 225, 255)(`仓库地址：`));
                logger.info(chalk.rgb(255, 245, 255)(`https://github.com/lemonade-lab/subscribe-code`));
                logger.info(chalk.rgb(255, 225, 255)(`版本号：${alemonjsCodeVersion}`));
                logger.info(chalk.rgb(0, 190, 255)(`-----------------------------------------`));
            })
            .catch(err => {
                logger.error({
                    message: 'github动态订阅机器人启动失败',
                    error: err
                });
            });
    }
});
