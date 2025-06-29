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

根目录新建文件`alemomn.config.yaml`：

```yaml
onebot:
    url: '' # 正向url
    token: '' # access_token
    master_key: null # 主人id, 消息显示的的UserKey
alemonjs-code:
    # 配置Github Webhook Secret
    github_secret: '' # Github Webhook Secret，需与Github Webhook配置时填写的一致
```

> redis 使用默认配置，若修改，请阅读文档

- 运行

```sh
# 启动机器人
yarn dev --login onebot
```

## 三、🎒订阅githu仓库

> [!IMPORTANT]
> 当前仅仅支持运行在onebot协议
> 需与配置Github Webhook部分配合使用。

- 启动bot后，在群聊/私聊中发送`订阅`指令，机器人会回复`订阅成功`即为成功订阅。

- 指令列表：

| 用途                   | 描述                                                                                                     | 指令                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 订阅Github代码仓库     | 订阅Github仓库动态，权限owner/admin                                                                      | `!订阅仓库github.com/username/reponame`                      |
| 删除订阅的仓库         | 删除已订阅的Github仓库，权限owner/admin                                                                  | `!删除仓库github.com/username/reponame`                      |
| 删除某编号的仓库       | 删除已订阅的某编号的Github仓库，可跨群聊使用，编号可通过`!仓库列表` `!仓库全部列表`查看，权限owner/admin | `!删除编号仓库xxxxx`                                         |
| 查看订阅列表           | 查看当前已订阅的Github仓库                                                                               | `!仓库列表`                                                  |
| 查看全部订阅列表       | 查看当前已订阅的全部Github仓库，权限owner/admin                                                          | `!仓库全部列表`                                              |
| 检查某个仓库的订阅状态 | 查看某个Github仓库是否已订阅，权限owner/admin                                                            | `!检查仓库github.com/username/reponame`                      |
| 开启本聊天的全部推送   | 开启本群聊的Github仓库动态推送，权限owner/admin                                                          | `!开启仓库推送`                                              |
| 关闭本聊天的全部推送   | 关闭本群聊的Github仓库动态推送，权限owner/admin                                                          | `!关闭仓库推送`                                              |
| 开启某个仓库推送       | 启用某个已订阅的Github仓库动态推送，编号可通过`!仓库列表`查看，权限owner/admin                           | `!开启编号仓库xxxxx`                                         |
| 关闭某个仓库推送       | 关闭某个已订阅的Github仓库动态推送，编号可通过`!仓库列表`查看，权限owner/admin                           | `!关闭编号仓库xxxxxx`                                        |
| 添加仓库订阅管理员     | 添加某个群聊成员为Github仓库订阅管理员，权限owner，userKey可通过后台成员消息日志查看                     | `!新增仓库订阅管理员 @user` 或 `!新增仓库订阅管理员 userKey` |
| 删除仓库订阅管理员     | 从管理员列表删除某个仓库订阅管理员，权限owner，userKey可通过后台成员消息日志查看                         | `!删除仓库订阅管理员 @user` 或 `!删除仓库订阅管理员 userKey` |

## 四、🎈连接说明

提供了2种方式订阅github仓库

### 1. webhook

直接在具有公网IP的服务器上，接收来自github webhook消息。

> 这是机器人的默认模式。

- 配置文件`alemomn.config.yaml`：

```yaml
alemonjs-code:
    github_secret: xxxxx # 需Github Webhook配置时填写的一致
    webhook_port: 18666 # Github Webhook服务端口，与Github Webhook的url时填写的一致
    ws_secret: '' # 密钥（选填）
```

- 启动服务器和机器人

```sh
yarn dev --login onebot
```

- 仅启服务器，不启机器人

用来当作webscoket的服务器时

```sh
yarn dev --server
```

### 2. websocket

使用ws协议，连接公网IP的服务器，让不具备公网IP的设备具有消息接收能力。

- 配置文件`alemomn.config.yaml`：

```yaml
alemonjs-code:
    # 该配置为非空时，将启动ws连接使用中转模式
    ws_server_url: ws://127.0.0.1:18666 # 连接地址 （端口要和服务上的一致）
```

```sh
yarn dev --login onebot # 启动OneBot机器人
```

## 开发

开发文档 [https://lvyjs.dev/ ](https://lvyjs.dev/)

使用文档 [https://alemonjs.com/](https://alemonjs.com/)

### 开发指南

[README_DEV](./README_DEV.md)

```sh
yarn dev --login gui # 启动vscode gui开发机器人
```
