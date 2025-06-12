// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from 'yjs';
import { IncomingMessage } from 'http';

export type WeaveStoreWebsocketsOptions = {
  roomId: string;
  wsOptions: {
    serverUrl: string;
  };
};

export type PerformUpgrade = (req: IncomingMessage) => Promise<boolean>;
export type ExtractRoomId = (req: IncomingMessage) => string | undefined;
export type FetchInitialState = (doc: Y.Doc) => void;
export type PersistRoom = (
  roomId: string,
  actualState: Uint8Array<ArrayBufferLike>
) => Promise<void>;
export type FetchRoom = (roomId: string) => Promise<Uint8Array | null>;
