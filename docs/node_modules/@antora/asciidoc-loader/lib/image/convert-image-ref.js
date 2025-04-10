'use strict'

const computeRelativeUrlPath = require('../util/compute-relative-url-path')

function convertImageRef (resourceSpec, currentPage, contentCatalog) {
  const image = contentCatalog.resolveResource(resourceSpec, currentPage.src, 'image', ['image'])
  // technically, this should check for out instead of pub, but these properties are expected to be set together
  if (image?.pub) return computeRelativeUrlPath(currentPage.pub.url, image.pub.url)
}

module.exports = convertImageRef
