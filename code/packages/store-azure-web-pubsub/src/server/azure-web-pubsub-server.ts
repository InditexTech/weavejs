// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WebPubSubServiceClient, AzureKeyCredential } from '@azure/web-pubsub';
import koa from 'koa';
import Emittery from 'emittery';
import {
  type FetchInitialState,
  type PersistRoom,
  type FetchRoom,
  type WeaveStoreAzureWebPubsubConfig,
} from '../types';
import WeaveAzureWebPubsubSyncHandler from './azure-web-pubsub-sync-handler';
import { defaultInitialState } from './default-initial-state';
import type { WebPubSubEventHandlerOptions } from './event-handler';
import type { RequestHandler } from 'express-serve-static-core';

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

    const credentials = new AzureKeyCredential(pubSubConfig.key ?? '');

    this.syncClient = new WebPubSubServiceClient(
      pubSubConfig.endpoint,
      credentials,
      pubSubConfig.hubName
    );

    this.syncHandler = new WeaveAzureWebPubsubSyncHandler(
      this,
      this.syncClient,
      initialState,
      pubSubConfig.hubName,
      eventsHandlerConfig
    );
  }

  getKoaMiddleware(): koa.Middleware {
    return this.syncHandler.getKoaMiddleware();
  }

  getExpressJsMiddleware(): RequestHandler {
    return this.syncHandler.getExpressJsMiddleware();
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

  async clientConnect(roomId: string): Promise<string | null> {
    return await this.syncHandler.clientConnect(roomId);
  }
}
