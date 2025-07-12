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

- 启动bot后，在群聊/私聊中发送指令 `/codeh` `/code-help`

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
