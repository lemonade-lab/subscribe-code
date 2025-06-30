# Docker 运行指南

## 生产环境运行

### 1. 构建和启动服务

```bash
# 构建镜像并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f alemonjs-code

# 停止服务
docker-compose down
```

### 2. 配置说明

#### 端口映射

- `18666`: GitHub Webhook 接收端口
- `6379`: Redis 数据库端口

#### 配置文件

- `alemon.config.yaml`: 主配置文件
- 确保 Redis 配置指向容器内的 redis 服务

## 常用命令

### 查看容器状态

```bash
docker-compose ps
```

### 重启服务

```bash
docker-compose restart alemonjs-code
```

### 清理和重建

```bash
# 停止并删除容器、网络
docker-compose down

# 删除镜像（可选）
docker rmi $(docker images -q alemonjs-code)

# 重新构建并启动
docker-compose up -d --build
```

### 进入容器调试

```bash
docker-compose exec alemonjs-code sh
```

### 查看日志

```bash
# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f alemonjs-code
docker-compose logs -f redis
```

## 数据持久化

- Redis 数据存储在 `redis_data` 卷中
- 应用日志映射到本地 `./logs` 目录
- 配置文件映射为只读模式
