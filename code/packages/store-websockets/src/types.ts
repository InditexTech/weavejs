// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from 'yjs';
import { WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS } from './constants';
import { IncomingMessage } from 'http';

export type WeaveStoreWebsocketsConnectionStatusKeys =
  keyof typeof WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS;
export type WeaveStoreWebsocketsConnectionStatus =
  (typeof WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS)[WeaveStoreWebsocketsConnectionStatusKeys];

export type WeaveStoreWebsocketsOptions = {
  roomId: string;
  wsOptions: {
    serverUrl: string;
  };
  callbacks?: WeaveStoreWebsocketsCallbacks;
};

export type WeaveStoreWebsocketsCallbacks = {
  onConnectionStatusChange?: (
    status: WeaveStoreWebsocketsConnectionStatus
  ) => void;
};

export type PerformUpgrade = (req: IncomingMessage) => Promise<boolean>;
export type ExtractRoomId = (req: IncomingMessage) => string | undefined;
export type FetchInitialState = (doc: Y.Doc) => void;
export type PersistRoom = (
  roomId: string,
  actualState: Uint8Array<ArrayBufferLike>
) => Promise<void>;
export type FetchRoom = (roomId: string) => Promise<Uint8Array | null>;
