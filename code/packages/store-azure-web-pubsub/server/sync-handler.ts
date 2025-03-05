import * as Y from "yjs";
import WebSocket from "ws";
import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { WebPubSubEventHandler } from "@azure/web-pubsub-express";
import { WeaveStoreAzureWebPubSubSyncHost } from "./../src/host";
import { persistRoomStateToFile, getRoomStateFromFile } from "./utils";
import { initState } from "./init-state";

export default class SyncHandler extends WebPubSubEventHandler {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private _client: WebPubSubServiceClient;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private _connections: Map<string, WeaveStoreAzureWebPubSubSyncHost> = new Map();
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private _store_persistence: Map<string, NodeJS.Timeout> = new Map();

  constructor(hub: string, path: string, client: WebPubSubServiceClient) {
    super(hub, {
      path: path,
    });
    this._client = client;
  }

  getNewYDoc() {
    return new Y.Doc();
  }

  setupRoomPersistence(roomId: string, connection: WeaveStoreAzureWebPubSubSyncHost) {
    if (!this._store_persistence.has(roomId)) {
      const intervalId = setInterval(
        async () => {
          const actualState = Y.encodeStateAsUpdate(connection.doc);
          persistRoomStateToFile(`${roomId}.room`, actualState);
        },
        parseInt(process.env.WEAVE_AZURE_WEB_PUBSUB_STATE_SYNC_FREQUENCY_SEG ?? "10") * 1000,
      );

      this._store_persistence.set(roomId, intervalId);
    }
  }

  async getHostConnection(roomId: string) {
    if (!this._connections.has(roomId)) {
      const doc = this.getNewYDoc();

      const documentData = await getRoomStateFromFile(`${roomId}.room`);
      if (documentData) {
        console.log(`Room [${roomId}] has data!`);
        Y.applyUpdate(doc, documentData);
      } else {
        console.log(`Room [${roomId}] is new!`);
        initState(doc);
      }

      const connection = new WeaveStoreAzureWebPubSubSyncHost(this._client, roomId, doc, {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        WebSocketPolyfill: WebSocket,
      });
      connection.start();

      this._connections.set(roomId, connection);

      this.setupRoomPersistence(roomId, connection);
    }
    return this._connections.get(roomId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async clientConnect(req: any, res: any) {
    const roomId = req.params.roomId;
    this.getHostConnection(roomId);

    const token = await this._client.getClientAccessToken({
      roles: [`webpubsub.joinLeaveGroup.${roomId}`, `webpubsub.sendToGroup.${roomId}.host`],
    });

    res.json({
      url: token.url,
    });
  }
}
