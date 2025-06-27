# AlemonJS Github Dynamic Bot 中转推送服务

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

## 二、🎈中转推送

1. 部署中转服务，Github Webhook的推送数据到部署于公网的中转服务，中转服务再通过ws链接转发到本地推送客户端。

```sh
git clone -b wss https://github.com/lemonade-lab/subscribe-code.git ./subscribe-code-wss
cd subscribe-code-wss
yarn install
yarn dev # 启动中转服务
```

- 修改中转服务配置文件`alemomn.config.yaml`：

```yaml
alemonjs-code-wss:
    ws_secret: xxxxx # 中转服务自动生成的ws_secret，需与客户端配置文件一致
    ws_server_port: 18555 # 中转服务端口，需与客户端配置文件url的端口一致
    github_secret: xxxxx # 将自动生成并保存到配置文件，与Github Webhook配置时填写的一致
    webhook_port: 18666 # Github Webhook服务端口，与Github Webhook的url时填写的一致
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
