import vPlatform, { selects } from '../index.js';
import { useMessage, Image, Text } from 'alemonjs';
import Help from '../../img/src/views/XHelp.js';
import { renderComponentToBuffer } from 'jsxp';
import config from './config.json.js';

const regular = /^(!|！|\/)?code(s|u|m)?(-help|h|-h)$/;
const res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    const pic = await renderComponentToBuffer('help/', Help, { data: config });
    if (pic) {
        void message.send(format(Image(pic)));
    }
    else {
        void message.send(format(Text('无法生成帮助图片，请稍后再试')));
    }
});
var res$1 = onResponse(selects, [vPlatform.current, res.current]);

export { res$1 as default, regular };
