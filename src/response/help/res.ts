import vPlatform, { selects } from '@src/response/index';
import { Image, Text, useMessage } from 'alemonjs';
import Help from '@src/img/src/views/XHelp';
import { renderComponentToBuffer } from 'jsxp';
import config from './config.json';

export const regular = /^(!|！|\/)?code(s|u|m)?(-help|h|-h)$/;

const res = onResponse(selects, async e => {
  const [message] = useMessage(e);
  const pic = await renderComponentToBuffer('help/', Help, { data: config });

  if (pic) {
    void message.send(format(Image(pic)));
  } else {
    void message.send(format(Text('无法生成帮助图片，请稍后再试')));
  }
});

export default onResponse(selects, [vPlatform.current, res.current]);
