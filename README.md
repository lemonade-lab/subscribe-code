# AlemonJS Github Dynamic Bot

必要环境 `nodejs` 、`redis` 、`chrome`

该扩展推荐使用`alemongo`作为生产环境

https://github.com/lemonade-lab/alemongo

## 安装

### alemongo

- 唤醒

`/codeh`

地址

```sh
https://github.com/lemonade-lab/subscribe-code.git
```

分支

```sh
release
```

### 本地模板

```sh
git clone --depth=1 -b release  https://github.com/lemonade-lab/subscribe-code.git ./packages/subscribe-code
```

## ⭐Github Webhook

### 一、🍄配置Github Webhook

> [!IMPORTANT]
> 需后文bot指令订阅github仓库配合使用。

- 进入Github仓库，点击`Settings` -> `Webhooks` -> `Add webhook`

- Payload URL： `http://[ip]:18110/apps/alemonjs-code/api/github/webhook`

- Content type：`application/json`

- Secret：`subscribe-code`(可自定义)

- 按需选择推送事件：
  - Just the push event.
  - Send me everything.
  - Let me select individual events.

- 暂未实现SSL verification：
  - [√] disable SSL verification

- 点击`Add webhook`

### 二、🚀配置启动bot

文档： [https://alemonjs.com/](https://alemonjs.com/)

根目录新建文件`alemomn.config.yaml`：

```yaml
serverPort: 18110 # 记得配置应用端口号
master_id:
  '123456': true # 主人权限, 消息显示的的UserId
onebot:
  url: '' # 正向url
  token: '' # access_token
```

- Redis

将以默认配置连接本地redis,

如需调整，请阅读[@alemonjs/db](https://www.npmjs.com/package/@alemonjs/db)配置连接,

如需使用docker请参考[docker-compose.yml](./docker-compose.yml)

```sh
# 启动
docker-compose up -d
```

```sh
# 关闭
docker-compose down
```

### 三、🎒订阅githu仓库

> [!IMPORTANT]
> 当前仅支持运行在onebot协议
> 需与配置Github Webhook部分配合使用。

- 启动bot后，在群聊/私聊中发送指令 `/codeh` `/code-help`

### 四、🎈连接说明

在具有公网IP的服务器上，接收来自github webhook消息。

- 配置文件`alemomn.config.yaml`

```yaml
alemonjs-code:
  github_secret: 'subscribe-code' # 需Github Webhook配置时填写的一致
  # 以下配置已废弃，新版本不需要独立启动服务器
  webhook_port: 18666 # Github Webhook服务端口
  ws_secret: 'subscribe-ws' # 密钥（选填，仅启服务器，不启机器人时可配）
```

- 启动服务器和机器人

```sh
yarn dev --login onebot
# release 版
yarn app --login onebot
```

## ☀️阿柠檬机器人错误上报

### 一、设置token

- 进入要启用的聊天发送指令`/codeu alert add`
- 机器人会私聊返回一个`token`，复制并保存。或查看配置文件`alert_token`项。

### 二、机器人POST错误上报

机器人开发获取报错信息并按照如下新增POST请求即可。

POST请求 URL： `http://[ip]:18110/apps/alemonjs-code/api/alert/warning`

请求头header：

```yaml
"content-type": "application/json",
"x-warning-report-token": "12位token字符串"
```

请求body(POST) -> JSON：

```json
{
  "title": "标题",
  "message": "错误信息",
  "level": "error",
  "timestamp": "时间戳"
}
```

<details><summary>伪代码示例，点击展开</summary>

```js
// 定义请求的 URL 和 token
const postUrl = 'http://[ip]:18110/apps/alemonjs-code/api/alert/warning';
const token = '你的12位token字符串'; // 替换为实际 token

// 定义错误信息内容
const payload = {
  title: '标题',
  message: '错误信息',
  level: 'error',
  timestamp: new Date().toISOString() // 当前时间戳
};

// 发送 POST 请求
fetch(postUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-warning-report-token': token
  },
  body: JSON.stringify(payload)
})
  .then(response => {
    if (response.ok) {
      console.log('错误报告发送成功');
    } else {
      console.error('发送失败，状态码:', response.status);
    }
  })
  .catch(error => {
    console.error('请求出错:', error);
  });
```

</details>

## ☀️Github Actions

### 一、设置Github Actions

- 登录Github，`个人设置` > `Developer settings` > `Personal access tokens` > `Generate new token`

- 勾选`repo`权限，点击`Generate token`

- 复制生成的`token`并保存，后续配置使用。

### 二、编辑workflows文件

编辑仓库分支路径`.github/workflows/`下的工作流文件，新增`workflow_dispatch`项：

[workflow_dispatch设置官方说明](https://docs.github.com/cn/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch)

```yaml
on:
  workflow_dispatch:
```

### 三、开发小助手发送指令

- 机器人发送指令：`/codem -ga add <用户名/仓库名> : <分支名> : <workflow文件名> : <token>`。具体参数查看仓库获取。

更多指令发送：`/code -h` 查看
