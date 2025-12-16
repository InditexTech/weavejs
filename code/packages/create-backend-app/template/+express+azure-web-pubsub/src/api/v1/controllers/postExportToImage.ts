// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { Request, Response } from 'express'
import archiver from 'archiver'
import { WeaveExportFormats } from '@inditextech/weave-types'
import { getServiceConfig } from '../../../config/config.js'
import { runWorker } from '../../../workers/workers.js'
import { ExportToImageWorkerResult } from './workers/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const WeaveExportFormatsSchema: z.ZodType<WeaveExportFormats> = z.enum([
  'image/png',
  'image/jpeg'
])

const payloadSchema = z.object({
  roomData: z.string().base64(),
  nodes: z.array(z.string()).optional().default([]),
  options: z.object({
    format: WeaveExportFormatsSchema.optional().default('image/png'),
    backgroundColor: z.string().optional().default('transparent'),
    padding: z.number().min(0).optional().default(20),
    pixelRatio: z.number().min(1).optional().default(1),
    quality: z.number().min(0).max(1).optional().default(1)
  }),
  responseType: z.enum(['base64', 'blob', 'zip']).optional().default('blob')
})

export const postExportToImageController = () => {
  const config = getServiceConfig()

  return async (req: Request, res: Response): Promise<void> => {
    const parsedBody = payloadSchema.safeParse(req.body)

    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.errors })
      return
    }

    try {
      console.log(__dirname)
      const result = await runWorker<ExportToImageWorkerResult>(
        path.join(__dirname, './workers/exportToImage.js'),
        {
          ...parsedBody.data,
          config
        }
      )

      const finalBuffer = result as Buffer

      // success
      const fileExtension =
        parsedBody.data.options.format.split('/')[1] === 'png' ? '.png' : '.jpg'

      if (parsedBody.data.responseType === 'zip') {
        res.setHeader('Content-Type', 'application/zip')
        res.setHeader('Content-Disposition', 'attachment; filename=export.zip')

        const archive = archiver('zip', { zlib: { level: 9 } })
        archive.pipe(res)

        archive.append(Buffer.from(finalBuffer), {
          name: `render${fileExtension}`
        })

        // Finalize ZIP
        archive.finalize()
        return
      }

      if (parsedBody.data.responseType === 'blob') {
        res.setHeader('Content-Type', 'application/octet-stream')
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="render${fileExtension}"`
        )

        res.status(200).send(Buffer.from(finalBuffer))
        return
      }

      res.status(200).json({
        url: `data:${parsedBody.data.options.format};base64,${Buffer.from(finalBuffer).toString('base64')}`
      })
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: 'Error processing image' })
    }
  }
}
