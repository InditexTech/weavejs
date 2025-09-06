// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { TokenCredential } from '@azure/identity';
import * as Y from 'yjs';
import type { ConnectionContext } from './index.server';

export type WeaveStoreAzureWebPubsubConfig = {
  endpoint: string;
  hubName: string;
  auth?: {
    key?: string;
    custom?: TokenCredential;
  };
  persistIntervalMs?: number;
};

export type WeaveAzureWebPubsubSyncHandlerOptions = {
  persistIntervalMs?: number;
};

export type WeaveStoreAzureWebPubsubOptions = {
  roomId: string;
  url: string;
  fetchClient?: FetchClient;
};

export type WeaveStoreAzureWebPubsubOnStoreFetchConnectionUrlEvent = {
  loading: boolean;
  error: Error | null;
};

export type FetchClient = (
  input: string | URL | globalThis.Request,
  init?: RequestInit
) => Promise<Response>;

export type FetchInitialState = (doc: Y.Doc) => void;
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
  roomId: string | null;
  context: ConnectionContext;
  connections: number;
  rooms: number;
  roomsConnections: Record<string, number>;
};

export type WeaveStoreAzureWebPubsubOnConnectedEvent = {
  roomId: string | null;
  context: ConnectionContext;
  connections: number;
  rooms: number;
  roomsConnections: Record<string, number>;
};

export type WeaveStoreAzureWebPubsubOnDisconnectedEvent = {
  roomId: string | null;
  context: ConnectionContext;
  connections: number;
  rooms: number;
  roomsConnections: Record<string, number>;
};
