// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import crypto from 'node:crypto';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';

import {
  WebPubSubServiceClient,
  type ClientTokenResponse,
} from '@azure/web-pubsub';
import { WebSocket } from 'ws';
import Y from './../yjs';
import type { WeaveAzureWebPubsubServer } from './azure-web-pubsub-server';
import {
  MessageDataType,
  MessageType,
  type Message,
  type MessageData,
  type WeaveStoreAzureWebPubsubOnWebsocketCloseEvent,
  type WeaveStoreAzureWebPubsubOnWebsocketErrorEvent,
  type WeaveStoreAzureWebPubsubOnWebsocketJoinGroupEvent,
  type WeaveStoreAzureWebPubsubOnWebsocketMessageEvent,
  type WeaveStoreAzureWebPubsubOnWebsocketOpenEvent,
  type WeaveStoreAzureWebPubsubOnWebsocketReconnectEvent,
  type WeaveStoreAzureWebPubsubSyncHostOptions,
} from '@/types';
import type WeaveAzureWebPubsubSyncHandler from './azure-web-pubsub-sync-handler';
import { handleChunkedMessage } from '@/utils';
import type { DeepPartial } from '@inditextech/weave-types';
import { mergeExceptArrays } from '@inditextech/weave-sdk';
import { WEAVE_STORE_AZURE_WEB_PUBSUB_SYNC_HOST_DEFAULT_OPTIONS } from '@/constants';

const expirationTimeInMinutes = 60; // 1 hour
const messageSync = 0;
const messageAwareness = 1;
const AzureWebPubSubJsonProtocol = 'json.webpubsub.azure.v1';

const HostUserId = 'host';

export interface WebPubSubHostOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  WebSocketPolyfill: any;
}

export class WeaveStoreAzureWebPubSubSyncHost {
  private readonly server: WeaveAzureWebPubsubServer;
  private readonly syncHandler: WeaveAzureWebPubsubSyncHandler;
  public doc: Y.Doc;
  public topic: string;
  public topicAwarenessChannel: string;

  private _client: WebPubSubServiceClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _conn: any;
  private _reconnectAttempts: number = 0;
  private _forceClose: boolean = false;

  private _awareness!: awarenessProtocol.Awareness;

  private _chunkedMessages: Map<string, string[]>;

  private readonly _syncHostOptions: WeaveStoreAzureWebPubsubSyncHostOptions;

  private _heartbeatIntervalId: NodeJS.Timeout | null;
  private _reconnectionTimeoutId: NodeJS.Timeout | null;

  private _resyncAttempt: number = 0;
  private _resyncIntervalId: NodeJS.Timeout | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _updateHandler: (update: any, origin: any) => void;
  private _awarenessUpdateHandler: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { added, updated, removed }: { added: any; updated: any; removed: any },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    origin: any
  ) => void;

  constructor(
    server: WeaveAzureWebPubsubServer,
    syncHandler: WeaveAzureWebPubsubSyncHandler,
    client: WebPubSubServiceClient,
    topic: string,
    doc: Y.Doc,
    syncHostOptions?: DeepPartial<WeaveStoreAzureWebPubsubSyncHostOptions>
  ) {
    this._syncHostOptions = mergeExceptArrays(
      WEAVE_STORE_AZURE_WEB_PUBSUB_SYNC_HOST_DEFAULT_OPTIONS,
      syncHostOptions ?? {}
    );
    this.server = server;
    this.syncHandler = syncHandler;
    this.doc = doc;
    this.topic = topic;
    this.topicAwarenessChannel = `${topic}-awareness`;
    this._client = client;
    this._chunkedMessages = new Map();

    this._heartbeatIntervalId = null;
    this._reconnectionTimeoutId = null;

    this._conn = null;

    // register awareness controller
    this._awareness = new awarenessProtocol.Awareness(this.doc);

    // const awarenessChangeHandler = ({ added, updated, removed }, conn) => {
    this._awarenessUpdateHandler = (
      {
        added,
        updated,
        removed,
      }: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        added: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updated: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        removed: any;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      origin: any
    ) => {
      try {
        const changedClients = added.concat(added, updated, removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        const payload = awarenessProtocol.encodeAwarenessUpdate(
          this._awareness,
          changedClients
        );
        encoding.writeVarUint8Array(encoder, payload);
        const u8 = encoding.toUint8Array(encoder);
        this.broadcast(this.topic, origin, u8);
      } catch (err) {
        console.error('Error in awareness update handler:', err);
      }
    };

    this._awareness.on('update', this._awarenessUpdateHandler);

    // register update handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._updateHandler = (update: Uint8Array, origin: any) => {
      try {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.writeUpdate(encoder, update);
        const u8 = encoding.toUint8Array(encoder);

        this.broadcast(this.topic, origin, u8);

        if (!this.syncHandler.isPersistingOnInterval()) {
          this.syncHandler.persistRoomTask(this.topic);
        }
      } catch (err) {
        console.error('Error in document update handler:', err);
      }
    };

    this.doc.on('update', this._updateHandler);
  }

  get awareness(): awarenessProtocol.Awareness {
    return this._awareness;
  }

  sendInitAwarenessInfo(origin: string): void {
    if (!this._awareness) return;
    const encoderAwarenessState = encoding.createEncoder();
    encoding.writeVarUint(encoderAwarenessState, messageAwareness);
    encoding.writeVarUint8Array(
      encoderAwarenessState,
      awarenessProtocol.encodeAwarenessUpdate(
        this._awareness,
        Array.from(this._awareness.getStates().keys())
      )
    );
    const u8 = encoding.toUint8Array(encoderAwarenessState);
    this.broadcast(this.topic, origin, u8);
  }

  private setupHeartbeat() {
    this._heartbeatIntervalId = setInterval(() => {
      this._conn?.send?.(
        JSON.stringify({
          type: MessageType.SendToGroup,
          group: this.topic,
          noEcho: true,
          data: { type: 'heartbeat' },
        })
      );
    }, this._syncHostOptions.heartbeat.sendIntervalMs);
  }

  async createWebSocket(): Promise<void> {
    const group = this.topic;

    const { url } = await this.negotiate(this.topic);

    return new Promise((resolve) => {
      const ws = new WebSocket(url, AzureWebPubSubJsonProtocol);

      const connectionAttempt = this._reconnectAttempts;

      this._resyncAttempt = 0;
      this._resyncIntervalId = null;

      ws.addEventListener('open', (event) => {
        this.server.emitEvent<WeaveStoreAzureWebPubsubOnWebsocketOpenEvent>(
          'onWsOpen',
          {
            group: `${group}.host`,
            event,
            connectionAttempt,
          }
        );
        ws.send(
          JSON.stringify({
            type: MessageType.JoinGroup,
            group: `${group}.host`,
          })
        );
        this.server.emitEvent<WeaveStoreAzureWebPubsubOnWebsocketJoinGroupEvent>(
          'onWsJoinGroup',
          {
            group: `${group}.host`,
            connectionAttempt,
          }
        );

        const handleResync = () => {
          ws.send(
            JSON.stringify({
              type: MessageType.SendToGroup,
              group,
              noEcho: true,
              data: { type: 'resync' },
            })
          );
          this._resyncAttempt++;
          if (
            this._resyncAttempt >= this._syncHostOptions.resync.attemptsLimit &&
            this._resyncIntervalId
          ) {
            clearInterval(this._resyncIntervalId);
          }
        };

        this._resyncIntervalId = setInterval(() => {
          handleResync();
        }, this._syncHostOptions.resync.checkIntervalMs);

        handleResync();

        this.setupHeartbeat();

        this._reconnectAttempts = 0; // reset on successful connection

        this._conn = ws;
        resolve();
      });

      ws.addEventListener('message', (e) => {
        this.server.emitEvent<WeaveStoreAzureWebPubsubOnWebsocketMessageEvent>(
          'onWsMessage',
          {
            group: `${group}.host`,
            event: e,
          }
        );

        const event: Message = JSON.parse(e.data.toString());

        if (event.type === 'message' && event.from === 'group') {
          const joinedMessagePayload = handleChunkedMessage(
            this._chunkedMessages,
            event.data
          );

          if (event.data.type === 'chunk') {
            // skip processed chunked message
            return;
          }

          switch (event.data.t) {
            case MessageDataType.Init:
              this.onClientInit(group, event.data);
              this.onClientSync(
                group,
                event.data.f,
                joinedMessagePayload ?? event.data.c
              );
              this.sendInitAwarenessInfo(event.data.f);
              return;
            case MessageDataType.Sync:
              this.onClientSync(
                group,
                event.data.f,
                joinedMessagePayload ?? event.data.c
              );
              return;
            case MessageDataType.Awareness:
              this.onAwareness(group, event.data.c);
              return;
          }
        }
      });

      ws.addEventListener('close', (e) => {
        if (this._heartbeatIntervalId) {
          clearInterval(this._heartbeatIntervalId);
        }

        if (this._resyncIntervalId) {
          clearInterval(this._resyncIntervalId);
        }

        this.server.emitEvent<WeaveStoreAzureWebPubsubOnWebsocketCloseEvent>(
          'onWsClose',
          {
            group: `${group}.host`,
            event: e as unknown as CloseEvent,
            connectionAttempt,
          }
        );

        if (this._forceClose) {
          return;
        } else {
          this._reconnectAttempts++;
          const timeoutMs = Math.round(
            1000 * Math.pow(1.5, this._reconnectAttempts - 1)
          );

          this.server.emitEvent<WeaveStoreAzureWebPubsubOnWebsocketReconnectEvent>(
            'onWsReconnect',
            {
              group: `${group}.host`,
              connectionAttempt: this._reconnectAttempts,
              timeoutMs,
            }
          );

          this._reconnectionTimeoutId = setTimeout(() => {
            this.createWebSocket(); // start fresh with a new token
          }, timeoutMs);
        }
      });

      ws.addEventListener('error', (error) => {
        if (this._heartbeatIntervalId) {
          clearInterval(this._heartbeatIntervalId);
        }

        if (this._resyncIntervalId) {
          clearInterval(this._resyncIntervalId);
        }

        this.server.emitEvent<WeaveStoreAzureWebPubsubOnWebsocketErrorEvent>(
          'onWsError',
          {
            group: `${group}.host`,
            error: error as unknown as ErrorEvent,
            connectionAttempt,
          }
        );

        if (ws.readyState === WebSocket.OPEN) {
          ws.close(); // ensure cleanup
        }
      });
    });
  }

  async start(): Promise<void> {
    this._forceClose = false;
    this._reconnectAttempts = 0;

    if (this._reconnectionTimeoutId) {
      clearTimeout(this._reconnectionTimeoutId);
    }

    await this.createWebSocket();
  }

  public isConnected(): boolean {
    return this._conn && this._conn.readyState === WebSocket.OPEN;
  }

  public isReconnecting(): boolean {
    return this._reconnectionTimeoutId !== null;
  }

  async stop(): Promise<void> {
    this._reconnectAttempts = 0;
    this._forceClose = true;
    if (this._conn?.readyState === WebSocket.OPEN) {
      this._conn?.close();
      this._conn = null;
    }
  }

  public simulateWebsocketError(): void {
    if (this._conn) {
      this._conn.emit('error', new Error('Simulated connection failure'));
    }
  }

  private safeSend(data: string) {
    const MAX_BYTES = 64 * 1024; // 64 KB

    const bytes = new TextEncoder().encode(data);

    if (bytes.byteLength > MAX_BYTES) {
      return false;
    }

    return true;
  }

  private chunkString(str: string, size: number) {
    const chunks = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.slice(i, i + size));
    }
    return chunks;
  }
  private chunkedBroadcast(group: string, from: string, u8: Uint8Array) {
    const base64Data = Buffer.from(u8).toString('base64');

    const CHUNK_SIZE = 60 * 1024; // 60 KB
    const chunks = this.chunkString(base64Data, CHUNK_SIZE);
    const payloadId = crypto.randomUUID();

    for (let i = 0; i < chunks.length; i++) {
      const payload = JSON.stringify({
        type: MessageType.SendToGroup,
        group,
        noEcho: true,
        data: {
          payloadId,
          type: 'chunk',
          index: i,
          totalChunks: chunks.length,
          f: from,
          c: chunks[i],
        },
      });

      this._conn?.send?.(payload);
    }

    const payload = JSON.stringify({
      type: MessageType.SendToGroup,
      group,
      noEcho: true,
      data: {
        payloadId,
        type: 'end',
        f: from,
      },
    });

    this._conn?.send?.(payload);
  }

  private broadcast(group: string, from: string, u8: Uint8Array) {
    try {
      const payload = JSON.stringify({
        type: MessageType.SendToGroup,
        group,
        noEcho: true,
        data: {
          f: from,
          c: Buffer.from(u8).toString('base64'),
        },
      });

      if (!this.safeSend(payload)) {
        this.chunkedBroadcast(group, from, u8);
        return;
      }

      this._conn?.send?.(payload);
    } catch (ex) {
      console.error('Error broadcasting message:', ex);
    }
  }

  private chunkedSend(group: string, to: string, u8: Uint8Array) {
    const base64Data = Buffer.from(u8).toString('base64');

    const CHUNK_SIZE = 60 * 1024; // 60 KB
    const chunks = this.chunkString(base64Data, CHUNK_SIZE);
    const payloadId = crypto.randomUUID();

    for (let i = 0; i < chunks.length; i++) {
      const payload = JSON.stringify({
        type: MessageType.SendToGroup,
        group,
        noEcho: true,
        data: {
          payloadId,
          type: 'chunk',
          index: i,
          totalChunks: chunks.length,
          t: to,
          c: chunks[i],
        },
      });

      this._conn?.send?.(payload);
    }

    const payload = JSON.stringify({
      type: MessageType.SendToGroup,
      group,
      noEcho: true,
      data: {
        payloadId,
        type: 'end',
        t: to,
      },
    });

    this._conn?.send?.(payload);
  }

  private send(group: string, to: string, u8: Uint8Array) {
    try {
      const payload = JSON.stringify({
        type: MessageType.SendToGroup,
        group,
        noEcho: true,
        data: {
          t: to,
          c: Buffer.from(u8).toString('base64'),
        },
      });

      if (!this.safeSend(payload)) {
        this.chunkedSend(group, to, u8);
        return;
      }

      this._conn?.send?.(payload);
    } catch (ex) {
      console.error('Error sending message:', ex);
    }
  }

  private onClientInit(group: string, data: MessageData) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, syncProtocol.messageYjsSyncStep1);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    const u8 = encoding.toUint8Array(encoder);
    this.send(group, data.f, u8);
  }

  private onClientSync(group: string, from: string, data: string) {
    try {
      const buf = Buffer.from(data, 'base64');
      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(buf);
      const messageType = decoding.readVarUint(decoder);
      switch (messageType) {
        case syncProtocol.messageYjsSyncStep1:
          encoding.writeVarUint(encoder, syncProtocol.messageYjsSyncStep1);
          syncProtocol.readSyncMessage(decoder, encoder, this.doc, from);
          if (encoding.length(encoder) > 1) {
            this.send(group, from, encoding.toUint8Array(encoder));
          }
          break;
      }
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.doc.emit('error', [err]);
    }
  }

  // private onAwareness(group: string, data: MessageData) {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private onAwareness(_: string, data: string) {
    try {
      const buf = Buffer.from(data, 'base64');
      const decoder = decoding.createDecoder(buf);
      decoding.readVarUint(decoder); // skip the message type
      const update = decoding.readVarUint8Array(decoder);

      if (!this._awareness) return;

      awarenessProtocol.applyAwarenessUpdate(
        this._awareness,
        update,
        undefined
      );
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.doc.emit('error', [err]);
    }
  }

  private async negotiate(group: string): Promise<ClientTokenResponse> {
    const roles = [
      `webpubsub.sendToGroup.${group}`,
      `webpubsub.joinLeaveGroup.${group}`,
      `webpubsub.joinLeaveGroup.${group}.host`,
    ];

    const res = await this._client.getClientAccessToken({
      expirationTimeInMinutes,
      userId: HostUserId,
      roles,
    });
    return res;
  }
}
