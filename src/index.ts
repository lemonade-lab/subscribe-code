import { ensureDefaultConfig } from '@src/utils/config';

// 启动时补全默认配置
ensureDefaultConfig();

export default defineChildren({
    async onCreated() {
        import('./wsServer').catch(err => {
            logger.error({
                message: 'wsServer启动失败',
                error: err
            });
        });
    }
});
