import { isMaster, getRepoWorkflowsData } from '../../../../models/config.js';
import vPlatform, { selects } from '../../../index.js';
import { useMessage, Text } from 'alemonjs';

const regular = /^(\/code|!|！)m\s+(-ga|ga)\s*(l|list)\s+([a-zA-Z0-9_-]{1,39}\/[a-zA-Z0-9._-]{1,39})?$/;
const res = onResponse(selects, async (e) => {
    const [message] = useMessage(e);
    if (!isMaster(e.UserKey, e.UserId) && !e.IsMaster) {
        message.send(format(Text('你没有权限执行此操作')));
        return;
    }
    const match = e.MessageText.match(regular);
    if (match && match[4]) {
        const userRepoName = match[4];
        const workflowsListData = getRepoWorkflowsData({ userRepoName: userRepoName });
        if (workflowsListData && workflowsListData.length > 0) {
            const listMsg = workflowsListData.map(item => ` - ${item.branch} : ${item.pathFile}`).join('\n');
            message.send(format(Text(`该仓库${userRepoName}的 Github Action 工作流列表：\n${listMsg}`)));
        }
        else {
            message.send(format(Text(`该仓库${userRepoName}的 Github Action 工作流列表为空，或该仓库未配置 Github Action`)));
        }
    }
    else {
        message.send(format(Text('请输入正确的格式：/code -ga list <userName>/<RepoName>')));
    }
});
var res$1 = onResponse(selects, [vPlatform.current, res.current]);

export { res$1 as default, regular };
