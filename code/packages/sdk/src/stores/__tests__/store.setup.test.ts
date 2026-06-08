// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeaveStore } from '../store';
import type { WeaveStoreOptions } from '@inditextech/weave-types';

// ---------------------------------------------------------------------------
// Concrete subclass for testing
// ---------------------------------------------------------------------------

class TestStore extends WeaveStore {
  constructor(config: WeaveStoreOptions, supportsUndo = false) {
    super(config);
    this.name = 'testStore';
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
  return {
    getChildLogger: vi.fn().mockReturnValue({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
    getMainLogger: vi.fn().mockReturnValue({ info: vi.fn() }),
    emitEvent: vi.fn(),
    checkForAsyncElements: vi.fn(),
    setupRenderer: vi.fn(),
    render: vi.fn(),
    getPlugin: vi.fn().mockReturnValue(null),
    getNode: vi.fn().mockReturnValue(null),
  };
}

function makeConfig(userId = 'user-1'): WeaveStoreOptions {
  return { getUser: vi.fn().mockReturnValue({ id: userId }) };
}

/** Populate the store document so afterTransaction sees non-empty weave. */
function populateDocument(store: TestStore) {
  store.getDocument().transact(() => {
    store.getDocument().getMap('weave').set('stage', 'data');
  });
}

// ---------------------------------------------------------------------------
// Suite 10 — setup()
// ---------------------------------------------------------------------------

describe('10 — setup()', () => {
  let store: TestStore;
  let mock: ReturnType<typeof makeMockInstance>;
  let rafCallbacks: Array<() => void>;

  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn().mockImplementation((cb: () => void) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length - 1;
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function flushRaf() {
    const cbs = [...rafCallbacks];
    rafCallbacks.length = 0;
    cbs.forEach((cb) => cb());
  }

  it('10.1 setup() emits onRoomLoaded with false at start', () => {
    store = new TestStore(makeConfig());
    mock = makeMockInstance();
    store.register(mock as never);
    mock.emitEvent.mockClear();

    store.setup();

    expect(mock.emitEvent).toHaveBeenCalledWith('onRoomLoaded', false);
  });

  it('10.2 supportsUndoManager=false — no UndoManager created, canUndo throws', () => {
    store = new TestStore(makeConfig(), false);
    mock = makeMockInstance();
    store.register(mock as never);
    store.setup();

    expect(() => store.canUndoStateStep()).toThrow('Undo manager not supported');
  });

  it('10.3 supportsUndoManager=true — UndoManager created, canUndo returns boolean', () => {
    store = new TestStore(makeConfig(), true);
    mock = makeMockInstance();
    store.register(mock as never);
    store.setup();

    expect(() => store.canUndoStateStep()).not.toThrow();
    expect(store.canUndoStateStep()).toBe(false);
  });

  it('10.4 stack-item-added emits onUndoManagerStatusChange', () => {
    store = new TestStore(makeConfig(), true);
    mock = makeMockInstance();
    store.register(mock as never);
    store.setup();
    mock.emitEvent.mockClear();

    // Perform a transaction to add a stack item
    store.getDocument().transact(() => {
      store.getDocument().getMap('weave').set('key', 'value');
    }, (store as unknown as { config: WeaveStoreOptions }).config.getUser().id);

    expect(mock.emitEvent).toHaveBeenCalledWith(
      'onUndoManagerStatusChange',
      expect.objectContaining({ canUndo: expect.any(Boolean), canRedo: expect.any(Boolean) })
    );
  });

  it('10.5 afterTransaction: first load with non-empty weave calls checkForAsyncElements + setupRenderer', () => {
    store = new TestStore(makeConfig(), false);
    mock = makeMockInstance();
    store.register(mock as never);
    store.setup();
    mock.emitEvent.mockClear();

    populateDocument(store);

    expect(mock.checkForAsyncElements).toHaveBeenCalledTimes(1);
    expect(mock.setupRenderer).toHaveBeenCalledTimes(1);
  });

  it('10.6 afterTransaction: first load emits onRoomLoaded with true and returns early (no RAF)', () => {
    store = new TestStore(makeConfig(), false);
    mock = makeMockInstance();
    store.register(mock as never);
    store.setup();
    mock.emitEvent.mockClear();

    populateDocument(store);

    expect(mock.emitEvent).toHaveBeenCalledWith('onRoomLoaded', true);
    // RAF should NOT have been scheduled on first load
    expect(rafCallbacks).toHaveLength(0);
  });

  it('10.7 afterTransaction: first load with empty weave does NOT trigger first-load path', () => {
    store = new TestStore(makeConfig(), false);
    mock = makeMockInstance();
    store.register(mock as never);
    store.setup();
    mock.emitEvent.mockClear();

    // Empty transaction — weave stays empty
    store.getDocument().transact(() => {
      // no changes to 'weave'
    });

    expect(mock.checkForAsyncElements).not.toHaveBeenCalled();
    expect(mock.setupRenderer).not.toHaveBeenCalled();
  });

  it('10.8 afterTransaction: subsequent update queues a requestAnimationFrame', () => {
    store = new TestStore(makeConfig(), false);
    mock = makeMockInstance();
    store.register(mock as never);
    store.setup();

    populateDocument(store); // first load
    rafCallbacks.length = 0; // clear

    // Second transaction → RAF path
    store.getDocument().transact(() => {
      store.getDocument().getMap('weave').set('key2', 'val2');
    });

    expect(rafCallbacks).toHaveLength(1);
  });

  it('10.9 RAF callback emits onStateMetadataChange + onStateChange', () => {
    store = new TestStore(makeConfig(), false);
    mock = makeMockInstance();
    store.register(mock as never);
    store.setup();

    populateDocument(store); // first load

    // Second transaction
    store.getDocument().transact(() => {
      store.getDocument().getMap('weave').set('key2', 'val2');
    });

    mock.emitEvent.mockClear();
    flushRaf();

    expect(mock.emitEvent).toHaveBeenCalledWith('onStateMetadataChange', expect.anything());
    expect(mock.emitEvent).toHaveBeenCalledWith('onStateChange', expect.anything());
  });

  it('10.10 multiple transactions before RAF fires — only one RAF scheduled', () => {
    store = new TestStore(makeConfig(), false);
    mock = makeMockInstance();
    store.register(mock as never);
    store.setup();

    populateDocument(store); // first load
    rafCallbacks.length = 0;

    // Two more transactions
    store.getDocument().transact(() => {
      store.getDocument().getMap('weave').set('key2', 'val2');
    });
    store.getDocument().transact(() => {
      store.getDocument().getMap('weave').set('key3', 'val3');
    });

    expect(rafCallbacks).toHaveLength(1);
  });

  it('10.11 RAF: isRoomLoaded=true + non-empty weave calls this.instance.render()', () => {
    store = new TestStore(makeConfig(), false);
    mock = makeMockInstance();
    store.register(mock as never);
    store.setup();

    populateDocument(store); // first load

    store.getDocument().transact(() => {
      store.getDocument().getMap('weave').set('key2', 'val2');
    });

    flushRaf();

    expect(mock.render).toHaveBeenCalledTimes(1);
  });

  it('10.12 RAF: nodesSelectionPlugin with 1 selected node + valid nodeInfo emits onNodeChange', () => {
    const selectedNode = { getAttrs: vi.fn().mockReturnValue({ id: 'n1' }) };
    const nodeInfo = { node: { id: 'n1', nodeType: 'rect', props: { x: 0 } } };
    const mockPlugin = {
      getSelectedNodes: vi.fn().mockReturnValue([selectedNode]),
    };

    store = new TestStore(makeConfig(), false);
    mock = makeMockInstance();
    mock.getPlugin.mockReturnValue(mockPlugin);
    mock.getNode.mockReturnValue(nodeInfo);
    store.register(mock as never);
    store.setup();

    populateDocument(store); // first load

    store.getDocument().transact(() => {
      store.getDocument().getMap('weave').set('key2', 'val2');
    });

    mock.emitEvent.mockClear();
    flushRaf();

    expect(mock.emitEvent).toHaveBeenCalledWith(
      'onNodeChange',
      expect.objectContaining({ instance: selectedNode })
    );
  });

  it('10.13 RAF: nodesSelectionPlugin with 0 selected nodes — no onNodeChange', () => {
    const mockPlugin = {
      getSelectedNodes: vi.fn().mockReturnValue([]),
    };

    store = new TestStore(makeConfig(), false);
    mock = makeMockInstance();
    mock.getPlugin.mockReturnValue(mockPlugin);
    store.register(mock as never);
    store.setup();

    populateDocument(store); // first load

    store.getDocument().transact(() => {
      store.getDocument().getMap('weave').set('key2', 'val2');
    });

    mock.emitEvent.mockClear();
    flushRaf();

    const nodeChangeCalls = mock.emitEvent.mock.calls.filter(
      ([event]: string[]) => event === 'onNodeChange'
    );
    expect(nodeChangeCalls).toHaveLength(0);
  });

  it('10.14 RAF: nodeInfo.node is null — no onNodeChange emitted', () => {
    const selectedNode = { getAttrs: vi.fn().mockReturnValue({ id: 'n1' }) };
    const mockPlugin = {
      getSelectedNodes: vi.fn().mockReturnValue([selectedNode]),
    };

    store = new TestStore(makeConfig(), false);
    mock = makeMockInstance();
    mock.getPlugin.mockReturnValue(mockPlugin);
    mock.getNode.mockReturnValue({ node: null }); // nodeInfo present but node is null
    store.register(mock as never);
    store.setup();

    populateDocument(store); // first load

    store.getDocument().transact(() => {
      store.getDocument().getMap('weave').set('key2', 'val2');
    });

    mock.emitEvent.mockClear();
    flushRaf();

    const nodeChangeCalls = mock.emitEvent.mock.calls.filter(
      ([event]: string[]) => event === 'onNodeChange'
    );
    expect(nodeChangeCalls).toHaveLength(0);
  });
});
