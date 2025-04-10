'use strict'

const { posix: path } = require('path')

function summarizeFileLocation ({ path: path_, src: { abspath, origin } }) {
  if (!origin) return abspath || path_
  const { url, gitdir, worktree, refname, tag, reftype = tag ? 'tag' : 'branch', remote, startPath } = origin
  let details = `${reftype}: ${refname}`
  if ('worktree' in origin) details += worktree ? ' <worktree>' : remote ? ` <remotes/${remote}>` : ''
  if (startPath) details += ` | start path: ${startPath}`
  return `${abspath || path.join(startPath, path_)} in ${'worktree' in origin ? worktree || gitdir : url} (${details})`
}

module.exports = summarizeFileLocation
