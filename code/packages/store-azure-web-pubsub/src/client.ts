// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Emittery from 'emittery';
import { Buffer } from 'buffer';
import { v4 as uuidv4 } from 'uuid';
import type { Doc } from 'yjs';
import ReconnectingWebSocket from 'reconnecting-websocket';

import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import {
  type FetchClient,
  type WeaveStoreAzureWebPubsubOnStoreFetchConnectionUrlEvent,
} from './types';
import type { WeaveStoreAzureWebPubsub } from './store-azure-web-pubsub';
import { WEAVE_STORE_CONNECTION_STATUS } from '@inditextech/weave-types';

const messageSyncStep1 = 0;
const messageAwareness = 1;
const messageQueryAwareness = 3;

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
  group: string;
  t: string; // type / target uuid
  f: string; // origin uuid
  c: string; // base64 encoded binary data
}

export interface Message {
  type: string;
  fromUserId: string;
  from: string;
  group: string;
  data: MessageData;
}

type MessageHandler = (
  encoder: encoding.Encoder,
  decoder: decoding.Decoder,
  client: WeaveStoreAzureWebPubSubSyncClient,
  clientId: string,
  emitSynced: boolean,
  messageType: number
) => void;

export interface ClientOptions {
  resyncInterval: number;
  tokenProvider: Promise<string> | null;
}

const messageHandlers: MessageHandler[] = [];

messageHandlers[messageSyncStep1] = (
  encoder,
  decoder,
  client,
  clientId,
  emitSynced,
  messageType
) => {
  encoding.writeVarUint(encoder, messageType);
  const syncMessageType = syncProtocol.readSyncMessage(
    decoder,
    encoder,
    client.doc,
    clientId
  );
  if (
    emitSynced &&
    syncMessageType === syncProtocol.messageYjsSyncStep2 &&
    !client.synced
  ) {
    client.synced = true;
  }
};

// messageHandlers[messageQueryAwareness] = (encoder, decoder, client, emitSynced, messageType) => {
messageHandlers[messageQueryAwareness] = (encoder, _, client) => {
  encoding.writeVarUint(encoder, messageAwareness);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(
      client.awareness,
      Array.from(client.awareness.getStates().keys())
    )
  );
};

// messageHandlers[messageAwareness] = (encoder, decoder, client, emitSynced, messageType) => {
messageHandlers[messageAwareness] = (_, decoder, client) => {
  awarenessProtocol.applyAwarenessUpdate(
    client.awareness,
    decoding.readVarUint8Array(decoder),
    client
  );
};

const readMessage = (
  client: WeaveStoreAzureWebPubSubSyncClient,
  buf: Uint8Array,
  emitSynced: boolean,
  clientId: string
): encoding.Encoder => {
  const decoder = decoding.createDecoder(buf);
  const encoder = encoding.createEncoder();
  const messageType = decoding.readVarUint(decoder);
  if (messageType === 0) {
    client.saveLastSyncResponse();
  }
  const messageHandler = messageHandlers[messageType];
  if (messageHandler) {
    messageHandler(encoder, decoder, client, clientId, emitSynced, messageType);
  } else {
    throw new Error(`unable to handle message with type: ${messageType}`);
  }
  return encoder;
};

export class WeaveStoreAzureWebPubSubSyncClient extends Emittery {
  public doc: Doc;
  public topic: string;

  private instance: WeaveStoreAzureWebPubsub;
  private _ws: ReconnectingWebSocket | null;
  private _url: string;
  private _fetchClient: FetchClient;
  private _status: 'connected' | 'connecting' | 'disconnected' | 'error';
  private _wsConnected: boolean;
  private _synced: boolean;
  private _resyncInterval!: NodeJS.Timeout | null;
  private _resyncCheckInterval!: NodeJS.Timeout | null;
  private _lastReceivedSyncResponse!: number | null;
  private _connectionRetries: number;
  private _uuid: string;
  private _awareness!: awarenessProtocol.Awareness;
  private _options: ClientOptions;
  private _initialized: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _updateHandler: (update: any, origin: any) => void;
  private _awarenessUpdateHandler: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { added, updated, removed }: { added: any; updated: any; removed: any },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    origin: any
  ) => void;

  /**
   * @param {string} url
   * @param {string} topic
   * @param {Doc} doc
   * @param {number} [options.resyncInterval] Request server state every `resyncInterval` milliseconds.
   * @param {number} [options.tokenProvider] token generator for negotiation.
   */
  constructor(
    instance: WeaveStoreAzureWebPubsub,
    url: string,
    topic: string,
    doc: Doc,
    options: ClientOptions = {
      resyncInterval: 15 * 1000,
      tokenProvider: null,
    }
  ) {
    super();

    this.instance = instance;
    this._options = options;

    this.doc = doc;
    this.topic = topic;

    this._fetchClient = fetch;
    this._url = url;
    this._uuid = uuidv4();

    this._status = 'disconnected';
    this._wsConnected = false;
    this._initialized = false;

    this._connectionRetries = 0;
    this._synced = false;
    this._ws = null;

    this._resyncInterval = null;
    this._resyncCheckInterval = null;
    this._lastReceivedSyncResponse = null;

    const awareness = new awarenessProtocol.Awareness(this.doc);
    this._awareness = awareness;

    // register text update handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._updateHandler = (update: Uint8Array, origin: any) => {
      if (origin !== this) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSyncStep1);
        syncProtocol.writeUpdate(encoder, update);

        sendToControlGroup(
          this,
          topic,
          MessageDataType.Sync,
          encoding.toUint8Array(encoder)
        );
      }
    };

    this.doc.on('update', this._updateHandler);

    // register awareness update handler
    // this._awarenessUpdateHandler = ({ added, updated, removed }, origin) => {
    this._awarenessUpdateHandler = ({ added, updated, removed }) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );

      sendToControlGroup(
        this,
        topic,
        MessageDataType.Awareness,
        encoding.toUint8Array(encoder)
      );
    };

    this._awareness.on('update', this._awarenessUpdateHandler);

    // this._awareness.on('update', this._awarenessUpdateHandler);
    // this.doc.on('update', this._updateHandler);
  }

  get awareness(): awarenessProtocol.Awareness {
    return this._awareness;
  }

  get synced(): boolean {
    return this._synced;
  }

  set synced(state: boolean) {
    if (this._synced !== state) {
      this._synced = state;
    }
  }

  get ws(): ReconnectingWebSocket | null {
    return this._wsConnected ? this._ws : null;
  }

  get id(): string {
    return this._uuid;
  }

  getClientId(): string {
    return this.id;
  }

  saveLastSyncResponse(): void {
    const now = new Date();
    this._lastReceivedSyncResponse = now.getTime();
  }

  setupResyncInterval(): void {
    if (this._options.resyncInterval > 0) {
      this._resyncInterval = setInterval(() => {
        if (this._ws && this._wsConnected) {
          // resend sync step 1
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, messageSyncStep1);
          syncProtocol.writeSyncStep1(encoder, this.doc);
          sendToControlGroup(
            this,
            this.topic,
            MessageDataType.Sync,
            encoding.toUint8Array(encoder)
          );
        }
      }, this._options.resyncInterval);

      this._resyncCheckInterval = setInterval(() => {
        if (!this._lastReceivedSyncResponse) {
          return;
        }

        const resyncInSeconds = this._options.resyncInterval / 1000;
        const resyncLimitInSeconds = resyncInSeconds + 5;
        const now = new Date();
        const diffInSeconds =
          (now.getTime() - this._lastReceivedSyncResponse) / 1000;

        if (
          diffInSeconds > resyncLimitInSeconds &&
          this._ws?.readyState === WebSocket.OPEN
        ) {
          // if last received sync response is older than resync interval + 5s, assume connection lost
          this._ws.dispatchEvent(
            new CustomEvent('error', {
              cancelable: false,
              bubbles: false,
              detail: new Error('No sync response'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }) as any
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this._ws as any)._ws.close();
        }
      }, this._options.resyncInterval + 5000);
    }
  }

  cleanupResyncInterval(): void {
    if (this._resyncInterval) {
      clearInterval(this._resyncInterval);
      this._resyncInterval = null;
    }

    if (this._resyncCheckInterval) {
      clearInterval(this._resyncCheckInterval);
      this._resyncCheckInterval = null;
    }
  }

  simulateWebsocketError(): void {
    if (this._ws) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this._ws as any)._ws.close(4000, 'Simulated error for testing');
    }
  }

  disconnect(): void {
    if (this._ws !== null) {
      // broadcast message with local awareness state set to null (indicating disconnect)
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          this.awareness,
          [this.doc.clientID],
          new Map()
        )
      );
      const u8 = encoding.toUint8Array(encoder);
      sendToControlGroup(this, this.topic, MessageDataType.Awareness, u8);

      // update awareness (all users except local left)
      awarenessProtocol.removeAwarenessStates(
        this.awareness,
        Array.from(this.awareness.getStates().keys()).filter(
          (client) => client !== this.doc.clientID
        ),
        this
      );

      this._initialized = false;

      this._ws.close();
    }

    this.cleanupResyncInterval();
    this._wsConnected = false;
    this._ws = null;
  }

  setFetchClient(fetchClient: FetchClient = window.fetch): void {
    this._fetchClient = fetchClient.bind(window);
  }

  async fetchConnectionUrl(
    connectionUrlExtraParams?: Record<string, string>
  ): Promise<string> {
    try {
      const connectionURL = new URL(
        this._url,
        isRelativeUrl(this._url) ? window.location.origin : undefined
      );
      if (connectionUrlExtraParams) {
        const extraParamsKeys = Object.keys(connectionUrlExtraParams);
        for (const key of extraParamsKeys) {
          if (connectionURL.searchParams.has(key)) {
            connectionURL.searchParams.delete(key);
          }
          connectionURL.searchParams.append(key, connectionUrlExtraParams[key]);
        }
      }
      const res = await this._fetchClient(connectionURL.toString());
      if (res.ok) {
        const data = (await res.json()) as { url: string };
        return data.url;
      } else {
        throw new Error(`Failed to fetch connection url from: ${this._url}`);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      throw new Error(`Failed to fetch connection url from: ${this._url}`);
    }
  }

  async createWebSocket(
    connectionUrlExtraParams?: Record<string, string>
  ): Promise<ReconnectingWebSocket> {
    const websocket = new ReconnectingWebSocket(async () => {
      let url: string = 'https://error';
      let error: Error | null = null;

      try {
        this.instance.emitEvent<WeaveStoreAzureWebPubsubOnStoreFetchConnectionUrlEvent>(
          'onStoreFetchConnectionUrl',
          {
            loading: true,
            error: null,
          }
        );
        url = await this.fetchConnectionUrl(connectionUrlExtraParams);
      } catch (ex) {
        error = ex as Error;
      } finally {
        if (error) {
          this.instance.handleConnectionStatusChange(
            WEAVE_STORE_CONNECTION_STATUS.ERROR
          );
        }
        this.instance.emitEvent<WeaveStoreAzureWebPubsubOnStoreFetchConnectionUrlEvent>(
          'onStoreFetchConnectionUrl',
          {
            loading: false,
            error,
          }
        );
      }

      return url;
    }, AzureWebPubSubJsonProtocol);

    websocket.binaryType = 'arraybuffer';
    this._ws = websocket;
    this._wsConnected = false;
    this._initialized = false;
    this.synced = false;

    websocket.addEventListener('error', (e) => {
      console.error('WebSocket error', e);

      if (this._initialized && websocket.retryCount > 0) {
        this._status = 'connecting';
        this.emit('status', this._status);
        return;
      }
      this._status = 'error';
      this.emit('status', this._status);

      // if (websocket.readyState === WebSocket.OPEN) {
      //   websocket.close(); // ensure cleanup
      // }
    });

    websocket.onmessage = (event) => {
      if (event.data === null) {
        return;
      }

      const message: Message = JSON.parse(event.data.toString());
      if (message.type === MessageType.System) {
        // simply skip system event.
        return;
      }

      const messageData = message.data;
      if (messageData.t !== undefined && messageData.t !== this._uuid) {
        // should ignore message for other clients.
        return;
      }

      const buf = Buffer.from(messageData.c, 'base64');
      const encoder = readMessage(this, buf, true, messageData.f);
      if (encoding.length(encoder) > 1) {
        sendToControlGroup(
          this,
          this.topic,
          MessageDataType.Sync,
          encoding.toUint8Array(encoder)
        );
      }
    };

    websocket.onclose = () => {
      this._status = 'disconnected';
      this.emit('status', this._status);

      if (this._wsConnected) {
        this.cleanupResyncInterval();
        this._wsConnected = false;
        this.synced = false;
        awarenessProtocol.removeAwarenessStates(
          this.awareness,
          Array.from(this.awareness.getStates().keys()).filter(
            (x) => x !== this.doc.clientID
          ),
          this
        );
      }
    };

    websocket.onopen = () => {
      // this._wsLastMessageReceived = Date.now();
      this._status = 'connected';
      this.emit('status', this._status);
      this._wsConnected = true;
      this._initialized = true;

      this._connectionRetries = this._connectionRetries++;

      this.setupResyncInterval();

      joinGroup(this, this.topic);

      // always send sync step 1 when connected
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSyncStep1);
      syncProtocol.writeSyncStep1(encoder, this.doc);
      const u8 = encoding.toUint8Array(encoder);
      sendToControlGroup(this, this.topic, MessageDataType.Init, u8);

      // broadcast local state
      const encoderState = encoding.createEncoder();
      encoding.writeVarUint(encoderState, messageSyncStep1);
      syncProtocol.writeSyncStep2(encoderState, this.doc);
      sendToControlGroup(this, this.topic, MessageDataType.Init, u8);

      // write queryAwareness
      const encoderAwarenessQuery = encoding.createEncoder();
      encoding.writeVarUint(encoderAwarenessQuery, messageQueryAwareness);
      sendToControlGroup(this, this.topic, MessageDataType.Init, u8);

      // broadcast awareness state
      if (this.awareness.getLocalState() !== null) {
        const encoderAwarenessState = encoding.createEncoder();
        encoding.writeVarUint(encoderAwarenessState, messageAwareness);
        encoding.writeVarUint8Array(
          encoderAwarenessState,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, [
            this.doc.clientID,
          ])
        );
        const u82 = encoding.toUint8Array(encoder);

        sendToControlGroup(this, this.topic, MessageDataType.Awareness, u82);
      }
    };

    return websocket;
  }

  async connect(
    connectionUrlExtraParams?: Record<string, string>
  ): Promise<void> {
    if (this._wsConnected || this._ws) {
      return;
    }

    await this.createWebSocket(connectionUrlExtraParams);
  }
}

function safeSend(data: string) {
  const MAX_BYTES = 64 * 1024; // 64 KB

  const bytes = new TextEncoder().encode(data);

  if (bytes.byteLength > MAX_BYTES) {
    console.warn(
      `Message too large: ${bytes.byteLength} bytes (limit ${MAX_BYTES}). Skipping send.`
    );
    return false;
  }

  return true;
}

function joinGroup(client: WeaveStoreAzureWebPubSubSyncClient, group: string) {
  const payload = JSON.stringify({
    type: MessageType.JoinGroup,
    group,
  });

  if (!safeSend(payload)) {
    return;
  }

  client.ws?.send(payload);
}

function sendToControlGroup(
  client: WeaveStoreAzureWebPubSubSyncClient,
  group: string,
  type: string,
  u8: Uint8Array
) {
  const payload = JSON.stringify({
    type: MessageType.SendToGroup,
    group: `${group}.host`,
    data: {
      t: type,
      f: client.id,
      c: Buffer.from(u8).toString('base64'),
    },
  });

  if (!safeSend(payload)) {
    return;
  }

  client.ws?.send(payload);
}

function isRelativeUrl(url: string) {
  return !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url);
}
