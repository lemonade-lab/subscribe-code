export default defineChildren({
    async onCreated() {
        process.env.ALEMONJS_CODE_MODE = 'bot';
        /**
         * app 的 环境变量命名约定
         * ALEMONJS_[appName]_[key] = value
         */
        await import('./server.js').catch(err => {
            logger.error({
                message: 'code 机器人启动失败',
                error: err
            });
        });
    }
});
