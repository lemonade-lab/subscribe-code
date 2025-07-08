# AlemonJS Github Dynamic Bot

- 仓库动态机器人，可以自动推送Github仓库的动态到OneBot平台。

## 🚩运行环境：

- node v22+ 下载地址：https://nodejs.org/zh-cn/download/

- Redis 6+ 下载地址：https://redis.io/download

- 安装chrome或chromium浏览器，其他浏览器可能存在兼容性问题。

1. chrome 浏览器 v131+ win_x64下载地址：https://www.google.cn/chrome/
2. chromium 浏览器 v128+ Linux/win手动下载安装：https://download-chromium.appspot.com

> 示例linux命令行安装chromiun浏览器：

```sh
sudo apt-get install chromium-browser # Ubuntu/Debian
sudo dnf install chromium # Fedora
sudo yum install chromium # CentOS Stream 8
```

## 拉取仓库

```sh
git clone https://github.com/lemonade-lab/subscribe-code.git
```

```sh
# release 版
git clone -b release https://github.com/lemonade-lab/subscribe-code.git
```

## 一、🍄配置Github Webhook

> [!IMPORTANT]
> 需后文bot指令订阅github仓库配合使用。

- 进入Github仓库，点击`Settings` -> `Webhooks` -> `Add webhook`

- Payload URL：`http://[ip]:[port]/github/webhook`

- Content type：`application/json`

- Secret：`subscribe-code`(可自定义)

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
    github_secret: 'subscribe-code' # Github Webhook Secret，需与Github Webhook配置时填写的一致
```

> redis 使用默认配置，若修改，请阅读文档 @alemonjs/db

- 运行

```sh
# 启动机器人
yarn dev --login onebot
# release 版
yarn app --login onebot
```

## 三、🎒订阅githu仓库

> [!IMPORTANT]
> 当前仅仅支持运行在onebot协议
> 需与配置Github Webhook部分配合使用。

- 启动bot后，在群聊/私聊中发送指令

### 指令权限说明

| 操作类型     | 主人 | 全局管理员 | 管理员 | 白名单用户 | 普通用户 |
| ------------ | ---- | ---------- | ------ | ---------- | -------- |
| 仓库池管理   | ✓    | ✓          | ✓      | ✗          | ✗        |
| 群组订阅管理 | ✓    | ✓          | ✓      | ✗          | ✗        |
| 跨群组管理   | ✓    | ✓          | ✗      | ✗          | ✗        |
| 查看群组订阅 | ✓    | ✓          | ✓      | ✓          | ✓        |
| 私人订阅管理 | ✗    | ✗          | ✗      | ✓ (仅自己) | ✗        |
| 权限管理     | ✓    | ✗          | ✗      | ✗          | ✗        |
| 查看自身权限 | ✓    | ✓          | ✓      | ✓          | ✓        |

### 指令列表

- 向聊天机器人发送`!仓库帮助`即可查看

| 用途                 | 权限要求           | 指令示例                                   | 说明                                 |
| -------------------- | ------------------ | ------------------------------------------ | ------------------------------------ |
| **公共指令**         |                    |                                            |                                      |
| 查看当前仓库列表     | 所有人             | `!仓库列表`                                | 查看当前聊天订阅                     |
| 查看自身权限         | 所有人             | `!我的仓库权限`                            | 查看自身权限                         |
| 检查仓库订阅状态     | 所有人             | `!检查仓库 github.com/username/repo`       | 检查仓库是否已订阅                   |
| 获取帮助             | 所有人             | `!仓库帮助`                                | 显示指令帮助                         |
| **私人订阅管理**     |                    |                                            |                                      |
| 添加私人订阅         | 白名单用户(仅自己) | `!订阅本聊天仓库 github.com/username/repo` | 仅限私聊使用                         |
| 删除私人订阅         | 白名单用户(仅自己) | `!删除本聊天仓库 github.com/username/repo` | 仅限私聊使用                         |
| 查看私人订阅         | 白名单用户(仅自己) | `!仓库列表`                                | 查看私人订阅列表                     |
| **仓库池管理**       |                    |                                            |                                      |
| 添加仓库到仓库池     | 主人/管理员        | `!添加仓库池 github.com/username/repo`     | 将仓库添加到共享仓库池               |
| 从仓库池移除仓库     | 主人/管理员        | `!删除仓库池 github.com/username/repo`     | 从仓库池中移除仓库                   |
| 查看仓库池           | 主人/管理员        | `!仓库池列表`                              | 查看仓库池中的仓库                   |
| **群组订阅管理**     |                    |                                            |                                      |
| 订阅Github仓库       | 主人/管理员        | `!订阅本聊天仓库 github.com/username/repo` | 订阅仓库动态通知                     |
| 删除本聊天订阅的仓库 | 主人/管理员        | `!删除本聊天仓库 github.com/username/repo` | 仅删除当前群聊的订阅                 |
| 删除某编号的仓库     | 主人/管理员        | `!删除编号仓库 xxxxx`                      | 通过订阅编号删除                     |
| 开启本群所有推送     | 主人/管理员        | `!开启本聊天所有仓库推送`                  | 恢复全部订阅推送                     |
| 关闭本群所有推送     | 主人/管理员        | `!关闭本聊天所有仓库推送`                  | 暂停全部订阅推送                     |
| 开启指定编号推送     | 主人/管理员        | `!开启编号仓库 xxxxx`                      | 开启特定订阅推送                     |
| 关闭指定编号推送     | 主人/管理员        | `!关闭编号仓库 xxxxx`                      | 关闭特定订阅推送                     |
| 列出所有白名单用户   | 主人/管理员        | `!列出所有白名单用户`                      | 查看白名单列表                       |
| 添加私信订阅白名单   | 主人/管理员        | `!添加私信订阅白名单 @user`                | 添加白名单用户                       |
| 删除私信订阅白名单   | 主人/管理员        | `!删除私信订阅白名单 @user`                | 移除白名单用户                       |
| **跨群组管理**       |                    |                                            |                                      |
| 跨群删除仓库         | 主人/全局管理员    | `!删除编号仓库 xxxxx`                      | 跨群删除仓库                         |
| 跨群开启推送         | 主人/全局管理员    | `!开启编号仓库 xxxxx`                      | 跨群开启推送                         |
| 跨群关闭推送         | 主人/全局管理员    | `!关闭编号仓库 xxxxx`                      | 跨群关闭推送                         |
| 查看全部仓库列表     | 主人/全局管理员    | `!仓库全部列表`                            | 查看所有订阅                         |
| **权限管理**         |                    |                                            |                                      |
| 新增群聊仓库管理员   | 主人               | `!新增群聊仓库管理员 @user`                | 添加本群组管理员                     |
| 删除群聊仓库管理员   | 主人               | `!删除群聊仓库管理员 @user`                | 删除本群组管理员                     |
| 新增全局仓库管理员   | 主人               | `!新增全局仓库管理员 @user`                | 添加全局管理员                       |
| 删除全局仓库管理员   | 主人               | `!删除全局仓库管理员 @user`                | 删除全局管理员                       |
| 删除仓库管理员       | 主人               | `!删除仓库管理员 @user`                    | 同时删除全局管理员以及群组管理员角色 |
| 重置管理员系统       | 主人               | `!重置仓库管理员系统`                      | 清空所有管理员                       |

## 四、🎈连接说明

提供了2种方式订阅github仓库

### 1. webhook

直接在具有公网IP的服务器上，接收来自github webhook消息。

> 这是机器人的默认模式。

- 配置文件`alemomn.config.yaml`：

```yaml
alemonjs-code:
    github_secret: 'subscribe-code' # 需Github Webhook配置时填写的一致
    webhook_port: 18666 # Github Webhook服务端口，与Github Webhook的url时填写的一致
    ws_secret: 'subscribe-ws' # 密钥（选填，仅启服务器，不启机器人时可配）
```

- 启动服务器和机器人

```sh
yarn dev --login onebot
# release 版
yarn app --login onebot
```

- 仅启服务器，不启机器人

用来当作webscoket的服务器时

```sh
yarn dev --server
# release 版
yarn server
```

### 2. websocket

使用ws协议，连接公网IP的服务器，让不具备公网IP的设备具有消息接收能力。

- 配置文件`alemomn.config.yaml`：

```yaml
alemonjs-code:
    # 该配置为非空时，将启动ws连接使用中转模式
    ws_server_url: ws://127.0.0.1:18666 # 连接地址 （端口要和服务上的一致）
    ws_secret: 'subscribe-ws' # 密钥（要和ws上配置的ws_secret一致）
```

```sh
yarn dev --login onebot # 启动OneBot机器人
# release 版
yarn app --login onebot
```

## 开发

开发文档 [https://lvyjs.dev/ ](https://lvyjs.dev/)

使用文档 [https://alemonjs.com/](https://alemonjs.com/)

- 代码贡献指南

[README_DEV](./README_DEV.md)
