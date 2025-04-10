'use strict'

const CloneableReadable = require('./cloneable-readable')
const Stream = require('stream')
const { Readable } = Stream
const Vinyl = require('vinyl')

class File extends Vinyl {
  get relative () {
    return this.path
  }
}

class ReadableOutputFileArray extends Readable {
  constructor (array, cloneStreams) {
    super({ objectMode: true })
    this._array = array.map((it) => toOutputFile(it, cloneStreams)).reverse()
  }

  _read (size) {
    const array = this._array
    while (size--) {
      const next = array.pop()
      if (next === undefined) break
      this.push(next)
    }
    if (size > -1) this.push(null)
  }
}

function toOutputFile (file, cloneStreams) {
  let contents = file.contents
  if (contents instanceof Stream) {
    // NOTE: use guard in case contents is created on access (needed for @antora/lunr-extension <= 1.0.0-alpha.8)
    if (cloneStreams && (Object.getOwnPropertyDescriptor(file, 'contents') || { writable: true }).writable) {
      if (contents instanceof CloneableReadable) {
        contents._claimed ? (contents = contents.clone()) : (contents._claimed = true)
      } else if (typeof contents.clone === 'function' /* vinyl < 4 compat */) {
        contents = wrapLegacyStream(contents._claimed ? contents.clone() : (contents._claimed = true) && contents)
      } else {
        file.contents = ((contents = new CloneableReadable(contents))._claimed = true) && contents
      }
    } else {
      contents = wrapLegacyStream(contents)
    }
  }
  return new File({ contents, path: file.out.path, stat: file.stat })
}

function wrapLegacyStream (contents) {
  return contents instanceof Readable && Symbol.asyncIterator in contents ? contents : Readable.wrap(contents)
}

module.exports = ReadableOutputFileArray
