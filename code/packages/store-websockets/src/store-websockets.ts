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

    this.provider.on('status', ({ status }) => {
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

  connect(): void {
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

  setAwarenessInfo(field: string, value: unknown): void {
    const awareness = this.provider.awareness;
    awareness.setLocalStateField(field, value);
  }
}
