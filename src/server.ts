import Koa from 'koa'
import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'
import { sendToChannel } from 'alemonjs'
import { Text } from 'alemonjs'
import { readFileSync } from 'fs'

const FilePath = './data/list.json'

const getFileData = async (filePath: string) => {
  try {
    const data = readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error(`Error reading file at ${filePath}:`, error)
    return []
  }
}

const app = new Koa()
const router = new Router()
// Middleware to parse JSON bodies
app.use(bodyParser())
// Example route
router.post('/github', async ctx => {
  const data = await getFileData(FilePath)

  const url = ctx.request.body.url

  // 目标仓库
  const cur = data.find(item => item.url === url)

  if (cur.chnnel_id) {
    sendToChannel(cur.chnnel_id, format(Text('xxx 仓库消息')))
  } else if (cur.user_id) {
    sendToChannel(cur.user_id, format(Text('xxx 仓库消息')))
  }
})
// Add the router to the app
app.use(router.routes()).use(router.allowedMethods())
// Start the server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
