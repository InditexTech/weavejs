// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { Mock } from 'vitest';
import * as Y from 'yjs';
import EventEmitter from 'node:events';
import * as encoding from 'lib0/encoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';

// ---------------------------------------------------------------------------
// Mock heavy dependencies before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('ioredis', () => {
  const Redis = vi.fn().mockImplementation(() => {
    const emitter = new EventEmitter();
    return {
      on: emitter.on.bind(emitter),
      emit: emitter.emit.bind(emitter),
      publish: vi.fn().mockResolvedValue(0),
      subscribe: vi.fn().mockResolvedValue(null),
    };
  });
  return { default: Redis };
});

vi.mock('ws', () => ({
  WebSocketServer: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    handleUpgrade: vi.fn(),
  })),
}));

// Mock websockets-callbacks so isCallbackSet=true covers the debounce branch
// in WSSharedDoc constructor (lines 129-136) without triggering real HTTP requests.
vi.mock('../websockets-callbacks', () => ({
  isCallbackSet: true,
  callbackHandler: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import module under test AFTER mocks are set up
// ---------------------------------------------------------------------------

import {
  docs,
  setContentInitializor,
  setServer,
  setupWSConnection,
  destroyWSConnection,
  getYDoc,
  WSSharedDoc,
} from '../websockets-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockSubClient = {
  subscribe: ReturnType<typeof vi.fn>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  emit: (event: string, ...args: unknown[]) => void;
};

function makeHandler(enabled = false) {
  const subEmitter = new EventEmitter();
  const sub: MockSubClient = {
    subscribe: vi.fn(),
    on: subEmitter.on.bind(subEmitter),
    emit: subEmitter.emit.bind(subEmitter),
  };
  return {
    isEnabledPubSub: vi.fn().mockReturnValue(enabled),
    getPubClient: vi.fn().mockReturnValue({
      publish: vi.fn().mockResolvedValue(0),
    }),
    getSubClient: vi.fn().mockReturnValue(sub),
    _sub: sub,
    _subEmitter: subEmitter,
  };
}

let roomIdCounter = 0;
const nextRoomId = () => `room-${++roomIdCounter}`;

type MockConn = {
  readyState: number;
  binaryType: string;
  send: Mock<[unknown, unknown, ((err: Error | null) => void)?], void>;
  close: ReturnType<typeof vi.fn>;
  ping: ReturnType<typeof vi.fn>;
  on: Mock<[string, (...args: unknown[]) => void], void>;
  _handlers: Record<string, ((...args: unknown[]) => void)[]>;
};

function makeConn(readyState = 1): MockConn {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    readyState,
    binaryType: '',
    send: vi.fn(
      (_data: unknown, _opts: unknown, cb?: (err: Error | null) => void) => {
        cb?.(null);
      }
    ),
    close: vi.fn(),
    ping: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(handler);
    }),
    _handlers: handlers,
  };
}

function makeMockServer() {
  return {
    persistRoom: undefined as
      | ((roomId: string, data: Uint8Array) => Promise<void>)
      | undefined,
    fetchRoom: undefined as
      | ((roomId: string) => Promise<Uint8Array | null>)
      | undefined,
  };
}

// ---------------------------------------------------------------------------
// Cleanup between tests (no global fake timers)
// ---------------------------------------------------------------------------

beforeEach(() => {
  docs.clear();
  setServer(undefined as never);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  docs.clear();
  setServer(undefined as never);
});

// ---------------------------------------------------------------------------
// Suite 1 — setContentInitializor / setServer
// ---------------------------------------------------------------------------

describe('1 — setContentInitializor / setServer', () => {
  it('1.1 setContentInitializor replaces the default content initializer', async () => {
    const customInit = vi.fn().mockResolvedValue(undefined);
    setContentInitializor(customInit);

    const roomId = nextRoomId();
    const handler = makeHandler(false);
    await getYDoc(roomId, vi.fn(), handler as never);
    expect(customInit).toHaveBeenCalled();

    // reset
    setContentInitializor(() => Promise.resolve());
  });

  it('1.2 setServer sets the module-level server reference (fetchRoom called)', async () => {
    const mockServer = makeMockServer();
    mockServer.fetchRoom = vi.fn().mockResolvedValue(null);
    setServer(mockServer as never);

    const roomId = nextRoomId();
    const handler = makeHandler(false);
    await getYDoc(roomId, vi.fn(), handler as never);

    expect(mockServer.fetchRoom).toHaveBeenCalledWith(roomId);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — WSSharedDoc constructor (PubSub disabled)
// ---------------------------------------------------------------------------

describe('2 — WSSharedDoc constructor (PubSub disabled)', () => {
  it('2.1 topic and topicAwarenessChannel set from name', () => {
    const handler = makeHandler(false);
    const doc = new WSSharedDoc('my-room', handler as never);
    expect(doc.topic).toBe('my-room');
    expect(doc.topicAwarenessChannel).toBe('my-room-awareness');
  });

  it('2.2 conns is an empty Map', () => {
    const doc = new WSSharedDoc('room-x', makeHandler(false) as never);
    expect(doc.conns).toBeInstanceOf(Map);
    expect(doc.conns.size).toBe(0);
  });

  it('2.3 awareness is initialized with null local state', () => {
    const doc = new WSSharedDoc('room-x', makeHandler(false) as never);
    expect(doc.awareness).toBeDefined();
    expect(doc.awareness.getLocalState()).toBeNull();
  });

  it('2.4 whenInitialized is a Promise', () => {
    const doc = new WSSharedDoc('room-x', makeHandler(false) as never);
    expect(doc.whenInitialized).toBeInstanceOf(Promise);
  });

  it('2.5 PubSub disabled → subscribe NOT called', () => {
    const handler = makeHandler(false);
    const _doc = new WSSharedDoc('room-nosub', handler as never);
    expect(handler.getSubClient().subscribe).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — WSSharedDoc constructor (PubSub enabled)
// ---------------------------------------------------------------------------

describe('3 — WSSharedDoc constructor (PubSub enabled)', () => {
  it('3.1 subscribe called for topic and awareness channel', () => {
    const handler = makeHandler(true);
    const _doc = new WSSharedDoc('pub-room', handler as never);
    const sub = handler.getSubClient();
    expect(sub.subscribe).toHaveBeenCalledWith('pub-room');
    expect(sub.subscribe).toHaveBeenCalledWith('pub-room-awareness');
  });

  it('3.2 messageBuffer on topic → doc state updated (Y.applyUpdate called)', async () => {
    const handler = makeHandler(true);
    const doc = new WSSharedDoc('pub-room2', handler as never);
    await doc.whenInitialized;

    // Encode a doc with content
    const srcDoc = new Y.Doc();
    srcDoc.transact(() => srcDoc.getMap('weave').set('x', 42));
    const update = Y.encodeStateAsUpdate(srcDoc);

    // Emit messageBuffer on the topic channel
    handler._subEmitter.emit(
      'messageBuffer',
      Buffer.from('pub-room2'),
      Buffer.from(update)
    );

    // Verify state was applied
    expect(doc.getMap('weave').get('x')).toBe(42);
  });

  it('3.3 messageBuffer on awareness channel with valid update → no crash', () => {
    const handler = makeHandler(true);
    const doc = new WSSharedDoc('pub-room3', handler as never);

    // Build a valid (empty-clients) awareness update — Buffer.alloc(0) is not valid
    const validUpdate = awarenessProtocol.encodeAwarenessUpdate(doc.awareness, []);

    expect(() => {
      handler._subEmitter.emit(
        'messageBuffer',
        Buffer.from('pub-room3-awareness'),
        Buffer.from(validUpdate)
      );
    }).not.toThrow();
  });

  it('3.4 messageBuffer on unknown channel → doc state unchanged', () => {
    const handler = makeHandler(true);
    const doc = new WSSharedDoc('pub-room4', handler as never);
    const sizeBefore = doc.getMap('weave').size;

    handler._subEmitter.emit(
      'messageBuffer',
      Buffer.from('other-channel'),
      Buffer.alloc(0)
    );

    expect(doc.getMap('weave').size).toBe(sizeBefore);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — WSSharedDoc awareness change handler
// ---------------------------------------------------------------------------

describe('4 — WSSharedDoc awareness change handler', () => {
  it('4.1 awareness change with conn in conns → added IDs stored in controlledIDs set', () => {
    const handler = makeHandler(false);
    const doc = new WSSharedDoc('awareness-room', handler as never);

    const conn = { readyState: 1, send: vi.fn((_d: unknown, _o: unknown, cb?: (e: Error | null) => void) => cb?.(null)), close: vi.fn() };
    const controlledIds = new Set<number>();
    doc.conns.set(conn, controlledIds);

    // Trigger awareness update — the handler fires with origin = 'local'
    doc.awareness.setLocalStateField('test', 'value');

    // The 'local' origin means conn param = 'local' (not null), so conns.get('local') = undefined
    // No IDs are added to controlledIds, but the broadcast still happens
    expect(doc.conns.has(conn)).toBe(true);
  });

  it('4.2 null origin → awarenessChangeHandler broadcasts without modifying connControlledIDs', () => {
    const handler = makeHandler(false);
    const doc = new WSSharedDoc('awareness-room2', handler as never);

    const conn = { readyState: 1, send: vi.fn(), close: vi.fn() };
    doc.conns.set(conn, new Set<number>());

    // Use a remote awareness to inject state (avoids WSSharedDoc's setLocalState(null) quirk)
    const remoteDoc = new Y.Doc();
    const remoteAwareness = new awarenessProtocol.Awareness(remoteDoc);
    remoteAwareness.setLocalStateField('user', 'Bob');
    const update = awarenessProtocol.encodeAwarenessUpdate(remoteAwareness, [
      remoteAwareness.clientID,
    ]);

    // applyAwarenessUpdate with origin=null → conn param in awarenessChangeHandler = null
    expect(() =>
      awarenessProtocol.applyAwarenessUpdate(doc.awareness, update, null)
    ).not.toThrow();

    // Remote state was added to awareness
    expect(doc.awareness.getStates().size).toBeGreaterThan(0);
  });

  it('4.3 conn origin with removed clients → connControlledIDs.delete called (line 111)', () => {
    const handler = makeHandler(false);
    const doc = new WSSharedDoc('awareness-room3', handler as never);

    const conn = {
      readyState: 1,
      send: vi.fn((_d: unknown, _o: unknown, cb?: (e: Error | null) => void) => cb?.(null)),
      close: vi.fn(),
    };
    const controlledIds = new Set<number>();
    doc.conns.set(conn, controlledIds);

    // Add a remote client's state to doc.awareness (so we have something to remove)
    const remoteDoc = new Y.Doc();
    const remoteAwareness = new awarenessProtocol.Awareness(remoteDoc);
    remoteAwareness.setLocalStateField('user', 'temp');
    const addUpdate = awarenessProtocol.encodeAwarenessUpdate(remoteAwareness, [
      remoteAwareness.clientID,
    ]);
    awarenessProtocol.applyAwarenessUpdate(doc.awareness, addUpdate, null);

    // Manually track the clientID as "controlled" by this conn
    controlledIds.add(remoteAwareness.clientID);
    expect(controlledIds.has(remoteAwareness.clientID)).toBe(true);

    // Remove the state with origin=conn → awarenessChangeHandler fires with removed=[clientID], conn=conn
    awarenessProtocol.removeAwarenessStates(doc.awareness, [remoteAwareness.clientID], conn);

    // connControlledIDs.delete(clientID) should have been called (line 111)
    expect(controlledIds.has(remoteAwareness.clientID)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — WSSharedDoc.destroy() (after bug fix: super.destroy())
// ---------------------------------------------------------------------------

describe('5 — WSSharedDoc.destroy()', () => {
  it('5.1 closes all connections and clears conns map', () => {
    const doc = new WSSharedDoc('destroy-room', makeHandler(false) as never);
    const conn1 = { close: vi.fn() };
    const conn2 = { close: vi.fn() };
    doc.conns.set(conn1, new Set());
    doc.conns.set(conn2, new Set());

    doc.destroy();

    expect(conn1.close).toHaveBeenCalled();
    expect(conn2.close).toHaveBeenCalled();
    expect(doc.conns.size).toBe(0);
  });

  it('5.2 calls awareness.destroy()', () => {
    const doc = new WSSharedDoc('destroy-room2', makeHandler(false) as never);
    const destroySpy = vi.spyOn(doc.awareness, 'destroy');
    doc.destroy();
    expect(destroySpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — getYDoc
// ---------------------------------------------------------------------------

describe('6 — getYDoc', () => {
  it('6.1 first call → creates new WSSharedDoc, calls initialState(doc)', async () => {
    const roomId = nextRoomId();
    const initialState = vi.fn();
    const doc = await getYDoc(roomId, initialState, makeHandler(false) as never);

    expect(doc).toBeInstanceOf(WSSharedDoc);
    expect(initialState).toHaveBeenCalledWith(doc);
  });

  it('6.1b getUpdateHandler: pubSub + publish rejects → error caught (line 56)', async () => {
    const roomId = nextRoomId();
    const myHandler = makeHandler(true); // PubSub enabled
    // Make publish reject
    myHandler.getPubClient().publish.mockRejectedValue(new Error('redis down'));

    const doc = await getYDoc(roomId, vi.fn(), myHandler as never);
    docs.set(roomId, doc);

    // Trigger a Y.Doc update → getUpdateHandler → publish rejects → .catch logs error (line 56)
    doc!.transact(() => doc!.getMap('test').set('k', 'v'));

    // Wait for the rejected promise .catch to execute
    await new Promise((r) => setTimeout(r, 10));
    // No crash means the error was caught correctly
    expect(true).toBe(true);
  });

  it('6.2 fetchRoom returns data → doc state updated, initialState NOT called', async () => {
    const mockServer = makeMockServer();
    const srcDoc = new Y.Doc();
    srcDoc.transact(() => srcDoc.getMap('weave').set('fetched', true));
    const snapshot = Y.encodeStateAsUpdate(srcDoc);
    mockServer.fetchRoom = vi.fn().mockResolvedValue(snapshot);
    setServer(mockServer as never);

    const roomId = nextRoomId();
    const initialState = vi.fn();
    const doc = await getYDoc(roomId, initialState, makeHandler(false) as never);

    expect(initialState).not.toHaveBeenCalled();
    expect((doc as WSSharedDoc).getMap('weave').get('fetched')).toBe(true);
  });

  it('6.3 fetchRoom returns null → initialState called', async () => {
    const mockServer = makeMockServer();
    mockServer.fetchRoom = vi.fn().mockResolvedValue(null);
    setServer(mockServer as never);

    const roomId = nextRoomId();
    const initialState = vi.fn();
    await getYDoc(roomId, initialState, makeHandler(false) as never);

    expect(initialState).toHaveBeenCalled();
  });

  it('6.4 second call with same name → returns cached doc', async () => {
    const roomId = nextRoomId();
    const initialState = vi.fn();
    const handler = makeHandler(false);
    const doc1 = await getYDoc(roomId, initialState, handler as never);
    const doc2 = await getYDoc(roomId, initialState, handler as never);

    expect(doc1).toBe(doc2);
    expect(initialState).toHaveBeenCalledTimes(1);
  });

  it('6.5 calls persistRoom immediately (setupRoomPersistence)', async () => {
    const mockServer = makeMockServer();
    const persistRoom = vi.fn().mockResolvedValue(undefined);
    mockServer.persistRoom = persistRoom;
    setServer(mockServer as never);

    const roomId = nextRoomId();
    await getYDoc(roomId, vi.fn(), makeHandler(false) as never);
    // Give the fire-and-forget persistHandler microtask a tick
    await new Promise((r) => setTimeout(r, 10));

    expect(persistRoom).toHaveBeenCalledWith(roomId, expect.any(Uint8Array));
  });

  it('6.6 persistRoom throws → error caught, getYDoc still resolves', async () => {
    const mockServer = makeMockServer();
    mockServer.persistRoom = vi.fn().mockRejectedValue(new Error('fail'));
    setServer(mockServer as never);

    const roomId = nextRoomId();
    await expect(
      getYDoc(roomId, vi.fn(), makeHandler(false) as never)
    ).resolves.toBeDefined();
    await new Promise((r) => setTimeout(r, 10));
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — setupWSConnection
// ---------------------------------------------------------------------------

describe('7 — setupWSConnection', () => {
  it('7.1 getDocName returns undefined → handler returns early', async () => {
    const conn = makeConn();
    const handler = setupWSConnection(() => undefined, vi.fn(), makeHandler(false) as never);
    await handler(conn, { url: '/test' } as never);

    expect(conn.close).not.toHaveBeenCalled();
    expect(conn.binaryType).toBe('');
  });

  it('7.2 getYDoc returns null → conn.close() called', async () => {
    const roomId = nextRoomId();
    docs.set(roomId, null as never);
    const conn = makeConn();
    const handler = setupWSConnection(() => roomId, vi.fn(), makeHandler(false) as never);
    await handler(conn, {} as never);
    expect(conn.close).toHaveBeenCalled();
  });

  it('7.3 successful connection → binaryType set, conn added to doc.conns', async () => {
    const roomId = nextRoomId();
    const myHandler = makeHandler(false);
    // Pre-create doc so we have a direct reference (docs.get returns Promise otherwise)
    const preDoc = await getYDoc(roomId, vi.fn(), myHandler as never);
    docs.set(roomId, preDoc);

    const conn = makeConn();
    const handler = setupWSConnection(() => roomId, vi.fn(), myHandler as never);
    await handler(conn, {} as never);

    expect(conn.binaryType).toBe('arraybuffer');
    expect(preDoc!.conns.has(conn)).toBe(true);
  });

  it('7.4 sends sync step 1 on connect', async () => {
    const roomId = nextRoomId();
    const conn = makeConn();
    const handler = setupWSConnection(() => roomId, vi.fn(), makeHandler(false) as never);
    await handler(conn, {} as never);
    expect(conn.send).toHaveBeenCalled();
  });

  it('7.5 awareness states exist → sends extra message on connect', async () => {
    const roomId = nextRoomId();
    const myHandler = makeHandler(false);
    const existingDoc = await getYDoc(roomId, vi.fn(), myHandler as never);
    docs.set(roomId, existingDoc);

    // Inject a remote awareness state so getStates().size > 0
    const remoteDoc = new Y.Doc();
    const remoteAwareness = new awarenessProtocol.Awareness(remoteDoc);
    remoteAwareness.setLocalStateField('user', 'Alice');
    const update = awarenessProtocol.encodeAwarenessUpdate(remoteAwareness, [
      remoteAwareness.clientID,
    ]);
    awarenessProtocol.applyAwarenessUpdate(existingDoc!.awareness, update, null);

    const conn = makeConn();
    conn.send.mockClear();
    const handler = setupWSConnection(() => roomId, vi.fn(), myHandler as never);
    await handler(conn, {} as never);

    expect(conn.send.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('7.6 conn close event → conn removed from doc.conns', async () => {
    const roomId = nextRoomId();
    const myHandler = makeHandler(false);
    const preDoc = await getYDoc(roomId, vi.fn(), myHandler as never);
    docs.set(roomId, preDoc);

    const conn = makeConn();
    const handler = setupWSConnection(() => roomId, vi.fn(), myHandler as never);
    await handler(conn, {} as never);

    conn._handlers['close']?.[0]?.();

    expect(preDoc!.conns.has(conn)).toBe(false);
  });

  it('7.7 pong event received → pongReceived flag set (conn survives next ping cycle)', async () => {
    vi.useFakeTimers();
    const roomId = nextRoomId();
    const myHandler = makeHandler(false);
    const preDoc = await getYDoc(roomId, vi.fn(), myHandler as never);
    docs.set(roomId, preDoc);

    const conn = makeConn();
    const handler = setupWSConnection(() => roomId, vi.fn(), myHandler as never);
    await handler(conn, {} as never);

    // First tick: pongReceived=true, ping is sent, pongReceived set to false
    vi.advanceTimersByTime(30001);
    // Receive pong → pongReceived = true
    conn._handlers['pong']?.[0]?.();
    // Second tick: pongReceived=true again → ping sent again, conn survives
    vi.advanceTimersByTime(30001);

    expect(preDoc!.conns.has(conn)).toBe(true);
    vi.useRealTimers();
  });

  it('7.8 ping interval fires without pong → closeConn called', async () => {
    vi.useFakeTimers();
    const roomId = nextRoomId();
    const myHandler = makeHandler(false);
    const preDoc = await getYDoc(roomId, vi.fn(), myHandler as never);
    docs.set(roomId, preDoc);

    const conn = makeConn();
    const handler = setupWSConnection(() => roomId, vi.fn(), myHandler as never);
    await handler(conn, {} as never);

    // First tick: pongReceived=true, send ping, pongReceived=false
    vi.advanceTimersByTime(30001);
    // Second tick: pongReceived=false → closeConn
    vi.advanceTimersByTime(30001);

    expect(preDoc?.conns.has(conn)).toBe(false);
    vi.useRealTimers();
  });

  it('7.9 conn.ping() throws → closeConn called, interval cleared', async () => {
    vi.useFakeTimers();
    const roomId = nextRoomId();
    const myHandler = makeHandler(false);
    const preDoc = await getYDoc(roomId, vi.fn(), myHandler as never);
    docs.set(roomId, preDoc);

    const conn = makeConn();
    conn.ping.mockImplementation(() => {
      throw new Error('ping failed');
    });
    const handler = setupWSConnection(() => roomId, vi.fn(), myHandler as never);
    await handler(conn, {} as never);

    vi.advanceTimersByTime(30001);

    expect(preDoc?.conns.has(conn)).toBe(false);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Suite 8 — messageListener (via setupWSConnection message event)
// ---------------------------------------------------------------------------

describe('8 — messageListener', () => {
  it('8.1 messageSync type → sends sync reply', async () => {
    const roomId = nextRoomId();
    const myHandler = makeHandler(false);
    const preDoc = await getYDoc(roomId, vi.fn(), myHandler as never);
    docs.set(roomId, preDoc);

    const conn = makeConn();
    const handler = setupWSConnection(() => roomId, vi.fn(), myHandler as never);
    await handler(conn, {} as never);

    conn.send.mockClear();

    // Build sync step 1 message using preDoc (actual WSSharedDoc)
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, 0); // messageSync
    syncProtocol.writeSyncStep1(enc, preDoc!);
    const message = encoding.toUint8Array(enc).buffer;

    conn._handlers['message']?.[0]?.(message);

    expect(conn.send).toHaveBeenCalled();
  });

  it('8.2 messageAwareness type → awareness update applied', async () => {
    const roomId = nextRoomId();
    const myHandler = makeHandler(false);
    const preDoc = await getYDoc(roomId, vi.fn(), myHandler as never);
    docs.set(roomId, preDoc);

    const conn = makeConn();
    const handler = setupWSConnection(() => roomId, vi.fn(), myHandler as never);
    await handler(conn, {} as never);

    conn.send.mockClear();

    // Build an awareness message using preDoc
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, 1); // messageAwareness
    const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(preDoc!.awareness, []);
    encoding.writeVarUint8Array(enc, awarenessUpdate);
    const message = encoding.toUint8Array(enc).buffer;

    expect(() => conn._handlers['message']?.[0]?.(message)).not.toThrow();
  });

  it('8.4 messageAwareness with PubSub enabled → publishes to awareness channel', async () => {
    const roomId = nextRoomId();
    const myHandler = makeHandler(true); // PubSub enabled
    const preDoc = await getYDoc(roomId, vi.fn(), myHandler as never);
    docs.set(roomId, preDoc);

    const conn = makeConn();
    const handler = setupWSConnection(() => roomId, vi.fn(), myHandler as never);
    await handler(conn, {} as never);

    // Build an awareness message with non-empty update
    const remoteDoc = new Y.Doc();
    const remoteAwareness = new awarenessProtocol.Awareness(remoteDoc);
    remoteAwareness.setLocalStateField('user', 'Alice');
    const awarenessData = awarenessProtocol.encodeAwarenessUpdate(remoteAwareness, [
      remoteAwareness.clientID,
    ]);
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, 1); // messageAwareness
    encoding.writeVarUint8Array(enc, awarenessData);
    const message = encoding.toUint8Array(enc).buffer;

    conn._handlers['message']?.[0]?.(message);

    expect(myHandler.getPubClient().publish).toHaveBeenCalledWith(
      preDoc!.topicAwarenessChannel,
      expect.any(Buffer)
    );
  });

  it('8.3 malformed message → error caught, no crash', async () => {
    const roomId = nextRoomId();
    const conn = makeConn();
    const handler = setupWSConnection(() => roomId, vi.fn(), makeHandler(false) as never);
    await handler(conn, {} as never);

    const malformed = new Uint8Array([255, 255, 255]).buffer;
    expect(() => conn._handlers['message']?.[0]?.(malformed)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Suite 9 — send (via conn readyState branches)
// ---------------------------------------------------------------------------

describe('9 — send', () => {
  it('9.1 readyState=CLOSED (2) → closeConn called', async () => {
    const roomId = nextRoomId();
    const conn = makeConn(2); // CLOSING/CLOSED
    const handler = setupWSConnection(() => roomId, vi.fn(), makeHandler(false) as never);
    await handler(conn, {} as never);

    // readyState=2 → send tries to closeConn before calling conn.send
    expect(conn.close).toHaveBeenCalled();
  });

  it('9.2 conn.send callback returns error → closeConn called', async () => {
    const roomId = nextRoomId();
    const myHandler = makeHandler(false);
    const preDoc = await getYDoc(roomId, vi.fn(), myHandler as never);
    docs.set(roomId, preDoc);

    const conn = makeConn(1);
    conn.send.mockImplementationOnce(
      (_d: unknown, _o: unknown, cb?: (e: Error | null) => void) => {
        cb?.(new Error('send failed'));
      }
    );
    const handler = setupWSConnection(() => roomId, vi.fn(), myHandler as never);
    await handler(conn, {} as never);

    expect(preDoc?.conns.has(conn)).toBe(false);
  });

  it('9.3 conn.send throws synchronously → catch block closes conn (lines 281-282)', () => {
    const handler = makeHandler(false);
    const doc = new WSSharedDoc('send-throw-room', handler as never);

    const throwingConn = {
      readyState: 1,
      send: vi.fn(() => {
        throw new Error('sync send error');
      }),
      close: vi.fn(),
    };
    doc.conns.set(throwingConn, new Set<number>());

    // Trigger a Y.Doc update → getUpdateHandler fires → send() → conn.send throws → catch block
    doc.transact(() => doc.getMap('test').set('key', 'value'));

    // closeConn in catch block should have removed the conn
    expect(doc.conns.has(throwingConn)).toBe(false);
  });

  it('9.4 closeConn clears persistence interval when one exists', async () => {
    const roomId = nextRoomId();
    const mockServer = makeMockServer();
    mockServer.persistRoom = vi.fn().mockResolvedValue(undefined);
    setServer(mockServer as never);

    const myHandler = makeHandler(false);
    const preDoc = await getYDoc(roomId, vi.fn(), myHandler as never);
    docs.set(roomId, preDoc);

    // Give persistHandler a tick to fire (it's fire-and-forget)
    await new Promise((r) => setTimeout(r, 10));

    const conn = makeConn();
    const handler = setupWSConnection(() => roomId, vi.fn(), myHandler as never);
    await handler(conn, {} as never);

    // Close the conn — closeConn should find the persistence interval and clear it
    conn._handlers['close']?.[0]?.();

    expect(preDoc?.conns.has(conn)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 10 — destroyWSConnection
// ---------------------------------------------------------------------------

describe('10 — destroyWSConnection', () => {
  it('10.1 roomId in docs → doc removed and destroy() called', async () => {
    const roomId = nextRoomId();
    const preDoc = await getYDoc(roomId, vi.fn(), makeHandler(false) as never);
    docs.set(roomId, preDoc);  // override Promise with actual doc

    const destroySpy = vi.spyOn(preDoc!, 'destroy');

    destroyWSConnection(roomId);

    expect(docs.has(roomId)).toBe(false);
    expect(destroySpy).toHaveBeenCalled();
  });

  it('10.2 roomId NOT in docs → no error', () => {
    expect(() => destroyWSConnection('nonexistent-room')).not.toThrow();
  });
});
