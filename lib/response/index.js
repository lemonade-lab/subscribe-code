import { onSelects, useMessage, Text } from 'alemonjs';
import { platform as platform$1 } from '@alemonjs/discord';
import { platform as platform$2 } from '@alemonjs/kook';
import { platform } from '@alemonjs/onebot';

const selects = onSelects(['message.create', 'private.message.create']);
const vPlatform = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    const checkPlatform = (r) => [platform, platform$1, platform$2, 'testone'].includes(r);
    if (!checkPlatform(e.Platform)) {
        message.send(format(Text(`本仓库推送功能目前仅支持OneBot、Discord、Kook！${e.Platform}平台暂不支持`)));
        return;
    }
    return true;
});

export { vPlatform as default, selects };
