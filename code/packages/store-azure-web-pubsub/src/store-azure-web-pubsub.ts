// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  WeaveStore,
  type WeaveStoreOnRoomChangedEvent,
  type WeaveStoreOnRoomSwitchingEndEvent,
  type WeaveStoreOnRoomSwitchingStartEvent,
} from '@inditextech/weave-sdk';
import merge from 'lodash/merge';
import {
  WEAVE_STORE_CONNECTION_STATUS,
  type WeaveStoreOptions,
} from '@inditextech/weave-types';
import { WeaveStoreAzureWebPubSubSyncClient } from './client';
import { WEAVE_STORE_AZURE_WEB_PUBSUB } from './constants';
import {
  type FetchInitialState,
  type WeaveRoomData,
  type WeaveStoreAzureWebPubsubOptions,
} from './types';

export class WeaveStoreAzureWebPubsub extends WeaveStore {
  private azureWebPubsubOptions: WeaveStoreAzureWebPubsubOptions;
  private roomId: string;
  private started: boolean;
  private initialRoomData: WeaveRoomData | undefined;
  private actualStatus!: (typeof WEAVE_STORE_CONNECTION_STATUS)[keyof typeof WEAVE_STORE_CONNECTION_STATUS];
  protected provider!: WeaveStoreAzureWebPubSubSyncClient;
  protected name: string = WEAVE_STORE_AZURE_WEB_PUBSUB;
  protected supportsUndoManager = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected awarenessCallback!: (changes: any) => void;

  constructor(
    initialRoomData: WeaveRoomData | undefined,
    storeOptions: WeaveStoreOptions,
    azureWebPubsubOptions: Pick<
      WeaveStoreAzureWebPubsubOptions,
      'roomId' | 'url'
    > &
      Partial<Omit<WeaveStoreAzureWebPubsubOptions, 'roomId' | 'url'>>
  ) {
    super(storeOptions);

    const { roomId } = azureWebPubsubOptions;

    this.azureWebPubsubOptions = merge({}, azureWebPubsubOptions);
    this.roomId = roomId;
    this.initialRoomData = initialRoomData;
    this.started = false;
    this.actualStatus = WEAVE_STORE_CONNECTION_STATUS.DISCONNECTED;

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

    const patchedUrl = url.replace('[roomId]', this.roomId);

    this.provider = new WeaveStoreAzureWebPubSubSyncClient(
      this,
      patchedUrl,
      this.roomId,
      this.getDocument(),
      this.azureWebPubsubOptions.syncClientOptions
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
    });

    this.provider.on('status', (status) => {
      if (
        this.actualStatus !== WEAVE_STORE_CONNECTION_STATUS.SWITCHING_ROOM ||
        (this.actualStatus === WEAVE_STORE_CONNECTION_STATUS.SWITCHING_ROOM &&
          status === WEAVE_STORE_CONNECTION_STATUS.CONNECTED)
      ) {
        this.handleConnectionStatusChange(status);

        if (
          this.actualStatus === WEAVE_STORE_CONNECTION_STATUS.SWITCHING_ROOM &&
          status === WEAVE_STORE_CONNECTION_STATUS.CONNECTED
        ) {
          this.instance.emitEvent<WeaveStoreOnRoomSwitchingEndEvent>(
            'onRoomSwitchingEnd',
            { room: this.roomId }
          );
        }

        this.actualStatus = status;
      }

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

  async switchToRoom(
    roomId: string,
    roomData: Uint8Array | FetchInitialState | undefined
  ): Promise<void> {
    this.instance.emitEvent<WeaveStoreOnRoomSwitchingStartEvent>(
      'onRoomSwitchingStart',
      { room: roomId }
    );

    this.actualStatus = WEAVE_STORE_CONNECTION_STATUS.SWITCHING_ROOM;

    this.disconnect();

    this.restartDocument();

    await this.instance.switchRoom();

    this.roomId = roomId;
    this.initialRoomData = roomData;
    this.started = false;

    this.init();

    this.setup();
    this.connect();
  }

  async connect(extraParams?: Record<string, string>): Promise<void> {
    const { fetchClient } = this.azureWebPubsubOptions;

    this.provider.setFetchClient(fetchClient ?? window.fetch);

    this.instance.emitEvent<WeaveStoreOnRoomChangedEvent>(
      'onStoreRoomChanged',
      { room: this.roomId }
    );

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
