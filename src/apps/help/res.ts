import { selects } from '@src/apps/index';
import { Image, useMessage } from 'alemonjs';
import Help from '@src/img/src/views/XHelp';
import { renderComponentToBuffer } from 'jsxp';
import permissionService, { UserRole } from '@src/models/github.sub.permissoin';

export const regular = /^(!|！|\/)?(仓库|github仓库|GitHub仓库|GitHub代码仓库)帮助$/;

const helpData = {
    data: [
        {
            group: '公共指令',
            list: [
                { title: '!仓库帮助', desc: '查看帮助信息' },
                { title: '!仓库列表', desc: '查看当前仓库' },
                { title: '!我的仓库权限', desc: '查看自身权限' },
                { title: '!检查仓库 repoUrl', desc: '检查仓库是否已经订阅' }
            ]
        },
        {
            group: '私聊订阅管理',
            list: [
                { title: '!订阅本聊天仓库 repoUrl', desc: '添加私人订阅 (白名单用户仅自己)' },
                { title: '!删除本聊天仓库 repoUrl', desc: '删除私人订阅 (白名单用户仅自己)' },
                { title: '!仓库列表', desc: '查看私聊订阅 (白名单用户仅自己)' }
            ]
        },
        {
            group: '仓库池管理',
            list: [
                { title: '!添加仓库池 repoUrl', desc: '添加仓库到仓库池 (主人/管理员)' },
                { title: '!删除仓库池 repoUrl', desc: '从仓库池移除仓库 (主人/管理员)' },
                { title: '!仓库池列表', desc: '查看仓库池 (主人/管理员)' }
            ]
        },
        {
            group: '群组订阅管理',
            list: [
                { title: '!订阅本聊天仓库 repoUrl', desc: '订阅仓库动态 (主人/管理员)' },
                { title: '!删除本聊天仓库 repoUrl', desc: '删除已订阅仓库 (主人/管理员)' },
                { title: '!列出所有白名单用户', desc: '查看白名单列表 (主人/管理员)' },
                { title: '!删除编号仓库 xxxxx', desc: '删除仓库编号 (主人/管理员)' },
                { title: '!开启编号仓库 xxxxx', desc: '开启指定推送 (主人/管理员)' },
                { title: '!关闭编号仓库 xxxxx', desc: '关闭指定推送 (主人/管理员)' },
                { title: '!开启本聊天所有仓库推送', desc: '开启本群所有推送 (主人/管理员)' },
                { title: '!关闭本聊天所有仓库推送', desc: '关闭本群所有推送 (主人/管理员)' },
                { title: '!添加私信订阅白名单 @user', desc: '添加白名单用户(主人/管理员)' },
                { title: '!删除私信订阅白名单 @user', desc: '移除白名单用户(主人/管理员)' }
            ]
        },
        {
            group: '跨群组管理',
            list: [
                { title: '!删除编号仓库 xxxxx', desc: '跨群删除仓库 (主人/全局管理员)' },
                { title: '!开启编号仓库 xxxxx', desc: '跨群开启推送 (主人/全局管理员)' },
                { title: '!关闭编号仓库 xxxxx', desc: '跨群关闭推送 (主人/全局管理员)' },
                { title: '!仓库全部列表', desc: '查看全部仓库 (主人/全局管理员)' }
            ]
        },
        {
            group: '权限管理',
            list: [
                { title: '!新增群聊仓库管理员 @user', desc: '添加本群组管理员 (主人)' },
                { title: '!删除群聊仓库管理员 @user', desc: '删除本群组管理员 (主人)' },
                { title: '!新增全局仓库管理员 @user', desc: '添加全局管理员 (主人)' },
                { title: '!删除全局仓库管理员 @user', desc: '删除全局管理员 (主人)' },
                { title: '!删除仓库管理员 @user', desc: '同时删除全局管理员以及群组管理员 (主人)' },
                { title: '!重置仓库管理员系统', desc: '清空所有仓库管理员列表 (主人)' }
            ]
        }
    ]
};

export default onResponse(selects, async e => {
    const [message] = useMessage(e);
    let role: string = 'user';
    if (e.name === 'message.create' && e.MessageId) {
        role = await permissionService.getUserRole(e.UserId, e.SpaceId, e);
    } else if (e.name === 'private.message.create' && e.MessageId) {
        role = await permissionService.getUserRole(e.UserId, e.OpenId, e);
    }
    // 权限检查配置
    const rolePermissions = {
        公共指令: () => true,
        私聊订阅管理: () => true,
        仓库池管理: (r: UserRole) => [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster].includes(r),
        群组订阅管理: (r: UserRole) => [UserRole.Master, UserRole.GlobalCodeMaster, UserRole.CodeMaster].includes(r),
        跨群组管理: (r: UserRole) => [UserRole.Master, UserRole.GlobalCodeMaster].includes(r),
        权限管理: (r: UserRole) => r === UserRole.Master
    };
    // 过滤数据
    const helpDataFiltered = {
        data: [...helpData.data.filter(item => rolePermissions[item.group]?.(role) ?? false)]
    };

    const pic = await renderComponentToBuffer('help/', Help, { ...helpDataFiltered });
    if (pic) {
        message.send(format(Image(pic)));
    }
});
