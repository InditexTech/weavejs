// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from 'yjs';
import { WebPubSubServiceClient } from '@azure/web-pubsub';
import {
  WebPubSubEventHandler,
  type ConnectedRequest,
  type ConnectRequest,
  type ConnectResponseHandler,
  type DisconnectedRequest,
  type WebPubSubEventHandlerOptions,
} from './event-handler';
import {
  type FetchInitialState,
  type WeaveAzureWebPubsubSyncHandlerOptions,
  type WeaveStoreAzureWebPubsubOnConnectedEvent,
  type WeaveStoreAzureWebPubsubOnConnectEvent,
  type WeaveStoreAzureWebPubsubOnDisconnectedEvent,
} from '@/types';
import { WeaveStoreAzureWebPubSubSyncHost } from './azure-web-pubsub-host';
import { WeaveAzureWebPubsubServer } from './azure-web-pubsub-server';

export default class WeaveAzureWebPubsubSyncHandler extends WebPubSubEventHandler {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private _client: WebPubSubServiceClient;
  private readonly _rooms: Map<string, Y.Doc> = new Map();
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private readonly _roomsSyncHost: Map<
    string,
    WeaveStoreAzureWebPubSubSyncHost
  > = new Map();
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private _store_persistence: Map<string, NodeJS.Timeout> = new Map();
  private readonly syncOptions?: WeaveAzureWebPubsubSyncHandlerOptions;
  private initialState: FetchInitialState;
  private readonly server: WeaveAzureWebPubsubServer;

  constructor(
    hub: string,
    server: WeaveAzureWebPubsubServer,
    client: WebPubSubServiceClient,
    initialState: FetchInitialState,
    syncHandlerOptions?: WeaveAzureWebPubsubSyncHandlerOptions,
    eventHandlerOptions?: WebPubSubEventHandlerOptions
  ) {
    super(hub, {
      ...eventHandlerOptions,
      handleConnect: (req: ConnectRequest, res: ConnectResponseHandler) => {
        res.success();

        this.syncOptions?.onConnect?.(req.context.connectionId, req.queries);

        this.server.emitEvent<WeaveStoreAzureWebPubsubOnConnectEvent>(
          'onConnect',
          {
            context: req.context,
            queries: req.queries,
          }
        );
      },
      onConnected: (req: ConnectedRequest) => {
        this.syncOptions?.onConnected?.(req.context.connectionId);

        this.server.emitEvent<WeaveStoreAzureWebPubsubOnConnectedEvent>(
          'onConnected',
          {
            context: req.context,
          }
        );
      },
      onDisconnected: (req: DisconnectedRequest) => {
        this.handleConnectionDisconnection(req.context.connectionId);

        this.server.emitEvent<WeaveStoreAzureWebPubsubOnDisconnectedEvent>(
          'onDisconnected',
          {
            context: req.context,
          }
        );
      },
    });

    this.syncOptions = syncHandlerOptions;
    this.server = server;
    this.initialState = initialState;
    this._client = client;
  }

  private getNewYDoc() {
    return new Y.Doc();
  }

  private async setupRoomInstance(roomId: string): Promise<void> {
    this._rooms.set(roomId, this.getNewYDoc());

    const doc = this._rooms.get(roomId)!;

    let documentData = undefined;
    if (this.server?.fetchRoom) {
      documentData = await this.server.fetchRoom(roomId);
    }

    if (documentData) {
      Y.applyUpdate(doc, documentData);
    } else {
      this.initialState(doc);
    }

    this._roomsSyncHost.set(
      roomId,
      new WeaveStoreAzureWebPubSubSyncHost(
        this.server,
        this._client,
        roomId,
        doc
      )
    );

    const connection = this._roomsSyncHost.get(roomId)!;

    await connection.start();

    await this.setupRoomInstancePersistence(roomId);
  }

  private async persistRoomTask(roomId: string): Promise<void> {
    try {
      const doc = this._rooms.get(roomId);

      if (!doc) {
        return;
      }

      const actualState = Y.encodeStateAsUpdate(doc);
      if (this.server?.persistRoom) {
        await this.server.persistRoom(roomId, actualState);
      }
    } catch (ex) {
      console.error(ex);
    }
  }

  private async setupRoomInstancePersistence(roomId: string) {
    if (!this._store_persistence.has(roomId)) {
      const intervalId = setInterval(async () => {
        await this.persistRoomTask(roomId);
      }, this.syncOptions?.persistIntervalMs ?? 5000);

      this._store_persistence.set(roomId, intervalId);
    }
  }

  private async handleConnectionDisconnection(connectionId: string) {
    const connectionRoom = await this.syncOptions?.getConnectionRoom?.(
      connectionId
    );

    if (connectionRoom) {
      await this.syncOptions?.removeConnection?.(connectionId);
    }

    const roomConnections = connectionRoom
      ? await this.syncOptions?.getRoomConnections?.(connectionRoom)
      : [];

    if (connectionRoom && roomConnections?.length === 0) {
      await this.destroyRoomInstance(connectionRoom);
    }
  }

  async destroyRoomInstance(roomId: string): Promise<void> {
    const intervalId = this._store_persistence.get(roomId);
    if (intervalId) {
      clearInterval(intervalId);
    }
    this._store_persistence.delete(roomId);

    // flush document to storage
    await this.persistRoomTask(roomId);

    // stop sync host
    const syncHost = this._roomsSyncHost.get(roomId);
    if (syncHost) {
      await syncHost.stop();
      this._roomsSyncHost.delete(roomId);
    }

    this._rooms.delete(roomId);
  }

  private async getHostConnection(roomId: string) {
    if (!this._rooms.has(roomId)) {
      await this.setupRoomInstance(roomId);
    }
  }

  getRoomsLoaded(): string[] {
    return Array.from(this._rooms.keys());
  }

  getRoomSyncHost(
    roomId: string
  ): WeaveStoreAzureWebPubSubSyncHost | undefined {
    return this._roomsSyncHost.get(roomId);
  }

  async clientConnect(roomId: string): Promise<string | null> {
    try {
      await this.getHostConnection(roomId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (ex) {
      return null;
    }

    const token = await this._client.getClientAccessToken({
      groups: [roomId],
      roles: [
        `webpubsub.joinLeaveGroup.${roomId}`,
        `webpubsub.sendToGroup.${roomId}.host`,
      ],
    });

    const finalURL = `${token.url}&group=${roomId}`;

    return finalURL;
  }
}
