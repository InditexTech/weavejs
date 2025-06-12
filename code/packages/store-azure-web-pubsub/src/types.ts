// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from 'yjs';

export type WeaveStoreAzureWebPubsubConfig = {
  endpoint: string;
  key: string;
  hubName: string;
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
