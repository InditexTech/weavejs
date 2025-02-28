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
