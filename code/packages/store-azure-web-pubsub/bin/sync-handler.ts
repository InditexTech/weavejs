import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { encodeStateAsUpdate, applyUpdate, Doc } from "yjs";
import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { WebPubSubEventHandler } from "@azure/web-pubsub-express";
import ws from "ws";
import { WebPubSubSyncHost } from "y-azure-webpubsub";

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename);

const recoverFile = async (filename: string): Promise<Uint8Array | null> => {
  const roomsFolder = path.join(__dirname, "rooms");

  try {
    return await fs.readFile(path.join(roomsFolder, filename));
  } catch (error) {
    return null;
  }
};

const saveFile = async (filename: string, data: Uint8Array) => {
  const roomsFolder = path.join(__dirname, "rooms");

  let folderExists = false;
  try {
    await fs.access(roomsFolder);
    folderExists = true;
  } catch (error) {
    folderExists = false;
  }

  if (!folderExists) {
    await fs.mkdir(roomsFolder, { recursive: true });
  }

  await fs.writeFile(path.join(roomsFolder, filename), data);
};

export default class SyncHandler extends WebPubSubEventHandler {
  private _client: WebPubSubServiceClient;
  private _connections: Map<string, WebPubSubSyncHost> = new Map();

  constructor(hub: string, path: string, client: WebPubSubServiceClient) {
    super(hub, {
      path: path,
    });
    this._client = client;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConnected(connectedRequest: any) {
    console.log("Client connected", connectedRequest);
  }

  async getHostConnection(group: string) {
    if (!this._connections.has(group)) {
      console.log(`New connection to room: ${group}`);

      const doc = new Doc();

      const documentData = await recoverFile(`${group}.room`);
      if (documentData) {
        console.log("HAVE CONTENT!", documentData);
        applyUpdate(doc, documentData);
      }

      const connection = new WebPubSubSyncHost(this._client, group, doc, {
        WebSocketPolyfill: ws.WebSocket,
      });
      connection.start();

      setInterval(async () => {
        const actualState = encodeStateAsUpdate(doc);
        saveFile(`${group}.room`, actualState);
      }, 5000);

      this._connections.set(group, connection);
    }
    return this._connections.get(group);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async client_negotiate(req: any, res: any) {
    const group = req.query.id === undefined ? "default" : req.query.id;
    this.getHostConnection(group);

    const token = await this._client.getClientAccessToken({
      roles: [`webpubsub.joinLeaveGroup.${group}`, `webpubsub.sendToGroup.${group}.host`],
    });
    res.json({
      url: token.url,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // async client_disconnect(req: any, res: any) {
  //   const group = req.query.id === undefined ? "default" : req.query.id;
  //   this.getHostConnection(group);

  //   const token = await this._client.getClientAccessToken({
  //     roles: [`webpubsub.joinLeaveGroup.${group}`, `webpubsub.sendToGroup.${group}.host`],
  //   });
  //   res.json({
  //     url: token.url,
  //   });
  // }
}
