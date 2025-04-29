import { IncomingMessage } from "http"; // [!code ++]
import express, { Request, Response } from "express";
import next from "next";
import { WeaveWebsocketsServer } from "@inditextech/weave-store-websockets/server"; // (1) [!code ++]
import { fetchRoom, persistRoom } from "./persistence"; // (2) [!code ++]

const VALID_ROOM_WEBSOCKET_URL = /\/sync\/rooms\/(.*)/; // (3) [!code ++]

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const app = express();

  app.get("/{*splat}", (req: Request, res: Response) => {
    return handle(req, res);
  });

  app.listen(3000, (err: Error | undefined) => { // [!code --]
  const server = app.listen(3000, (err: Error | undefined) => { // [!code ++]
    if (err) throw err;
    console.log(
      `> Server listening at http://localhost:${port} as ${
        dev ? "development" : process.env.NODE_ENV
      }`
    );
  }); // (4)

  const weaveWebsocketsServerConfig = { // [!code ++]
    performUpgrade: async (request: IncomingMessage) => { // [!code ++]
      return VALID_ROOM_WEBSOCKET_URL.test(request.url ?? ""); // [!code ++]
    }, // (6) [!code ++]
    extractRoomId: (request: IncomingMessage) => { // [!code ++]
      const match = request.url?.match(VALID_ROOM_WEBSOCKET_URL); // [!code ++]
      if (match) { // [!code ++]
        return match[1]; // [!code ++]
      } // [!code ++]
      return undefined; // [!code ++]
    }, // (7) [!code ++]
    fetchRoom, // (8) [!code ++]
    persistRoom, // (9) [!code ++]
  }; // (5) [!code ++]

  const wss = new WeaveWebsocketsServer(weaveWebsocketsServerConfig); // (10) [!code ++]

  wss.handleUpgrade(server); // (11) [!code ++]
});
