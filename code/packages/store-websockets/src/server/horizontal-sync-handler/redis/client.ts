// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveWebsocketsServer } from '@/index.server';
import type {
  WeaveStoreHorizontalSyncRedisConfig,
  WeaveStoreOnSyncHandleConnectionStatusChangeEvent,
} from '@inditextech/weave-types';
import Redis from 'ioredis';

export class WeaveHorizontalSyncHandlerRedis {
  private server: WeaveWebsocketsServer;
  private enabled: boolean = false;
  private config: WeaveStoreHorizontalSyncRedisConfig = {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'weave:sync-room:',
  };
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;

  constructor(
    server: WeaveWebsocketsServer,
    config?: WeaveStoreHorizontalSyncRedisConfig
  ) {
    this.server = server;

    if (config) {
      this.enabled = true;
      this.config = {
        ...this.config,
        ...config,
      };
    }

    this.initPubClient();
    this.initSubClient();
  }

  isEnabledPubSub(): boolean {
    return this.enabled;
  }

  initPubClient(): void {
    this.pubClient = new Redis(this.config);

    this.server.emitEvent<WeaveStoreOnSyncHandleConnectionStatusChangeEvent>(
      'onPubClientStatusChange',
      { status: 'connecting' }
    );

    this.pubClient.on('error', (error) => {
      this.server.emitEvent<WeaveStoreOnSyncHandleConnectionStatusChangeEvent>(
        'onPubClientStatusChange',
        { status: 'error', error }
      );
    });

    this.pubClient.on('end', () => {
      this.server.emitEvent<WeaveStoreOnSyncHandleConnectionStatusChangeEvent>(
        'onPubClientStatusChange',
        { status: 'end' }
      );
    });

    this.pubClient.on('reconnecting', (delay: number) => {
      this.server.emitEvent<WeaveStoreOnSyncHandleConnectionStatusChangeEvent>(
        'onPubClientStatusChange',
        {
          status: 'reconnecting',
          delay,
        }
      );
    });

    this.pubClient.on('connect', () => {
      this.server.emitEvent<WeaveStoreOnSyncHandleConnectionStatusChangeEvent>(
        'onPubClientStatusChange',
        { status: 'connect' }
      );
    });

    this.pubClient.on('ready', () => {
      this.server.emitEvent<WeaveStoreOnSyncHandleConnectionStatusChangeEvent>(
        'onPubClientStatusChange',
        { status: 'ready' }
      );
    });
  }

  initSubClient(): void {
    this.subClient = new Redis(this.config);

    this.server.emitEvent<WeaveStoreOnSyncHandleConnectionStatusChangeEvent>(
      'onSubClientStatusChange',
      { status: 'connecting' }
    );

    this.subClient.on('error', (error) => {
      this.server.emitEvent<WeaveStoreOnSyncHandleConnectionStatusChangeEvent>(
        'onSubClientStatusChange',
        { status: 'error', error }
      );
    });

    this.subClient.on('end', () => {
      this.server.emitEvent<WeaveStoreOnSyncHandleConnectionStatusChangeEvent>(
        'onSubClientStatusChange',
        { status: 'end' }
      );
    });

    this.subClient.on('reconnecting', (delay: number) => {
      this.server.emitEvent<WeaveStoreOnSyncHandleConnectionStatusChangeEvent>(
        'onSubClientStatusChange',
        {
          status: 'reconnecting',
          delay,
        }
      );
    });

    this.subClient.on('connect', () => {
      this.server.emitEvent<WeaveStoreOnSyncHandleConnectionStatusChangeEvent>(
        'onSubClientStatusChange',
        { status: 'connect' }
      );
    });

    this.subClient.on('ready', () => {
      this.server.emitEvent<WeaveStoreOnSyncHandleConnectionStatusChangeEvent>(
        'onSubClientStatusChange',
        { status: 'ready' }
      );
    });
  }

  getPubClient(): Redis {
    if (!this.pubClient) {
      throw new Error('Pub client not initialized');
    }
    return this.pubClient;
  }

  getSubClient(): Redis {
    if (!this.subClient) {
      throw new Error('Sub client not initialized');
    }
    return this.subClient;
  }
}
