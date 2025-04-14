// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import http from 'http';
import * as number from 'lib0/number';
import { WeaveWebsocketsServer } from '../src';

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename);

const VALID_ROOM_WEBSOCKET_URL = /\/sync\/rooms\/(.*)/;

const host = process.env.HOST || 'localhost';
const port = number.parseInt(process.env.PORT || '1234');

const server = http.createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('okay');
});

const wss = new WeaveWebsocketsServer({
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

wss.handleUpgrade(server);

server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Server started @ http://0.0.0.0:${port}\n`);
});
