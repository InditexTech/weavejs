// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type {
  WeaveStoreAzureWebPubSubSyncClientOptions,
  WeaveStoreAzureWebPubsubSyncHostOptions,
} from './types';

export const WEAVE_STORE_AZURE_WEB_PUBSUB = 'store-azure-web-pubsub';

export const WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS = {
  ['CONNECTING']: 'connecting',
  ['CONNECTED']: 'connected',
  ['DISCONNECTED']: 'disconnected',
  ['ERROR']: 'error',
};

export const WEAVE_STORE_HORIZONTAL_SYNC_HANDLER_CLIENT_TYPE = {
  ['PUB']: 'pub',
  ['SUB']: 'sub',
};

export const WEAVE_STORE_AZURE_WEB_PUBSUB_DESTROY_ROOM_STATUS = {
  ['NOT_FOUND']: 'not-found',
  ['NOT_CONNECTED']: 'not-connected',
  ['DESTROYED']: 'destroyed',
};

export const WEAVE_STORE_AZURE_WEB_PUBSUB_SYNC_CLIENT_DEFAULT_OPTIONS: WeaveStoreAzureWebPubSubSyncClientOptions =
  {
    clientConnection: {
      timeoutMs: 60000,
    },
    heartbeat: {
      checkWindowTimeMs: 60000,
      checkIntervalMs: 15000,
    },
  };

export const WEAVE_STORE_AZURE_WEB_PUBSUB_SYNC_HOST_DEFAULT_OPTIONS: WeaveStoreAzureWebPubsubSyncHostOptions =
  {
    heartbeat: {
      sendIntervalMs: 5000,
    },
    resync: {
      checkIntervalMs: 60000,
      attemptsLimit: 12,
    },
  };
