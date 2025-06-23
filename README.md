# AlemonJS Github Dynamic Bot

- Github动态机器人，可以自动推送Github仓库的动态到OneBot平台。

## 🚩运行环境：

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

## 一、🍄配置Github Webhook

> [!IMPORTANT]
> 需后文bot指令订阅github仓库配合使用。

- 进入Github仓库，点击`Settings` -> `Webhooks` -> `Add webhook`

- Payload URL：`http://你的机器人地址:端口/github/webhook`

- Content type：`application/json`

- Secret：填写自动生成保存在`alemon.config.yaml`中的`github_secret`值

- 按需选择推送事件：

    - Just the push event.
    - Send me everything.
    - Let me select individual events.

- 暂未实现SSL verification：

    - [√] disable SSL verification

- 点击`Add webhook`

## 二、🚀配置启动bot

文档： [https://alemonjs.com/](https://alemonjs.com/)

Bot本体根目录新建文件`alemomn.config.yaml`：

```yaml
# 配置Github Webhook Secret
github_secret: '' # Github Webhook Secret，第一次启动将自动生成并保存到配置文件，也可手动自定义为任意字符串
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

- 运行

```sh
# 启动机器人
yarn dev --login onebot # 启动OneBot机器人
```

## 三、🎒订阅githu仓库

> [!IMPORTANT]
> 需与配置Github Webhook部分配合使用。

- 启动bot后，在群聊/私聊中发送`订阅`指令，机器人会回复`订阅成功`即为成功订阅。

- 指令列表：

| 用途               | 描述                              | 指令                                        |
| ------------------ | --------------------------------- | ------------------------------------------- |
|                    |                                   |                                             |
| 订阅Github代码仓库 | 订阅Github仓库动态                | !订阅github仓库github.com/username/reponame |
| 查看订阅列表       | 查看当前已订阅的Github仓库        | !仓库列表                                   |
| 查看全部订阅列表   | 查看当前已订阅的全部Github仓库    | !仓库全部列表                               |
| 删除订阅           | 删除已订阅的Github仓库            | !删除仓库github.com/username/reponame       |
| 开启推送           | 开启本群聊/私聊Github仓库动态推送 | !开启仓库订阅服务                           |
| 关闭推送           | 关闭本群聊/私聊Github仓库动态推送 | !关闭仓库订阅服务                           |

## 开发

开发文档 [https://lvyjs.dev/ ](https://lvyjs.dev/)

使用文档 [https://alemonjs.com/](https://alemonjs.com/)

### 开发指南

[README_DEV](./README_DEV.md)

```sh
yarn dev --login gui # 启动vscode gui开发机器人
```
