'use strict'

/**
 * Pipes the stream of files to the specified Vinyl destination adapter.
 *
 * Pipes a stream of virtual files to the specified Vinyl destination adapter
 * (a stream transform function) and returns a Promise that resolves when the
 * stream ends.
 *
 * @memberof file-publisher
 *
 * @param {Function} dest - A Vinyl destination adapter, preconfigured to
 *   write to a destination (e.g., `dest('path/to/dir')` from vinyl-fs).
 * @param {Readable<File>} files - A Readable stream of virtual files to publish.
 * @returns {Promise} A promise that resolves when the stream ends (i.e., emits the finish event).
 */
function publishStream (dest, files) {
  return new Promise((resolve, reject) => files.pipe(dest).on('error', reject).on('finish', resolve))
}

module.exports = publishStream
