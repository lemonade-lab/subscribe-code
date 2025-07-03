import React from 'react';
import { defineConfig } from 'jsxp';
import Help from '@src/img/src/views/XHelp';

const helpProps = {
    data: [
        {
            group: '指令1',
            list: [
                { title: '!订阅仓库github.com/username/reponame', desc: '订阅仓库动态' },
                { title: '!删除仓库github.com/username/reponame', desc: '删除已订阅仓库' },
                { title: '!删除编号仓库xxxxx', desc: '删除仓库编号' },
                { title: '!仓库列表', desc: '查看当前仓库' },
                { title: '!仓库全部列表', desc: '查看全部仓库' },
                { title: '!检查仓库github.com/username/reponame', desc: '检查仓库状态' },
                { title: '!开启仓库推送', desc: '开启全部推送' },
                { title: '!关闭仓库推送', desc: '关闭全部推送' },
                { title: '!开启编号仓库xxxxx', desc: '开启指定推送' },
                { title: '!关闭编号仓库xxxxx', desc: '关闭指定推送' },
                { title: '!新增仓库订阅管理员 @user 或 !新增仓库订阅管理员 userKey', desc: '添加订阅管理员' },
                { title: '!删除仓库订阅管理员 @user 或 !删除仓库订阅管理员 userKey', desc: '删除订阅管理员' },
                { title: '!授权私信订阅 @user 或 !授权私信订阅 userKey', desc: '授权私信订阅' },
                { title: '!取消授权私信订阅 @user 或 !取消授权私信订阅 userKey', desc: '取消私信订阅' }
            ]
        },
        {
            group: '指令2',
            list: [
                { title: '!订阅仓库github.com/username/reponame', desc: '订阅仓库动态' },
                { title: '!删除仓库github.com/username/reponame', desc: '删除已订阅仓库' },
                { title: '!删除编号仓库xxxxx', desc: '删除仓库编号' },
                { title: '!仓库列表', desc: '查看当前仓库' },
                { title: '!仓库全部列表', desc: '查看全部仓库' },
                { title: '!检查仓库github.com/username/reponame', desc: '检查仓库状态' },
                { title: '!开启仓库推送', desc: '开启全部推送' },
                { title: '!关闭仓库推送', desc: '关闭全部推送' },
                { title: '!开启编号仓库xxxxx', desc: '开启指定推送' },
                { title: '!关闭编号仓库xxxxx', desc: '关闭指定推送' },
                { title: '!新增仓库订阅管理员 @user 或 !新增仓库订阅管理员 userKey', desc: '添加订阅管理员' },
                { title: '!删除仓库订阅管理员 @user 或 !删除仓库订阅管理员 userKey', desc: '删除订阅管理员' },
                { title: '!授权私信订阅 @user 或 !授权私信订阅 userKey', desc: '授权私信订阅' },
                { title: '!取消授权私信订阅 @user 或 !取消授权私信订阅 userKey', desc: '取消私信订阅' }
            ]
        }
    ]
};
export default defineConfig({
    routes: {
        '/help': {
            component: <Help {...helpProps} />
        }
    }
});
