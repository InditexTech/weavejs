// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { parentPort } from 'worker_threads'
import sharp from 'sharp'
import { WEAVE_EXPORT_FORMATS } from '@inditextech/weave-types'
import { renderWeaveRoom } from '../../../../canvas/weave.js'

parentPort?.on('message', async ({ config, roomData, nodes, options }) => {
  const { instance, destroy } = await renderWeaveRoom(config, roomData)

  const { composites, width, height } = await instance.exportNodesServerSide(
    nodes,
    (nodes) => nodes,
    {
      format: options.format,
      padding: options.padding,
      pixelRatio: options.pixelRatio,
      backgroundColor: options.backgroundColor,
      quality: options.quality
    }
  )

  destroy()

  try {
    const composedImage = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    }).composite(composites)

    let imagePipeline = composedImage
    if (options.format === WEAVE_EXPORT_FORMATS.JPEG) {
      imagePipeline = composedImage.jpeg({
        quality: (options.quality ?? 0.8) * 100
      })
    }
    if (options.format === WEAVE_EXPORT_FORMATS.PNG) {
      imagePipeline = composedImage.png()
    }

    const imageBuffer = await imagePipeline.toBuffer()
    parentPort?.postMessage(imageBuffer, [imageBuffer.buffer as ArrayBuffer])
  } catch (error) {
    parentPort?.postMessage((error as Error).message)
  }
})
