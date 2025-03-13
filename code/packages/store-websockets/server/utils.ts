import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';

import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as map from 'lib0/map';
import debounce from 'lodash.debounce';

import { isCallbackSet, callbackHandler } from './callback';
import { initState } from './init-state';

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename);

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
// const messageAuth = 2

const updateHandler = (update, _origin, doc: any) => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);
  doc.conns.forEach((_, conn) => send(doc, conn, message));
};

let contentInitializor = () => Promise.resolve();

export const setContentInitializor = (f) => {
  contentInitializor = f;
};

export class WSSharedDoc extends Y.Doc {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  name: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conns: Map<any, any>;
  awareness: awarenessProtocol.Awareness;
  whenInitialized: Promise<void>;
  /**
   * @param {string} name
   */
  constructor(name) {
    super({ gc: gcEnabled });
    this.name = name;
    /**
     * Maps from conn to set of controlled user ids. Delete all user ids from awareness when this conn is closed
     * @type {Map<Object, Set<number>>}
     */
    this.conns = new Map();
    /**
     * @type {awarenessProtocol.Awareness}
     */
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);
    /**
     * @param {{ added: Array<number>, updated: Array<number>, removed: Array<number> }} changes
     * @param {Object | null} conn Origin is the connection that made the change
     */
    const awarenessChangeHandler = ({ added, updated, removed }, conn) => {
      const changedClients = added.concat(updated, removed);
      if (conn !== null) {
        const connControlledIDs =
          /** @type {Set<number>} */ this.conns.get(conn);
        if (connControlledIDs !== undefined) {
          added.forEach((clientID) => {
            connControlledIDs.add(clientID);
          });
          removed.forEach((clientID) => {
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
    this.on('update', /** @type {any} */ updateHandler);
    if (isCallbackSet) {
      this.on(
        'update',
        /** @type {any} */ debounce(callbackHandler, CALLBACK_DEBOUNCE_WAIT, {
          maxWait: CALLBACK_DEBOUNCE_MAXWAIT,
        })
      );
    }
    this.whenInitialized = contentInitializor();
  }
}

/**
 * Gets a Y.Doc by name, whether in memory or on disk
 *
 * @param {string} docname - the name of the Y.Doc to find or create
 * @param {boolean} gc - whether to allow gc on the doc (applies only when created)
 * @return {WSSharedDoc}
 */
export const getYDoc = (docname, gc = true) =>
  map.setIfUndefined(docs, docname, async () => {
    const documentData = await getRoomStateFromFile(`${docname}.room`);
    const doc = new WSSharedDoc(docname);
    doc.gc = gc;
    docs.set(docname, doc);

    if (documentData) {
      console.log(`Room [${docname}] has data!`);
      Y.applyUpdate(doc, documentData);
    } else {
      console.log(`Room [${docname}] is new!`);
      initState(doc);
    }

    setupRoomPersistence(docname, doc);

    return doc;
  });

/**
 * @param {any} conn
 * @param {WSSharedDoc} doc
 * @param {Uint8Array} message
 */
const messageListener = (conn, doc, message) => {
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
    doc.emit('error', [err]);
  }
};

/**
 * @param {WSSharedDoc} doc
 * @param {any} conn
 */
const closeConn = (doc, conn) => {
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

/**
 * @param {WSSharedDoc} doc
 * @param {import('ws').WebSocket} conn
 * @param {Uint8Array} m
 */
const send = (doc, conn, m) => {
  if (
    conn.readyState !== wsReadyStateConnecting &&
    conn.readyState !== wsReadyStateOpen
  ) {
    closeConn(doc, conn);
  }
  try {
    conn.send(m, {}, (err) => {
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

/**
 * @param {import('ws').WebSocket} conn
 * @param {import('http').IncomingMessage} req
 * @param {any} opts
 */
export const setupWSConnection = async (
  conn,
  req,
  { docName = (req.url || '').slice(1).split('?')[0], gc = true } = {}
) => {
  conn.binaryType = 'arraybuffer';
  // get doc, initialize if it does not exist yet
  const doc = await getYDoc(docName, gc);
  doc.conns.set(conn, new Set());
  // listen and reply to events
  conn.on(
    'message',
    /** @param {ArrayBuffer} message */ (message) =>
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

export const getRoomStateFromFile = async (
  filename: string
): Promise<Uint8Array | null> => {
  const roomsFolder = path.join(__dirname, 'rooms');

  try {
    return await fs.readFile(path.join(roomsFolder, filename));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return null;
  }
};

export const persistRoomStateToFile = async (
  filename: string,
  data: Uint8Array
) => {
  const roomsFolder = path.join(__dirname, 'rooms');

  let folderExists = false;
  try {
    await fs.access(roomsFolder);
    folderExists = true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    folderExists = false;
  }

  if (!folderExists) {
    await fs.mkdir(roomsFolder, { recursive: true });
  }

  await fs.writeFile(path.join(roomsFolder, filename), data);
};

function setupRoomPersistence(roomId: string, doc: Y.Doc) {
  if (!persistenceMap.has(roomId)) {
    const intervalId = setInterval(async () => {
      const actualState = Y.encodeStateAsUpdate(doc);
      persistRoomStateToFile(`${roomId}.room`, actualState);
    }, parseInt(process.env.WEAVE_WEBSOCKETS_STATE_SYNC_FREQUENCY_SEG ?? '10') * 1000);

    persistenceMap.set(roomId, intervalId);
  }
}
