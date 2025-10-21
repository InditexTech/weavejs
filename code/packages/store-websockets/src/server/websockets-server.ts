// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Server as HttpServer } from 'node:http';
import type { Server as HttpsServer } from 'node:https';
import Emittery from 'emittery';
import { WebSocketServer } from 'ws';
import { setServer, setupWSConnection } from './websockets-utils';
import { defaultInitialState } from './default-initial-state';
import {
  type FetchInitialState,
  type PerformUpgrade,
  type ExtractRoomId,
  type PersistRoom,
  type FetchRoom,
} from '../types';
import { WeaveHorizontalSyncHandlerRedis } from './horizontal-sync-handler/redis/client';
import type { WeaveStoreHorizontalSyncConfig } from '@inditextech/weave-types';

type WeaveWebsocketsServerParams = {
  initialState?: FetchInitialState;
  horizontalSyncHandlerConfig?: WeaveStoreHorizontalSyncConfig;
  performUpgrade: PerformUpgrade;
  extractRoomId: ExtractRoomId;
  persistRoom?: PersistRoom;
  fetchRoom?: FetchRoom;
};

export class WeaveWebsocketsServer extends Emittery {
  private initialState: FetchInitialState;
  private horizontalSyncHandler: WeaveHorizontalSyncHandlerRedis;
  private performUpgrade: PerformUpgrade;
  private extractRoomId: ExtractRoomId;
  private wss: WebSocketServer;
  persistRoom: PersistRoom | undefined = undefined;
  fetchRoom: FetchRoom | undefined = undefined;

  constructor({
    initialState = defaultInitialState,
    horizontalSyncHandlerConfig,
    performUpgrade,
    extractRoomId,
    persistRoom,
    fetchRoom,
  }: WeaveWebsocketsServerParams) {
    super();

    this.initialState = initialState;
    this.performUpgrade = performUpgrade;
    this.extractRoomId = extractRoomId;
    this.persistRoom = persistRoom;
    this.fetchRoom = fetchRoom;

    switch (horizontalSyncHandlerConfig?.type) {
      case 'redis':
        this.horizontalSyncHandler = new WeaveHorizontalSyncHandlerRedis(
          this,
          horizontalSyncHandlerConfig?.config
        );
        break;

      default:
        this.horizontalSyncHandler = new WeaveHorizontalSyncHandlerRedis(
          this,
          horizontalSyncHandlerConfig?.config
        );
        break;
    }

    this.wss = new WebSocketServer({ noServer: true });

    setServer(this);

    this.wss.on(
      'connection',
      setupWSConnection(
        this.extractRoomId,
        this.initialState,
        this.horizontalSyncHandler
      )
    );
  }

  getHorizontalSyncHandler(): WeaveHorizontalSyncHandlerRedis {
    return this.horizontalSyncHandler;
  }

  emitEvent<T>(event: string, payload?: T): void {
    this.emit(event, payload);
  }

  addEventListener<T>(event: string, callback: (payload: T) => void): void {
    this.on(event, callback);
  }

  removeEventListener<T>(event: string, callback: (payload: T) => void): void {
    this.off(event, callback);
  }

  handleUpgrade(server: HttpServer | HttpsServer): void {
    server.on('upgrade', async (request, socket, head) => {
      const continueToUpgrade = await this.performUpgrade(request);

      if (!continueToUpgrade) {
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });
  }
}
