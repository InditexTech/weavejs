// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WebPubSubServiceClient, AzureKeyCredential } from '@azure/web-pubsub';
import { DefaultAzureCredential, type TokenCredential } from '@azure/identity';
import koa from 'koa';
import Emittery from 'emittery';
import {
  type FetchInitialState,
  type PersistRoom,
  type FetchRoom,
  type WeaveStoreAzureWebPubsubConfig,
  type WeaveStoreAzureWebPubSubSyncHostClientConnectOptions,
} from '../types';
import WeaveAzureWebPubsubSyncHandler from './azure-web-pubsub-sync-handler';
import type { WebPubSubEventHandlerOptions } from './event-handler';
import type { RequestHandler } from 'express';
import { defaultInitialState } from '@inditextech/weave-sdk/server';

type WeaveAzureWebPubsubServerParams = {
  initialState?: FetchInitialState;
  pubSubConfig: WeaveStoreAzureWebPubsubConfig;
  eventsHandlerConfig?: WebPubSubEventHandlerOptions;
  persistRoom?: PersistRoom;
  fetchRoom?: FetchRoom;
};

export class WeaveAzureWebPubsubServer extends Emittery {
  private syncClient: WebPubSubServiceClient;
  private syncHandler: WeaveAzureWebPubsubSyncHandler;
  persistRoom: PersistRoom | undefined = undefined;
  fetchRoom: FetchRoom | undefined = undefined;

  constructor({
    pubSubConfig,
    eventsHandlerConfig,
    initialState = defaultInitialState,
    persistRoom,
    fetchRoom,
  }: WeaveAzureWebPubsubServerParams) {
    super();

    this.persistRoom = persistRoom;
    this.fetchRoom = fetchRoom;

    let credentials: TokenCredential | AzureKeyCredential | null = null;
    // Defined a custom credential
    if (!credentials && pubSubConfig.auth?.custom) {
      credentials = pubSubConfig.auth.custom;
    }
    // Defined a key credential (deprecated but supported for backward compatibility)
    if (!credentials && typeof pubSubConfig.auth?.key !== 'undefined') {
      console.warn(
        'Using key-based authentication is deprecated. Consider using DefaultAzureCredential for better security.'
      );
      credentials = new AzureKeyCredential(pubSubConfig.auth.key);
    }
    // Use DefaultAzureCredential as fallback (recommended for production)
    credentials ??= new DefaultAzureCredential();

    this.syncClient = new WebPubSubServiceClient(
      pubSubConfig.endpoint,
      credentials,
      pubSubConfig.hubName
    );

    this.syncHandler = new WeaveAzureWebPubsubSyncHandler(
      pubSubConfig.hubName,
      this,
      this.syncClient,
      initialState,
      {
        ...(pubSubConfig.persistIntervalMs && {
          persistIntervalMs: pubSubConfig.persistIntervalMs,
        }),
        ...pubSubConfig.connectionHandlers,
      },
      eventsHandlerConfig
    );
  }

  getKoaMiddleware(): koa.Middleware {
    return this.syncHandler.getKoaMiddleware();
  }

  getExpressJsMiddleware(): RequestHandler {
    return this.syncHandler.getExpressJsMiddleware();
  }

  getSyncHandler(): WeaveAzureWebPubsubSyncHandler {
    return this.syncHandler;
  }

  emitEvent<T>(event: string, payload?: T): void {
    this.emit(event, payload);
  }

  addEventListener<T>(event: string, callback: (payload: T) => void): void {
    this.on(event, callback);
  }

  removeEventListener<T>(event: string, callback: (payload: T) => void): void {
    this.off(event, callback);
  }

  async clientConnect(
    roomId: string,
    connectionOptions?: WeaveStoreAzureWebPubSubSyncHostClientConnectOptions
  ): Promise<string | null> {
    return await this.syncHandler.clientConnect(roomId, connectionOptions);
  }
}
