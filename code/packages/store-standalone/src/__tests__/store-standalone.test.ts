// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { Buffer } from 'buffer';
import { WEAVE_STORE_STANDALONE } from '../constants';
import { WeaveStoreStandalone } from '../store-standalone';
import type { WeaveStoreOptions } from '@inditextech/weave-types';
import { WEAVE_STORE_CONNECTION_STATUS } from '@inditextech/weave-types';

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

/**
 * Builds a base64-encoded Yjs state update from a plain-object payload.
 * Both `weave` and `weaveMetadata` maps are populated with the provided data.
 */
const DEFAULT_WEAVE_DATA: Record<string, unknown> = { node1: 'value1' };
const DEFAULT_META_DATA: Record<string, unknown> = { meta1: 'metaValue1' };
function makeBase64RoomData(
  weaveData: Record<string, unknown> = DEFAULT_WEAVE_DATA,
  metaData: Record<string, unknown> = DEFAULT_META_DATA
): string {
  const doc = new Y.Doc();
  doc.transact(() => {
    const weaveMap = doc.getMap('weave');
    for (const [k, v] of Object.entries(weaveData)) {
      weaveMap.set(k, v);
    }
    const metaMap = doc.getMap('weaveMetadata');
    for (const [k, v] of Object.entries(metaData)) {
      metaMap.set(k, v);
    }
  });
  const update = Y.encodeStateAsUpdate(doc);
  return Buffer.from(update).toString('base64');
}

// ---------------------------------------------------------------------------
// Suite 1 — Constants
// ---------------------------------------------------------------------------

describe('1 — Constants', () => {
  it('1.1 WEAVE_STORE_STANDALONE equals "store-standalone"', () => {
    expect(WEAVE_STORE_STANDALONE).toBe('store-standalone');
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Module re-exports
// ---------------------------------------------------------------------------

describe('2 — Module re-exports', () => {
  it('2.1 WeaveStoreStandalone is exported from the client entry', async () => {
    const clientEntry = await import('../index.client');
    expect(clientEntry.WeaveStoreStandalone).toBeDefined();
    expect(clientEntry.WeaveStoreStandalone).toBe(WeaveStoreStandalone);
  });

  it('2.2 WEAVE_STORE_STANDALONE is exported from the client entry', async () => {
    const clientEntry = await import('../index.client');
    expect(clientEntry.WEAVE_STORE_STANDALONE).toBe('store-standalone');
  });

  it('2.3 WeaveStoreStandalone is exported from the server entry', async () => {
    const serverEntry = await import('../index.server');
    expect(serverEntry.WeaveStoreStandalone).toBeDefined();
    expect(serverEntry.WeaveStoreStandalone).toBe(WeaveStoreStandalone);
  });

  it('2.4 WEAVE_STORE_STANDALONE is exported from the server entry', async () => {
    const serverEntry = await import('../index.server');
    expect(serverEntry.WEAVE_STORE_STANDALONE).toBe('store-standalone');
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — Constructor
// ---------------------------------------------------------------------------

describe('3 — Constructor', () => {
  it('3.1 roomId is always "standalone"', () => {
    const store = new WeaveStoreStandalone(
      { roomData: undefined },
      makeConfig()
    );
    expect(store.getRoomId()).toBe('standalone');
  });

  it('3.2 name is WEAVE_STORE_STANDALONE', () => {
    const store = new WeaveStoreStandalone(
      { roomData: undefined },
      makeConfig()
    );
    const mock = makeMockInstance();
    store.register(mock as never);
    expect(store.getName()).toBe(WEAVE_STORE_STANDALONE);
  });

  it('3.3 supportsUndoManager is true', () => {
    const store = new WeaveStoreStandalone(
      { roomData: undefined },
      makeConfig()
    );
    // canUndoStateStep must not throw — it would throw if supportsUndoManager were false
    const mock = makeMockInstance();
    store.register(mock as never);
    store.setup();
    expect(() => store.canUndoStateStep()).not.toThrow();
  });

  it('3.4 roomData provided is stored and used during connect', async () => {
    const roomData = makeBase64RoomData({ myKey: 'myValue' });
    const store = new WeaveStoreStandalone({ roomData }, makeConfig());
    const mock = makeMockInstance();
    store.register(mock as never);

    await store.connect();

    // If roomData was stored, the document should now have myKey
    const weaveMap = store.getDocument().getMap('weave');
    expect(weaveMap.get('myKey')).toBe('myValue');
  });

  it('3.5 roomData undefined means the initialState path is taken', async () => {
    const customInitialState = vi.fn();
    const store = new WeaveStoreStandalone(
      { roomData: undefined, initialState: customInitialState },
      makeConfig()
    );
    const mock = makeMockInstance();
    store.register(mock as never);

    await store.connect();

    expect(customInitialState).toHaveBeenCalledWith(store.getDocument());
  });

  it('3.6 custom initialState function is stored when provided', async () => {
    const customInitialState = vi.fn();
    const store = new WeaveStoreStandalone(
      { roomData: undefined, initialState: customInitialState },
      makeConfig()
    );
    const mock = makeMockInstance();
    store.register(mock as never);

    await store.connect();

    expect(customInitialState).toHaveBeenCalledTimes(1);
  });

  it('3.7 initialState defaults to defaultInitialState when not provided', async () => {
    const store = new WeaveStoreStandalone(
      { roomData: undefined },
      makeConfig()
    );
    const mock = makeMockInstance();
    store.register(mock as never);

    await store.connect();

    // defaultInitialState sets up 5 layers; verify document has non-empty weave map
    const weave = store.getDocument().getMap('weave');
    expect(weave.size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — connect() with roomData
// ---------------------------------------------------------------------------

describe('4 — connect() with roomData', () => {
  let store: WeaveStoreStandalone;
  let mock: ReturnType<typeof makeMockInstance>;

  beforeEach(async () => {
    const roomData = makeBase64RoomData(
      { node1: 'value1' },
      { metaKey: 'metaValue' }
    );
    store = new WeaveStoreStandalone({ roomData }, makeConfig());
    mock = makeMockInstance();
    store.register(mock as never);
    await store.connect();
  });

  it('4.1 calls instance.checkForAsyncElements with parsed WeaveState JSON', () => {
    expect(mock.checkForAsyncElements).toHaveBeenCalledTimes(1);
    const [arg] = mock.checkForAsyncElements.mock.calls[0];
    expect(arg).toMatchObject({
      weave: expect.objectContaining({ node1: 'value1' }),
      weaveMetadata: expect.objectContaining({ metaKey: 'metaValue' }),
    });
  });

  it('4.2 Yjs update is applied to the internal document', () => {
    const weaveMap = store.getDocument().getMap('weave');
    expect(weaveMap.get('node1')).toBe('value1');
  });

  it('4.3 emits CONNECTED status via handleConnectionStatusChange', () => {
    expect(mock.emitEvent).toHaveBeenCalledWith(
      'onStoreConnectionStatusChange',
      WEAVE_STORE_CONNECTION_STATUS.CONNECTED
    );
  });

  it('4.4 snapshotToJSON correctly extracts both weave and weaveMetadata maps', () => {
    // Verified indirectly: checkForAsyncElements received a properly shaped WeaveState
    const [arg] = mock.checkForAsyncElements.mock.calls[0];
    expect(Object.keys(arg)).toEqual(
      expect.arrayContaining(['weave', 'weaveMetadata'])
    );
    expect(arg.weave.node1).toBe('value1');
    expect(arg.weaveMetadata.metaKey).toBe('metaValue');
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — connect() without roomData
// ---------------------------------------------------------------------------

describe('5 — connect() without roomData', () => {
  it('5.1 custom initialState is called with the Y.Doc', async () => {
    const customInitialState = vi.fn();
    const store = new WeaveStoreStandalone(
      { roomData: undefined, initialState: customInitialState },
      makeConfig()
    );
    const mock = makeMockInstance();
    store.register(mock as never);

    await store.connect();

    expect(customInitialState).toHaveBeenCalledWith(store.getDocument());
  });

  it('5.2 emits CONNECTED status even without roomData', async () => {
    const store = new WeaveStoreStandalone(
      { roomData: undefined, initialState: vi.fn() },
      makeConfig()
    );
    const mock = makeMockInstance();
    store.register(mock as never);
    await store.connect();

    expect(mock.emitEvent).toHaveBeenCalledWith(
      'onStoreConnectionStatusChange',
      WEAVE_STORE_CONNECTION_STATUS.CONNECTED
    );
  });

  it('5.3 defaultInitialState is used when initialState is not provided', async () => {
    const store = new WeaveStoreStandalone(
      { roomData: undefined },
      makeConfig()
    );
    const mock = makeMockInstance();
    store.register(mock as never);

    await store.connect();

    // defaultInitialState populates 'weave' with 5 child layers
    const weave = store.getDocument().getMap('weave');
    expect(weave.size).toBeGreaterThan(0);
    expect(mock.emitEvent).toHaveBeenCalledWith(
      'onStoreConnectionStatusChange',
      WEAVE_STORE_CONNECTION_STATUS.CONNECTED
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — disconnect()
// ---------------------------------------------------------------------------

describe('6 — disconnect()', () => {
  it('6.1 destroys the Y.Doc', async () => {
    const store = new WeaveStoreStandalone(
      { roomData: undefined, initialState: vi.fn() },
      makeConfig()
    );
    const mock = makeMockInstance();
    store.register(mock as never);

    const doc = store.getDocument();
    const destroySpy = vi.spyOn(doc, 'destroy');

    await store.disconnect();

    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('6.2 emits DISCONNECTED status', async () => {
    const store = new WeaveStoreStandalone(
      { roomData: undefined, initialState: vi.fn() },
      makeConfig()
    );
    const mock = makeMockInstance();
    store.register(mock as never);
    mock.emitEvent.mockClear();

    await store.disconnect();

    expect(mock.emitEvent).toHaveBeenCalledWith(
      'onStoreConnectionStatusChange',
      WEAVE_STORE_CONNECTION_STATUS.DISCONNECTED
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — No-op overrides
// ---------------------------------------------------------------------------

describe('7 — No-op overrides', () => {
  let store: WeaveStoreStandalone;

  beforeEach(() => {
    store = new WeaveStoreStandalone(
      { roomData: undefined, initialState: vi.fn() },
      makeConfig()
    );
    const mock = makeMockInstance();
    store.register(mock as never);
  });

  it('7.1 handleAwarenessChange() can be called without error', () => {
    expect(() => store.handleAwarenessChange(false)).not.toThrow();
  });

  it('7.2 setAwarenessInfo() can be called without error', () => {
    expect(() => store.setAwarenessInfo('field', 'value')).not.toThrow();
  });
});
