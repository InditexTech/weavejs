// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'
import cors from 'cors'
import express, { Router } from 'express'
import { WeaveAzureWebPubsubServer } from '@inditextech/weave-store-azure-web-pubsub/server' // <1>

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url)
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename)

const host = process.env.WEAVE_AZURE_WEB_PUBSUB_HOST || 'localhost'
const port = parseInt(process.env.WEAVE_AZURE_WEB_PUBSUB_PORT || '1234')

const endpoint = process.env.WEAVE_AZURE_WEB_PUBSUB_ENDPOINT // <2>
const key = process.env.WEAVE_AZURE_WEB_PUBSUB_KEY // <2>
const hubName = process.env.WEAVE_AZURE_WEB_PUBSUB_HUB_NAME // <2>

if (!endpoint || !key || !hubName) {
  throw new Error('Missing required environment variables')
}

// prettier-ignore
const azureWebPubsubServer = new WeaveAzureWebPubsubServer({ // <3>
  pubsubConfig: {
    endpoint,
    key,
    hubName,
  }, // <4>
  fetchRoom: async (docName: string) => {
    try {
      const roomsFolder = path.join(__dirname, "rooms");
      const roomsFile = path.join(roomsFolder, docName);
      return await fs.readFile(roomsFile);
    } catch (e) {
      return null;
    }
  }, // <5>
  persistRoom: async (
    docName: string,
    actualState: Uint8Array<ArrayBufferLike>
  ) => {
    try {
      const roomsFolder = path.join(__dirname, "rooms");

      let folderExists = false;
      try {
        await fs.access(roomsFolder);
        folderExists = true;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        folderExists = false;
      }

      if (!folderExists) {
        await fs.mkdir(roomsFolder, { recursive: true });
      }

      const roomsFile = path.join(roomsFolder, docName);
      await fs.writeFile(roomsFile, actualState);
    } catch (ex) {
      console.error(ex);
    }
  }, // <6>
})

const app = express()

// Example server: restricts allowed origins explicitly to whatever
// WEAVE_AZURE_WEB_PUBSUB_ALLOWED_ORIGINS lists (comma-separated), rather
// than reflecting back any Origin header a client sends (`origin: true`).
// No origins configured means no cross-origin access at all -- add the
// frontend's real origin(s) there instead of widening this default.
const allowedOrigins = (process.env.WEAVE_AZURE_WEB_PUBSUB_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsOptions = {
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
}

app.use(cors(corsOptions))

const router = Router()

router.use(azureWebPubsubServer.getMiddleware()) // <7>
router.get(`/rooms/:roomId/connect`, async (req, res) => {
  const roomId = req.params.roomId
  const url = await azureWebPubsubServer.clientConnect(roomId)
  res.json({ url })
}) // <8>

app.use(`/api/v1/${hubName}`, router) // <9>

app.listen(port, host, (err: Error | undefined) => {
  // <10>
  if (err) throw err

  // eslint-disable-next-line no-console
  console.log(`Server started @ http://${host}:${port}\n`)
  // eslint-disable-next-line no-console
  console.log(`Connection endpoint: /api/v1/${hubName}/{roomId}/connect`)
})
