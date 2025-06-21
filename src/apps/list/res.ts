import { Text, useMessage } from 'alemonjs'
import { platform as onebot } from '@alemonjs/onebot'
import { selects } from '@src/apps/index'
export const regular = /^(!|！|\/)?仓库列表/
export default onResponse(selects, async e => {
  const [message] = useMessage(e)
  if (e.Platform !== onebot) {
    message.send(format(Text('暂不支持')))
    return
  }
  //
  return
})
