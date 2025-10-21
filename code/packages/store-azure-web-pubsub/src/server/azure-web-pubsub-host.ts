// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

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
import type {
  WeaveStoreAzureWebPubsubOnWebsocketCloseEvent,
  WeaveStoreAzureWebPubsubOnWebsocketErrorEvent,
  WeaveStoreAzureWebPubsubOnWebsocketJoinGroupEvent,
  WeaveStoreAzureWebPubsubOnWebsocketMessageEvent,
  WeaveStoreAzureWebPubsubOnWebsocketOnTokenRefreshEvent,
  WeaveStoreAzureWebPubsubOnWebsocketOpenEvent,
} from '@/types';

const expirationTimeInMinutes = 60; // 1 hour
const messageSync = 0;
const messageAwareness = 1;
const AzureWebPubSubJsonProtocol = 'json.webpubsub.azure.v1';

export enum MessageType {
  System = 'system',
  JoinGroup = 'joinGroup',
  SendToGroup = 'sendToGroup',
}

export enum MessageDataType {
  Init = 'init',
  Sync = 'sync',
  Awareness = 'awareness',
}

export interface MessageData {
  t: string; // type / target uuid
  f: string; // origin uuid
  c: string; // base64 encoded binary data
}

export interface Message {
  type: string;
  from: string;
  group: string;
  data: MessageData;
}
const HostUserId = 'host';

export interface WebPubSubHostOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  WebSocketPolyfill: any;
}

export class WeaveStoreAzureWebPubSubSyncHost {
  private readonly server: WeaveAzureWebPubsubServer;
  public doc: Y.Doc;
  public topic: string;
  public topicAwarenessChannel: string;

  private _client: WebPubSubServiceClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _conn: any;

  private _awareness: awarenessProtocol.Awareness;

  constructor(
    server: WeaveAzureWebPubsubServer,
    client: WebPubSubServiceClient,
    topic: string,
    doc: Y.Doc
  ) {
    this.server = server;
    this.doc = doc;
    this.topic = topic;
    this.topicAwarenessChannel = `${topic}-awareness`;
    this._client = client;

    this._conn = null;

    // register awareness controller
    this._awareness = new awarenessProtocol.Awareness(this.doc);
    this._awareness.setLocalState(null);

    // const awarenessChangeHandler = ({ added, updated, removed }, conn) => {
    const awarenessUpdateHandler = (
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
      const changedClients = added.concat(added, updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this._awareness, changedClients)
      );
      const u8 = encoding.toUint8Array(encoder);
      this.broadcast(this.topic, origin, u8);
    };
    this._awareness.on('update', awarenessUpdateHandler);

    // register update handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateHandler = (update: Uint8Array, origin: any) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const u8 = encoding.toUint8Array(encoder);

      this.broadcast(this.topic, origin, u8);
    };
    this.doc.on('update', updateHandler);
  }

  get awareness(): awarenessProtocol.Awareness {
    return this._awareness;
  }

  sendInitAwarenessInfo(origin: string): void {
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

  async createWebSocket(sleep: number = 0): Promise<void> {
    const group = this.topic;

    const { url } = await this.negotiate(this.topic);

    if (sleep && sleep > 0) {
      await new Promise((resolve) => setTimeout(resolve, sleep));
    }

    return new Promise((resolve) => {
      const ws = new WebSocket(url, AzureWebPubSubJsonProtocol);

      ws.addEventListener('open', (event) => {
        this.server.emitEvent<WeaveStoreAzureWebPubsubOnWebsocketOpenEvent>(
          'onWsOpen',
          { group: `${group}.host`, event }
        );
        ws.send(
          JSON.stringify({
            type: MessageType.JoinGroup,
            group: `${group}.host`,
          })
        );
        this.server.emitEvent<WeaveStoreAzureWebPubsubOnWebsocketJoinGroupEvent>(
          'onWsJoinGroup',
          { group: `${group}.host` }
        );

        this._conn = ws;
        resolve();
      });

      ws.addEventListener('message', (e) => {
        this.server.emitEvent<WeaveStoreAzureWebPubsubOnWebsocketMessageEvent>(
          'onWsMessage',
          { group: `${group}.host`, event: e }
        );

        const event: Message = JSON.parse(e.data.toString());

        if (event.type === 'message' && event.from === 'group') {
          switch (event.data.t) {
            case MessageDataType.Init:
              this.onClientInit(group, event.data);
              this.onClientSync(group, event.data);
              this.sendInitAwarenessInfo(event.data.f);
              return;
            case MessageDataType.Sync:
              this.onClientSync(group, event.data);
              return;
            case MessageDataType.Awareness:
              this.onAwareness(group, event.data);
              return;
          }
        }
      });

      ws.addEventListener('close', (e) => {
        this.server.emitEvent<WeaveStoreAzureWebPubsubOnWebsocketCloseEvent>(
          'onWsClose',
          {
            group: `${group}.host`,
            event: e as unknown as CloseEvent,
          }
        );

        if (e.code === 1008 && ws.readyState === WebSocket.OPEN) {
          ws.close(); // ensure cleanup
          this.createWebSocket(); // start fresh with a new token
        }
      });

      ws.addEventListener('error', (error) => {
        this.server.emitEvent<WeaveStoreAzureWebPubsubOnWebsocketErrorEvent>(
          'onWsError',
          {
            group: `${group}.host`,
            error: error as unknown as ErrorEvent,
          }
        );

        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }

        this.createWebSocket(20000);
      });

      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
          this.server.emitEvent<WeaveStoreAzureWebPubsubOnWebsocketOnTokenRefreshEvent>(
            'onWsTokenRefresh',
            { group: `${group}.host` }
          );
          this.createWebSocket(); // start fresh with a new token
        }
      }, expirationTimeInMinutes * 0.75 * 60 * 1000);
    });
  }

  async start(): Promise<void> {
    await this.createWebSocket();
  }

  async stop(): Promise<void> {
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

  private broadcast(group: string, from: string, u8: Uint8Array) {
    this._conn?.send?.(
      JSON.stringify({
        type: MessageType.SendToGroup,
        group,
        noEcho: true,
        data: {
          f: from,
          c: Buffer.from(u8).toString('base64'),
        },
      })
    );
  }

  private send(group: string, to: string, u8: Uint8Array) {
    this._conn?.send?.(
      JSON.stringify({
        type: MessageType.SendToGroup,
        group,
        noEcho: true,
        data: {
          t: to,
          c: Buffer.from(u8).toString('base64'),
        },
      })
    );
  }

  private onClientInit(group: string, data: MessageData) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, syncProtocol.messageYjsSyncStep1);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    const u8 = encoding.toUint8Array(encoder);
    this.send(group, data.f, u8);
  }

  private onClientSync(group: string, data: MessageData) {
    try {
      const buf = Buffer.from(data.c, 'base64');
      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(buf);
      const messageType = decoding.readVarUint(decoder);
      switch (messageType) {
        case syncProtocol.messageYjsSyncStep1:
          encoding.writeVarUint(encoder, syncProtocol.messageYjsSyncStep1);
          syncProtocol.readSyncMessage(decoder, encoder, this.doc, data.f);
          if (encoding.length(encoder) > 1) {
            this.send(group, data.f, encoding.toUint8Array(encoder));
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
  private onAwareness(_: string, data: MessageData) {
    try {
      const buf = Buffer.from(data.c, 'base64');
      const decoder = decoding.createDecoder(buf);
      decoding.readVarUint(decoder); // skip the message type
      const update = decoding.readVarUint8Array(decoder);

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
