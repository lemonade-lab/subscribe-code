import moment from 'moment';

function formatGithubEvent(event, payload) {
    if (!payload)
        return null;
    switch (event) {
        case 'push': {
            const repo = payload.repository?.full_name;
            const pusher = payload.pusher?.name;
            const branch = payload.ref?.replace('refs/heads/', '');
            const commitCount = payload.commits?.length || 0;
            const compareUrl = payload.compare;
            const commits = payload.commits || [];
            const headCommit = payload.head_commit || {};
            const time = headCommit.timestamp ? moment(headCommit.timestamp).format('YYYY年MM月DD日 HH:mm:ss') : '';
            const message = [
                `📦 仓库：${repo}`,
                `🌿 分支：${branch}`,
                `--------------------`,
                `👤 推送者：${pusher}`,
                `🕒 时间：${time}`,
                `--------------------`,
                `📝 提交数：${commitCount}`,
                `--------------------`
            ];
            commits.slice(0, 5).forEach((commit, idx) => {
                message.push(`#${idx + 1} ✏️ ${commit.message.split('\n')[0]}`, `👤 作者：${commit.author?.name}`, `🔗 提交链接：${commit.url}`, `--------------------`);
            });
            if (commitCount > 5) {
                message.push(`...等共${commitCount}条提交`);
                message.push(`--------------------`);
            }
            message.push(`🔍 对比变更：${compareUrl}`);
            return message.join('\n');
        }
        case 'issues':
            if (payload.action === 'opened') {
                const commentBody = payload.body || '';
                const maxLen = 500;
                const shortBody = commentBody.length > maxLen ? commentBody.slice(0, maxLen) + '...' : commentBody;
                return [
                    `📦 仓库：${payload.repository?.full_name}`,
                    `--------------------`,
                    `🆕 新建 Issue`,
                    `#${payload.issue?.number} ${payload.issue?.title}`,
                    `正文：`,
                    `${shortBody}`,
                    `--------------------`,
                    `👤 作者：${payload.issue?.user?.login}`,
                    `🔗 链接：${payload.issue?.html_url}`
                ].join('\n');
            }
            else if (payload.action === 'closed') {
                return [
                    `📦 仓库：${payload.repository?.full_name}`,
                    `--------------------`,
                    `✅ 关闭 Issue`,
                    `#${payload.issue?.number} ${payload.issue?.title}`,
                    `--------------------`,
                    `👤 作者：${payload.issue?.user?.login}`,
                    `🔗 链接：${payload.issue?.html_url}`
                ].join('\n');
            }
            break;
        case 'issue_comment': {
            const commentBody = payload.comment?.body || '';
            const maxLen = 500;
            const shortBody = commentBody.length > maxLen ? commentBody.slice(0, maxLen) + '...' : commentBody;
            return [
                `📦 仓库：${payload.repository?.full_name}`,
                `--------------------`,
                `💬 Issue 评论`,
                `#${payload.issue?.number} ${payload.issue?.title}`,
                `--------------------`,
                `👤 评论者：${payload.comment?.user?.login}`,
                `📝 内容：${shortBody}`,
                `🔗 链接：${payload.comment?.html_url}`
            ].join('\n');
        }
        case 'pull_request':
            if (payload.action === 'opened') {
                return [
                    `📦 仓库：${payload.repository?.full_name}`,
                    `--------------------`,
                    `🔀 新建 PR`,
                    `#${payload.pull_request?.number} ${payload.pull_request?.title}`,
                    `--------------------`,
                    `👤 作者：${payload.pull_request?.user?.login}`,
                    `🔗 链接：${payload.pull_request?.html_url}`
                ].join('\n');
            }
            else if (payload.action === 'closed') {
                return [
                    `📦 仓库：${payload.repository?.full_name}`,
                    `--------------------`,
                    `❌ 关闭 PR`,
                    `#${payload.pull_request?.number} ${payload.pull_request?.title}`,
                    `--------------------`,
                    `👤 作者：${payload.pull_request?.user?.login}`,
                    `🔗 链接：${payload.pull_request?.html_url}`
                ].join('\n');
            }
            break;
        case 'create':
            return [
                `📦 仓库：${payload.repository?.full_name}`,
                `--------------------`,
                `🆕 创建 ${payload.ref_type}`,
                `📄 名称：${payload.ref}`
            ].join('\n');
        case 'delete':
            return [
                `📦 仓库：${payload.repository?.full_name}`,
                `--------------------`,
                `🗑️ 删除 ${payload.ref_type}`,
                `📄 名称：${payload.ref}`
            ].join('\n');
        default:
            return null;
    }
    return null;
}

export { formatGithubEvent };
