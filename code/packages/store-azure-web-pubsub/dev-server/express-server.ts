// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import cors from 'cors';
import express, { Router } from 'express';
import { WeaveAzureWebPubsubServer } from '../src/index.server';
import {
  WeaveStoreOnPubSubClientStatusChange,
  WeaveStoreOnStoreConnectionStatusChangeEvent,
} from '@inditextech/weave-types';

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename);

const host = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '1234');

const endpoint = process.env.WEAVE_AZURE_WEB_PUBSUB_ENDPOINT;
const key = process.env.WEAVE_AZURE_WEB_PUBSUB_KEY;
const hubName = process.env.WEAVE_AZURE_WEB_PUBSUB_HUB_NAME;

const syncHandlerEnabled = process.env.WEAVE_REDIS_ENABLED === 'true';
const redisHost = process.env.WEAVE_REDIS_HOST ?? 'localhost';
const redisPortString = process.env.WEAVE_REDIS_PORT;
let redisPort = 6379;
try {
  redisPort = parseInt(redisPortString ?? '6379');
} catch (ex) {
  console.error(ex);
}
const redisPassword = process.env.WEAVE_REDIS_PASSWORD;
const redisKeyPrefix =
  process.env.WEAVE_REDIS_KEY_PREFIX ?? 'weavejs:room-sync:';

if (!endpoint || !key || !hubName) {
  throw new Error('Missing required environment variables');
}

const azureWebPubsubServer = new WeaveAzureWebPubsubServer({
  pubSubConfig: {
    endpoint,
    key,
    hubName,
  },
  horizontalSyncHandlerConfig: syncHandlerEnabled
    ? {
        type: 'redis',
        config: {
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          keyPrefix: redisKeyPrefix,
        },
      }
    : undefined,
  fetchRoom: async (docName: string) => {
    try {
      const roomsFolder = path.join(__dirname, 'rooms');
      const roomsFile = path.join(roomsFolder, docName);
      return await fs.readFile(roomsFile);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (ex) {
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (ex) {
      /* empty */
    }
  },
});

azureWebPubsubServer.addEventListener<WeaveStoreOnStoreConnectionStatusChangeEvent>(
  'onPubClientStatusChange',
  ({ status, delay, error }: WeaveStoreOnPubSubClientStatusChange) => {
    switch (status) {
      case 'connecting':
        console.log("['horizontal-sync-pub'] connecting");
        break;
      case 'connect':
        console.log("['horizontal-sync-pub'] connected");
        break;
      case 'ready':
        console.log("['horizontal-sync-pub'] ready");
        break;
      case 'end':
        console.log("['horizontal-sync-pub'] connection ended");
        break;
      case 'error':
        console.error("['horizontal-sync-pub'] error", error);
        break;
      case 'reconnecting':
        console.log(`['horizontal-sync-pub'] reconnecting in ${delay}ms`);
        break;

      default:
        break;
    }
  }
);

azureWebPubsubServer.addEventListener<WeaveStoreOnStoreConnectionStatusChangeEvent>(
  'onSubClientStatusChange',
  ({ status, delay, error }: WeaveStoreOnPubSubClientStatusChange) => {
    switch (status) {
      case 'connecting':
        console.log("['horizontal-sync-sub'] connecting");
        break;
      case 'connect':
        console.log("['horizontal-sync-sub'] connected");
        break;
      case 'ready':
        console.log("['horizontal-sync-sub'] ready");
        break;
      case 'end':
        console.log("['horizontal-sync-sub'] connection ended");
        break;
      case 'error':
        console.error("['horizontal-sync-sub'] error", error);
        break;
      case 'reconnecting':
        console.log(`['horizontal-sync-sub'] reconnecting in ${delay}ms`);
        break;
      default:
        break;
    }
  }
);

const app = express();

const corsOptions = {
  origin: true,
};

app.use(cors(corsOptions));

const router = Router();

router.use(azureWebPubsubServer.getExpressJsMiddleware());
router.get(`/rooms/:roomId/connect`, async (req, res) => {
  const roomId = req.params.roomId;
  const url = await azureWebPubsubServer.clientConnect(roomId);
  console.log(`connect URL: ${url}`);
  if (!url) {
    res.status(404).json({ error: 'Error connecting to the room' });
    return;
  }
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
