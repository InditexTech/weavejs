// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';

import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as map from 'lib0/map';
import debounce from 'lodash.debounce';

import { isCallbackSet, callbackHandler } from './websockets-callbacks';
import { ExtractRoomId, FetchInitialState } from '../types';
import { IncomingMessage } from 'node:http';
import { WeaveWebsocketsServer } from './websockets-server';

let actualServer: WeaveWebsocketsServer | undefined = undefined;

const CALLBACK_DEBOUNCE_WAIT = parseInt(
  process.env.CALLBACK_DEBOUNCE_WAIT || '2000'
);
const CALLBACK_DEBOUNCE_MAXWAIT = parseInt(
  process.env.CALLBACK_DEBOUNCE_MAXWAIT || '10000'
);

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;

// disable gc when using snapshots!
const gcEnabled = process.env.GC !== 'false' && process.env.GC !== '0';

export const docs = new Map();

const persistenceMap: Map<string, NodeJS.Timeout> = new Map();
const messageSync = 0;
const messageAwareness = 1;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updateHandler = (update: any, _origin: any, doc: any) => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc.conns.forEach((_: any, conn: any) => send(doc, conn, message));
};

let contentInitializor = () => Promise.resolve();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setContentInitializor = (f: any) => {
  contentInitializor = f;
};

export class WSSharedDoc extends Y.Doc {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  name: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conns: Map<any, any>;
  awareness: awarenessProtocol.Awareness;
  whenInitialized: Promise<void>;

  constructor(name: string) {
    super({ gc: gcEnabled });
    this.name = name;
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    const awarenessChangeHandler = (
      {
        added,
        updated,
        removed,
      }: { added: number[]; updated: number[]; removed: number[] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conn: any
    ) => {
      const changedClients = added.concat(updated, removed);
      if (conn !== null) {
        const connControlledIDs =
          /** @type {Set<number>} */ this.conns.get(conn);
        if (connControlledIDs !== undefined) {
          added.forEach((clientID: number) => {
            connControlledIDs.add(clientID);
          });
          removed.forEach((clientID: number) => {
            connControlledIDs.delete(clientID);
          });
        }
      }
      // broadcast awareness update
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => {
        send(this, c, buff);
      });
    };
    this.awareness.on('update', awarenessChangeHandler);
    this.on('update', updateHandler);
    if (isCallbackSet) {
      this.on(
        'update',
        debounce(callbackHandler, CALLBACK_DEBOUNCE_WAIT, {
          maxWait: CALLBACK_DEBOUNCE_MAXWAIT,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any
      );
    }
    this.whenInitialized = contentInitializor();
  }
}

export const getYDoc = (
  docName: string,
  initialState: FetchInitialState,
  gc = true
) =>
  map.setIfUndefined(docs, docName, async () => {
    let documentData = undefined;
    if (actualServer && actualServer.fetchRoom) {
      documentData = await actualServer.fetchRoom(docName);
    }
    // const documentData = await getRoomStateFromFile(`${docName}.room`);
    const doc = new WSSharedDoc(docName);
    doc.gc = gc;
    docs.set(docName, doc);

    if (documentData) {
      Y.applyUpdate(doc, documentData);
    } else {
      initialState(doc);
    }

    await setupRoomPersistence(docName, doc);

    return doc;
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const messageListener = (
  conn: WebSocket,
  doc: WSSharedDoc,
  message: Uint8Array
) => {
  try {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);
    switch (messageType) {
      case messageSync:
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn);

        // If the `encoder` only contains the type of reply message and no
        // message, there is no need to send the message. When `encoder` only
        // contains the type of reply, its length is 1.
        if (encoding.length(encoder) > 1) {
          send(doc, conn, encoding.toUint8Array(encoder));
        }
        break;
      case messageAwareness: {
        awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          decoding.readVarUint8Array(decoder),
          conn
        );
        break;
      }
    }
  } catch (err) {
    console.error(err);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const closeConn = (doc: WSSharedDoc, conn: any) => {
  if (doc.conns.has(conn)) {
    /**
     * @type {Set<number>}
     */
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    if (persistenceMap.has(doc.name)) {
      clearInterval(persistenceMap.get(doc.name));
    }
    awarenessProtocol.removeAwarenessStates(
      doc.awareness,
      Array.from(controlledIds),
      null
    );
  }
  conn.close();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const send = (doc: WSSharedDoc, conn: any, m: Uint8Array) => {
  if (
    conn.readyState !== wsReadyStateConnecting &&
    conn.readyState !== wsReadyStateOpen
  ) {
    closeConn(doc, conn);
  }
  try {
    conn.send(m, {}, (err: Error | null) => {
      if (err != null) {
        closeConn(doc, conn);
      }
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    closeConn(doc, conn);
  }
};

const pingTimeout = 30000;

export const setServer = (server: WeaveWebsocketsServer) => {
  actualServer = server;
};

export const setupWSConnection = (
  getDocName: ExtractRoomId,
  initialState: FetchInitialState
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (conn: any, req: IncomingMessage, { gc = true } = {}) => {
    const docName = getDocName(req);
    if (!docName) {
      return;
    }
    conn.binaryType = 'arraybuffer';
    // get doc, initialize if it does not exist yet
    const doc = await getYDoc(docName, initialState, gc);
    doc.conns.set(conn, new Set());
    // listen and reply to events
    conn.on('message', (message: ArrayBuffer) =>
      messageListener(conn, doc, new Uint8Array(message))
    );

    // Check if connection is still alive
    let pongReceived = true;
    const pingInterval = setInterval(() => {
      if (!pongReceived) {
        if (doc.conns.has(conn)) {
          closeConn(doc, conn);
        }
        clearInterval(pingInterval);
      } else if (doc.conns.has(conn)) {
        pongReceived = false;
        try {
          conn.ping();
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          closeConn(doc, conn);
          clearInterval(pingInterval);
        }
      }
    }, pingTimeout);
    conn.on('close', () => {
      closeConn(doc, conn);
      clearInterval(pingInterval);
    });
    conn.on('pong', () => {
      pongReceived = true;
    });
    // put the following in a variables in a block so the interval handlers don't keep in in
    // scope
    {
      // send sync step 1
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeSyncStep1(encoder, doc);
      send(doc, conn, encoding.toUint8Array(encoder));
      const awarenessStates = doc.awareness.getStates();
      if (awarenessStates.size > 0) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(
            doc.awareness,
            Array.from(awarenessStates.keys())
          )
        );
        send(doc, conn, encoding.toUint8Array(encoder));
      }
    }
  };
};

async function setupRoomPersistence(roomId: string, doc: Y.Doc): Promise<void> {
  if (!persistenceMap.has(roomId)) {
    const persistHandler = async () => {
      const actualState = Y.encodeStateAsUpdate(doc);
      if (actualServer && actualServer.persistRoom) {
        try {
          await actualServer.persistRoom(roomId, actualState);
        } catch (ex) {
          console.error(ex);
        }
      }
    };

    persistHandler();
    const intervalId = setInterval(
      persistHandler,
      parseInt(process.env.WEAVE_WEBSOCKETS_STATE_SYNC_FREQUENCY_SEG ?? '10') *
        1000
    );

    persistenceMap.set(roomId, intervalId);
  }
}
