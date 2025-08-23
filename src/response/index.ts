import { onSelects } from 'alemonjs';
export const selects = onSelects(['message.create', 'private.message.create']);
import { platform as discord } from '@alemonjs/discord';
import { platform as kook } from '@alemonjs/kook';
import { platform as onebot } from '@alemonjs/onebot';
import { Text, useMessage } from 'alemonjs';

const vPlatform = onResponse(selects, async e => {
    const [message] = useMessage(e);
    const checkPlatform = (r: string) => [onebot, discord, kook, 'testone'].includes(r);
    if (!checkPlatform(e.Platform)) {
        message.send(format(Text(`本仓库推送功能目前仅支持OneBot、Discord、Kook！${e.Platform}平台暂不支持`)));
        return;
    }
    return true;
});

export default vPlatform;
