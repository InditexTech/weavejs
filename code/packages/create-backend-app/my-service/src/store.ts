import { WeaveWebsocketsServer } from '@inditextech/weavejs-store-websockets/server';
import path from 'path';
import fs from 'fs/promises';
import http from 'http';

const VALID_ROOM_WEBSOCKET_URL = /\/sync\/rooms\/(.*)/;

export const setupStore = (server: http.Server) => {
  const wss = new WeaveWebsocketsServer({
    performUpgrade: async (request: Request) => {
      return VALID_ROOM_WEBSOCKET_URL.test(request.url ?? '');
    },
    extractRoomId: (request: Request) => {
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
      actualState: Uint8Array<ArrayBufferLike>,
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
};
