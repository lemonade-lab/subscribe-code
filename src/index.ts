export default defineChildren({
    async onCreated() {
        import('./server').catch(err => {
            logger.error({
                message: 'code 机器人启动失败',
                error: err
            });
        });
    }
});
