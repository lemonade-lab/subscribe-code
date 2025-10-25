import { addActionToken, isMaster } from '@src/models/config';
import vPlatform, { selects } from '@src/response/index';
import { Text, useMessage } from 'alemonjs';

// 指令格式：/codem -ga add <用户名/仓库名>:<分支名>:<workflow文件名>:<token>
export const regular =
  /^(\/code|!|！)m\s+(-ga|ga)\s+add\s+([a-zA-Z0-9_-]{1,39}\/[a-zA-Z0-9._-]{1,39}\s*(:|：)\s*[a-zA-Z0-9_-]\s*(:|：)\s*[a-zA-Z0-9_-]\s*(:|：)\s*[a-zA-Z0-9_]{40})?$/;

const res = onResponse(selects, async e => {
  const [message] = useMessage(e);

  // 需要是 主人
  if (!isMaster(e.UserKey, e.UserId) && !e.IsMaster) {
    message.send(format(Text('你没有权限执行此操作')));

    return;
  }
  if (e.name === 'private.message.create') {
    const match = e.MessageText.match(regular);

    if (match && match[3]) {
      const parts = match[3].split(/[:：]/);
      const userRepoName = parts[0].trim();
      const branch = parts[1].trim();
      const workflowFileName = parts[2].trim();
      const token = parts[3].trim();
      const workflowsListRes = (await fetch(`https://api.github.com/repos/${userRepoName}/actions/workflows`, {
        method: 'GET',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        }
      }).then(res => res.json())) as {
        total_count: number;
        workflows: Array<{
          id: number;
          node_id: string;
          name: string;
          path: string;
          state: string;
          created_at: string;
          updated_at: string;
          url: string;
          html_url: string;
          badge_url: string;
        }>;
      };
      const selectsWorkFlows = workflowsListRes?.workflows.find(item => item.path.includes(workflowFileName));
      const workflows = {
        name: selectsWorkFlows.name,
        branch: branch,
        pathFile: selectsWorkFlows.path.replace(/.github\/workflows\//g, ''),
        url: selectsWorkFlows.url
      };

      if (addActionToken({ userRepoName: userRepoName, token: token, workflows: [workflows] })) {
        logger.info(`Github Action REST API已设置：\nuserRepoName: ${userRepoName}\nToken: ${token}`);
        message.send(format(Text(`Github Action REST API已设置：\nuserRepoName: ${userRepoName}\nToken: ${token}`)));
      } else {
        message.send(format(Text('Github Action REST API设置失败，已存在此仓库设置，如需修改请先删除原有设置')));
      }
    } else {
      message.send(format(Text('请输入正确的格式：/code -ga add <userName>/<RepoName>:<token>')));
    }
  } else if (e.name === 'message.create') {
    message.send(format(Text('请私聊执行设置 /code -ga add <userName>/<RepoName>:<token>')));
  }
});

export default onResponse(selects, [vPlatform.current, res.current]);
