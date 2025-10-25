import dayjs from 'dayjs';

/**
 * 格式化 GitHub 事件消息
 * @param event - GitHub 事件类型
 * @param payload - 事件的负载数据
 * @returns 格式化后的消息字符串或 null
 */
export function formatGithubEvent(event: string, payload: GithubEventPayload): string | null {
  if (!payload) {
    return null;
  }

  // 通用分隔线
  const SEPARATOR = '────────────────';

  switch (event) {
    case 'push': {
      const repo = payload.repository?.full_name;
      const pusher = payload.pusher?.name;
      const branch = payload.ref?.replace('refs/heads/', '');
      const commitCount = payload.commits?.length || 0;
      const compareUrl = payload.compare;
      const commits = payload.commits || [];
      const headCommit = payload.head_commit || {};
      const time = headCommit.timestamp ? dayjs(headCommit.timestamp).format('YYYY-MM-DD HH:mm:ss') : '';

      const message = [
        '🚀 GitHub 推送事件',
        SEPARATOR,
        `📦 仓库：${repo}`,
        `🌿 分支：${branch}`,
        `👤 推送者：${pusher}`,
        `🕒 时间：${time}`,
        `📝 提交数：${commitCount}`,
        SEPARATOR
      ];

      // 展示前3条提交（QQ消息不宜过长）
      commits.slice(0, 3).forEach(
        (
          commit: {
            message: string;
            author?: { name?: string };
            url?: string;
          },
          idx: number
        ) => {
          message.push(`✨ 提交 #${idx + 1}`, `  信息：${commit.message.split('\n')[0]}`, `  作者：${commit.author?.name}`, `  链接：${commit.url}`, SEPARATOR);
        }
      );

      if (commitCount > 3) {
        message.push(`...等共 ${commitCount} 条提交`, `🔍 完整变更：${compareUrl}`);
      } else {
        message.push(`🔍 对比变更：${compareUrl}`);
      }

      return message.join('\n');
    }

    case 'issues':
      if (payload.action === 'opened') {
        const commentBody = payload.body || '';
        const maxLen = 200; // QQ消息更适合短内容
        const shortBody = commentBody.length > maxLen ? commentBody.slice(0, maxLen) + '...' : commentBody;

        return [
          '📌 GitHub Issue 新建',
          SEPARATOR,
          `📦 仓库：${payload.repository?.full_name}`,
          `🆕 标题：#${payload.issue?.number} ${payload.issue?.title}`,
          '📝 内容：',
          `  ${shortBody.replace(/\n/g, '\n  ')}`, // 内容缩进
          SEPARATOR,
          `👤 作者：${payload.issue?.user?.login}`,
          `🔗 链接：${payload.issue?.html_url}`
        ].join('\n');
      } else if (payload.action === 'closed') {
        return [
          '✅ GitHub Issue 关闭',
          SEPARATOR,
          `📦 仓库：${payload.repository?.full_name}`,
          `#${payload.issue?.number} ${payload.issue?.title}`,
          SEPARATOR,
          `👤 作者：${payload.issue?.user?.login}`,
          `🔗 链接：${payload.issue?.html_url}`
        ].join('\n');
      }
      break;

    case 'issue_comment': {
      const commentBody = payload.comment?.body || '';
      const maxLen = 200;
      const shortBody = commentBody.length > maxLen ? commentBody.slice(0, maxLen) + '...' : commentBody;

      return [
        '💬 Issue 评论',
        SEPARATOR,
        `📦 仓库：${payload.repository?.full_name}`,
        `📌 关联 Issue: #${payload.issue?.number} ${payload.issue?.title}`,
        '📝 评论内容：',
        `  ${shortBody.replace(/\n/g, '\n  ')}`,
        SEPARATOR,
        `👤 评论者：${payload.comment?.user?.login}`,
        `🔗 链接：${payload.comment?.html_url}`
      ].join('\n');
    }

    case 'pull_request':
      if (payload.action === 'opened') {
        return [
          '🔀 新建 Pull Request',
          SEPARATOR,
          `📦 仓库：${payload.repository?.full_name}`,
          `✨ 标题：#${payload.pull_request?.number} ${payload.pull_request?.title}`,
          SEPARATOR,
          `👤 作者：${payload.pull_request?.user?.login}`,
          `🔗 链接：${payload.pull_request?.html_url}`
        ].join('\n');
      } else if (payload.action === 'closed') {
        return [
          '❌ PR 关闭',
          SEPARATOR,
          `📦 仓库：${payload.repository?.full_name}`,
          `#${payload.pull_request?.number} ${payload.pull_request?.title}`,
          SEPARATOR,
          `👤 作者：${payload.pull_request?.user?.login}`,
          `🔗 链接：${payload.pull_request?.html_url}`
        ].join('\n');
      }
      break;

    case 'create':
      return [`🆕 新建 ${payload.ref_type}`, SEPARATOR, `📦 仓库：${payload.repository?.full_name}`, `📄 名称：${payload.ref}`].join('\n');

    case 'delete':
      return [`🗑️ 删除 ${payload.ref_type}`, SEPARATOR, `📦 仓库：${payload.repository?.full_name}`, `📄 名称：${payload.ref}`].join('\n');

    default:
      return null;
  }

  return null;
}

/**
 * GitHub 事件的负载数据类型
 */
export interface GithubEventPayload {
  repository?: { full_name?: string };
  pusher?: { name?: string };
  ref?: string;
  ref_type?: string;
  commits?: Array<{ message: string; author?: { name?: string }; url?: string }>;
  head_commit?: { timestamp?: string };
  compare?: string;
  issue?: { number?: number; title?: string; user?: { login?: string }; html_url?: string };
  action?: string;
  comment?: { body?: string; user?: { login?: string }; html_url?: string };
  pull_request?: { number?: number; title?: string; user?: { login?: string }; html_url?: string };
  body?: string;
  user?: { login?: string };
  html_url?: string;
}
