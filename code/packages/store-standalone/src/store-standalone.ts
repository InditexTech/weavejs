// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Y from './yjs';
import { defaultInitialState, WeaveStore } from '@inditextech/weave-sdk';
import {
  WEAVE_STORE_CONNECTION_STATUS,
  type WeaveStoreOptions,
} from '@inditextech/weave-types';
import { WEAVE_STORE_STANDALONE } from './constants.js';
import type { FetchInitialState, WeaveStoreStandaloneParams } from './types.js';

export class WeaveStoreStandalone extends WeaveStore {
  private roomData: string | undefined;
  private initialState: FetchInitialState;
  protected name: string = WEAVE_STORE_STANDALONE;
  protected supportsUndoManager = true;

  constructor(
    { roomData, initialState }: WeaveStoreStandaloneParams,
    storeOptions: WeaveStoreOptions
  ) {
    super(storeOptions);

    this.roomData = roomData;
    this.initialState = initialState ?? defaultInitialState;
  }

  async connect(): Promise<void> {
    if (this.roomData !== undefined) {
      const roomDataSnapshot = Buffer.from(this.roomData, 'base64');
      Y.applyUpdate(this.getDocument(), roomDataSnapshot);
    } else {
      this.initialState(this.getDocument());
    }

    this.handleConnectionStatusChange(WEAVE_STORE_CONNECTION_STATUS.CONNECTED);
  }

  disconnect(): void {
    this.handleConnectionStatusChange(
      WEAVE_STORE_CONNECTION_STATUS.DISCONNECTED
    );
  }

  handleAwarenessChange(): void {}

  setAwarenessInfo(): void {}
}
