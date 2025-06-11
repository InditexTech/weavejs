// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveStore } from '@inditextech/weave-sdk';
import {
  WEAVE_STORE_CONNECTION_STATUS,
  type WeaveStoreOptions,
} from '@inditextech/weave-types';
import { WeaveStoreAzureWebPubSubSyncClient } from './client';
import { WEAVE_STORE_AZURE_WEB_PUBSUB } from './constants';
import {
  type WeaveStoreAzureWebPubsubOptions,
  type WeaveStoreAzureWebPubsubOnStoreFetchConnectionUrlEvent,
} from './types';

export class WeaveStoreAzureWebPubsub extends WeaveStore {
  private azureWebPubsubOptions: WeaveStoreAzureWebPubsubOptions;
  private roomId: string;
  protected provider!: WeaveStoreAzureWebPubSubSyncClient;
  protected name: string = WEAVE_STORE_AZURE_WEB_PUBSUB;
  protected supportsUndoManager = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected awarenessCallback!: (changes: any) => void;

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

    window.addEventListener('beforeunload', () => {
      const awareness = this.provider.awareness;
      awareness.destroy();
    });

    this.provider.on('status', (status) => {
      if (status === WEAVE_STORE_CONNECTION_STATUS.CONNECTED) {
        this.handleAwarenessChange();

        const awareness = this.provider.awareness;
        awareness.on('update', this.handleAwarenessChange.bind(this));
        awareness.on('change', this.handleAwarenessChange.bind(this));
      }

      if (status === WEAVE_STORE_CONNECTION_STATUS.DISCONNECTED) {
        const awareness = this.provider.awareness;
        awareness.destroy();
        awareness.off('update', this.handleAwarenessChange.bind(this));
        awareness.off('change', this.handleAwarenessChange.bind(this));
      }

      this.handleConnectionStatusChange(status);
    });
  }

  async connect(): Promise<void> {
    const { fetchClient } = this.azureWebPubsubOptions;

    let error: Error | null = null;
    try {
      this.instance.emitEvent<WeaveStoreAzureWebPubsubOnStoreFetchConnectionUrlEvent>(
        'onStoreFetchConnectionUrl',
        {
          loading: true,
          error: null,
        }
      );
      await this.provider.fetchConnectionUrl(fetchClient ?? fetch);
    } catch (ex) {
      error = ex as Error;
    } finally {
      this.handleConnectionStatusChange(WEAVE_STORE_CONNECTION_STATUS.ERROR);
      this.instance.emitEvent<WeaveStoreAzureWebPubsubOnStoreFetchConnectionUrlEvent>(
        'onStoreFetchConnectionUrl',
        {
          loading: false,
          error,
        }
      );
    }

    await this.provider.start();
  }

  disconnect(): void {
    const awareness = this.provider.awareness;
    awareness.destroy();
    awareness.off('update', this.handleAwarenessChange.bind(this));
    awareness.off('change', this.handleAwarenessChange.bind(this));

    this.provider.destroy();
  }

  handleAwarenessChange(emit: boolean = true): void {
    const awareness = this.provider.awareness;
    const values = Array.from(awareness.getStates().values());
    values.splice(awareness.clientID, 1);
    if (emit) {
      this.instance.emitEvent('onAwarenessChange', values);
    }
  }

  setAwarenessInfo(field: string, value: unknown): void {
    const awareness = this.provider.awareness;
    awareness.setLocalStateField(field, value);
  }
}
