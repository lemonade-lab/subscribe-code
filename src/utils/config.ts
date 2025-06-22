import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const configPath = path.resolve(process.cwd(), 'alemon.config.yaml');

let config: any = {};
let listeners: Array<(cfg: any) => void> = [];

// 读取并解析配置
function loadConfig() {
    try {
        const file = fs.readFileSync(configPath, 'utf8');
        config = yaml.load(file) || {};
        listeners.forEach(fn => fn(config));
        console.log('[Github-Bot] [Config] 配置已更新:', config);
    } catch (e: any) {
        console.warn('[Github-Bot] [Config] 读取配置失败:', e.message);
    }
}

// 监听配置文件变更
fs.watchFile(configPath, { interval: 1000 }, () => {
    console.log('[Github-Bot] [Config] 检测到 alemon.config.yaml 变更，重新加载...');
    loadConfig();
});

// 导出获取配置的方法
export function getConfig<T = any>(): T {
    return config as T;
}

// 支持外部监听配置变化
export function onConfigChange(fn: (cfg: any) => void) {
    listeners.push(fn);
}

// 启动时加载一次
loadConfig();
