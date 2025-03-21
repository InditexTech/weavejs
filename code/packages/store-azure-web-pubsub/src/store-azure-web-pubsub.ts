import {
  WeaveAwarenessChange,
  WeaveStore,
  WeaveStoreOptions,
} from '@inditextech/weavejs-sdk';
import { WeaveStoreAzureWebPubSubSyncClient } from './client';
import { WEAVE_STORE_AZURE_WEB_PUBSUB } from './constants';
import { FetchClient, WeaveStoreAzureWebPubsubOptions } from './types';

export class WeaveStoreAzureWebPubsub extends WeaveStore {
  private azureWebPubsubOptions: WeaveStoreAzureWebPubsubOptions;
  private roomId: string;
  protected provider!: WeaveStoreAzureWebPubSubSyncClient;
  protected name = WEAVE_STORE_AZURE_WEB_PUBSUB;
  protected supportsUndoManager = true;

  constructor(
    storeOptions: WeaveStoreOptions,
    azureWebPubsubOptions: WeaveStoreAzureWebPubsubOptions
  ) {
    super(storeOptions);

    const { roomId } = azureWebPubsubOptions;

    this.azureWebPubsubOptions = azureWebPubsubOptions;
    this.roomId = roomId;

    this.init();
  }

  private init() {
    const { url } = this.azureWebPubsubOptions;

    this.provider = new WeaveStoreAzureWebPubSubSyncClient(
      url,
      this.roomId,
      this.getDocument(),
      {
        resyncInterval: 1000,
        tokenProvider: null,
      }
    );

    this.provider.on('status', (status) => {
      this.azureWebPubsubOptions.callbacks?.onConnectionStatusChange?.(status);
      this.instance.emitEvent('onConnectionStatusChange', status);
    });
  }

  async connect(fetchClient?: FetchClient) {
    let error: Error | null = null;
    try {
      this.azureWebPubsubOptions.callbacks?.onFetchConnectionUrl?.({
        loading: true,
        error: null,
      });
      this.instance.emitEvent('onFetchConnectionUrl', {
        loading: true,
        error: null,
      });

      await this.provider.fetchConnectionUrl(fetchClient);
    } catch (ex) {
      error = ex as Error;
    } finally {
      this.azureWebPubsubOptions.callbacks?.onFetchConnectionUrl?.({
        loading: false,
        error,
      });
      this.instance.emitEvent('onFetchConnectionUrl', {
        loading: false,
        error,
      });
    }

    await this.provider.start();
  }

  async disconnect() {
    this.provider.destroy();
  }

  setAwarenessInfo(field: string, value: unknown) {
    const awareness = this.provider.awareness;
    awareness.setLocalStateField(field, value);
  }

  onAwarenessChange<K extends string, T>(
    callback: (changes: WeaveAwarenessChange<K, T>[]) => void
  ): void {
    const awareness = this.provider.awareness;
    awareness.on('change', () => {
      const values = Array.from(awareness.getStates().values());
      values.splice(awareness.clientID, 1);
      callback(values as WeaveAwarenessChange<K, T>[]);
    });
  }
}
