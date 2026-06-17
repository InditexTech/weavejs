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
import { IndexeddbPersistence } from 'y-indexeddb';
import { WeaveStoreAzureWebPubSubSyncClient } from './client';
import { WEAVE_STORE_AZURE_WEB_PUBSUB } from './constants';
import {
  type FetchInitialState,
  type WeaveRoomData,
  type WeaveStoreAzureWebPubsubOptions,
} from './types';
import Y from './yjs';

export class WeaveStoreAzureWebPubsub extends WeaveStore {
  private azureWebPubsubOptions: WeaveStoreAzureWebPubsubOptions;
  private started: boolean;
  private initialRoomData: WeaveRoomData | undefined;
  private actualStatus!: (typeof WEAVE_STORE_CONNECTION_STATUS)[keyof typeof WEAVE_STORE_CONNECTION_STATUS];
  private indexedDbPersistence: IndexeddbPersistence | null = null;
  protected roomId: string;
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

  static roomHasIndexedDbData(dbName: string): Promise<boolean> {
    return new Promise((resolve) => {
      const doc = new Y.Doc();
      const providerTest = new IndexeddbPersistence(dbName, doc);

      providerTest.on('synced', () => {
        const docHasContent = doc.getMap('weave').size > 0;
        doc.destroy();
        providerTest.destroy();
        resolve(docHasContent);
      });
    });
  }

  private loadRoomInitialData(hasIndexedDbData: boolean): void {
    let loadedData = false;

    if (
      !loadedData &&
      this.initialRoomData &&
      this.initialRoomData instanceof Uint8Array
    ) {
      this.loadDocument(this.initialRoomData);
      loadedData = true;
    }
    if (
      !loadedData &&
      this.initialRoomData &&
      typeof this.initialRoomData === 'function'
    ) {
      this.loadDefaultDocument(this.initialRoomData);
      loadedData = true;
    }
    if (
      !loadedData &&
      !this.initialRoomData &&
      (!this.azureWebPubsubOptions.indexedDb?.enabled || !hasIndexedDbData)
    ) {
      this.loadDefaultDocument();
      loadedData = true;
    }

    this.initialRoomData = undefined;
  }

  private initIndexedDb() {
    if (!this.azureWebPubsubOptions.indexedDb?.enabled) return;
    const dbName = this.azureWebPubsubOptions.indexedDb.dbName ?? this.roomId;
    this.indexedDbPersistence = new IndexeddbPersistence(
      dbName,
      this.getDocument()
    );
  }

  private async destroyIndexedDb(): Promise<void> {
    if (this.indexedDbPersistence) {
      await this.indexedDbPersistence.destroy();
      this.indexedDbPersistence = null;
    }
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

    this.provider.on('status', async (status) => {
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

      const hasIndexedDbData =
        await WeaveStoreAzureWebPubsub.roomHasIndexedDbData(this.roomId);

      if (status === WEAVE_STORE_CONNECTION_STATUS.CONNECTED && !this.started) {
        this.loadRoomInitialData(hasIndexedDbData);
        this.started = true;

        this.initIndexedDb();
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

    await this.disconnect();

    await this.destroyIndexedDb();

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

  async disconnect(): Promise<void> {
    await this.provider.disconnect();
  }

  simulateWebsocketError(): void {
    this.provider.simulateWebsocketError();
  }

  destroy(): void {
    void this.destroyIndexedDb();
  }

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
