// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveStore } from '@inditextech/weave-sdk';
import merge from 'lodash/merge';
import {
  WEAVE_STORE_CONNECTION_STATUS,
  type WeaveStoreOptions,
} from '@inditextech/weave-types';
import { WeaveStoreAzureWebPubSubSyncClient } from './client';
import {
  WEAVE_STORE_AZURE_WEB_PUBSUB,
  WEAVE_STORE_AZURE_WEB_PUBSUB_DEFAULT_CONFIG,
} from './constants';
import { type WeaveStoreAzureWebPubsubOptions } from './types';

export class WeaveStoreAzureWebPubsub extends WeaveStore {
  private azureWebPubsubOptions: WeaveStoreAzureWebPubsubOptions;
  private roomId: string;
  private initialRoomData: Uint8Array | undefined;
  protected provider!: WeaveStoreAzureWebPubSubSyncClient;
  protected name: string = WEAVE_STORE_AZURE_WEB_PUBSUB;
  protected supportsUndoManager = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected awarenessCallback!: (changes: any) => void;

  constructor(
    initialRoomData: Uint8Array | undefined,
    storeOptions: WeaveStoreOptions,
    azureWebPubsubOptions: Pick<
      WeaveStoreAzureWebPubsubOptions,
      'roomId' | 'url'
    > &
      Partial<Omit<WeaveStoreAzureWebPubsubOptions, 'roomId' | 'url'>>
  ) {
    super(storeOptions);

    const { roomId } = azureWebPubsubOptions;

    this.azureWebPubsubOptions = merge(
      WEAVE_STORE_AZURE_WEB_PUBSUB_DEFAULT_CONFIG,
      azureWebPubsubOptions
    );
    this.roomId = roomId;
    this.initialRoomData = initialRoomData;

    this.init();
  }

  setup(): void {
    super.setup();

    this.loadRoomData();
  }

  private loadRoomData() {
    if (this.initialRoomData) {
      this.loadDocument(this.initialRoomData);
      this.initialRoomData = undefined;
    }
  }

  private init() {
    const { url } = this.azureWebPubsubOptions;

    this.provider = new WeaveStoreAzureWebPubSubSyncClient(
      this,
      url,
      this.roomId,
      this.getDocument(),
      {
        resyncInterval: this.azureWebPubsubOptions.resyncIntervalMs,
        tokenProvider: null,
      }
    );

    window.addEventListener('beforeunload', () => {
      const awareness = this.provider.awareness;
      awareness.destroy();
    });

    this.provider.on('error', () => {
      this.handleConnectionStatusChange(
        WEAVE_STORE_CONNECTION_STATUS.DISCONNECTED
      );
      this.disconnect();
    });

    this.provider.on('status', (status) => {
      if (
        status === WEAVE_STORE_CONNECTION_STATUS.CONNECTED &&
        !this.instance.getRenderer().isInitialized()
      ) {
        this.instance.setupRenderer();
      }

      this.handleConnectionStatusChange(status);
    });
  }

  emitEvent<T>(name: string, payload?: T): void {
    this.instance.emitEvent(name, payload);
  }

  getClientId(): string | null {
    if (this.provider) {
      return this.provider.getClientId();
    }
    return null;
  }

  async connect(): Promise<void> {
    const { fetchClient } = this.azureWebPubsubOptions;

    const awareness = this.provider.awareness;
    awareness.on('update', this.handleAwarenessChange.bind(this));
    awareness.on('change', this.handleAwarenessChange.bind(this));

    this.provider.setFetchClient(fetchClient ?? window.fetch);

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

  setAwarenessInfo<T>(field: string, value: T): void {
    const awareness = this.provider.awareness;
    awareness.setLocalStateField(field, value);
  }
}
