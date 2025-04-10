'use strict'

module.exports = Object.freeze({
  UI_CACHE_FOLDER: 'ui',
  UI_DESC_FILENAME: 'ui.yml',
  UI_SRC_GLOB: '**/!(*~)',
  UI_SRC_OPTS: {
    braceExpansion: false,
    dot: true,
    ignore: ['.git'],
    objectMode: true,
    onlyFiles: false,
    unique: false,
  },
})
