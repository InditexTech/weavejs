// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WebPubSubServiceClient, AzureKeyCredential } from '@azure/web-pubsub';
import {
  FetchInitialState,
  PersistRoom,
  FetchRoom,
  WeaveAzureWebPubsubConfig,
} from '../types';
import WeaveAzureWebPubsubSyncHandler from './azure-web-pubsub-sync-handler';
import { defaultInitialState } from './default-initial-state';

type WeaveAzureWebPubsubServerParams = {
  initialState?: FetchInitialState;
  pubsubConfig: WeaveAzureWebPubsubConfig;
  persistRoom?: PersistRoom;
  fetchRoom?: FetchRoom;
};

export class WeaveAzureWebPubsubServer {
  private syncHandler: WeaveAzureWebPubsubSyncHandler;
  persistRoom: PersistRoom | undefined = undefined;
  fetchRoom: FetchRoom | undefined = undefined;

  constructor({
    pubsubConfig,
    initialState = defaultInitialState,
    persistRoom,
    fetchRoom,
  }: WeaveAzureWebPubsubServerParams) {
    this.persistRoom = persistRoom;
    this.fetchRoom = fetchRoom;

    const credentials = new AzureKeyCredential(pubsubConfig.key ?? '');

    const syncClient: WebPubSubServiceClient = new WebPubSubServiceClient(
      pubsubConfig.endpoint,
      credentials,
      pubsubConfig.hubName
    );

    this.syncHandler = new WeaveAzureWebPubsubSyncHandler(
      pubsubConfig.hubName,
      `/api/webpubsub/hubs/${pubsubConfig.hubName}`,
      syncClient,
      initialState,
      this
    );
  }

  getMiddleware() {
    return this.syncHandler.getMiddleware();
  }

  async clientConnect(roomId: string) {
    return await this.syncHandler.clientConnect(roomId);
  }
}
