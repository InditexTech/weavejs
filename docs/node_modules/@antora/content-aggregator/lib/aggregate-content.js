'use strict'

const computeOrigin = require('./compute-origin')
const { createHash } = require('crypto')
const createGitHttpPlugin = require('./git-plugin-http')
const decodeUint8Array = require('./decode-uint8-array')
const deepClone = require('./deep-clone')
const EventEmitter = require('events')
const expandPath = require('@antora/expand-path-helper')
const File = require('./file')
const filterRefs = require('./filter-refs')
const fs = require('fs')
const { promises: fsp } = fs
const getCacheDir = require('cache-directory')
const GitCredentialManagerStore = require('./git-credential-manager-store')
const git = require('./git')
const { NotFoundError, ObjectTypeError, UnknownTransportError, UrlParseError } = git.Errors
const { globStream } = require('fast-glob')
const { inspect } = require('util')
const invariably = require('./invariably')
const logger = require('./logger')
const { makeMatcherRx, versionMatcherOpts: VERSION_MATCHER_OPTS } = require('./matcher')
const MultiProgress = require('multi-progress') // calls require('progress') as a peer dependencies
const ospath = require('path')
const { posix: path } = ospath
const posixify = require('./posixify')
const removeGitSuffix = require('./remove-git-suffix')
const { fs: resolvePathGlobsFs, git: resolvePathGlobsGit } = require('./resolve-path-globs')
const { pipeline, Writable } = require('stream')
const forEach = (write) => new Writable({ objectMode: true, write })
const userRequire = require('@antora/user-require-helper')
const yaml = require('js-yaml')

const {
  COMPONENT_DESC_FILENAME,
  CONTENT_CACHE_FOLDER,
  CONTENT_SRC_GLOB,
  CONTENT_SRC_OPTS,
  FILE_MODES,
  GIT_CORE,
  GIT_OPERATION_LABEL_LENGTH,
  GIT_PROGRESS_PHASES,
  REF_PATTERN_CACHE_KEY,
  SYMLINK_FILE_MODE,
  VALID_STATE_FILENAME,
} = require('./constants')
const ANY_SEPARATOR_RX = /[:/]/
const CSV_RX = /\s*,\s*/
const VENTILATED_CSV_RX = /\s*,\s+/
const GIT_URI_DETECTOR_RX = /:(?:\/\/|[^/\\])/
const HTTP_ERROR_CODE_RX = new RegExp('^' + git.Errors.HttpError.code + '$', 'i')
const NEWLINE_RX = /\n/g
const PATH_SEPARATOR_RX = /[/]/g
const SHORTEN_REF_RX = /^refs\/(?:heads|remotes\/[^/]+|tags)\//
const SPACE_RX = / /g
const SUPERFLUOUS_SEPARATORS_RX = /^\/+|\/+$|\/+(?=\/)/g
const URL_AUTH_CLEANER_RX = /^(https?:\/\/)[^/]*@(?=.)/
const URL_AUTH_EXTRACTOR_RX = /^(https?:\/\/)(?:([^/:]+)?(?::([^/]+)?)?@)?(.*)/
const URL_PORT_CLEANER_RX = /^([^/]+):[0-9]+(?=\/)/

/**
 * Aggregates files from the specified content sources so they can be loaded
 * into Antora's virtual file catalog.
 *
 * Currently assumes each source points to a local or remote git repository.
 * Clones the repository, if necessary, then walks the git tree (or worktree) of
 * the specified branches and tags, starting from the specified start path(s).
 * Creates a virtual file containing the contents and location metadata for each
 * file matched. The files are then roughly organized by component version.
 *
 * @memberof content-aggregator
 *
 * @param {Object} playbook - The configuration object for Antora.
 * @param {Object} playbook.dir - The working directory of the playbook.
 * @param {Object} playbook.runtime - The runtime configuration object for Antora.
 * @param {String} [playbook.runtime.cacheDir=undefined] - The base cache directory.
 * @param {Boolean} [playbook.runtime.fetch=undefined] - Whether to fetch
 * updates from managed git repositories.
 * @param {Boolean} [playbook.runtime.quiet=false] - Whether to be suppress progress
 * bars that show progress of clone and fetch operations.
 * @param {Array} playbook.git - The git configuration object for Antora.
 * @param {Boolean} [playbook.git.ensureGitSuffix=true] - Whether the .git
 * suffix is automatically appended to each repository URL, if missing.
 * @param {Array} playbook.content - An array of content sources.
 *
 * @returns {Promise<Object>} A map of files organized by component version.
 */
function aggregateContent (playbook) {
  const startDir = playbook.dir || '.'
  const { branches, editUrl, tags, sources } = playbook.content
  const sourceDefaults = { branches, editUrl, tags }
  const { cacheDir: requestedCacheDir, fetch, quiet } = playbook.runtime
  return ensureCacheDir(requestedCacheDir, startDir).then((cacheDir) => {
    const gitConfig = Object.assign({ ensureGitSuffix: true }, playbook.git)
    const gitPlugins = loadGitPlugins(gitConfig, playbook.network || {}, startDir)
    const concurrency = {
      fetch: Math.max(gitConfig.fetchConcurrency || Infinity, 1),
      read: Math.max(gitConfig.readConcurrency || Infinity, 1),
    }
    const sourcesByUrl = sources.reduce((accum, source) => {
      return accum.set(source.url, [...(accum.get(source.url) || []), Object.assign({}, sourceDefaults, source)])
    }, new Map())
    const progress = quiet ? undefined : createProgress(sourcesByUrl.keys(), process.stdout)
    const refPatternCache = Object.assign(new Map(), { braces: new Map() })
    const loadOpts = { cacheDir, fetch, gitPlugins, progress, startDir, refPatternCache }
    return collectFiles(sourcesByUrl, loadOpts, concurrency).then(buildAggregate, (err) => {
      progress?.terminate()
      throw err
    })
  })
}

async function collectFiles (sourcesByUrl, loadOpts, concurrency, fetchedUrls) {
  const loadTasks = [...sourcesByUrl.entries()].map(([url, sources]) => {
    const loadOptsForUrl = Object.assign({}, loadOpts)
    if (loadOpts.fetch && fetchedUrls && fetchedUrls.length && fetchedUrls.includes(url)) loadOptsForUrl.fetch = false
    if (tagsSpecified(sources)) loadOptsForUrl.fetchTags = true
    return loadRepository.bind(null, url, loadOptsForUrl, { url, sources })
  })
  return gracefulPromiseAllWithLimit(loadTasks, concurrency.fetch).then(([results, rejections]) => {
    if (rejections.length) {
      if (concurrency.fetch > 1 && results.length > 1 && rejections.every(({ recoverable }) => recoverable)) {
        if (loadOpts.progress) loadOpts.progress.terminate() // reset cursor position and allow it be reused
        const msg0 = 'An unexpected error occurred while fetching content sources concurrently.'
        const msg1 = 'Retrying with git.fetch_concurrency value of 1.'
        logger.warn(rejections[0], msg0 + ' ' + msg1)
        const fulfilledUrls = results.filter((it) => it?.repo.url).map((it) => it.url)
        return collectFiles(sourcesByUrl, loadOpts, Object.assign(concurrency, { fetch: 1 }), fulfilledUrls)
      }
      throw rejections[0]
    }
    return Promise.all(
      results.map(({ repo, authStatus, sources }) =>
        selectStartPathsForRepository(repo, authStatus, sources).then((startPaths) =>
          collectFilesFromStartPaths.bind(null, startPaths, repo, authStatus)
        )
      )
    ).then((collectTasks) => promiseAllWithLimit(collectTasks, concurrency.read))
  })
}

function buildAggregate (componentVersionBuckets) {
  const entries = Object.assign(new Map(), { accum: [] })
  for (const batchesForOrigin of componentVersionBuckets) {
    for (const batch of batchesForOrigin) {
      let key, entry
      if ((entry = entries.get((key = batch.version + '@' + batch.name)))) {
        const { files, origins } = batch
        ;(batch.files = entry.files).push(...files)
        ;(batch.origins = entry.origins).push(origins[0])
        Object.assign(entry, batch)
      } else {
        entries.set(key, batch).accum.push(batch)
      }
    }
  }
  return entries.accum
}

async function loadRepository (url, opts, result = {}) {
  let authStatus, dir, repo
  const cache = { [REF_PATTERN_CACHE_KEY]: opts.refPatternCache }
  if (~url.indexOf(':') && GIT_URI_DETECTOR_RX.test(url)) {
    let credentials, displayUrl
    ;({ displayUrl, url, credentials } = extractCredentials(url))
    const { cacheDir, fetch, fetchTags, gitPlugins, progress } = opts
    dir = ospath.join(cacheDir, generateCloneFolderName(displayUrl))
    // NOTE the presence of the url property on the repo object implies the repository is remote
    repo = { cache, dir, fs, gitdir: dir, noCheckout: true, url }
    const { credentialManager } = gitPlugins
    const validStateFile = ospath.join(dir, VALID_STATE_FILENAME)
    try {
      await fsp.access(validStateFile)
      if (fetch) {
        await fsp.unlink(validStateFile)
        const fetchOpts = buildFetchOptions(repo, progress, displayUrl, credentials, gitPlugins, fetchTags, 'fetch')
        await git
          .fetch(fetchOpts)
          .then(() => {
            authStatus = identifyAuthStatus(credentialManager, credentials, url)
            return git.setConfig(Object.assign({ path: 'remote.origin.private', value: authStatus }, repo))
          })
          .catch((fetchErr) => {
            fetchOpts.onProgress?.finish(fetchErr)
            if (HTTP_ERROR_CODE_RX.test(fetchErr.code) && fetchErr.data.statusCode === 401) fetchErr.rethrow = true
            throw fetchErr
          })
          .then(() => fsp.writeFile(validStateFile, '').catch(invariably.void))
          .then(() => fetchOpts.onProgress?.finish())
      } else {
        authStatus = await git.getConfig(Object.assign({ path: 'remote.origin.private' }, repo))
      }
    } catch (gitErr) {
      await fsp['rm' in fsp ? 'rm' : 'rmdir'](dir, { recursive: true, force: true })
      if (gitErr.rethrow) throw transformGitCloneError(gitErr, displayUrl)
      const fetchOpts = buildFetchOptions(repo, progress, displayUrl, credentials, gitPlugins, fetchTags, 'clone')
      await git
        .clone(fetchOpts)
        .then(() => git.resolveRef(Object.assign({ ref: 'HEAD', depth: 1 }, repo)))
        .then(() => {
          authStatus = identifyAuthStatus(credentialManager, credentials, url)
          return git.setConfig(Object.assign({ path: 'remote.origin.private', value: authStatus }, repo))
        })
        .catch((cloneErr) => {
          fetchOpts.onProgress?.finish(cloneErr)
          const authRequested = credentialManager.status({ url }) === 'requested'
          throw transformGitCloneError(cloneErr, displayUrl, authRequested)
        })
        .then(() => fsp.writeFile(validStateFile, '').catch(invariably.void))
        .then(() => fetchOpts.onProgress?.finish())
    }
  } else if (await isDirectory((dir = expandPath(url, { dot: opts.startDir })))) {
    const gitdir = ospath.join(dir, '.git')
    repo = (await isDirectory(gitdir)) ? { cache, dir, fs, gitdir } : { cache, dir, fs, gitdir: dir, noCheckout: true }
    try {
      await git.resolveRef(Object.assign({ ref: 'HEAD', depth: 1 }, repo))
    } catch {
      const msg = `Local content source must be a git repository: ${dir}${url !== dir ? ' (url: ' + url + ')' : ''}`
      throw new Error(msg)
    }
  } else {
    throw new Error(`Local content source does not exist: ${dir}${url !== dir ? ' (url: ' + url + ')' : ''}`)
  }
  return Object.assign(result, { repo, authStatus })
}

function extractCredentials (url) {
  if ((url.startsWith('https://') || url.startsWith('http://')) && ~url.indexOf('@')) {
    // Common oauth2 formats: (QUESTION should we try to coerce token only into one of these formats?)
    // GitHub: <token>:x-oauth-basic@ (or <token>@)
    // GitHub App: x-access-token:<token>@
    // GitLab: oauth2:<token>@
    // BitBucket: x-token-auth:<token>@
    const [, scheme, username, password, rest] = url.match(URL_AUTH_EXTRACTOR_RX)
    const displayUrl = (url = scheme + rest)
    // NOTE if only username is present, assume it's an oauth token and set password to empty string
    const credentials = username ? { username, password: password || '' } : {}
    return { displayUrl, url, credentials }
  }
  if (url.startsWith('git@')) return { displayUrl: url, url: 'https://' + url.substr(4).replace(':', '/') }
  return { displayUrl: url, url }
}

async function selectStartPathsForRepository (repo, authStatus, sources) {
  const startPaths = []
  const originUrls = {}
  for (const source of sources) {
    const { version, editUrl } = source
    // NOTE if repository is managed (has a url property), we can assume the remote name is origin
    // TODO if the repo has no remotes, then remoteName should be undefined
    const remoteName = repo.url ? 'origin' : source.remote || 'origin'
    const originUrl = repo.url || (originUrls[remoteName] ||= await resolveRemoteUrl(repo, remoteName))
    const refs = await selectReferences(source, repo, remoteName)
    if (refs.length) {
      for (const ref of refs) {
        for (const startPath of await selectStartPaths(source, repo, remoteName, ref)) {
          startPaths.push({ startPath, ref, originUrl, editUrl, version })
        }
      }
    } else {
      const { url, branches, tags } = source
      const startPathInfo =
        'startPaths' in source
          ? { 'start paths': source.startPaths || undefined }
          : { 'start path': source.startPath || undefined }
      const sourceInfo = yaml.dump({ url, branches, tags, ...startPathInfo }, { flowLevel: 1 }).trimRight()
      logger.info(`No matching references found for content source entry (${sourceInfo.replace(NEWLINE_RX, ' | ')})`)
    }
  }
  return startPaths
}

// QUESTION should we resolve HEAD to a ref eagerly to avoid having to do a match on it?
async function selectReferences (source, repo, remote) {
  let { branches: branchPatterns, tags: tagPatterns, worktrees: worktreePatterns = '.' } = source
  const managed = 'url' in repo
  const isBare = managed || repo.noCheckout
  const patternCache = repo.cache[REF_PATTERN_CACHE_KEY]
  const noWorktree = managed ? undefined : false
  const refs = new Map()
  if (
    tagPatterns &&
    (tagPatterns = Array.isArray(tagPatterns)
      ? tagPatterns.map((pattern) => String(pattern))
      : splitRefPatterns(String(tagPatterns))).length
  ) {
    const tags = await git.listTags(repo)
    if (tags.length) {
      for (const shortname of filterRefs(tags, tagPatterns, patternCache)) {
        // NOTE tags are stored using symbol keys to distinguish them from branches
        refs.set(Symbol(shortname), { shortname, fullname: 'tags/' + shortname, type: 'tag', head: noWorktree })
      }
    }
  }
  if (!branchPatterns) return [...refs.values()]
  if (worktreePatterns) {
    if (worktreePatterns === '.') {
      worktreePatterns = ['.']
    } else if (worktreePatterns === true) {
      worktreePatterns = ['.', '*']
    } else {
      worktreePatterns = Array.isArray(worktreePatterns)
        ? worktreePatterns.map((pattern) => String(pattern))
        : splitRefPatterns(String(worktreePatterns))
    }
  } else {
    worktreePatterns = []
  }
  const branchPatternsString = String(branchPatterns)
  if (branchPatternsString === 'HEAD' || branchPatternsString === '.') {
    const currentBranch = await getCurrentBranchName(repo, remote)
    if (currentBranch) {
      branchPatterns = [currentBranch]
    } else if (isBare) {
      return [...refs.values()]
    } else {
      // NOTE current branch is undefined when HEAD is detached
      const head = worktreePatterns[0] === '.' ? repo.dir : noWorktree
      refs.set('HEAD', { shortname: 'HEAD', fullname: 'HEAD', type: 'branch', detached: true, head })
      return [...refs.values()]
    }
  } else if (
    (branchPatterns = Array.isArray(branchPatterns)
      ? branchPatterns.map((pattern) => String(pattern))
      : splitRefPatterns(branchPatternsString)).length
  ) {
    let headBranchIdx
    // NOTE we can assume at least two entries if HEAD or . are present
    if (~(headBranchIdx = branchPatterns.indexOf('HEAD')) || ~(headBranchIdx = branchPatterns.indexOf('.'))) {
      const currentBranch = await getCurrentBranchName(repo, remote)
      if (currentBranch) {
        // NOTE ignore if current branch is already in list
        if (~branchPatterns.indexOf(currentBranch)) {
          branchPatterns.splice(headBranchIdx, 1)
        } else {
          branchPatterns[headBranchIdx] = currentBranch
        }
      } else if (isBare) {
        branchPatterns.splice(headBranchIdx, 1)
      } else {
        let head = noWorktree
        if (worktreePatterns[0] === '.') {
          worktreePatterns = worktreePatterns.slice(1)
          head = repo.dir
        }
        // NOTE current branch is undefined when HEAD is detached
        refs.set('HEAD', { shortname: 'HEAD', fullname: 'HEAD', type: 'branch', detached: true, head })
        branchPatterns.splice(headBranchIdx, 1)
      }
    }
  } else {
    return [...refs.values()]
  }
  // NOTE isomorphic-git includes HEAD in list of remote branches (see https://isomorphic-git.org/docs/listBranches)
  const remoteBranches = (await git.listBranches(Object.assign({ remote }, repo))).filter((it) => it !== 'HEAD')
  if (remoteBranches.length) {
    for (const shortname of filterRefs(remoteBranches, branchPatterns, patternCache)) {
      const fullname = 'remotes/' + remote + '/' + shortname
      refs.set(shortname, { shortname, fullname, type: 'branch', remote, head: noWorktree })
    }
  }
  // NOTE only consider local branches if repo has a worktree or there are no remote tracking branches
  if (!isBare) {
    const localBranches = await git.listBranches(repo)
    if (localBranches.length) {
      const worktrees = await findWorktrees(repo, worktreePatterns)
      for (const shortname of filterRefs(localBranches, branchPatterns, patternCache)) {
        const head = worktrees.get(shortname) || noWorktree
        refs.set(shortname, { shortname, fullname: 'heads/' + shortname, type: 'branch', head })
      }
    }
  } else if (!managed || !remoteBranches.length) {
    const localBranches = await git.listBranches(repo)
    if (localBranches.length) {
      for (const shortname of filterRefs(localBranches, branchPatterns, patternCache)) {
        if (refs.has(shortname)) continue // NOTE prefer remote branches in bare repository
        refs.set(shortname, { shortname, fullname: 'heads/' + shortname, type: 'branch', head: noWorktree })
      }
    }
  }
  return [...refs.values()]
}

/**
 * Returns the current branch name or undefined if the HEAD is detached.
 */
function getCurrentBranchName (repo, remote) {
  let refPromise
  if (repo.noCheckout) {
    refPromise = git
      .resolveRef(Object.assign({ ref: 'refs/remotes/' + remote + '/HEAD', depth: 2 }, repo))
      .catch(() => git.resolveRef(Object.assign({ ref: 'HEAD', depth: 2 }, repo)))
  } else {
    refPromise = git.resolveRef(Object.assign({ ref: 'HEAD', depth: 2 }, repo))
  }
  return refPromise.then((ref) => (ref.startsWith('refs/') ? ref.replace(SHORTEN_REF_RX, '') : undefined))
}

async function selectStartPaths (source, repo, remoteName, ref) {
  const url = repo.url
  const displayUrl = url || repo.dir
  const worktreePath = ref.head
  if (!worktreePath) {
    ref.oid = await git.resolveRef(
      Object.assign(ref.detached ? { ref: 'HEAD', depth: 1 } : { ref: 'refs/' + ref.fullname }, repo)
    )
  }
  if ('startPaths' in source) {
    let startPaths
    startPaths = Array.isArray((startPaths = source.startPaths))
      ? startPaths.map(coerceToString).map(cleanStartPath)
      : (startPaths = coerceToString(startPaths)) && startPaths.split(VENTILATED_CSV_RX).map(cleanStartPath)
    startPaths = await (worktreePath
      ? resolvePathGlobsFs(worktreePath, startPaths)
      : resolvePathGlobsGit(repo, ref.oid, startPaths))
    if (!startPaths.length) {
      const where = worktreePath || (worktreePath === false ? repo.gitdir : displayUrl)
      const flag = worktreePath ? ' <worktree>' : ref.remote && worktreePath === false ? ` <remotes/${ref.remote}>` : ''
      throw new Error(`no start paths found in ${where} (${ref.type}: ${ref.shortname}${flag})`)
    }
    return startPaths
  }
  return [cleanStartPath(coerceToString(source.startPath))]
}

async function collectFilesFromStartPaths (startPaths, repo, authStatus) {
  const buckets = []
  for (const { startPath, ref, originUrl, editUrl, version } of startPaths) {
    buckets.push(await collectFilesFromStartPath(startPath, repo, authStatus, ref, originUrl, editUrl, version))
  }
  repo.cache = undefined
  return buckets
}

function collectFilesFromStartPath (startPath, repo, authStatus, ref, originUrl, editUrl, version) {
  const worktreePath = ref.head
  const origin = computeOrigin(originUrl, authStatus, repo.gitdir, ref, startPath, worktreePath, editUrl)
  return (worktreePath ? readFilesFromWorktree(origin) : readFilesFromGitTree(repo, ref.oid, startPath))
    .then((files) => {
      const batch = deepClone((origin.descriptor = loadComponentDescriptor(files, ref, version)))
      if ('nav' in batch && Array.isArray(batch.nav)) batch.nav.origin = origin
      batch.files = files.map((file) => assignFileProperties(file, origin))
      batch.origins = [origin]
      return batch
    })
    .catch((err) => {
      const where = worktreePath || (worktreePath === false ? repo.gitdir : repo.url || repo.dir)
      const flag = worktreePath ? ' <worktree>' : ref.remote && worktreePath === false ? ` <remotes/${ref.remote}>` : ''
      const pathInfo = startPath ? (err.message.startsWith('the start path ') ? '' : ` | start path: ${startPath}`) : ''
      const message = err.message.replace(/$/m, ` in ${where} (${ref.type}: ${ref.shortname}${flag}${pathInfo})`)
      throw Object.assign(err, { message })
    })
}

function readFilesFromWorktree (origin) {
  const startPath = origin.startPath
  const cwd = ospath.join(origin.worktree, startPath, '.') // . shaves off trailing slash
  return fsp.stat(cwd).then(
    (startPathStat) => {
      if (!startPathStat.isDirectory()) throw new Error(`the start path '${startPath}' is not a directory`)
      return srcFs(cwd, origin)
    },
    () => {
      throw new Error(`the start path '${startPath}' does not exist`)
    }
  )
}

function srcFs (cwd, origin) {
  return new Promise((resolve, reject, files = []) =>
    pipeline(
      globStream(CONTENT_SRC_GLOB, Object.assign({ cwd }, CONTENT_SRC_OPTS)),
      forEach(({ path: relpath, dirent }, _, done) => {
        if (dirent.isDirectory()) return done()
        const relpathPosix = relpath
        const abspath = posixify ? ospath.join(cwd, (relpath = ospath.normalize(relpath))) : cwd + '/' + relpath
        fsp.stat(abspath).then(
          (stat) =>
            fsp.readFile(abspath).then(
              (contents) => {
                files.push(new File({ path: relpathPosix, contents, stat, src: { abspath } }))
                done()
              },
              (readErr) => {
                const logObject = { file: { abspath, origin } }
                readErr.code === 'ENOENT'
                  ? logger.warn(logObject, `ENOENT: file or directory disappeared, ${readErr.syscall} ${relpath}`)
                  : logger.error(logObject, readErr.message.replace(`'${abspath}'`, relpath))
                done()
              }
            ),
          (statErr) => {
            const logObject = { file: { abspath, origin } }
            if (dirent.isSymbolicLink()) {
              fsp
                .readlink(abspath)
                .then(
                  (symlink) =>
                    (statErr.code === 'ELOOP' ? 'ELOOP: symbolic link cycle, ' : 'ENOENT: broken symbolic link, ') +
                    `${relpath} -> ${symlink}`,
                  () => statErr.message.replace(`'${abspath}'`, relpath)
                )
                .then((message) => {
                  logger.error(logObject, message)
                  done()
                })
            } else {
              statErr.code === 'ENOENT'
                ? logger.warn(logObject, `ENOENT: file or directory disappeared, ${statErr.syscall} ${relpath}`)
                : logger.error(logObject, statErr.message.replace(`'${abspath}'`, relpath))
              done()
            }
          }
        )
      }),
      (err) => (err ? reject(err) : resolve(files))
    )
  )
}

function readFilesFromGitTree (repo, oid, startPath) {
  return git.readTree(Object.assign({ oid }, repo)).then((root) => {
    Object.assign(root, { dirname: '' })
    return startPath
      ? getGitTreeAtStartPath(repo, oid, startPath).then((start) => {
          Object.assign(start, { dirname: startPath })
          return srcGitTree(repo, root, start)
        })
      : srcGitTree(repo, root)
  })
}

function getGitTreeAtStartPath (repo, oid, startPath) {
  return git.readTree(Object.assign({ oid, filepath: startPath }, repo)).catch((err) => {
    const m = err instanceof ObjectTypeError && err.data.expected === 'tree' ? 'is not a directory' : 'does not exist'
    throw new Error(`the start path '${startPath}' ${m}`)
  })
}

function srcGitTree (repo, root, start = root) {
  return new Promise((resolve, reject) => {
    const files = []
    createGitTreeWalker(repo, root, filterGitEntry, gitEntryToFile)
      .on('entry', (file) => files.push(file))
      .on('error', reject)
      .on('end', () => resolve(files))
      .walk(start)
  })
}

function createGitTreeWalker (repo, root, filter, convert) {
  return Object.assign(new EventEmitter(), {
    walk (start) {
      return visitGitTree(this, repo, root, filter, convert, start).then(
        () => this.emit('end'),
        (err) => this.emit('error', err)
      )
    },
  })
}

function visitGitTree (emitter, repo, root, filter, convert, parent, dirname = '', following = new Set()) {
  const reads = []
  for (const entry of parent.tree) {
    const filterVerdict = filter(entry)
    if (filterVerdict) {
      const vfilePath = dirname ? path.join(dirname, entry.path) : entry.path
      if (entry.type === 'tree') {
        reads.push(
          git.readTree(Object.assign({ oid: entry.oid }, repo)).then((subtree) => {
            Object.assign(subtree, { dirname: path.join(parent.dirname, entry.path) })
            return visitGitTree(emitter, repo, root, filter, convert, subtree, vfilePath, following)
          })
        )
      } else if (entry.type === 'blob') {
        let mode
        if (entry.mode === SYMLINK_FILE_MODE) {
          reads.push(
            readGitSymlink(repo, root, parent, entry, following).then(
              (target) => {
                if (target.type === 'tree') {
                  return visitGitTree(emitter, repo, root, filter, convert, target, vfilePath, target.following)
                }
                if (target.type === 'blob' && filterVerdict === true && (mode = FILE_MODES[target.mode])) {
                  return convert(Object.assign({ mode, oid: target.oid, path: vfilePath }, repo)).then((result) =>
                    emitter.emit('entry', result)
                  )
                }
              },
              (err) => {
                if (err.symlink) {
                  err.message =
                    (err.code === 'ELOOP' ? 'ELOOP: symbolic link cycle' : 'ENOENT: broken symbolic link') +
                    `, ${vfilePath} -> ${err.symlink}`
                }
                throw err
              }
            )
          )
        } else if ((mode = FILE_MODES[entry.mode])) {
          reads.push(
            convert(Object.assign({ mode, oid: entry.oid, path: vfilePath }, repo)).then((result) =>
              emitter.emit('entry', result)
            )
          )
        }
      }
    }
  }
  // NOTE preserve scan order so error for symbolic link cycle is deterministic; ensures no rejections after resolve
  return Promise.allSettled(reads).then((results) => {
    const rejected = results.find(({ reason }) => reason)
    if (rejected) throw rejected.reason
  })
}

function readGitSymlink (repo, root, parent, { oid, path: name }, following) {
  const dirname = parent.dirname
  if (following.size === (following = new Set(following)).add(oid).size) {
    const err = { name: 'SymbolicLinkCycleError', code: 'ELOOP', oid, path: `${path.join(dirname, name)}` }
    return Promise.reject(Object.assign(new Error(`Symbolic link cycle detected at ${oid}:${err.path}`), err))
  }
  return git.readBlob(Object.assign({ oid }, repo)).then(({ blob: symlink }) => {
    symlink = decodeUint8Array(symlink)
    let target
    let targetParent = root
    if (dirname) {
      if (!(target = path.join('/', dirname, symlink).substr(1)) || target === dirname) {
        target = '.'
      } else if (target.startsWith(dirname + '/')) {
        target = target.substr(dirname.length + 1) // join doesn't remove trailing separator
        targetParent = parent
      }
    } else {
      target = path.normalize(symlink) // normalize doesn't remove trailing separator
    }
    if (target === '.') {
      const err = { name: 'SymbolicLinkCycleError', code: 'ELOOP', oid, path: `${path.join(dirname, name)}`, symlink }
      return Promise.reject(Object.assign(new Error(`Symbolic link cycle detected at ${oid}:${err.path}`), err))
    }
    const targetSegments = target.split('/')
    targetSegments[targetSegments.length - 1] || targetSegments.pop()
    return readGitObjectAtPath(repo, root, targetParent, targetSegments, following).catch((err) => {
      throw Object.assign(err, { symlink })
    })
  })
}

// QUESTION: could we use this to resolve the start path too?
function readGitObjectAtPath (repo, root, parent, pathSegments, following) {
  const firstPathSegment = pathSegments[0]
  for (const entry of parent.tree) {
    if (entry.path === firstPathSegment) {
      return entry.type === 'tree'
        ? git.readTree(Object.assign({ oid: entry.oid }, repo)).then((subtree) => {
            Object.assign(subtree, { dirname: path.join(parent.dirname, entry.path) })
            return (pathSegments = pathSegments.slice(1)).length
              ? readGitObjectAtPath(repo, root, subtree, pathSegments, following)
              : Object.assign(subtree, { type: 'tree', following }) // Q: should this create copy?
          })
        : entry.mode === SYMLINK_FILE_MODE
          ? readGitSymlink(repo, root, parent, entry, following)
          : Promise.resolve(entry)
    }
  }
  return Promise.reject(new NotFoundError(`${parent.oid}:${pathSegments.join('/')}`))
}

/**
 * Returns true (or 'treeOnly' if the entry is a symlink tree) if the entry
 * should be processed or false if it should be skipped. An entry with a path
 * (basename) that begins with dot ('.') is marked as skipped.
 */
function filterGitEntry (entry) {
  const entryPath = entry.path
  if (entryPath.charAt() === '.') return false
  if (entry.type === 'tree') return entry.mode === SYMLINK_FILE_MODE ? 'treeOnly' : true
  return entryPath.charAt(entryPath.length - 1) !== '~'
}

function gitEntryToFile (entry) {
  return git.readBlob(entry).then(({ blob: contents }) => {
    const stat = {
      mode: entry.mode,
      size: (contents = Buffer.from(contents.buffer)).byteLength,
      isDirectory: invariably.false,
      isFile: invariably.true,
      isSymbolicLink: invariably.false,
    }
    return new File({ path: entry.path, contents, stat })
  })
}

function loadComponentDescriptor (files, ref, version) {
  const descriptorFileIdx = files.findIndex((file) => file.path === COMPONENT_DESC_FILENAME)
  if (descriptorFileIdx < 0) throw new Error(`${COMPONENT_DESC_FILENAME} not found`)
  const descriptorFile = files[descriptorFileIdx]
  files.splice(descriptorFileIdx, 1)
  let data
  try {
    data = Object(yaml.load(descriptorFile.contents.toString(), { schema: yaml.CORE_SCHEMA }))
  } catch (err) {
    throw Object.assign(err, { message: `${COMPONENT_DESC_FILENAME} has invalid syntax; ${err.message}` })
  }
  if (data.name == null) throw new Error(`${COMPONENT_DESC_FILENAME} is missing a name`)
  const name = (data.name = String(data.name))
  if (name === '.' || name === '..' || ~name.indexOf('/')) {
    throw new Error(`name in ${COMPONENT_DESC_FILENAME} cannot have path segments: ${name}`)
  }
  if ('version' in data) version = data.version
  if (!version) {
    if (version === undefined) throw new Error(`${COMPONENT_DESC_FILENAME} is missing a version`)
    if (version === false) throw new Error(`${COMPONENT_DESC_FILENAME} has an invalid version`)
    version = '' + (typeof version === 'number' ? version : '')
  } else if (version === true) {
    version = ref.shortname.replace(PATH_SEPARATOR_RX, '-')
  } else if (version.constructor === Object) {
    const refname = ref.shortname
    let matched
    if (refname in version) {
      matched = version[refname]
    } else if (
      !Object.entries(version).some(([pattern, replacement]) => {
        const result = refname.replace(makeMatcherRx(pattern, VERSION_MATCHER_OPTS), '\0' + replacement)
        if (result === refname) return false
        matched = result.substr(1)
        return true
      })
    ) {
      matched = refname
    }
    if (matched === '.' || matched === '..') {
      throw new Error(`version in ${COMPONENT_DESC_FILENAME} cannot have path segments: ${matched}`)
    }
    version = matched.replace(PATH_SEPARATOR_RX, '-')
  } else if ((version = '' + version) === '.' || version === '..' || ~version.indexOf('/')) {
    throw new Error(`version in ${COMPONENT_DESC_FILENAME} cannot have path segments: ${version}`)
  }
  data.version = version
  return camelCaseKeys(data, ['asciidoc'])
}

function assignFileProperties (file, origin) {
  if (!file.src) file.src = {}
  Object.assign(file.src, { path: file.path, basename: file.basename, stem: file.stem, extname: file.extname, origin })
  if (origin.fileUriPattern) {
    const fileUri = origin.fileUriPattern.replace('%s', file.src.path)
    file.src.fileUri = ~fileUri.indexOf(' ') ? fileUri.replace(SPACE_RX, '%20') : fileUri
  }
  if (origin.editUrlPattern) {
    const editUrl = origin.editUrlPattern.replace('%s', file.src.path)
    file.src.editUrl = ~editUrl.indexOf(' ') ? editUrl.replace(SPACE_RX, '%20') : editUrl
  }
  return file
}

function buildFetchOptions (repo, progress, displayUrl, credentialsFromUrl, gitPlugins, fetchTags, operation) {
  const { credentialManager, http, urlRouter } = gitPlugins
  const onAuth = resolveCredentials.bind(credentialManager, new Map().set(undefined, credentialsFromUrl))
  const onAuthFailure = onAuth
  const onAuthSuccess = (url) => credentialManager.approved({ url })
  const opts = Object.assign({ corsProxy: false, depth: 1, http, onAuth, onAuthFailure, onAuthSuccess }, repo)
  if (urlRouter) opts.url = urlRouter.ensureGitSuffix(opts.url)
  if (progress) opts.onProgress = createProgressListener(progress, displayUrl, operation)
  if (operation === 'fetch') {
    opts.prune = true
    if (fetchTags) opts.tags = opts.pruneTags = true
  } else if (!fetchTags) {
    opts.noTags = true
  }
  return opts
}

function createProgress (urls, term) {
  if (term.isTTY && term.columns > 59) {
    let maxUrlLength = 0
    const width = term.columns
    for (const url of urls) {
      if (~url.indexOf(':') && GIT_URI_DETECTOR_RX.test(url)) {
        const urlLength = extractCredentials(url).displayUrl.length
        if (urlLength > maxUrlLength) maxUrlLength = urlLength
      }
    }
    return Object.assign(new MultiProgress(term), {
      // NOTE remove the operation width, then partition the difference between the url and bar
      maxLabelWidth: Math.min(Math.ceil((width - GIT_OPERATION_LABEL_LENGTH) / 2), maxUrlLength),
      width,
    })
  }
}

function createProgressListener (progress, progressLabel, operation) {
  const width = progress.width
  const progressBar = progress.newBar(formatProgressBar(progressLabel, progress.maxLabelWidth, operation), {
    complete: '#',
    incomplete: '-',
    renderThrottle: 25,
    total: 100,
    width,
  })
  const ticks = width - progressBar.fmt.replace(':bar', '').length
  // NOTE leave room for indeterminate progress at end of bar; this isn't strictly needed for a bare clone
  progressBar.scaleFactor = Math.max(0, (ticks - 1) / ticks)
  progressBar.tick(0)
  return Object.assign(onGitProgress.bind(progressBar), { finish: onGitComplete.bind(progressBar) })
}

function formatProgressBar (label, maxLabelWidth, operation) {
  const paddingSize = maxLabelWidth - label.length
  let padding = ''
  if (paddingSize < 0) {
    label = '...' + label.substr(-paddingSize + 3)
  } else if (paddingSize) {
    padding = ' '.repeat(paddingSize)
  }
  // NOTE assume operation has a fixed length
  return `[${operation}] ${label}${padding} [:bar]`
}

function onGitProgress ({ phase, loaded, total }) {
  const phaseIdx = GIT_PROGRESS_PHASES.indexOf(phase)
  if (~phaseIdx) {
    const scaleFactor = this.scaleFactor
    let ratio = ((loaded / total) * scaleFactor) / GIT_PROGRESS_PHASES.length
    if (phaseIdx) ratio += (phaseIdx * scaleFactor) / GIT_PROGRESS_PHASES.length
    // NOTE updates are automatically throttled based on renderThrottle option
    this.update(ratio > scaleFactor ? scaleFactor : ratio)
  }
}

function onGitComplete (err) {
  if (err) {
    this.chars.incomplete = '?'
    this.update(0)
    // NOTE force progress bar to update regardless of throttle setting
    this.render(undefined, true)
  } else {
    this.update(1)
  }
}

function resolveCredentials (credentialsFromUrlHolder, url, auth) {
  const credentialsFromUrl = credentialsFromUrlHolder.get() || {}
  if ('Authorization' in auth.headers) {
    if ('username' in credentialsFromUrl) {
      credentialsFromUrlHolder.clear()
    } else {
      return this.rejected({ url, auth })
    }
  } else if ('username' in credentialsFromUrl) {
    return credentialsFromUrl
  } else {
    auth = undefined
  }
  return this.fill({ url }).then((credentials) =>
    credentials
      ? { username: credentials.token || credentials.username, password: credentials.token ? '' : credentials.password }
      : this.rejected({ url, auth })
  )
}

function identifyAuthStatus (credentialManager, credentials, url) {
  return credentials ? 'auth-embedded' : credentialManager.status({ url }) ? 'auth-required' : undefined
}

/**
 * Generates a safe, unique folder name for a git URL.
 *
 * The purpose of this function is generate a safe, unique folder name for the cloned
 * repository that gets stored in the cache directory.
 *
 * The generated folder name follows the pattern: <basename>-<sha1-of-normalized-url>.git
 *
 * @param {String} url - The repository URL to convert.
 * @returns {String} The generated folder name.
 */
function generateCloneFolderName (url) {
  const normalizedUrl = removeGitSuffix(posixify ? posixify(url.toLowerCase()) : url.toLowerCase())
  const basename = normalizedUrl.split(ANY_SEPARATOR_RX).pop()
  return basename + '-' + createHash('sha1').update(normalizedUrl).digest('hex') + '.git'
}

/**
 * Resolve the HTTP URL of the specified remote for the given repository, removing embedded auth if present.
 *
 * @param {Repository} repo - The repository on which to operate.
 * @param {String} remoteName - The name of the remote to resolve.
 * @returns {String} The URL of the specified remote, if defined, or the file URI to the local repository.
 */
function resolveRemoteUrl (repo, remoteName) {
  return git.getConfig(Object.assign({ path: 'remote.' + remoteName + '.url' }, repo)).then((url) => {
    if (url) {
      if (url.startsWith('https://') || url.startsWith('http://')) {
        return ~url.indexOf('@') ? url.replace(URL_AUTH_CLEANER_RX, '$1') : url
      }
      if (url.startsWith('git@')) return 'https://' + url.substr(4).replace(':', '/')
      if (url.startsWith('ssh://')) {
        return 'https://' + url.substr(url.indexOf('@') + 1 || 6).replace(URL_PORT_CLEANER_RX, '$1')
      }
    }
    url = posixify ? 'file:///' + posixify(repo.dir) : 'file://' + repo.dir
    return ~url.indexOf(' ') ? url.replace(SPACE_RX, '%20') : url
  })
}

/**
 * Checks whether the specified URL matches a directory on the local filesystem.
 *
 * @param {String} url - The URL to check.
 * @returns {Boolean} A flag indicating whether the URL matches a directory on the local filesystem.
 */
function isDirectory (url) {
  return fsp.stat(url).then((stat) => stat.isDirectory(), invariably.false)
}

function tagsSpecified (sources) {
  return sources.some(({ tags }) => tags && (Array.isArray(tags) ? tags.length : true))
}

function loadGitPlugins (gitConfig, networkConfig, startDir) {
  const plugins = new Map((git.cores || git.default.cores || new Map()).get(GIT_CORE))
  for (const [name, request] of Object.entries(gitConfig.plugins || {})) {
    if (request) plugins.set(name, userRequire(request, { dot: startDir, paths: [startDir, __dirname] }))
  }
  let credentialManager, urlRouter
  if ((credentialManager = plugins.get('credentialManager'))) {
    if (typeof credentialManager.configure === 'function') {
      credentialManager.configure({ config: gitConfig.credentials, startDir })
    }
    if (typeof credentialManager.status !== 'function') Object.assign(credentialManager, { status: invariably.void })
  } else {
    credentialManager = new GitCredentialManagerStore().configure({ config: gitConfig.credentials, startDir })
  }
  if (gitConfig.ensureGitSuffix) urlRouter = { ensureGitSuffix: (url) => (url.endsWith('.git') ? url : url + '.git') }
  const http = plugins.get('http') || createGitHttpPlugin(networkConfig)
  return { credentialManager, http, urlRouter }
}

/**
 * Expands the content cache directory path and ensures it exists.
 *
 * @param {String} preferredCacheDir - The preferred cache directory. If the value is undefined,
 *   the user's cache folder is used.
 * @param {String} startDir - The directory to use in place of a leading '.' segment.
 *
 * @returns {Promise<String>} A promise that resolves to the absolute content cache directory.
 */
function ensureCacheDir (preferredCacheDir, startDir) {
  // QUESTION should fallback directory be relative to cwd, playbook dir, or tmpdir?
  const baseCacheDir =
    preferredCacheDir == null
      ? getCacheDir('antora' + (process.env.NODE_ENV === 'test' ? '-test' : '')) || ospath.resolve('.antora/cache')
      : expandPath(preferredCacheDir, { dot: startDir })
  const cacheDir = ospath.join(baseCacheDir, CONTENT_CACHE_FOLDER)
  return fsp.mkdir(cacheDir, { recursive: true }).then(
    () => cacheDir,
    (err) => {
      throw Object.assign(err, { message: `Failed to create content cache directory: ${cacheDir}; ${err.message}` })
    }
  )
}

function transformGitCloneError (err, displayUrl, authRequested) {
  let wrappedMsg, recoverable, trimMessage
  if (HTTP_ERROR_CODE_RX.test(err.code)) {
    switch (err.data.statusCode) {
      case 401:
        wrappedMsg = err.rejected
          ? 'Content repository not found or credentials were rejected'
          : 'Content repository not found or requires credentials'
        break
      case 404:
        wrappedMsg = authRequested
          ? 'Content repository not found or credentials were rejected'
          : 'Content repository not found'
        break
      default:
        wrappedMsg = err.message
        recoverable = trimMessage = true
    }
  } else if (err instanceof UrlParseError || err instanceof UnknownTransportError) {
    wrappedMsg = 'Content source uses an unsupported transport protocol'
  } else if (err.code === 'ENOTFOUND') {
    wrappedMsg = `Content repository host could not be resolved: ${err.hostname}`
  } else {
    wrappedMsg = err.message || String(err)
    recoverable = trimMessage = true
  }
  if (trimMessage && !~(wrappedMsg = wrappedMsg.trimEnd()).indexOf('. ')) wrappedMsg = wrappedMsg.replace(/\.$/, '')
  const errWrapper = new Error(`${wrappedMsg} (url: ${displayUrl})`)
  errWrapper.stack += `\nCaused by: ${err.stack ? inspect(err).replace(/^Error \[(.+?)\](?=: )/, '$1') : err}`
  if (recoverable) Object.defineProperty(errWrapper, 'recoverable', { value: true })
  return errWrapper
}

function splitRefPatterns (str) {
  return ~str.indexOf('{') ? str.split(VENTILATED_CSV_RX) : str.split(CSV_RX)
}

function camelCaseKeys (o, stopPaths = [], p = '') {
  if (Array.isArray(o)) return o.map((it) => camelCaseKeys(it, stopPaths, p))
  if (o == null || o.constructor !== Object) return o
  const pathPrefix = p && p + '.'
  const accum = {}
  for (const [k, v] of Object.entries(o)) {
    const camelKey = k.toLowerCase().replace(/[_-]([a-z0-9])/g, (_, l, idx) => (idx ? l.toUpperCase() : l))
    accum[camelKey] = ~stopPaths.indexOf(pathPrefix + camelKey) ? v : camelCaseKeys(v, stopPaths, pathPrefix + camelKey)
  }
  return accum
}

function cleanStartPath (value) {
  return value && ~value.indexOf('/') ? value.replace(SUPERFLUOUS_SEPARATORS_RX, '') : value
}

function coerceToString (value) {
  return value == null ? '' : String(value)
}

function findWorktrees (repo, patterns) {
  if (!patterns.length) return new Map()
  const linkedOnly = patterns[0] === '.' ? !(patterns = patterns.slice(1)) : true
  let worktreesDir
  const patternCache = repo.cache[REF_PATTERN_CACHE_KEY]
  return (
    patterns.length
      ? fsp
          .readdir((worktreesDir = ospath.join(repo.dir, '.git', 'worktrees')))
          .then((worktreeNames) => filterRefs(worktreeNames, patterns, patternCache), invariably.emptyArray)
          .then((worktreeNames) =>
            worktreeNames.length
              ? Promise.all(
                  worktreeNames.map((worktreeName) => {
                    const gitdir = ospath.resolve(worktreesDir, worktreeName)
                    // NOTE uses name of worktree as branch name if HEAD is detached
                    return git
                      .currentBranch(Object.assign({}, repo, { gitdir }))
                      .then((branch = worktreeName) =>
                        fsp
                          .readFile(ospath.join(gitdir, 'gitdir'), 'utf8')
                          .then((contents) => ({ branch, dir: ospath.dirname(contents.trimEnd()) }))
                      )
                  })
                ).then((entries) => entries.reduce((accum, it) => accum.set(it.branch, it.dir), new Map()))
              : new Map()
          )
      : Promise.resolve(new Map())
  ).then((worktrees) =>
    linkedOnly
      ? worktrees
      : git.currentBranch(repo).then((branch) => (branch ? worktrees.set(branch, repo.dir) : worktrees))
  )
}

async function gracefulPromiseAllWithLimit (tasks, limit = Infinity) {
  const rejections = []
  const recordRejection = (err) => rejections.push(err) && undefined
  const started = []
  if (tasks.length <= limit) {
    for (const task of tasks) started.push(task().catch(recordRejection))
  } else {
    const pending = []
    for (const task of tasks) {
      const current = task()
        .catch(recordRejection)
        .finally(() => pending.splice(pending.indexOf(current), 1))
      started.push(current)
      if (pending.push(current) < limit) continue
      await Promise.race(pending)
      if (rejections.length) break
    }
  }
  return Promise.all(started).then((results) => [results, rejections])
}

async function promiseAllWithLimit (tasks, limit = Infinity) {
  if (tasks.length <= limit) return Promise.all(tasks.map((task) => task()))
  const started = []
  const pending = []
  for (const task of tasks) {
    const current = task().finally(() => pending.splice(pending.indexOf(current), 1))
    started.push(current)
    if (pending.push(current) >= limit) await Promise.race(pending)
  }
  return Promise.all(started)
}

module.exports = aggregateContent
