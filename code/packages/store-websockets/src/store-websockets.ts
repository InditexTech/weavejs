// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveStore } from '@inditextech/weave-sdk';
import {
  WEAVE_STORE_CONNECTION_STATUS,
  type WeaveStoreOptions,
} from '@inditextech/weave-types';
import { WEAVE_STORE_WEBSOCKETS } from './constants';
import { type WeaveStoreWebsocketsOptions } from './types';
import { WebsocketProvider } from 'y-websocket';

export class WeaveStoreWebsockets extends WeaveStore {
  private websocketOptions: WeaveStoreWebsocketsOptions;
  private roomId: string;
  private initialized!: boolean;
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

    this.initialized = false;
    this.provider = new WebsocketProvider(
      serverUrl,
      this.roomId,
      this.getDocument(),
      {
        connect: false,
        disableBc: true,
      }
    );

    this.provider.on('status', ({ status }) => {
      this.handleConnectionStatusChange(status);
      if (!this.initialized && status === 'connected') {
        this.initialized = true;
      }
    });

    this.provider.on('connection-close', () => {
      if (this.initialized) {
        this.handleConnectionStatusChange(
          WEAVE_STORE_CONNECTION_STATUS.CONNECTING
        );
        return;
      }
      this.handleConnectionStatusChange(
        WEAVE_STORE_CONNECTION_STATUS.DISCONNECTED
      );
    });

    this.provider.on('connection-error', () => {
      if (this.initialized) {
        this.handleConnectionStatusChange(
          WEAVE_STORE_CONNECTION_STATUS.DISCONNECTED
        );
        return;
      }
      this.handleConnectionStatusChange(WEAVE_STORE_CONNECTION_STATUS.ERROR);
    });
  }

  connect(): void {
    const awareness = this.provider.awareness;
    awareness.on('update', this.handleAwarenessChange.bind(this));
    awareness.on('change', this.handleAwarenessChange.bind(this));

    this.provider.connect();
  }

  disconnect(): void {
    const awareness = this.provider.awareness;
    awareness.destroy();
    awareness.off('update', this.handleAwarenessChange.bind(this));
    awareness.off('change', this.handleAwarenessChange.bind(this));

    this.provider.disconnect();
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
