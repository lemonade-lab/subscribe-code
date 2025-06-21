import { Text, useMessage } from 'alemonjs'
import { platform as onebot } from '@alemonjs/onebot'
import { selects } from '@src/apps/index'
export const regular = /^(!|！|\/)?移除/
export default onResponse(selects, async e => {
  const [message] = useMessage(e)
  if (e.Platform !== onebot) {
    message.send(format(Text('暂不支持')))
    return
  }
  // 群聊触发则，记录群聊。
  // 私聊触发则，记录用户。
  return
})
