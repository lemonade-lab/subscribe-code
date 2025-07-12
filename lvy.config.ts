import { defineConfig } from 'lvyjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import tsPKG from './tsconfig.json';
const __dirname = dirname(fileURLToPath(import.meta.url));
const includes = (val: string) => process.argv.includes(val);
const alemonjs = () => import('alemonjs').then(res => res.start('src/index.ts'));
const server = () => import('./src/server.client.switch.ts');
const jsxp = () => import('jsxp').then(res => res.createServer());
export default defineConfig({
    plugins: [
        () => {
            if (includes('--jsxp')) return jsxp;
            if (includes('--server')) return server;
            return alemonjs;
        }
    ],
    alias: {
        entries: Object.entries(tsPKG.compilerOptions.paths || {}).map(([key, value]) => {
            return {
                find: key.replace('/*', ''),
                replacement: join(__dirname, value[0].replace('/*', ''))
            };
        })
    },
    build: {
        typescript: {
            removeComments: true
        }
    }
});
