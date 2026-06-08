// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { WEAVE_STORE_WEBSOCKETS } from '../constants';
import { WeaveStoreWebsockets } from '../store-websockets';
import type { WeaveStoreOptions } from '@inditextech/weave-types';
import { WEAVE_STORE_CONNECTION_STATUS } from '@inditextech/weave-types';

// ---------------------------------------------------------------------------
// Mock y-websocket
// ---------------------------------------------------------------------------

const mockAwareness = {
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
  getStates: vi.fn().mockReturnValue(new Map()),
  setLocalStateField: vi.fn(),
  clientID: 0,
};

const mockProvider = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  awareness: mockAwareness,
};

vi.mock('y-websocket', () => ({
  WebsocketProvider: vi.fn().mockImplementation(() => mockProvider),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockInstance() {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  const mockMainLogger = { info: vi.fn() };
  return {
    getChildLogger: vi.fn().mockReturnValue(mockLogger),
    getMainLogger: vi.fn().mockReturnValue(mockMainLogger),
    emitEvent: vi.fn(),
    checkForAsyncElements: vi.fn(),
    setupRenderer: vi.fn(),
    render: vi.fn(),
    getPlugin: vi.fn().mockReturnValue(null),
    getNode: vi.fn().mockReturnValue(null),
    _mockLogger: mockLogger,
    _mockMainLogger: mockMainLogger,
  };
}

function makeConfig(userId = 'user-1'): WeaveStoreOptions {
  return {
    getUser: vi.fn().mockReturnValue({ id: userId }),
  };
}

function makeWsOptions(roomId = 'room-test', serverUrl = 'ws://localhost:1234') {
  return { roomId, wsOptions: { serverUrl } };
}

function makeStore(initialRoomData?: Uint8Array | ((doc: Y.Doc) => void)) {
  const store = new WeaveStoreWebsockets(
    initialRoomData,
    makeConfig(),
    makeWsOptions()
  );
  const mock = makeMockInstance();
  store.register(mock as never);
  return { store, mock };
}

/** Get the callback registered on the provider for a given event name */
function getProviderHandler(eventName: string) {
  const calls = mockProvider.on.mock.calls;
  const call = calls.find((c) => c[0] === eventName);
  return call ? call[1] : undefined;
}

// ---------------------------------------------------------------------------
// Suite 1 — Constants
// ---------------------------------------------------------------------------

describe('1 — Constants', () => {
  it('1.1 WEAVE_STORE_WEBSOCKETS equals "store-websockets"', () => {
    expect(WEAVE_STORE_WEBSOCKETS).toBe('store-websockets');
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Module re-exports (index.client.ts)
// ---------------------------------------------------------------------------

describe('2 — Module re-exports (index.client.ts)', () => {
  it('2.1 WeaveStoreWebsockets is exported from the client entry', async () => {
    const clientEntry = await import('../index.client');
    expect(clientEntry.WeaveStoreWebsockets).toBe(WeaveStoreWebsockets);
  });

  it('2.2 WEAVE_STORE_WEBSOCKETS is exported from the client entry', async () => {
    const clientEntry = await import('../index.client');
    expect(clientEntry.WEAVE_STORE_WEBSOCKETS).toBe('store-websockets');
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — Constructor
// ---------------------------------------------------------------------------

describe('3 — Constructor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider.on.mockClear();
    mockAwareness.on.mockClear();
  });

  it('3.1 roomId is set from websocketOptions.roomId', () => {
    const { store } = makeStore();
    expect(store.getRoomId()).toBe('room-test');
  });

  it('3.2 name is WEAVE_STORE_WEBSOCKETS', () => {
    const { store } = makeStore();
    expect(store.getName()).toBe(WEAVE_STORE_WEBSOCKETS);
  });

  it('3.3 supportsUndoManager is true (canUndoStateStep does not throw)', () => {
    const { store } = makeStore();
    store.setup();
    expect(() => store.canUndoStateStep()).not.toThrow();
  });

  it('3.4 WebsocketProvider is instantiated with correct args', async () => {
    const { WebsocketProvider } = await import('y-websocket');
    makeStore();
    expect(WebsocketProvider).toHaveBeenCalledWith(
      'ws://localhost:1234',
      'room-test',
      expect.any(Y.Doc),
      { connect: false, disableBc: true }
    );
  });

  it('3.5 provider.on registered for status, connection-close, connection-error', () => {
    makeStore();
    const registeredEvents = mockProvider.on.mock.calls.map((c) => c[0]);
    expect(registeredEvents).toContain('status');
    expect(registeredEvents).toContain('connection-close');
    expect(registeredEvents).toContain('connection-error');
  });

  it('3.6 accepts Uint8Array as initialRoomData', () => {
    const data = new Uint8Array([1, 2, 3]);
    expect(() => makeStore(data)).not.toThrow();
  });

  it('3.7 accepts a function as initialRoomData', () => {
    const fn = vi.fn();
    expect(() => makeStore(fn)).not.toThrow();
  });

  it('3.8 accepts undefined as initialRoomData', () => {
    expect(() => makeStore(undefined)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — setup()
// ---------------------------------------------------------------------------

describe('4 — setup()', () => {
  it('4.1 calls super.setup() — creates UndoManager', () => {
    const { store } = makeStore();
    // super.setup() creates the UndoManager; canUndoStateStep should not throw
    store.setup();
    expect(() => store.canUndoStateStep()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — loadRoomInitialData() (triggered via status event)
// ---------------------------------------------------------------------------

describe('5 — loadRoomInitialData()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('5.1 Uint8Array → loadDocument() applied to document', () => {
    // Build a real Yjs snapshot
    const sourceDoc = new Y.Doc();
    sourceDoc.transact(() => {
      sourceDoc.getMap('weave').set('key1', 'val1');
    });
    const snapshot = Y.encodeStateAsUpdate(sourceDoc);

    const { store } = makeStore(snapshot);

    // Trigger status=connected
    const statusHandler = getProviderHandler('status');
    statusHandler?.({ status: WEAVE_STORE_CONNECTION_STATUS.CONNECTED });

    expect(store.getDocument().getMap('weave').get('key1')).toBe('val1');
  });

  it('5.2 function → loadDefaultDocument(fn) called with the Y.Doc', () => {
    const initialFn = vi.fn();
    const { store } = makeStore(initialFn);

    const statusHandler = getProviderHandler('status');
    statusHandler?.({ status: WEAVE_STORE_CONNECTION_STATUS.CONNECTED });

    expect(initialFn).toHaveBeenCalledWith(store.getDocument());
  });

  it('5.3 undefined → loadDefaultDocument() with no args (default initial state)', () => {
    const { store } = makeStore(undefined);

    const statusHandler = getProviderHandler('status');
    statusHandler?.({ status: WEAVE_STORE_CONNECTION_STATUS.CONNECTED });

    // defaultInitialState populates weave map
    expect(store.getDocument().getMap('weave').size).toBeGreaterThan(0);
  });

  it('5.4 initialRoomData is cleared to undefined after first load', () => {
    const initialFn = vi.fn();
    makeStore(initialFn);

    const statusHandler = getProviderHandler('status');
    statusHandler?.({ status: WEAVE_STORE_CONNECTION_STATUS.CONNECTED });
    statusHandler?.({ status: WEAVE_STORE_CONNECTION_STATUS.CONNECTED }); // second time

    // should only be called once
    expect(initialFn).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — init() status event handler
// ---------------------------------------------------------------------------

describe('6 — init() status event handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('6.1 Any status → handleConnectionStatusChange(status) emitted', () => {
    const { mock } = makeStore();
    const statusHandler = getProviderHandler('status');
    statusHandler?.({ status: 'connected' });
    expect(mock.emitEvent).toHaveBeenCalledWith(
      'onStoreConnectionStatusChange',
      'connected'
    );
  });

  it('6.2 status=CONNECTED + started=false → loadRoomInitialData called, started=true', () => {
    const initialFn = vi.fn();
    makeStore(initialFn);
    const statusHandler = getProviderHandler('status');
    statusHandler?.({ status: WEAVE_STORE_CONNECTION_STATUS.CONNECTED });
    expect(initialFn).toHaveBeenCalledTimes(1);
  });

  it('6.3 status=CONNECTED + started=true → loadRoomInitialData NOT called again', () => {
    const initialFn = vi.fn();
    makeStore(initialFn);
    const statusHandler = getProviderHandler('status');
    statusHandler?.({ status: WEAVE_STORE_CONNECTION_STATUS.CONNECTED }); // started=true now
    statusHandler?.({ status: WEAVE_STORE_CONNECTION_STATUS.CONNECTED }); // second trigger
    expect(initialFn).toHaveBeenCalledTimes(1);
  });

  it('6.4 status != CONNECTED → loadRoomInitialData NOT called', () => {
    const initialFn = vi.fn();
    makeStore(initialFn);
    const statusHandler = getProviderHandler('status');
    statusHandler?.({ status: WEAVE_STORE_CONNECTION_STATUS.DISCONNECTED });
    expect(initialFn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — init() connection-close event handler
// ---------------------------------------------------------------------------

describe('7 — init() connection-close event handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('7.1 started=true → emits CONNECTING', () => {
    const { mock } = makeStore();
    // Set started=true via a connected event
    const statusHandler = getProviderHandler('status');
    statusHandler?.({ status: WEAVE_STORE_CONNECTION_STATUS.CONNECTED });
    mock.emitEvent.mockClear();

    const closeHandler = getProviderHandler('connection-close');
    closeHandler?.();

    expect(mock.emitEvent).toHaveBeenCalledWith(
      'onStoreConnectionStatusChange',
      WEAVE_STORE_CONNECTION_STATUS.CONNECTING
    );
  });

  it('7.2 started=false → emits DISCONNECTED', () => {
    const { mock } = makeStore();
    mock.emitEvent.mockClear();

    const closeHandler = getProviderHandler('connection-close');
    closeHandler?.();

    expect(mock.emitEvent).toHaveBeenCalledWith(
      'onStoreConnectionStatusChange',
      WEAVE_STORE_CONNECTION_STATUS.DISCONNECTED
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 8 — init() connection-error event handler
// ---------------------------------------------------------------------------

describe('8 — init() connection-error event handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('8.1 started=true → emits DISCONNECTED', () => {
    const { mock } = makeStore();
    const statusHandler = getProviderHandler('status');
    statusHandler?.({ status: WEAVE_STORE_CONNECTION_STATUS.CONNECTED });
    mock.emitEvent.mockClear();

    const errorHandler = getProviderHandler('connection-error');
    errorHandler?.();

    expect(mock.emitEvent).toHaveBeenCalledWith(
      'onStoreConnectionStatusChange',
      WEAVE_STORE_CONNECTION_STATUS.DISCONNECTED
    );
  });

  it('8.2 started=false → emits ERROR', () => {
    const { mock } = makeStore();
    mock.emitEvent.mockClear();

    const errorHandler = getProviderHandler('connection-error');
    errorHandler?.();

    expect(mock.emitEvent).toHaveBeenCalledWith(
      'onStoreConnectionStatusChange',
      WEAVE_STORE_CONNECTION_STATUS.ERROR
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 9 — connect()
// ---------------------------------------------------------------------------

describe('9 — connect()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAwareness.on.mockClear();
    mockProvider.connect.mockClear();
  });

  it('9.1 registers update and change on awareness', async () => {
    const { store } = makeStore();
    await store.connect();
    const registeredEvents = mockAwareness.on.mock.calls.map((c) => c[0]);
    expect(registeredEvents).toContain('update');
    expect(registeredEvents).toContain('change');
  });

  it('9.2 calls provider.connect()', async () => {
    const { store } = makeStore();
    await store.connect();
    expect(mockProvider.connect).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 10 — disconnect()
// ---------------------------------------------------------------------------

describe('10 — disconnect()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAwareness.destroy.mockClear();
    mockAwareness.off.mockClear();
    mockProvider.disconnect.mockClear();
  });

  it('10.1 calls awareness.destroy()', async () => {
    const { store } = makeStore();
    await store.disconnect();
    expect(mockAwareness.destroy).toHaveBeenCalled();
  });

  it('10.2 calls awareness.off for update and change', async () => {
    const { store } = makeStore();
    await store.disconnect();
    const offEvents = mockAwareness.off.mock.calls.map((c) => c[0]);
    expect(offEvents).toContain('update');
    expect(offEvents).toContain('change');
  });

  it('10.3 calls provider.disconnect()', async () => {
    const { store } = makeStore();
    await store.disconnect();
    expect(mockProvider.disconnect).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 11 — handleAwarenessChange()
// ---------------------------------------------------------------------------

describe('11 — handleAwarenessChange()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAwareness.getStates.mockClear();
  });

  it('11.1 emit=true (default) → calls instance.emitEvent("onAwarenessChange", values)', () => {
    const state1 = { user: 'A' };
    const state2 = { user: 'B' };
    mockAwareness.getStates.mockReturnValue(
      new Map([
        [0, state1],
        [1, state2],
      ])
    );
    mockAwareness.clientID = 99; // won't splice any index

    const { store, mock } = makeStore();
    mock.emitEvent.mockClear();
    store.handleAwarenessChange(true);

    expect(mock.emitEvent).toHaveBeenCalledWith(
      'onAwarenessChange',
      expect.any(Array)
    );
  });

  it('11.2 emit=false → does NOT call instance.emitEvent', () => {
    mockAwareness.getStates.mockReturnValue(new Map());
    const { store, mock } = makeStore();
    mock.emitEvent.mockClear();
    store.handleAwarenessChange(false);
    expect(mock.emitEvent).not.toHaveBeenCalled();
  });

  it('11.3 clientID entry is spliced out of values', () => {
    const states = new Map([
      [0, { user: 'A' }],
      [1, { user: 'B' }],
      [2, { user: 'C' }],
    ]);
    mockAwareness.getStates.mockReturnValue(states);
    mockAwareness.clientID = 1;

    const { store, mock } = makeStore();
    mock.emitEvent.mockClear();
    store.handleAwarenessChange(true);

    const [, emittedValues] = mock.emitEvent.mock.calls[0];
    // The splice removes item at index clientID=1 from the values array
    expect(emittedValues).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Suite 12 — setAwarenessInfo()
// ---------------------------------------------------------------------------

describe('12 — setAwarenessInfo()', () => {
  it('12.1 calls awareness.setLocalStateField(field, value)', () => {
    mockAwareness.setLocalStateField.mockClear();
    const { store } = makeStore();
    store.setAwarenessInfo('cursor', { x: 10, y: 20 });
    expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith('cursor', {
      x: 10,
      y: 20,
    });
  });
});
