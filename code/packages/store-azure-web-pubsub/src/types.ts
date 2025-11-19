// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WebSocket } from 'ws';
import type { TokenCredential } from '@azure/identity';
import type { Doc } from 'yjs';
import type { ConnectionContext } from './index.server';
import type { WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS } from './constants';
import type { WeaveStoreAzureWebPubSubSyncClient } from './client';
import type { Encoder } from 'lib0/encoding';
import type { Decoder } from 'lib0/decoding';
import type { DeepPartial } from '@inditextech/weave-types';

export type WeaveStoreAzureWebPubsubConfig = {
  endpoint: string;
  persistIntervalMs?: number;
  hubName: string;
  auth?: {
    key?: string;
    custom?: TokenCredential;
  };
  connectionHandlers?: DeepPartial<WeaveAzureWebPubsubSyncHandlerOptions>;
};

export type WeaveAzureWebPubsubSyncHandlerOptions = {
  onConnect?: (
    connectionId: string,
    queries: Record<string, string[]> | undefined
  ) => Promise<void>;
  onConnected?: (connectionId: string) => Promise<void>;
  removeConnection?: (connectionId: string) => Promise<void>;
  getConnectionRoom?: (connectionId: string) => Promise<string | null>;
  getRoomConnections?: (roomId: string) => Promise<string[]>;
  persistIntervalMs?: number;
};

export type WeaveStoreAzureWebPubsubOptions = {
  roomId: string;
  url: string;
  fetchClient?: FetchClient;
  resyncIntervalMs: number;
};

export type WeaveStoreAzureWebPubsubOnStoreFetchConnectionUrlEvent = {
  loading: boolean;
  error: Error | null;
};

export type FetchClient = (
  input: string | URL | globalThis.Request,
  init?: RequestInit
) => Promise<Response>;

export type FetchInitialState = (doc: Doc) => void;
export type PersistRoom = (
  roomId: string,
  actualState: Uint8Array<ArrayBufferLike>
) => Promise<void>;
export type FetchRoom = (roomId: string) => Promise<Uint8Array | null>;

export type WeaveStoreAzureWebPubsubEvents = {
  onConnect: WeaveStoreAzureWebPubsubOnConnectEvent;
  onConnected: WeaveStoreAzureWebPubsubOnConnectedEvent;
  onDisconnected: WeaveStoreAzureWebPubsubOnDisconnectedEvent;
};

export type WeaveStoreAzureWebPubsubOnConnectEvent = {
  context: ConnectionContext;
  queries: Record<string, string[]> | undefined;
};

export type WeaveStoreAzureWebPubsubOnConnectedEvent = {
  context: ConnectionContext;
  queries?: Record<string, string[]>;
};

export type WeaveStoreAzureWebPubsubOnDisconnectedEvent = {
  context: ConnectionContext;
  queries?: Record<string, string[]>;
};

export type WeaveStoreAzureWebPubsubOnWebsocketOpenEvent = {
  group: string;
  event: WebSocket.Event;
};

export type WeaveStoreAzureWebPubsubOnWebsocketJoinGroupEvent = {
  group: string;
};

export type WeaveStoreAzureWebPubsubOnWebsocketMessageEvent = {
  group: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: WebSocket.MessageEvent;
};

export type WeaveStoreAzureWebPubsubOnWebsocketCloseEvent = {
  group: string;
  event: CloseEvent;
};

export type WeaveStoreAzureWebPubsubOnWebsocketErrorEvent = {
  group: string;
  error: ErrorEvent;
};

export type WeaveStoreAzureWebPubsubOnWebsocketOnTokenRefreshEvent = {
  group: string;
};

export type WeaveStoreAzureWebPubSubSyncHostClientConnectOptions = {
  expirationTimeInMinutes?: number;
};

// Client types

export type WeaveStoreAzureWebPubSubSyncClientConnectionStatusKeys =
  keyof typeof WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS;
export type WeaveStoreAzureWebPubSubSyncClientConnectionStatus =
  (typeof WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS)[WeaveStoreAzureWebPubSubSyncClientConnectionStatusKeys];

export enum MessageType {
  System = 'system',
  JoinGroup = 'joinGroup',
  SendToGroup = 'sendToGroup',
}

export enum MessageDataType {
  Init = 'init',
  Sync = 'sync',
  Awareness = 'awareness',
}

export interface MessageData {
  payloadId?: string;
  index?: number;
  type?: 'chunk' | 'end';
  totalChunks?: number;
  group: string;
  t: string; // type / target uuid
  f: string; // origin uuid
  c: string; // base64 encoded binary data
}

export interface Message {
  type: string;
  fromUserId: string;
  from: string;
  group: string;
  data: MessageData;
}

export type MessageHandler = (
  encoder: Encoder,
  decoder: Decoder,
  client: WeaveStoreAzureWebPubSubSyncClient,
  clientId: string,
  emitSynced: boolean,
  messageType: number
) => void;

export interface WeaveStoreAzureWebPubSubSyncClientOptions {
  resyncInterval: number;
  tokenProvider: Promise<string> | null;
}
