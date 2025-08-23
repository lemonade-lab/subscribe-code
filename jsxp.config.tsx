import React from 'react';
import { defineConfig } from 'jsxp';
import Help from '@src/img/src/views/XHelp';
import data from '@src/response/help/config.json';
export default defineConfig({
    routes: {
        '/help': {
            component: <Help data={data} />
        }
    }
});
