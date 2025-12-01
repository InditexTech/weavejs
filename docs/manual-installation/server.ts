import { IncomingMessage } from "http";
import express, { Request, Response } from "express";
import next from "next";
import { WeaveWebsocketsServer } from "@inditextech/weave-store-websockets/server";
import { fetchRoom, persistRoom } from "./weave/persistence";

const VALID_ROOM_WEBSOCKET_URL = /\/rooms\/(.*)\/connect/;

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const app = express();

  app.get("/{*splat}", (req: Request, res: Response) => {
    return handle(req, res);
  });

  // Fetch room initial data endpoint example
  app.get("/api/rooms/:roomId", async (req: Request, res: Response) => {
    const buffer = await fetchRoom(req.params.roomId);

    if (!buffer) {
      return res.status(404).send("Room not found");
    }

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${req.params.roomId}"`
    );

    res.setHeader("Content-Type", "image/png");
    res.send(buffer);
  });

  const server = app.listen(port, (err: Error | undefined) => {
    if (err) throw err;
    console.log(
      `> Server listening at http://localhost:${port} as ${
        dev ? "development" : process.env.NODE_ENV
      }`
    );
  });

  const weaveWebsocketsServerConfig = {
    performUpgrade: async (request: IncomingMessage) => {
      return VALID_ROOM_WEBSOCKET_URL.test(request.url ?? "");
    },
    extractRoomId: (request: IncomingMessage) => {
      const match = request.url?.match(VALID_ROOM_WEBSOCKET_URL);
      if (match) {
        return match[1];
      }
      return undefined;
    },
    fetchRoom,
    persistRoom,
  };

  const wss = new WeaveWebsocketsServer(weaveWebsocketsServerConfig);
  wss.handleUpgrade(server);
});
