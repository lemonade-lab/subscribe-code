import { selects } from '@src/apps/index';
import { Image, useMessage } from 'alemonjs';
import Help from '@src/img/src/views/XHelp';
import { renderComponentToBuffer } from 'jsxp';
import permissionService, { UserRole } from '@src/models/github.sub.permissoin';

export const regular = /^(!|！|\/)?(仓库帮助|code-help|codeh)$/;

const helpData = {
    data: [
        {
            group: '公共指令',
            list: [
                { title: '/code-help | codeh', desc: '!仓库帮助' },
                { title: '/codes-list | codes-l', desc: '!订阅列表' },
                { title: '/code-permission | code-p', desc: '!我的仓库权限' },
                { title: '/codes-check | codes-c + repoUrl', desc: '!检查仓库 + repoUrl 是否已经订阅' },
                { title: '/codesrid-check | codesrid-c + repoId', desc: '!检查索引仓库 + repoId 是否已经订阅' }
            ]
        },
        {
            group: '私聊订阅管理',
            list: [
                { title: '/codes-sub | codes-s + repoUrl', desc: '!订阅仓库 + repoUrl (白名单用户仅自己)' },
                { title: '/codesrid-sub | codesrid-s + repoId', desc: '!订阅索引仓库 + repoId (白名单用户仅自己)' },
                { title: '/codes-del | codes-d + repoUrl', desc: '!取消订阅仓库 + repoUrl (白名单用户仅自己)' },
                { title: '/codes-list | codes-l', desc: '!订阅列表 (白名单用户仅自己)' }
            ]
        },
        {
            group: '仓库池管理',
            list: [
                { title: '/codep-add | codep-a + repoUrl', desc: '!添加仓库池 + repoUrl (主人/管理员)' },
                { title: '/codep-del | codep-d + repoUrl', desc: '!移除仓库池仓库 + repoUrl (主人/管理员)' },
                { title: '/codeprid-del | codeprid-d + repoId', desc: '!移除仓库池索引仓库 + repoId (主人/管理员)' },
                { title: '/codep-list | codep-l', desc: '!仓库池列表 (主人/管理员)' }
            ]
        },
        {
            group: '群组订阅管理',
            list: [
                { title: '/codes-sub | codes-s + repoUrl', desc: '!订阅仓库 + repoUrl (主人/管理员)' },
                { title: '/codesrid-sub | codesrid-s + repoId', desc: '!订阅索引仓库 + repoId (主人/管理员)' },
                { title: '/codes-del | codes-d + repoUrl', desc: '!取消订阅仓库 + repoUrl (主人/管理员)' },
                { title: '/codessid-del | codessid-d + subid', desc: '!取消订阅编号仓库 (主人/管理员)' },
                { title: '/codessid-start + subid', desc: '!启动推送编号 + subId (主人/管理员)' },
                { title: '/codessid-stop + subid', desc: '!暂停推送编号 + subId (主人/管理员)' },
                { title: '/codes-start', desc: '!开启推送 本群所有订阅 (主人/管理员)' },
                { title: '/codes-stop', desc: '!关闭推送  本群所有订阅 (主人/管理员)' },
                { title: '/codew-add | codew-a @user', desc: '!添加私信订阅白名单 (主人/管理员)' },
                { title: '/codew-del | codew-d @user', desc: '!删除私信订阅白名单 (主人/管理员)' },
                { title: '/codew-list | codew-l', desc: '!白名单列表 (主人/管理员)' }
            ]
        },
        {
            group: '跨群组管理',
            list: [
                {
                    title: '/codesid-del | codesid-d + subid',
                    desc: '!取消订阅编号仓库 + subid，跨群移除订阅(主人/全局管理员)'
                },
                { title: '/codessid-start + subid', desc: '!启动推送编号 + subId，跨群开启推送 (主人/全局管理员)' },
                { title: '/codessid-stop + subid', desc: '!暂停推送编号 + subId，跨群关闭推送 (主人/全局管理员)' },
                { title: '/codesg-list | codesg-l', desc: '!全部订阅列表 (主人/全局管理员)' }
            ]
        },
        {
            group: '权限管理',
            list: [
                { title: '/codesm-add | codesm-a @user', desc: '!新增仓库管理员 (主人)' },
                { title: '/codesm-del | codesm-d @user', desc: '!删除仓库管理员 (主人)' },
                { title: '/codegm-add | codegm-a @user', desc: '!新增全局仓库管理员 (主人)' },
                { title: '/codegm-del | codegm-d @user', desc: '!删除全局仓库管理员 (主人)' },
                {
                    title: '/codem-del | codem-d @user',
                    desc: '!移除仓库管理员角色：同时删除全局管理员以及群组管理员 (主人)'
                },
                { title: '/codem-list | codem-l', desc: '!管理员列表 (主人)' },
                { title: '/codem-rm-rf', desc: '!重置仓库管理员系统 (主人)' }
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
