import Emittery from "emittery";
import { Buffer } from "buffer";
import { v4 as uuidv4 } from "uuid";
import { Doc } from "yjs"; // eslint-disable-line
import ReconnectingWebSocket from "reconnecting-websocket";

import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";

const messageSyncStep1 = 0;
const messageAwareness = 1;
const messageQueryAwareness = 3;

const AzureWebPubSubJsonProtocol = "json.webpubsub.azure.v1";

export enum MessageType {
  System = "system",
  JoinGroup = "joinGroup",
  SendToGroup = "sendToGroup",
}

export enum MessageDataType {
  Init = "init",
  Sync = "sync",
  Awareness = "awareness",
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

type MessageHandler = (
  encoder: encoding.Encoder,
  decoder: decoding.Decoder,
  client: WeaveStoreAzureWebPubSubSyncClient,
  emitSynced: boolean,
  messageType: number,
) => void;

export interface ClientOptions {
  resyncInterval: number;
  tokenProvider: Promise<string> | null;
}

const messageHandlers: MessageHandler[] = [];

messageHandlers[messageSyncStep1] = (encoder, decoder, client, emitSynced, messageType) => {
  encoding.writeVarUint(encoder, messageType);
  const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, client.doc, client);
  if (emitSynced && syncMessageType === syncProtocol.messageYjsSyncStep2 && !client.synced) {
    client.synced = true;
  }
};

// messageHandlers[messageQueryAwareness] = (encoder, decoder, client, emitSynced, messageType) => {
messageHandlers[messageQueryAwareness] = (encoder, _, client) => {
  encoding.writeVarUint(encoder, messageAwareness);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(client.awareness, Array.from(client.awareness.getStates().keys())),
  );
};

// messageHandlers[messageAwareness] = (encoder, decoder, client, emitSynced, messageType) => {
messageHandlers[messageAwareness] = (_, decoder, client) => {
  awarenessProtocol.applyAwarenessUpdate(client.awareness, decoding.readVarUint8Array(decoder), client);
};

const readMessage = (
  client: WeaveStoreAzureWebPubSubSyncClient,
  buf: Uint8Array,
  emitSynced: boolean,
): encoding.Encoder => {
  const decoder = decoding.createDecoder(buf);
  const encoder = encoding.createEncoder();
  const messageType = decoding.readVarUint(decoder);
  const messageHandler = messageHandlers[messageType];
  if (messageHandler) {
    messageHandler(encoder, decoder, client, emitSynced, messageType);
  } else {
    throw new Error(`unable to handle message with type: ${messageType}`);
  }
  return encoder;
};

export class WeaveStoreAzureWebPubSubSyncClient extends Emittery {
  public doc: Doc;
  public topic: string;

  private _ws: ReconnectingWebSocket | null;
  private _url: string;
  private _connectionUrl: string | null;
  private _status: "connected" | "connecting" | "disconnected";
  private _wsConnected: boolean;
  private _wsLastMessageReceived: number;
  private _synced: boolean;
  private _resyncInterval;
  private _uuid: string;
  private _awareness: awarenessProtocol.Awareness;

  private _updateHandler: (update: any, origin: any) => void;
  private _awarenessUpdateHandler: (
    { added, updated, removed }: { added: any; updated: any; removed: any },
    origin: any,
  ) => void;

  /**
   * @param {string} url
   * @param {string} topic
   * @param {Doc} doc
   * @param {number} [options.resyncInterval] Request server state every `resyncInterval` milliseconds.
   * @param {number} [options.tokenProvider] token generator for negotiation.
   */
  constructor(
    url: string,
    topic: string,
    doc: Doc,
    options: ClientOptions = {
      resyncInterval: 15 * 1000,
      tokenProvider: null,
    },
  ) {
    super();

    this.doc = doc;
    this.topic = topic;

    this._url = url;
    this._connectionUrl = null;
    this._uuid = uuidv4();

    this._status = "disconnected";
    this._wsConnected = false;

    this._synced = false;
    this._ws = null;
    this._wsLastMessageReceived = 0;

    const awareness = new awarenessProtocol.Awareness(doc);
    this._awareness = awareness;

    this._resyncInterval = null;

    if (options.resyncInterval > 0) {
      this._resyncInterval = setInterval(() => {
        if (this._ws) {
          // resend sync step 1
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, messageSyncStep1);
          syncProtocol.writeSyncStep1(encoder, doc);
          sendToControlGroup(this, topic, MessageDataType.Sync, encoding.toUint8Array(encoder));
        }
      }, options.resyncInterval);
    }

    // register text update handler
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._updateHandler = (update: Uint8Array, origin: any) => {
      if (origin !== this) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSyncStep1);
        syncProtocol.writeUpdate(encoder, update);
        sendToControlGroup(this, topic, MessageDataType.Sync, encoding.toUint8Array(encoder));
      }
    };
    this.doc.on("update", this._updateHandler);

    // register awareness update handler
    // this._awarenessUpdateHandler = ({ added, updated, removed }, origin) => {
    this._awarenessUpdateHandler = ({ added, updated, removed }) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
      sendToControlGroup(this, topic, MessageDataType.Awareness, encoding.toUint8Array(encoder));
    };
    awareness.on("update", this._awarenessUpdateHandler);
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

  destroy() {
    if (this._resyncInterval !== null) {
      clearInterval(this._resyncInterval);
    }
    this.stop();
    this.doc.off("update", this._updateHandler);
  }

  stop() {
    if (this._ws !== null) {
      this._ws.close();
    }
  }

  async fetchConnectionUrl() {
    try {
      const res = await fetch(this._url);
      if (res.ok) {
        const data = (await res.json()) as { url: string };
        this._connectionUrl = data.url;
      }
    } catch (err) {
      throw new Error(`Failed to fetch connection url from: ${this._url}`);
    }
  }

  async start() {
    if (this._wsConnected || this._ws) {
      return;
    }

    if (!this._connectionUrl) {
      return;
    }

    const websocket = new ReconnectingWebSocket(this._connectionUrl, AzureWebPubSubJsonProtocol);
    websocket.binaryType = "arraybuffer";
    this._ws = websocket;
    this._wsConnected = false;
    this.synced = false;

    this._status = "connecting";
    this.emit("status", this._status);

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

      const buf = Buffer.from(messageData.c, "base64");
      this._wsLastMessageReceived = Date.now();
      const encoder = readMessage(this, buf, true);
      if (encoding.length(encoder) > 1) {
        sendToControlGroup(this, this.topic, MessageDataType.Sync, encoding.toUint8Array(encoder));
      }
    };

    websocket.onclose = () => {
      this._ws = null;
      if (this._wsConnected) {
        this._status = "disconnected";
        this.emit("status", this._status);
        this._wsConnected = false;
        this.synced = false;
        awarenessProtocol.removeAwarenessStates(
          this.awareness,
          Array.from(this.awareness.getStates().keys()).filter((x) => x !== this.doc.clientID),
          this,
        );
      }
    };

    websocket.onerror = (err) => {
      console.error(err);
    };

    websocket.onopen = () => {
      this._wsLastMessageReceived = Date.now();
      this._wsConnected = true;
      this._status = "connected";
      this.emit("status", this._status);

      joinGroup(this, this.topic);

      // always send sync step 1 when connected
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSyncStep1);
      syncProtocol.writeSyncStep1(encoder, this.doc);
      const u8 = encoding.toUint8Array(encoder);
      sendToControlGroup(this, this.topic, MessageDataType.Init, u8);

      // broadcast awareness state
      if (this.awareness.getLocalState() !== null) {
        const encoderAwarenessState = encoding.createEncoder();
        encoding.writeVarUint(encoderAwarenessState, messageAwareness);
        encoding.writeVarUint8Array(
          encoderAwarenessState,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID]),
        );
        const u8 = encoding.toUint8Array(encoder);
        sendToControlGroup(this, this.topic, MessageDataType.Awareness, u8);
      }
    };
  }
}

function joinGroup(client: WeaveStoreAzureWebPubSubSyncClient, group: string) {
  client.ws?.send(
    JSON.stringify({
      type: MessageType.JoinGroup,
      group,
    }),
  );
}

function sendToControlGroup(client: WeaveStoreAzureWebPubSubSyncClient, group: string, type: string, u8: Uint8Array) {
  client.ws?.send(
    JSON.stringify({
      type: MessageType.SendToGroup,
      group: `${group}.host`,
      data: {
        t: type,
        f: client.id,
        c: Buffer.from(u8).toString("base64"),
      },
    }),
  );
}
