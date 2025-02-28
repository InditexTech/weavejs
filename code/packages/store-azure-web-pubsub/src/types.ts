import { WEAVER_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS } from "./constants";

export type WeaveStoreAzureWebPubsubConnectionStatusKeys = keyof typeof WEAVER_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS;
export type WeaveStoreAzureWebPubsubConnectionStatus =
  (typeof WEAVER_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS)[WeaveStoreAzureWebPubsubConnectionStatusKeys];

export type WeaveStoreAzureWebPubsubOptions = {
  roomId: string;
  url: string;
  callbacks?: WeaveStoreAzureWebPubsubStoreCallbacks;
};

export type WeaveStoreAzureWebPubsubStoreCallbacks = {
  onConnectionStatusChange?: (status: WeaveStoreAzureWebPubsubConnectionStatus) => void;
};
