import { isMaster, removeActionToken } from '@src/models/config';
import vPlatform, { selects } from '@src/response/index';
import { Text, useMessage } from 'alemonjs';

// 指令格式：/codem -ga del <userName>/<RepoName> [:<branch>] --可选branch参数
export const regular = /^(\/code|!|！)m\s+(-ga|ga)\s+del\s+([a-zA-Z0-9_-]{1,39}\/[a-zA-Z0-9._-]{1,39}\s*(:|：)?\s*([a-zA-Z0-9_-])?)$/;

const res = onResponse(selects, async e => {
  const [message] = useMessage(e);

  // 需要是 主人
  if (!isMaster(e.UserKey, e.UserId) && !e.IsMaster) {
    message.send(format(Text('你没有权限执行此操作')));

    return;
  }
  const match = e.MessageText.match(regular);

  if (match && match[3]) {
    let userRepoName: string, branch: string | undefined;

    if (match[4] && match[5]) {
      const parts = match[3].split(/[:：]/);

      userRepoName = parts[0];
      branch = parts[1];
      if (removeActionToken({ userRepoName: userRepoName, branch: branch })) {
        message.send(format(Text(`仓库 ${userRepoName} 的分支 ${branch} 的 Github Action REST API设置已删除`)));
      } else {
        message.send(format(Text('该仓库的 Github Action REST API 设置不存在，无需删除')));
      }
    } else {
      userRepoName = match[3];
      if (removeActionToken({ userRepoName: userRepoName })) {
        message.send(format(Text(`仓库 ${userRepoName} 全部的 Github Action REST API设置已删除`)));
      } else {
        message.send(format(Text('该仓库的 Github Action REST API 设置不存在，无需删除')));
      }
    }
  } else {
    message.send(format(Text('请输入正确的格式：/code -ga del <userName>/<RepoName>')));
  }
});

export default onResponse(selects, [vPlatform.current, res.current]);
