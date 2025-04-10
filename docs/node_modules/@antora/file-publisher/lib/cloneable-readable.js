'use strict'

const { PassThrough } = require('stream')

const invariably = { void: () => undefined }

// a fork of https://github.com/mcollina/cloneable-readable (MIT), but based on Node.js APIs
// all clones attached to the cloneable, as well as the cloneable itself, must be piped to start the flow
class CloneableReadable extends PassThrough {
  constructor (original, opts) {
    super(Object.assign({}, opts, { objectMode: original.readableObjectMode }))
    forwardDestroy((this._original = original), this)
    this.setMaxListeners(0)
    this._numStreams = 1
    this._hasListener = true
    this.on('newListener', onNewListener).on('resume', onResume)
  }

  clone () {
    if (!this._original) throw new Error('stream has already been started')
    this._numStreams++
    if (this._hasListener) this.removeListener('newListener', onNewListener).removeListener('resume', onResume)
    const clone = new ReadableClone(this)
    if (this._hasListener) this.on('newListener', onNewListener).on('resume', onResume)
    return clone
  }
}

class ReadableClone extends PassThrough {
  constructor (cloneable, opts) {
    super(Object.assign({}, opts, { objectMode: cloneable.readableObjectMode }))
    forwardDestroy((this._cloneable = cloneable), this)
    Object.defineProperty(cloneable, 'resume', { value: invariably.void, configurable: true })
    cloneable.pipe(this)
    delete cloneable.resume // restore shadowed method
    this.on('newListener', onNewListener).once('resume', onResume)
  }
}

function forwardDestroy (from, to) {
  const onClose = () => to.end()
  from.on('error', (err) => {
    from.removeListener('close', onClose)
    to.destroy(err)
  })
  from.on('close', onClose)
}

function onNewListener (eventName, listener) {
  if (eventName === 'data' || eventName === 'readable' || eventName === 'close') {
    const isClone = this instanceof ReadableClone
    if (isClone) {
      pipeIfFulfilled(this._cloneable)
    } else {
      if (eventName === 'close') return
      this._hasListener = false
    }
    this.removeListener('newListener', onNewListener).removeListener('resume', onResume)
    if (!isClone) pipeIfFulfilled(this)
  }
}

function onResume () {
  const isClone = this instanceof ReadableClone
  if (!isClone) this._hasListener = false
  this.removeListener('newListener', onNewListener).removeListener('resume', onResume)
  pipeIfFulfilled(isClone ? this._cloneable : this)
}

function pipeIfFulfilled (cloneable) {
  if (--cloneable._numStreams !== 0 || cloneable.destroyed) return
  cloneable._original.pipe(cloneable)
  cloneable._original = undefined
}

module.exports = CloneableReadable
