// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { WeaveStore } from '../store';
import type { WeaveStoreOptions } from '@inditextech/weave-types';

// ---------------------------------------------------------------------------
// Concrete subclass for testing
// ---------------------------------------------------------------------------

class TestStore extends WeaveStore {
  constructor(config: WeaveStoreOptions, name = 'testStore', supportsUndo = false) {
    super(config);
    this.name = name;
    this.supportsUndoManager = supportsUndo;
    this.roomId = 'room-123';
  }

  connect(): Promise<void> { return Promise.resolve(); }
  disconnect(): Promise<void> { return Promise.resolve(); }
  handleAwarenessChange(): void { /* intentionally empty */ }
  setAwarenessInfo(): void { /* intentionally empty */ }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockInstance() {
  const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
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

// ---------------------------------------------------------------------------
// Suite 1 — Constructor
// ---------------------------------------------------------------------------

describe('1 — Constructor', () => {
  it('1.1 document is a Y.Doc with weave and weaveMetadata maps', () => {
    const store = new TestStore(makeConfig());
    const doc = store.getDocument();
    expect(doc).toBeInstanceOf(Y.Doc);
    expect(doc.getMap('weave')).toBeDefined();
    expect(doc.getMap('weaveMetadata')).toBeDefined();
  });

  it('1.2 initial state and latestState are empty objects', () => {
    const store = new TestStore(makeConfig());
    expect(store.getState()).toEqual({ weave: {}, weaveMetadata: {} });
    expect(store.getLatestState()).toEqual({ weave: {}, weaveMetadata: {} });
  });

  it('1.3 config is stored (getUser delegates to it)', () => {
    const config = makeConfig('test-user');
    const store = new TestStore(config);
    expect(store.getUser()).toEqual({ id: 'test-user' });
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — getName / getLogger
// ---------------------------------------------------------------------------

describe('2 — getName / getLogger', () => {
  it('2.1 getName returns the name set by the subclass', () => {
    const store = new TestStore(makeConfig(), 'myStore');
    expect(store.getName()).toBe('myStore');
  });

  it('2.2 getLogger returns the logger created during register', () => {
    const store = new TestStore(makeConfig());
    const mock = makeMockInstance();
    store.register(mock as never);
    expect(store.getLogger()).toBe(mock._mockLogger);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — register
// ---------------------------------------------------------------------------

describe('3 — register', () => {
  it('3.1 sets this.instance to the provided Weave mock', () => {
    const store = new TestStore(makeConfig());
    const mock = makeMockInstance();
    store.register(mock as never);
    expect((store as unknown as { instance: typeof mock }).instance).toBe(mock);
  });

  it('3.2 calls getChildLogger with the store name', () => {
    const store = new TestStore(makeConfig(), 'myStore');
    const mock = makeMockInstance();
    store.register(mock as never);
    expect(mock.getChildLogger).toHaveBeenCalledWith('myStore');
  });

  it('3.3 calls getMainLogger().info with a message containing the store name', () => {
    const store = new TestStore(makeConfig(), 'myStore');
    const mock = makeMockInstance();
    store.register(mock as never);
    expect(mock._mockMainLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('myStore')
    );
  });

  it('3.4 emits onRoomLoaded and returns this', () => {
    const store = new TestStore(makeConfig());
    const mock = makeMockInstance();
    const result = store.register(mock as never);
    expect(mock.emitEvent).toHaveBeenCalledWith('onRoomLoaded', false);
    expect(result).toBe(store);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Simple getters and setters
// ---------------------------------------------------------------------------

describe('4 — Getters and setters', () => {
  let store: TestStore;

  beforeEach(() => {
    store = new TestStore(makeConfig());
  });

  it('4.1 getUser delegates to config.getUser', () => {
    const user = store.getUser();
    expect(user).toEqual({ id: 'user-1' });
  });

  it('4.2 setState + getState round-trips', () => {
    const newState = { weave: { x: 1 }, weaveMetadata: {} };
    store.setState(newState as never);
    expect(store.getState()).toBe(newState);
  });

  it('4.3 setLatestState + getLatestState round-trips', () => {
    const newState = { weave: { y: 2 }, weaveMetadata: {} };
    store.setLatestState(newState as never);
    expect(store.getLatestState()).toBe(newState);
  });

  it('4.4 getDocument returns the internal Y.Doc', () => {
    const doc = store.getDocument();
    expect(doc).toBeInstanceOf(Y.Doc);
  });

  it('4.5 getRoomId returns roomId', () => {
    expect(store.getRoomId()).toBe('room-123');
  });

  it('4.6 getStateSnapshot returns a Uint8Array', () => {
    const snapshot = store.getStateSnapshot();
    expect(snapshot).toBeInstanceOf(Uint8Array);
  });

  it('4.7 loadDocument applies a Yjs update to the document', () => {
    // Encode a doc with content, then apply to store doc
    const sourceDoc = new Y.Doc();
    sourceDoc.transact(() => {
      sourceDoc.getMap('weave').set('testKey', 'testValue');
    });
    const update = Y.encodeStateAsUpdate(sourceDoc);

    store.loadDocument(update);

    expect(store.getDocument().getMap('weave').get('testKey')).toBe('testValue');
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — restartDocument
// ---------------------------------------------------------------------------

describe('5 — restartDocument', () => {
  it('5.1 creates a new Y.Doc', () => {
    const store = new TestStore(makeConfig());
    const oldDoc = store.getDocument();
    store.restartDocument();
    const newDoc = store.getDocument();
    expect(newDoc).toBeInstanceOf(Y.Doc);
    expect(newDoc).not.toBe(oldDoc);
  });

  it('5.2 resets state to empty', () => {
    const store = new TestStore(makeConfig());
    store.setState({ weave: { x: 1 }, weaveMetadata: {} } as never);
    store.restartDocument();
    expect(store.getState()).toEqual({ weave: {}, weaveMetadata: {} });
  });

  it('5.3 resets latestState to empty', () => {
    const store = new TestStore(makeConfig());
    store.setLatestState({ weave: { x: 1 }, weaveMetadata: {} } as never);
    store.restartDocument();
    expect(store.getLatestState()).toEqual({ weave: {}, weaveMetadata: {} });
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — loadDefaultDocument
// ---------------------------------------------------------------------------

describe('6 — loadDefaultDocument', () => {
  it('6.1 with a custom function — calls that function with the document', () => {
    const store = new TestStore(makeConfig());
    const customFn = vi.fn();
    store.loadDefaultDocument(customFn);
    expect(customFn).toHaveBeenCalledWith(store.getDocument());
  });

  it('6.2 without a function — calls defaultInitialState (5 layers in document)', () => {
    const store = new TestStore(makeConfig());
    store.loadDefaultDocument();
    const weave = store.getDocument().getMap('weave');
    const props = weave.get('props') as Y.Map<unknown>;
    const children = props.get('children') as Y.Array<unknown>;
    expect(children.length).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — handleConnectionStatusChange
// ---------------------------------------------------------------------------

describe('7 — handleConnectionStatusChange', () => {
  it('7.1 emits onStoreConnectionStatusChange with the provided status', () => {
    const store = new TestStore(makeConfig());
    const mock = makeMockInstance();
    store.register(mock as never);
    mock.emitEvent.mockClear();

    store.handleConnectionStatusChange('connected');

    expect(mock.emitEvent).toHaveBeenCalledWith(
      'onStoreConnectionStatusChange',
      'connected'
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 8 — canUndoStateStep / canRedoStateStep
// ---------------------------------------------------------------------------

describe('8 — canUndoStateStep / canRedoStateStep', () => {
  it('8.1 canUndoStateStep throws when supportsUndoManager=false', () => {
    const store = new TestStore(makeConfig(), 'store', false);
    expect(() => store.canUndoStateStep()).toThrow('Undo manager not supported');
  });

  it('8.2 canRedoStateStep throws when supportsUndoManager=false', () => {
    const store = new TestStore(makeConfig(), 'store', false);
    expect(() => store.canRedoStateStep()).toThrow('Undo manager not supported');
  });

  it('8.3 canUndoStateStep returns false initially when undo stack is empty', () => {
    const store = new TestStore(makeConfig(), 'store', true);
    const mock = makeMockInstance();
    store.register(mock as never);
    store.setup();
    expect(store.canUndoStateStep()).toBe(false);
  });

  it('8.4 canRedoStateStep returns false initially when redo stack is empty', () => {
    const store = new TestStore(makeConfig(), 'store', true);
    const mock = makeMockInstance();
    store.register(mock as never);
    store.setup();
    expect(store.canRedoStateStep()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 9 — undoStateStep / redoStateStep
// ---------------------------------------------------------------------------

describe('9 — undoStateStep / redoStateStep', () => {
  it('9.1 undoStateStep throws when supportsUndoManager=false', () => {
    const store = new TestStore(makeConfig(), 'store', false);
    expect(() => store.undoStateStep()).toThrow('Undo manager not supported');
  });

  it('9.2 redoStateStep throws when supportsUndoManager=false', () => {
    const store = new TestStore(makeConfig(), 'store', false);
    expect(() => store.redoStateStep()).toThrow('Undo manager not supported');
  });

  it('9.3 undoStateStep emits onUndoChange', () => {
    const store = new TestStore(makeConfig(), 'store', true);
    const mock = makeMockInstance();
    store.register(mock as never);
    store.setup();
    mock.emitEvent.mockClear();

    store.undoStateStep();

    expect(mock.emitEvent).toHaveBeenCalledWith('onUndoChange');
  });

  it('9.4 redoStateStep emits onRedoChange', () => {
    const store = new TestStore(makeConfig(), 'store', true);
    const mock = makeMockInstance();
    store.register(mock as never);
    store.setup();
    mock.emitEvent.mockClear();

    store.redoStateStep();

    expect(mock.emitEvent).toHaveBeenCalledWith('onRedoChange');
  });
});
