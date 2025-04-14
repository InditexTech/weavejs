// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from 'yjs';
import { WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS } from './constants';

export type WeaveStoreAzureWebPubsubConnectionStatusKeys =
  keyof typeof WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS;
export type WeaveStoreAzureWebPubsubConnectionStatus =
  (typeof WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS)[WeaveStoreAzureWebPubsubConnectionStatusKeys];

export type WeaveAzureWebPubsubConfig = {
  endpoint: string;
  key: string;
  hubName: string;
};

export type WeaveStoreAzureWebPubsubOptions = {
  roomId: string;
  url: string;
  fetchClient?: FetchClient;
  callbacks?: WeaveStoreAzureWebPubsubStoreCallbacks;
};

export type WeaveStoreAzureWebPubsubStoreCallbacks = {
  onFetchConnectionUrl?: (payload: {
    loading: boolean;
    error: Error | null;
  }) => void;
  onConnectionStatusChange?: (
    status: WeaveStoreAzureWebPubsubConnectionStatus
  ) => void;
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
