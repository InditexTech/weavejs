'use strict'

const expandPath = require('@antora/expand-path-helper')
const fs = require('fs')
const ospath = require('path')
const publishStream = require('./common/publish-stream')
const { Writable } = require('stream')
const forEach = (construct, write, final) => new Writable({ objectMode: true, construct, write, final })
const { ZipFile } = require('yazl')

const { DEFAULT_DEST_ARCHIVE } = require('../constants.js')

// FIXME right now we're assuming the archive is a zip
function publishToArchive (config, files, playbook) {
  const destFile = config.path || DEFAULT_DEST_ARCHIVE
  const absDestFile = expandPath(destFile, { dot: playbook.dir })
  const report = { provider: 'archive', path: destFile, resolvedPath: absDestFile }
  return publishStream(zipDest(absDestFile), files).then(() => report)
}

function zipDest (zipPath, zipFile = new ZipFile(), writeStream = undefined) {
  return forEach(
    (done) => {
      fs.mkdir(ospath.dirname(zipPath), { recursive: true }, (mkdirErr) =>
        mkdirErr ? done(mkdirErr) : zipFile.outputStream.pipe((writeStream = fs.createWriteStream(zipPath))) && done()
      )
    },
    (file, _, done) => {
      const zipStat = file.stat ? { compress: true, mode: file.stat.mode, mtime: file.stat.mtime } : { compress: true }
      try {
        file.isStream()
          ? zipFile.addReadStream(file.contents, file.relative, zipStat)
          : file.isNull() || zipFile.addBuffer(file.isSymbolic() ? file.symlink : file.contents, file.relative, zipStat)
        done()
      } catch (addErr) {
        const bubbleError = () => done(addErr)
        writeStream.on('error', bubbleError).on('close', bubbleError)
        zipFile.outputStream.end()
      }
    },
    (done) => {
      writeStream.on('error', done).on('close', done)
      zipFile.on('error', done).end()
    }
  )
}

module.exports = publishToArchive
