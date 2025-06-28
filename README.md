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
alemonjs-code:
    # 配置Github Webhook Secret
    github_secret: '' # Github Webhook Secret，第一次启动将自动生成并保存到配置文件，也可手动自定义为任意字符串
    server_mode: webhook # 运行模式，本地接收github webhook推送模式需配置Github Webhook，中转wsClient模式看下文
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

## 四、🎈中转推送

1. 部署中转服务，Github Webhook的推送数据到部署于公网的中转服务，中转服务再通过ws链接转发到本地推送客户端。

```sh
git clone -b wss https://github.com/lemonade-lab/subscribe-code.git ./subscribe-code-wss
cd subscribe-code-wss
yarn install
yarn dev # 启动中转服务，首次将自动生成配置文件alemomn.config.yaml
```

- 修改中转服务配置文件`alemomn.config.yaml`：

```yaml
alemonjs-code-wss:
    ws_secret: xxxxx # 中转服务自动生成的ws_secret，需与客户端配置文件一致
    ws_server_port: 18555 # 中转服务端口，需与客户端配置文件url的端口一致
    github_secret: xxxxx # 将自动生成并保存到配置文件，与Github Webhook配置时填写的一致
    webhook_port: 18666 # Github Webhook服务端口，与Github Webhook的url时填写的一致
```

Ctrl+C 退出服务，再次启动：

```sh
yarn dev
```

2. 配置本地客户端配置文件`alemomn.config.yaml`：

```yaml
alemonjs-code:
    server_mode: wsClient
    ws_secret: xxxxxx # 复制中转服务配置文件的ws_secret，需与中转服务配置文件一致
    ws_server_url: ws://127.0.0.1:18555/ws-client # 中转服务地址，替换为实际中转服务（内网/公网）地址
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
