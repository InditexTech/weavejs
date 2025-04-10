'use strict'

const expandPath = require('@antora/expand-path-helper')
const { promises: fsp } = require('fs')
const mkdirp = (path) => fsp.mkdir(path, { recursive: true })
const rmrf = (path) => fsp['rm' in fsp ? 'rm' : 'rmdir'](path, { recursive: true, force: true })
const ospath = require('path')
const { pathToFileURL } = require('url')
const publishStream = require('./common/publish-stream')
const { PassThrough, Writable } = require('stream')
const forEach = (write, final) => new Writable({ objectMode: true, write, final })

const { DEFAULT_DEST_FS } = require('../constants.js')

function publishToFs (config, files, playbook) {
  const destDir = config.path || DEFAULT_DEST_FS
  const absDestDir = expandPath(destDir, { dot: playbook.dir })
  return (config.clean ? rmrf(absDestDir).then(() => mkdirp(absDestDir)) : mkdirp(absDestDir))
    .then(() => publishStream(fsDest(absDestDir), files))
    .then(() => ({ provider: 'fs', path: destDir, resolvedPath: absDestDir, fileUri: pathToFileURL(absDestDir).href }))
}

function fsDest (toDir, dirs = new Map(), fileRestream = new PassThrough({ objectMode: true })) {
  return forEach(
    (file, _, done) => {
      if (file.isNull()) return done()
      fileRestream.push(file)
      const dir = ospath.dirname(file.path)
      if (dir === '.' || dirs.has(dir)) return done()
      dirs.set(dir, true)
      let ancestorDir = ospath.dirname(dir)
      do {
        if (ancestorDir === '.' || dirs.get(ancestorDir) === false) break
        dirs.set(ancestorDir, false)
      } while ((ancestorDir = ospath.dirname(ancestorDir)))
      done()
    },
    (done, mkdirs = []) => {
      dirs.forEach((create, dir) => create && mkdirs.push(mkdirp(ospath.join(toDir, dir))))
      Promise.all(mkdirs).then(() => {
        fileRestream
          .end()
          .pipe(
            forEach((file, _, done_) => {
              const abspath = ospath.join(toDir, file.path)
              const { gid, mode, uid } = file.stat || {}
              fsp.open(abspath, 'w', mode).then(async (fh) => {
                try {
                  await fh.writeFile(file.contents)
                  const stat = await fh.stat()
                  if (mode && mode !== stat.mode) await fh.chmod(mode)
                  const { gid: fGid, uid: fUid } = stat
                  const newOwner = { gid: fGid, uid: fUid }
                  if (typeof gid === 'number' && gid >= 0 && typeof fGid === 'number' && fGid >= 0 && gid !== fGid) {
                    newOwner.gid = gid
                    newOwner.changed = true
                  }
                  if (typeof uid === 'number' && uid >= 0 && typeof fUid === 'number' && fUid >= 0 && uid !== fUid) {
                    newOwner.uid = uid
                    newOwner.changed = true
                  }
                  if (newOwner.changed) await fh.chown(newOwner.uid, newOwner.gid).catch(() => undefined)
                  fh.close().then(done_, done_)
                } catch (writeErr) {
                  const bubbleError = () => done_(writeErr)
                  fh.close().then(bubbleError, bubbleError)
                }
              }, done_)
            })
          )
          .on('error', done)
          .on('close', done)
      }, done)
    }
  )
}

module.exports = publishToFs
