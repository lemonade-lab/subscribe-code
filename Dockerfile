# 最终运行阶段
FROM  node:22
WORKDIR /app

# 安装系统依赖、Node 依赖并构建 - 合并多个 RUN
RUN echo "" > /etc/apt/sources.list && \
    echo "deb http://mirrors.aliyun.com/debian bookworm main contrib non-free non-free-firmware" >> /etc/apt/sources.list && \
    echo "deb http://mirrors.aliyun.com/debian bookworm-updates main contrib non-free non-free-firmware" >> /etc/apt/sources.list && \
    echo "deb http://mirrors.aliyun.com/debian-security bookworm-security main contrib non-free non-free-firmware" >> /etc/apt/sources.list && \
    apt-get update && \
    (apt-get install -y chromium || echo "Chromium not available for this architecture") && \
    rm -rf /var/lib/apt/lists/*

# 设置yarn缓存目录
ENV YARN_CACHE_FOLDER=/app/.yarn_cache

# 复制依赖文件
COPY package.json .npmrc ./

# 安装依赖
RUN yarn install

# 复制源代码
COPY src ./src
COPY .puppeteerrc.cjs index.js jsxp.config.tsx lvy.config.ts postcss.config.cjs tailwind.config.js tsconfig.json ./

# 构建项目
RUN yarn build