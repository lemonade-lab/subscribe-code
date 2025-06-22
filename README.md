# AlemonJS Github Dynamic Bot

- 一个 `AlemonJS 机器人框架` 的Github动态机器人，可以自动推送Github仓库的动态到QQ、OneBot平台。

- 支持 群聊/私聊

# 🚩运行环境：

- node v22+ 下载地址：https://nodejs.org/zh-cn/download/

- Redis 下载地址：https://redis.io/download

```sh
# Ubuntu安装示例
# 安装redis
sudo apt-get install redis-server
# 启动redis
sudo systemctl start redis
#开机自启
sudo systemctl enable redis
```

# 一、🍄配置Github Webhook

> [!IMPORTANT]
> 需后文bot指令订阅github仓库配合使用。

- 进入Github仓库，点击`Settings` -> `Webhooks` -> `Add webhook`

- Payload URL：`http://你的机器人地址:端口/github/webhook`

- Content type：`application/json`

- Secret：填写你在`alemon.config.yaml`中配置的`github_secret`

- 按需选择推送事件：

    - Just the push event.
    - Send me everything.
    - Let me select individual events.

- 暂未实现SSL verification：

    - [√] disable SSL verification

- 点击`Add webhook`

# 二、🚀配置启动bot

文档： [https://alemonjs.com/](https://alemonjs.com/)

Bot本体根目录新建文件`alemomn.config.yaml`：

```yaml
# 配置Github Webhook Secret
github_secret: 'alemonjs-github-sub-secret' # Github Webhook Secret，默认设置为'alemonjs-github-sub-secret'
```

- OneBot

```yaml
onebot:
    url: '' # 正向url
    token: '' # access_token
    # 启用反向ws连接作为服务端
    reverse_enable: false # 启用后正向连接配置失效，启用地址：ws://127.0.0.1:17158
    reverse_port: 17158 # 返向连接服务端口，启用反向连接后生效
    master_key: null # 主人id, 消息显示的的UserKey
```

```sh
yarn dev --login onebot # 启动OneBot开发机器人
```

- QQ

```sh
yarn add @alemonjs/qq
```

> vlyjs 环境下登录时请增加参数 --no-watch 以关闭热重启

- alemon.config.yaml

```yaml
qq:
  # 账户
  qq: ''
  # 密码
  password: ''
  # 设备 1:安卓手机、 2:aPad 、 3:安卓手表、 4:MacOS 、 5:iPad 、 6:Tim
  device: ''
  # 签名
  sign_api_addr: ''
  # 版本
  ver: ''
  # 主人[platform:qq]哈希
  master_key:
    - ""
  # 日志等级，默认info
  log_level: 'info',
  # 群聊和频道中过滤自己的消息
  ignore_self: true,
  # 被风控时是否尝试用分片发送
  resend: true,
  # 触发`system.offline.network`事件后的重新登录间隔秒数
  reconn_interval: 5,
  # 是否缓存群员列表
  cache_group_member: true,
  # ffmepg路径
  ffmpeg_path: '',
  ffprobe_path: ''
```

```sh
yarn dev --login qq # 启动QQ开发机器人
```

# 运行

```sh
# 启动机器人
yarn dev --login onebot # 启动OneBot机器人
# 或者
yarn dev --login qq # 启动QQ机器人
```

# 三、🎒订阅githu仓库

> [!IMPORTANT]
> 需与配置Github Webhook部分配合使用。

- 启动bot后，在群聊/私聊中发送`订阅`指令，机器人会回复`订阅成功`即为成功订阅。

- 指令列表：

| 用途               | 描述                              | 指令                                        |
| ------------------ | --------------------------------- | ------------------------------------------- |
|                    |                                   |                                             |
| 订阅Github代码仓库 | 订阅Github仓库动态                | !订阅github仓库github.com/username/reponame |
| 查看订阅列表       | 查看当前已订阅的Github仓库        | !仓库列表                                   |
| 删除订阅           | 删除已订阅的Github仓库            | !删除仓库github.com/username/reponame       |
| 开启推送           | 开启本群聊/私聊Github仓库动态推送 | !开启仓库订阅服务                           |
| 关闭推送           | 关闭本群聊/私聊Github仓库动态推送 | !关闭仓库订阅服务                           |

# 开发

开发文档 [https://lvyjs.dev/ ](https://lvyjs.dev/)

使用文档 [https://alemonjs.com/](https://alemonjs.com/)

## 开发指南

[README_DEV](./README_DEV.md)

```sh
yarn dev --login gui # 启动vscode gui开发机器人
```
