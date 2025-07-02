import chalk from 'chalk';

var index = defineChildren({
    async onCreated() {
        process.env.ALEMONJS_CODE_MODE = 'bot';
        await import('./server.client.switch.js').catch(err => {
            logger.error({
                message: 'github动态订阅机器人启动失败',
                error: err
            });
        });
        logger.info(chalk.rgb(0, 190, 255)(`-----------------------------------------`));
        logger.info(chalk.rgb(255, 225, 255)(`github动态订阅bot初始化~`));
        logger.info(chalk.rgb(255, 245, 255)(`作者：snowtafir, ningmengchongshui`));
        logger.info(chalk.rgb(255, 225, 255)(`仓库地址：`));
        logger.info(chalk.rgb(255, 245, 255)(`https://github.com/lemonade-lab/subscribe-code`));
        logger.info(chalk.rgb(0, 190, 255)(`-----------------------------------------`));
    }
});

export { index as default };
