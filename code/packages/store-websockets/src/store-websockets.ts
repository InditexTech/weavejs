// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveStore } from '@inditextech/weave-sdk';
import {
  type WeaveAwarenessChange,
  type WeaveStoreOptions,
} from '@inditextech/weave-types';
import { WEAVE_STORE_WEBSOCKETS } from './constants';
import {
  type WeaveStoreWebsocketsConnectionStatus,
  type WeaveStoreWebsocketsOptions,
} from './types';
import { WebsocketProvider } from 'y-websocket';

export class WeaveStoreWebsockets extends WeaveStore {
  private websocketOptions: WeaveStoreWebsocketsOptions;
  private roomId: string;
  protected provider!: WebsocketProvider;
  protected name: string = WEAVE_STORE_WEBSOCKETS;
  protected supportsUndoManager = true;

  constructor(
    storeOptions: WeaveStoreOptions,
    websocketOptions: WeaveStoreWebsocketsOptions
  ) {
    super(storeOptions);

    const { roomId } = websocketOptions;

    this.websocketOptions = websocketOptions;
    this.roomId = roomId;

    this.init();
  }

  private init() {
    const {
      wsOptions: { serverUrl },
    } = this.websocketOptions;

    this.provider = new WebsocketProvider(
      serverUrl,
      this.roomId,
      this.getDocument(),
      {
        connect: false,
        disableBc: true,
      }
    );

    this.provider.on(
      'status',
      ({ status }: { status: WeaveStoreWebsocketsConnectionStatus }) => {
        this.websocketOptions.callbacks?.onConnectionStatusChange?.(status);
        this.instance.emitEvent('onConnectionStatusChange', status);
      }
    );
  }

  connect(): void {
    this.provider.connect();
  }

  disconnect(): void {
    this.provider.connect();
  }

  setAwarenessInfo(field: string, value: unknown): void {
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
