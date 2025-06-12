// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import Koa from 'koa';
import cors from '@koa/cors';
import Router from 'koa-router';
import { WeaveAzureWebPubsubServer } from '../src/index.server';

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename);

const host = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '1234');

const endpoint = process.env.WEAVE_AZURE_WEB_PUBSUB_ENDPOINT;
const key = process.env.WEAVE_AZURE_WEB_PUBSUB_KEY;
const hubName = process.env.WEAVE_AZURE_WEB_PUBSUB_HUB_NAME;

if (!endpoint || !key || !hubName) {
  throw new Error('Missing required environment variables');
}

const azureWebPubsubServer = new WeaveAzureWebPubsubServer({
  pubSubConfig: {
    endpoint,
    key,
    hubName,
  },
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

const app = new Koa();

const corsOptions = {
  origin(ctx) {
    return ctx.get('Origin') || '*';
  },
};

app.use(cors(corsOptions) as unknown as Koa.Middleware);

const router = new Router({
  prefix: `/api/v1/${hubName}`,
});

router.use(azureWebPubsubServer.getKoaMiddleware());
router.get(`/rooms/:roomId/connect`, async (ctx) => {
  const roomId = ctx.params.roomId;
  const url = await azureWebPubsubServer.clientConnect(roomId);
  console.log(`connect URL: ${url}`);
  if (!url) {
    ctx.status = 404;
    ctx.body = { error: 'Error connecting to the room' };
    return;
  }
  ctx.body = {
    url,
  };
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(port, host, 0, () => {
  // eslint-disable-next-line no-console
  console.log(`Server started @ http://${host}:${port}\n`);
  // eslint-disable-next-line no-console
  console.log(`Connection endpoint: /api/v1/${hubName}/{roomId}/connect`);
});
