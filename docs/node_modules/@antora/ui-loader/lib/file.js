'use strict'

const { constants: fsc } = require('fs')
const { posix: path } = require('path')
const { Readable } = require('stream')
const Vinyl = require('vinyl')

const DEFAULT_FILE_MODE = 0o100666 & ~process.umask()
const invariably = { true: () => true, false: () => false }

class File extends Vinyl {
  get path () {
    return this.history[this.history.length - 1]
  }

  set path (path_) {
    this.history.push(path_)
  }

  get relative () {
    return this.history[this.history.length - 1]
  }

  isDot () {
    return ('/' + this.history[this.history.length - 1]).indexOf('/.') > -1
  }
}

class MemoryFile extends File {
  constructor (file) {
    const contents = file.contents || Buffer.alloc(0)
    const stat = {
      mode: DEFAULT_FILE_MODE,
      size: contents.length,
      isDirectory: invariably.false,
      isFile: invariably.true,
      isSymbolicLink: invariably.false,
    }
    super(Object.assign({}, file, { contents, stat }))
  }
}

class ZipReadable extends Readable {
  constructor (zipFile, options = {}) {
    super({ objectMode: true, highWaterMark: 1 })
    if ((this._closeable = (this._zipFile = zipFile).reader.fd != null) && !zipFile.autoClose) {
      throw new Error('ZipReadable requires file-based ZipFile to be initialized with autoClose:true option')
    }
    if (!zipFile.lazyEntries) {
      throw new Error('ZipReadable requires ZipFile to be initialized with lazyEntries:true option')
    }
    if ((this._startPath = options.startPath) && (this._startPath = path.join('/', this._startPath + '/')) !== '/') {
      this._startPath = this._startPath.slice(1)
    } else {
      this._startPath = undefined
    }
    this._init()
  }

  _init () {
    const zipFile = this._zipFile
    zipFile
      .on('entry', (entry) => {
        const mode = this.getFileMode(entry)
        if ((mode & fsc.S_IFMT) === fsc.S_IFDIR) return zipFile.readEntry()
        let path_ = entry.fileName
        if (this._startPath) {
          if (path_.length < this._startPath.length || !path_.startsWith(this._startPath)) return zipFile.readEntry()
          path_ = path_.slice(this._startPath.length)
        }
        const isLink = (mode & fsc.S_IFMT) === fsc.S_IFLNK
        const stat = {
          mode,
          mtime: entry.getLastModDate(),
          size: entry.uncompressedSize,
          isDirectory: invariably.false,
          isFile: invariably[!isLink],
          isSymbolicLink: invariably[isLink],
        }
        const file = { path: path_, stat }
        if (stat.size === 0) {
          file.contents = Buffer.alloc(0)
          this.push(new File(file))
        } else {
          zipFile.openReadStream(entry, (readErr, readStream) => {
            if (readErr) {
              zipFile.close()
              this.emit('error', readErr)
              return
            }
            if (isLink) {
              const buffer = []
              readStream
                .on('data', (chunk) => buffer.push(chunk))
                .on('error', (readStreamErr) => this.emit('error', readStreamErr))
                .on('end', () => {
                  file.symlink = (buffer.length === 1 ? buffer[0] : Buffer.concat(buffer)).toString()
                  this.push(new File(file))
                })
            } else {
              file.contents = readStream
              this.push(new File(file))
            }
          })
        }
      })
      .on(this._closeable ? 'close' : 'end', () => zipFile.emittedError || this.push(null))
  }

  _read (_n) {
    this._zipFile.readEntry()
  }

  getFileMode ({ externalFileAttributes }) {
    const attr = externalFileAttributes >> 16 || 33188
    return [448, 56, 7].map((mask) => attr & mask).reduce((a, b) => a + b, attr & fsc.S_IFMT)
  }
}

module.exports = { File, MemoryFile, ZipReadable }
