// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from 'yjs';
import WebSocket from 'ws';
import { WebPubSubServiceClient } from '@azure/web-pubsub';
import {
  WebPubSubEventHandler,
  type WebPubSubEventHandlerOptions,
} from '@azure/web-pubsub-express';
import { type FetchInitialState } from '@/types';
import { WeaveStoreAzureWebPubSubSyncHost } from './azure-web-pubsub-host';
import { WeaveAzureWebPubsubServer } from './azure-web-pubsub-server';

export default class WeaveAzureWebPubsubSyncHandler extends WebPubSubEventHandler {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private _client: WebPubSubServiceClient;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private _connections: Map<string, WeaveStoreAzureWebPubSubSyncHost> =
    new Map();
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private _store_persistence: Map<string, NodeJS.Timeout> = new Map();
  private initialState: FetchInitialState;
  private actualServer: WeaveAzureWebPubsubServer;

  constructor(
    server: WeaveAzureWebPubsubServer,
    client: WebPubSubServiceClient,
    initialState: FetchInitialState,
    hub: string,
    // path: string,
    options?: WebPubSubEventHandlerOptions
  ) {
    super(hub, {
      ...options,
    });

    this.actualServer = server;
    this.initialState = initialState;
    this._client = client;
  }

  private getNewYDoc() {
    return new Y.Doc();
  }

  private async setupRoomPersistence(
    roomId: string,
    connection: WeaveStoreAzureWebPubSubSyncHost
  ) {
    if (!this._store_persistence.has(roomId)) {
      const intervalId = setInterval(async () => {
        const actualState = Y.encodeStateAsUpdate(connection.doc);
        if (this.actualServer && this.actualServer.persistRoom) {
          try {
            await this.actualServer.persistRoom(roomId, actualState);
          } catch (ex) {
            console.error(ex);
          }
        }
      }, parseInt(process.env.WEAVE_AZURE_WEB_PUBSUB_STATE_SYNC_FREQUENCY_SEG ?? '10') * 1000);

      this._store_persistence.set(roomId, intervalId);
    }
  }

  private async getHostConnection(roomId: string) {
    if (!this._connections.has(roomId)) {
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

      this._connections.set(roomId, connection);

      await this.setupRoomPersistence(roomId, connection);
    }

    return this._connections.get(roomId);
  }

  async clientConnect(roomId: string): Promise<string> {
    this.getHostConnection(roomId);

    const token = await this._client.getClientAccessToken({
      roles: [
        `webpubsub.joinLeaveGroup.${roomId}`,
        `webpubsub.sendToGroup.${roomId}.host`,
      ],
    });

    return token.url;
  }
}
