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
import {
  type FetchInitialState,
  type WeaveStoreAzureWebPubsubOptions,
} from './types';

export class WeaveStoreAzureWebPubsub extends WeaveStore {
  private azureWebPubsubOptions: WeaveStoreAzureWebPubsubOptions;
  private roomId: string;
  private started: boolean;
  private initialRoomData: Uint8Array | FetchInitialState | undefined;
  protected provider!: WeaveStoreAzureWebPubSubSyncClient;
  protected name: string = WEAVE_STORE_AZURE_WEB_PUBSUB;
  protected supportsUndoManager = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected awarenessCallback!: (changes: any) => void;

  constructor(
    initialRoomData: Uint8Array | FetchInitialState | undefined,
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
    this.started = false;

    this.init();
  }

  setup(): void {
    super.setup();
  }

  private loadRoomInitialData() {
    if (this.initialRoomData && this.initialRoomData instanceof Uint8Array) {
      this.loadDocument(this.initialRoomData);
    }
    if (this.initialRoomData && typeof this.initialRoomData === 'function') {
      this.loadDefaultDocument(this.initialRoomData);
    }
    if (!this.initialRoomData) {
      this.loadDefaultDocument();
    }

    this.initialRoomData = undefined;
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

    const awareness = this.provider.awareness;
    awareness.on('update', this.handleAwarenessChange.bind(this));
    awareness.on('change', this.handleAwarenessChange.bind(this));

    window.addEventListener('beforeunload', () => {
      const awareness = this.provider.awareness;
      if (awareness) awareness.destroy();
    });

    this.provider.on('error', () => {
      this.handleConnectionStatusChange(
        WEAVE_STORE_CONNECTION_STATUS.DISCONNECTED
      );
      this.disconnect();
    });

    this.provider.on('status', (status) => {
      this.handleConnectionStatusChange(status);

      if (status === WEAVE_STORE_CONNECTION_STATUS.CONNECTED && !this.started) {
        this.loadRoomInitialData();
        this.started = true;
      }
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

  async connect(extraParams?: Record<string, string>): Promise<void> {
    const { fetchClient } = this.azureWebPubsubOptions;

    this.provider.setFetchClient(fetchClient ?? window.fetch);

    await this.provider.connect(extraParams);
  }

  disconnect(): void {
    this.provider.disconnect();
  }

  simulateWebsocketError(): void {
    this.provider.simulateWebsocketError();
  }

  destroy(): void {}

  handleAwarenessChange(emit: boolean = true): void {
    if (!this.instance) {
      return;
    }

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
