import { WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS } from './constants';

export type WeaveStoreAzureWebPubsubConnectionStatusKeys =
  keyof typeof WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS;
export type WeaveStoreAzureWebPubsubConnectionStatus =
  (typeof WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS)[WeaveStoreAzureWebPubsubConnectionStatusKeys];

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
