// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import http from 'http';
import https from 'https';
import { WebSocketServer } from 'ws';
import { setServer, setupWSConnection } from './websockets-utils';
import { defaultInitialState } from './default-initial-state';
import {
  FetchInitialState,
  PerformUpgrade,
  ExtractRoomId,
  PersistRoom,
  FetchRoom,
} from '../types';

type WeaveWebsocketsServerParams = {
  initialState?: FetchInitialState;
  performUpgrade: PerformUpgrade;
  extractRoomId: ExtractRoomId;
  persistRoom?: PersistRoom;
  fetchRoom?: FetchRoom;
};

export class WeaveWebsocketsServer {
  private initialState: FetchInitialState;
  private performUpgrade: PerformUpgrade;
  private extractRoomId: ExtractRoomId;
  private wss: WebSocketServer;
  persistRoom: PersistRoom | undefined = undefined;
  fetchRoom: FetchRoom | undefined = undefined;

  constructor({
    initialState = defaultInitialState,
    performUpgrade,
    extractRoomId,
    persistRoom,
    fetchRoom,
  }: WeaveWebsocketsServerParams) {
    this.initialState = initialState;
    this.performUpgrade = performUpgrade;
    this.extractRoomId = extractRoomId;
    this.persistRoom = persistRoom;
    this.fetchRoom = fetchRoom;

    this.wss = new WebSocketServer({ noServer: true });

    setServer(this);

    this.wss.on(
      'connection',
      setupWSConnection(this.extractRoomId, this.initialState)
    );
  }

  handleUpgrade(server: http.Server | https.Server) {
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
