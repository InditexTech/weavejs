// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import cors from 'cors';
import express, { Router } from 'express';
import { WeaveAzureWebPubsubServer } from '../src/index.server';

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename);

const host = process.env.WEAVE_AZURE_WEB_PUBSUB_HOST || 'localhost';
const port = parseInt(process.env.WEAVE_AZURE_WEB_PUBSUB_PORT || '1234');

const endpoint = process.env.WEAVE_AZURE_WEB_PUBSUB_ENDPOINT;
const key = process.env.WEAVE_AZURE_WEB_PUBSUB_KEY;
const hubName = process.env.WEAVE_AZURE_WEB_PUBSUB_HUB_NAME;

if (!endpoint || !key || !hubName) {
  throw new Error('Missing required environment variables');
}

const azureWebPubsubServer = new WeaveAzureWebPubsubServer({
  pubsubConfig: {
    endpoint,
    key,
    hubName,
  },
  fetchRoom: async (docName: string) => {
    try {
      const roomsFolder = path.join(__dirname, 'rooms');
      const roomsFile = path.join(roomsFolder, docName);
      return await fs.readFile(roomsFile);
    } catch (e) {
      return null;
    }
  },
  persistRoom: async (
    docName: string,
    actualState: Uint8Array<ArrayBufferLike>
  ) => {
    try {
      const roomsFolder = path.join(__dirname, 'rooms');

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
  },
});

const app = express();

const corsOptions = {
  origin: true,
};

app.use(cors(corsOptions));

const router = Router();

router.use(azureWebPubsubServer.getMiddleware());
router.get(`/rooms/:roomId/connect`, async (req, res) => {
  const roomId = req.params.roomId;
  const url = await azureWebPubsubServer.clientConnect(roomId);
  res.json({ url });
});

app.use(`/api/v1/${hubName}`, router);

app.listen(port, host, (err: Error | undefined) => {
  if (err) throw err;

  // eslint-disable-next-line no-console
  console.log(`Server started @ http://${host}:${port}\n`);
  // eslint-disable-next-line no-console
  console.log(`Connection endpoint: /api/v1/${hubName}/{roomId}/connect`);
});
