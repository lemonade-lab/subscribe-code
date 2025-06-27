import { getConfig, getConfigValue } from 'alemonjs';
import { PublicEventMessageCreate, PrivateEventMessageCreate } from 'alemonjs';

/**
 * 获取配置项
 */
export const configValue = getConfigValue();

const config = getConfig();

// 初始化缺失的配置项
const defaultAlemonjsCodeConfig = {
    github_secret: '',
    ws_server_port: '',
    ws_secret: ''
    // 其他必要键可以在这里初始化
};

/**
 * 自动补全 alemonjs-code-wss 缺失的键
 */
export function ensureDefaultConfig() {
    const val = config.value;
    if (!val['alemonjs-code-wss']) {
        val['alemonjs-code-wss'] = { ...defaultAlemonjsCodeConfig };
    } else {
        // 补全缺失的键
        for (const key in defaultAlemonjsCodeConfig) {
            if (!(key in val['alemonjs-code-wss'])) {
                val['alemonjs-code-wss'][key] = defaultAlemonjsCodeConfig[key];
            }
        }
    }
    config.saveValue(val);
}

/**
 * 通用配置更新方法
 * @param key 配置项键名
 * @param value 新值或更新函数
 * @param options 可选参数：{ merge: boolean，unique?: boolean }，对象时是否合并以及数组时是否去重，默认 merge 为 true，unique 为 true
 * 1. 设置/修改一个字符串配置项
 * updateConfig('github_secret', 'my-new-secret');
 * 
 * 2. 设置/修改一个对象配置项（覆盖原有对象）
 * updateConfig('github', { token: 'xxx', user: 'alemon' });
 * 
 * 3. 合并对象配置项（只更新部分字段，保留其他字段）
 * updateConfig('github', { token: 'yyy' }, { merge: true });
 * 
 * 4. 添加元素到数组配置项（自动初始化为数组并避免重复）
 * updateConfig('apps', (apps) => {
    if (!Array.isArray(apps)) apps = [];
    if (!apps.includes('@alemonjs/db')) apps.push('@alemonjs/db');
    return apps;
 * });
 * 
 * 5. 移除数组中的某个元素
 * updateConfig('apps', (apps) => {
    if (!Array.isArray(apps)) return [];
    return apps.filter(app => app !== '@alemonjs/db');
 * });
 * 
 * 6. 递增一个数字配置项
 * updateConfig('count', (count) => typeof count === 'number' ? count + 1 : 1);
 * 
 * 7. 初始化不存在的配置项
 * updateConfig('foo', (foo) => foo ?? 'bar');
 * 
 * 8. 初始化 foo 配置项为字符串（如果不存在或不是字符串则赋默认值）
 * updateConfig('foo', (old) => (typeof old === 'string' ? old : '默认值'));
 */
export function updateConfig(
    key: string,
    value: any | ((oldValue: any) => any),
    options: { merge?: boolean; unique?: boolean } = { merge: true, unique: true }
) {
    const val = config.value;
    let newValue = typeof value === 'function' ? value(val[key]) : value;

    // 如果是对象且需要合并
    if (options?.merge && typeof val[key] === 'object' && typeof newValue === 'object') {
        newValue = { ...val[key], ...newValue };
    }

    // 如果是要更新数组配置项，并指定了 unique 为 true，则进行去重处理
    if (Array.isArray(newValue) && options?.unique) {
        newValue = Array.from(new Set(newValue));
    }

    val[key] = newValue;
    config.saveValue(val);
    return val;
}
