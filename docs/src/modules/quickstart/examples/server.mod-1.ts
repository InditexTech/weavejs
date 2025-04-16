import { IncomingMessage } from "http";
import express, { Request, Response } from "express";
import next from "next";
import { WeaveWebsocketsServer } from "@inditextech/weavejs-store-websockets/server"; // <1>
import { fetchRoom, persistRoom } from "./persistence"; // <2>

const VALID_ROOM_WEBSOCKET_URL = /\/sync\/rooms\/(.*)/; // <3>

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const app = express();

  app.get("/{*splat}", (req: Request, res: Response) => {
    return handle(req, res);
  });

  const server = app.listen(3000, (err: Error | undefined) => {
    if (err) throw err;
    console.log(
      `> Server listening at http://localhost:${port} as ${
        dev ? "development" : process.env.NODE_ENV
      }`
    );
  }); // <4>

  const weaveWebsocketsServerConfig = {
    performUpgrade: async (request: IncomingMessage) => {
      return VALID_ROOM_WEBSOCKET_URL.test(request.url ?? "");
    }, // <6>
    extractRoomId: (request: IncomingMessage) => {
      const match = request.url?.match(VALID_ROOM_WEBSOCKET_URL);
      if (match) {
        return match[1];
      }
      return undefined;
    }, // <7>
    fetchRoom, // <8>
    persistRoom, // <9>
  }; // <5>

  const wss = new WeaveWebsocketsServer(weaveWebsocketsServerConfig); // <10>

  wss.handleUpgrade(server); // <11>
});
