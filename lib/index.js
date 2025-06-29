var index = defineChildren({
    async onCreated() {
        process.env.ALEMONJS_CODE_MODE = 'bot';
        await import('./server.js').catch(err => {
            logger.error({
                message: 'code 机器人启动失败',
                error: err
            });
        });
    }
});

export { index as default };
