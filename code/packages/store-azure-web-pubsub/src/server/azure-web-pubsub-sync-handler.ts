// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from 'yjs';
import WebSocket from 'ws';
import { WebPubSubServiceClient } from '@azure/web-pubsub';
import {
  WebPubSubEventHandler,
  type WebPubSubEventHandlerOptions,
} from './event-handler';
import { type FetchInitialState } from '@/types';
import { WeaveStoreAzureWebPubSubSyncHost } from './azure-web-pubsub-host';
import { WeaveAzureWebPubsubServer } from './azure-web-pubsub-server';
import type { WeaveHorizontalSyncHandlerRedis } from './horizontal-sync-handler/redis/client';

export default class WeaveAzureWebPubsubSyncHandler extends WebPubSubEventHandler {
  private horizontalSyncHandler: WeaveHorizontalSyncHandlerRedis;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private _client: WebPubSubServiceClient;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private _rooms: Map<string, Y.Doc> = new Map();
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private _store_persistence: Map<string, NodeJS.Timeout> = new Map();
  private initialState: FetchInitialState;
  private actualServer: WeaveAzureWebPubsubServer;

  constructor(
    server: WeaveAzureWebPubsubServer,
    client: WebPubSubServiceClient,
    horizontalSyncHandler: WeaveHorizontalSyncHandlerRedis,
    initialState: FetchInitialState,
    hub: string,
    // path: string,
    options?: WebPubSubEventHandlerOptions
  ) {
    super(hub, {
      ...options,
    });

    this.actualServer = server;
    this.horizontalSyncHandler = horizontalSyncHandler;
    this.initialState = initialState;
    this._client = client;
  }

  private getNewYDoc() {
    return new Y.Doc();
  }

  private async setupRoomPersistence(roomId: string, doc: Y.Doc) {
    if (!this._store_persistence.has(roomId)) {
      const intervalId = setInterval(async () => {
        const actualState = Y.encodeStateAsUpdate(doc);
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
    if (!this._rooms.has(roomId)) {
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
        this.horizontalSyncHandler,
        roomId,
        doc,
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          WebSocketPolyfill: WebSocket,
        }
      );
      connection.start();

      connection.on('connected', () => {
        console.log('reload state');
      });

      this._rooms.set(roomId, doc);

      await this.setupRoomPersistence(roomId, doc);
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
      roles: [
        `webpubsub.joinLeaveGroup.${roomId}`,
        `webpubsub.sendToGroup.${roomId}.host`,
      ],
    });

    return token.url;
  }
}
