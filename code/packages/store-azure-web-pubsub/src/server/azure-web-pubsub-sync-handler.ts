// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from 'yjs';
import WebSocket from 'ws';
import { WebPubSubServiceClient } from '@azure/web-pubsub';
import {
  WebPubSubEventHandler,
  type ConnectedRequest,
  type ConnectionContext,
  type ConnectRequest,
  type ConnectResponseHandler,
  type DisconnectedRequest,
  type WebPubSubEventHandlerOptions,
} from './event-handler';
import {
  type FetchInitialState,
  type WeaveAzureWebPubsubSyncHandlerOptions,
  type WeaveStoreAzureWebPubsubEvents,
} from '@/types';
import { WeaveStoreAzureWebPubSubSyncHost } from './azure-web-pubsub-host';
import { WeaveAzureWebPubsubServer } from './azure-web-pubsub-server';
import Emittery from 'emittery';

export default class WeaveAzureWebPubsubSyncHandler extends WebPubSubEventHandler {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private _client: WebPubSubServiceClient;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private readonly _connectionGroup: Map<string, string> = new Map();
  private readonly _connections: Map<string, ConnectionContext> = new Map();
  private readonly _groupConnections: Map<string, string[]> = new Map();
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private readonly _rooms: Map<string, Y.Doc> = new Map();
  private readonly _roomsSyncHost: Map<
    string,
    WeaveStoreAzureWebPubSubSyncHost
  > = new Map();
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private _store_persistence: Map<string, NodeJS.Timeout> = new Map();
  private readonly syncOptions?: WeaveAzureWebPubsubSyncHandlerOptions;
  private initialState: FetchInitialState;
  private actualServer: WeaveAzureWebPubsubServer;
  private readonly eventsHub: Emittery<WeaveStoreAzureWebPubsubEvents> =
    new Emittery<WeaveStoreAzureWebPubsubEvents>();

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
        const roomId = req.queries?.group?.[0];

        if (roomId) {
          this._connectionGroup.set(req.context.connectionId, roomId);

          this.eventsHub.emit('onConnect', {
            roomId: roomId,
            context: req.context,
            connections: this.getConnectionsAmount(),
            rooms: this.getRoomsAmount(),
            roomsConnections: this.getConnectionsAmountPerRoom(),
          });
        }

        res.success();
      },
      onConnected: (req: ConnectedRequest) => {
        this._connections.set(req.context.connectionId, req.context);

        let roomId: string | null = null;
        if (this._connectionGroup.has(req.context.connectionId)) {
          roomId = this._connectionGroup.get(req.context.connectionId) ?? null;
        }

        if (roomId) {
          const connections = this._groupConnections.get(roomId);
          if (connections) {
            connections.push(req.context.connectionId);
            this._groupConnections.set(roomId, connections);
          } else {
            this._groupConnections.set(roomId, [req.context.connectionId]);
          }

          this.eventsHub.emit('onConnected', {
            roomId,
            context: req.context,
            connections: this.getConnectionsAmount(),
            rooms: this.getRoomsAmount(),
            roomsConnections: this.getConnectionsAmountPerRoom(),
          });
        }
      },
      onDisconnected: (req: DisconnectedRequest) => {
        this._connections.delete(req.context.connectionId);

        let roomId: string | null = null;
        if (this._connectionGroup.has(req.context.connectionId)) {
          roomId = this._connectionGroup.get(req.context.connectionId) ?? null;
        }

        if (roomId && this._groupConnections.has(roomId)) {
          const connections = this._groupConnections.get(roomId);
          if (connections) {
            const index = connections.indexOf(req.context.connectionId);
            if (index !== -1) {
              connections.splice(index, 1);
              this._groupConnections.set(roomId, connections);
            }
          }

          this._connectionGroup.delete(req.context.connectionId);

          this.destroyRoomInstance(roomId);

          this.eventsHub.emit('onDisconnected', {
            roomId,
            context: req.context,
            connections: this.getConnectionsAmount(),
            rooms: this.getRoomsAmount(),
            roomsConnections: this.getConnectionsAmountPerRoom(),
          });
        }
      },
    });

    this.syncOptions = syncHandlerOptions;
    this.actualServer = server;
    this.initialState = initialState;
    this._client = client;
  }

  getConnections(): string[] {
    return Array.from(this._connections.keys());
  }

  getConnectionsAmount(): number {
    return this._connections.size;
  }

  getRooms(): string[] {
    return Array.from(this._rooms.keys());
  }

  getRoomsAmount(): number {
    return this._rooms.size;
  }

  getConnectionsPerRoom(): Record<string, string[]> {
    return Object.fromEntries(
      Array.from(this._groupConnections.entries()).map(([k, v]) => [k, v])
    );
  }

  getConnectionsAmountPerRoom(): Record<string, number> {
    return Object.fromEntries(
      Array.from(this._groupConnections.entries()).map(([k, v]) => [
        k,
        v.length,
      ])
    );
  }

  addEventListener(
    event: keyof WeaveStoreAzureWebPubsubEvents,
    callback: (payload: WeaveStoreAzureWebPubsubEvents[typeof event]) => void
  ): void {
    this.eventsHub.on(event, callback);
  }

  removeEventListener(
    event: keyof WeaveStoreAzureWebPubsubEvents,
    callback: (payload: WeaveStoreAzureWebPubsubEvents[typeof event]) => void
  ): void {
    this.eventsHub.off(event, callback);
  }

  private getNewYDoc() {
    return new Y.Doc();
  }

  private async setupRoomInstance(roomId: string): Promise<void> {
    const doc = this.getNewYDoc();

    let documentData = undefined;
    if (this.actualServer && this.actualServer.fetchRoom) {
      documentData = await this.actualServer.fetchRoom(roomId);
    }

    if (documentData) {
      Y.applyUpdate(doc, documentData);
    } else {
      this.initialState(doc);
    }

    const connection = new WeaveStoreAzureWebPubSubSyncHost(
      this._client,
      roomId,
      doc,
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        WebSocketPolyfill: WebSocket,
      }
    );
    connection.start();

    this._rooms.set(roomId, doc);
    this._roomsSyncHost.set(roomId, connection);

    await this.setupRoomInstancePersistence(roomId);
  }

  private async persistRoomTask(roomId: string): Promise<void> {
    try {
      const doc = this._rooms.get(roomId);

      if (!doc) {
        return;
      }

      const actualState = Y.encodeStateAsUpdate(doc);
      if (this.actualServer && this.actualServer.persistRoom) {
        await this.actualServer.persistRoom(roomId, actualState);
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

  private async destroyRoomInstance(roomId: string): Promise<void> {
    if (this._groupConnections.get(roomId)?.length === 0) {
      this._groupConnections.delete(roomId);

      if (this._store_persistence.has(roomId)) {
        const intervalId = this._store_persistence.get(roomId);
        if (intervalId) {
          clearInterval(intervalId);
        }
        this._store_persistence.delete(roomId);
      }

      // flush document to storage
      await this.persistRoomTask(roomId);

      // stop sync host
      const syncHost = this._roomsSyncHost.get(roomId);
      if (syncHost) {
        await syncHost.stop();
      }

      this._rooms.delete(roomId);
    }
  }

  private async getHostConnection(roomId: string) {
    if (!this._rooms.has(roomId)) {
      await this.setupRoomInstance(roomId);
    }
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
