// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS } from "./constants";

export type WeaveStoreWebsocketsConnectionStatusKeys = keyof typeof WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS;
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
  onConnectionStatusChange?: (status: WeaveStoreWebsocketsConnectionStatus) => void;
};
