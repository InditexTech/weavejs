// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import Koa from 'koa';
import { WeaveWebsocketsServer } from '../src/index.server';
import {
  WeaveStoreOnPubSubClientStatusChange,
  WeaveStoreOnStoreConnectionStatusChangeEvent,
} from '@inditextech/weave-types';

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename);

const VALID_ROOM_WEBSOCKET_URL = /\/sync\/rooms\/(.*)/;

const host = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '1234');

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

const app = new Koa();

const server = app.listen(port, host, 0, () => {
  // eslint-disable-next-line no-console
  console.log(`Server started: http://${host}:${port}\n`);
});

const wss = new WeaveWebsocketsServer({
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
  performUpgrade: async (request) => {
    return VALID_ROOM_WEBSOCKET_URL.test(request.url ?? '');
  },
  extractRoomId: (request) => {
    const match = request.url?.match(VALID_ROOM_WEBSOCKET_URL);
    if (match) {
      return match[1];
    }
    return undefined;
  },
  fetchRoom: async (docName: string) => {
    try {
      const roomsFolder = path.join(__dirname, 'rooms');
      const roomsFile = path.join(roomsFolder, docName);
      return await fs.readFile(roomsFile);
    } catch (ex) {
      console.error(ex);
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

wss.addEventListener<WeaveStoreOnStoreConnectionStatusChangeEvent>(
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

wss.addEventListener<WeaveStoreOnStoreConnectionStatusChangeEvent>(
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

wss.handleUpgrade(server);
