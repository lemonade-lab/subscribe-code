import { getRepoActionToken, getRepoWorkflowsData, isMaster } from '@src/models/config';
import vPlatform, { selects } from '@src/response/index';
import { Text, useMessage } from 'alemonjs';

// 指令格式：/codem -ga opt <userName>/<RepoName> : <branch> : <WorkflowfileName>
export const regular = /^(\/code|!|！)m\s+(-ga|ga)\s+opt\s+([a-zA-Z0-9_-]{1,39}\/[a-zA-Z0-9._-]{1,39}\s*(:|：)\s*[a-zA-Z0-9_-]\s*(:|：)[a-zA-Z0-9_-])?$/;

const res = onResponse(selects, async e => {
  const [message] = useMessage(e);

  // 需要是 主人
  if (!isMaster(e.UserKey, e.UserId) && !e.IsMaster) {
    void message.send(format(Text('你没有权限执行此操作')));

    return;
  }
  const match = e.MessageText.match(regular);

  if (match && match[3]) {
    const parts = match[3].split(/[:：]/);
    const userRepoName = parts[0].trim();
    const branch = parts[1].trim();
    const filePath = parts[2].trim();
    const thisWorkflowsListData = getRepoWorkflowsData({ userRepoName: userRepoName });

    if (!thisWorkflowsListData) {
      void message.send(format(Text('没有找到此仓库')));

      return;
    }
    const thisRepoWorkFlowData = thisWorkflowsListData.find(i => i.branch === branch && i.pathFile === filePath);

    const token = getRepoActionToken({ userRepoName: userRepoName });
    // 调用GitHub API触发workflow
    const response = await fetch(`https://api.github.com/repos/${userRepoName}/actions/workflows/${thisRepoWorkFlowData.pathFile}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: branch
      })
    }).then(res => res.json());

    if (response.status === 204) {
      message.send(format(Text(`Github Action 已触发：\nuserRepoName: ${userRepoName}\nbranch: ${branch}\nfilePath: ${filePath}`)));
    } else {
      message.send(format(Text(`触发 Github Action 失败：\nuserRepoName: ${userRepoName}\nbranch: ${branch}\nfilePath: ${filePath}\n${response.message}`)));
    }
  } else {
    message.send(format(Text('请输入正确的格式：/code -ga del <userName>/<RepoName>')));
  }
});

export default onResponse(selects, [vPlatform.current, res.current]);
