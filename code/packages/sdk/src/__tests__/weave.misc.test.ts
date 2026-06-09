// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */

// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { Weave } from '@/weave';

vi.mock('@/managers/setup');
vi.mock('@/managers/register');
vi.mock('@/managers/store');
vi.mock('@/managers/state');
vi.mock('@/managers/stage');
vi.mock('@/managers/groups');
vi.mock('@/managers/targeting');
vi.mock('@/managers/cloning');
vi.mock('@/managers/fonts');
vi.mock('@/managers/zindex');
vi.mock('@/managers/export/export');
vi.mock('@/managers/actions');
vi.mock('@/managers/plugins');
vi.mock('@/managers/users/users');
vi.mock('@/managers/mutex/mutex');
vi.mock('@/managers/async/async');
vi.mock('@/managers/hooks');
vi.mock('@/managers/drag-and-drop');
vi.mock('@/nodes/node', () => ({
  augmentKonvaNodeClass: vi.fn(),
  WeaveNode: class {},
}));

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeWeave() {
  const renderer = { register: vi.fn(), init: vi.fn(), render: vi.fn() };
  const doc = {
    destroy: vi.fn(),
    getMap: vi.fn().mockReturnValue({ toJSON: vi.fn().mockReturnValue({ title: 'test' }) }),
  };
  const store = {
    setup: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getDocument: vi.fn().mockReturnValue(doc),
    getUser: vi.fn().mockReturnValue({ id: 'user-1' }),
    setState: vi.fn(),
  };
  const stage = { findOne: vi.fn().mockReturnValue(null), destroy: vi.fn() };

  const weave = new Weave(
    { store: store as any, renderer: renderer as any },
    { container: 'c', width: 100, height: 100 }
  );

  (weave as any).storeManager.getStore.mockReturnValue(store);
  (weave as any).stageManager.getStage.mockReturnValue(stage);
  (weave as any).stageManager.getConfiguration.mockReturnValue({ container: 'c', width: 100, height: 100 });
  (weave as any).stateManager.getElementsTree.mockReturnValue([]);
  (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);

  return { weave, store, stage, doc, renderer };
}

// Helper: create a Konva.Node mock with configurable nodeType
function makeKonvaNodeMock(nodeType = 'rect') {
  return {
    getAttrs: vi.fn().mockReturnValue({ nodeType }),
  };
}

// ---------------------------------------------------------------------------
// Suite 1.2 — Constructor: server-side branch (node environment)
// ---------------------------------------------------------------------------

describe('Weave — constructor (server-side)', () => {
  it('sets _weave_isServerSide = true when window is undefined (node env)', () => {
    makeWeave();
    expect(globalThis._weave_isServerSide).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 8 — getId()
// ---------------------------------------------------------------------------

describe('Weave — getId()', () => {
  it('returns a non-empty string', () => {
    const { weave } = makeWeave();
    const id = weave.getId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns unique ids for different instances', () => {
    const { weave: w1 } = makeWeave();
    const { weave: w2 } = makeWeave();
    expect(w1.getId()).not.toBe(w2.getId());
  });
});

// ---------------------------------------------------------------------------
// Suite 9 — getConfiguration()
// ---------------------------------------------------------------------------

describe('Weave — getConfiguration()', () => {
  it('returns the stored configuration', () => {
    const { weave } = makeWeave();
    const config = weave.getConfiguration();
    expect(config).toBeDefined();
    expect(config.store).toBeDefined();
    expect(config.renderer).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Suite 9b — getRenderer()
// ---------------------------------------------------------------------------

describe('Weave — getRenderer()', () => {
  it('returns the renderer instance with the same functions', () => {
    const { weave, renderer } = makeWeave();
    const r = weave.getRenderer();
    expect(r).toBeDefined();
    expect(r.render).toBe(renderer.render);
    expect(r.init).toBe(renderer.init);
  });
});

// ---------------------------------------------------------------------------
// Suite 10 — augmentKonvaNodeClass()
// ---------------------------------------------------------------------------

describe('Weave — augmentKonvaNodeClass()', () => {
  it('delegates to the imported augmentKonvaNodeClass function', async () => {
    const { augmentKonvaNodeClass } = await import('@/nodes/node');
    const { weave } = makeWeave();
    const config = { foo: 'bar' } as any;
    weave.augmentKonvaNodeClass(config);
    expect(augmentKonvaNodeClass).toHaveBeenCalledWith(config);
  });
});

// ---------------------------------------------------------------------------
// Suite 13 — Logging proxies
// ---------------------------------------------------------------------------

describe('Weave — logging proxy methods', () => {
  it('getLogger() returns a WeaveLogger instance', () => {
    const { weave } = makeWeave();
    const logger = weave.getLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.getChildLogger).toBe('function');
  });

  it('getMainLogger() returns the pino logger (has info method)', () => {
    const { weave } = makeWeave();
    const mainLogger = weave.getMainLogger();
    expect(mainLogger).toBeDefined();
    expect(typeof mainLogger.info).toBe('function');
  });

  it('getChildLogger(name) delegates to logger.getChildLogger', () => {
    const { weave } = makeWeave();
    const childLogger = weave.getChildLogger('test-module');
    expect(childLogger).toBeDefined();
    expect(typeof childLogger.info).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Suite 19 — update() and render()
// ---------------------------------------------------------------------------

describe('Weave — update() / render()', () => {
  it('update() calls store.setState with new state', () => {
    const { weave, store } = makeWeave();
    const state = { nodes: [] } as any;
    weave.update(state);
    expect(store.setState).toHaveBeenCalledWith(state);
  });

  it('update() calls renderer.render()', () => {
    const { weave } = makeWeave();
    const renderer = (weave as any).renderer;
    weave.update({} as any);
    expect(renderer.render).toHaveBeenCalled();
  });

  it('update() renderer callback emits onRender', async () => {
    const { weave } = makeWeave();
    let cb: (() => void) | undefined;
    (weave as any).renderer.render.mockImplementation((fn: () => void) => {
      cb = fn;
    });
    const listener = vi.fn();
    weave.addEventListener('onRender', listener);
    weave.update({} as any);
    cb!();
    await Promise.resolve();
    expect(listener).toHaveBeenCalled();
  });

  it('render() calls renderer.render()', () => {
    const { weave } = makeWeave();
    const renderer = (weave as any).renderer;
    weave.render();
    expect(renderer.render).toHaveBeenCalled();
  });

  it('render() callback emits onRender', async () => {
    const { weave } = makeWeave();
    let cb: (() => void) | undefined;
    (weave as any).renderer.render.mockImplementation((fn: () => void) => {
      cb = fn;
    });
    const listener = vi.fn();
    weave.addEventListener('onRender', listener);
    weave.render();
    cb!();
    await Promise.resolve();
    expect(listener).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 20 — State proxy methods
// ---------------------------------------------------------------------------

describe('Weave — state proxy methods', () => {
  it('findNodeById() delegates to stateManager.findNodeById()', () => {
    const { weave } = makeWeave();
    const tree = {} as any;
    const result = { node: null, parent: null, index: -1 };
    (weave as any).stateManager.findNodeById.mockReturnValue(result);
    expect(weave.findNodeById(tree, 'key-1')).toBe(result);
    expect((weave as any).stateManager.findNodeById).toHaveBeenCalledWith(tree, 'key-1', null, -1);
  });

  it('findNodesByType() delegates to stateManager.findNodesByType()', () => {
    const { weave } = makeWeave();
    const tree = {} as any;
    const nodes = [{}] as any;
    (weave as any).stateManager.findNodesByType.mockReturnValue(nodes);
    expect(weave.findNodesByType(tree, 'rect')).toBe(nodes);
  });

  it('getNode(key) delegates to stateManager.getNode()', () => {
    const { weave } = makeWeave();
    const result = { node: null, parent: null, index: -1 };
    (weave as any).stateManager.getNode.mockReturnValue(result);
    expect(weave.getNode('node-key')).toBe(result);
    expect((weave as any).stateManager.getNode).toHaveBeenCalledWith('node-key');
  });

  it('getElementsTree() delegates to stateManager.getElementsTree()', () => {
    const { weave } = makeWeave();
    const tree = [{}] as any;
    (weave as any).stateManager.getElementsTree.mockReturnValue(tree);
    expect(weave.getElementsTree()).toBe(tree);
  });

  it('stateTransactional() delegates to stateManager.stateTransactional()', () => {
    const { weave } = makeWeave();
    const cb = vi.fn();
    weave.stateTransactional(cb, 'origin');
    expect((weave as any).stateManager.stateTransactional).toHaveBeenCalledWith(cb, 'origin');
  });
});

// ---------------------------------------------------------------------------
// Suite 21 — isEmpty()
// ---------------------------------------------------------------------------

describe('Weave — isEmpty()', () => {
  it('returns true when getElementsTree() is empty', () => {
    const { weave } = makeWeave();
    (weave as any).stateManager.getElementsTree.mockReturnValue([]);
    expect(weave.isEmpty()).toBe(true);
  });

  it('returns false when getElementsTree() has nodes', () => {
    const { weave } = makeWeave();
    (weave as any).stateManager.getElementsTree.mockReturnValue([{ key: 'n1' }]);
    expect(weave.isEmpty()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 37 — Lock / Unlock methods
// ---------------------------------------------------------------------------

describe('Weave — lock methods', () => {
  it('allNodesLocked returns true when all handlers report locked', () => {
    const { weave } = makeWeave();
    const handler = { isLocked: vi.fn().mockReturnValue(true) };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    const nodes = [makeKonvaNodeMock(), makeKonvaNodeMock()];
    expect(weave.allNodesLocked(nodes as any)).toBe(true);
  });

  it('allNodesLocked returns false when any handler reports unlocked', () => {
    const { weave } = makeWeave();
    let call = 0;
    (weave as any).registerManager.getNodeHandler.mockImplementation(() => ({
      isLocked: vi.fn().mockReturnValue(call++ === 0),
    }));
    const nodes = [makeKonvaNodeMock(), makeKonvaNodeMock()];
    expect(weave.allNodesLocked(nodes as any)).toBe(false);
  });

  it('allNodesLocked skips nodes with no handler (continue branch)', () => {
    const { weave } = makeWeave();
    (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);
    const nodes = [makeKonvaNodeMock()];
    expect(weave.allNodesLocked(nodes as any)).toBe(true);
  });

  it('allNodesUnlocked returns true when all handlers report unlocked', () => {
    const { weave } = makeWeave();
    const handler = { isLocked: vi.fn().mockReturnValue(false) };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    const nodes = [makeKonvaNodeMock()];
    expect(weave.allNodesUnlocked(nodes as any)).toBe(true);
  });

  it('allNodesUnlocked returns false when any handler reports locked', () => {
    const { weave } = makeWeave();
    const handler = { isLocked: vi.fn().mockReturnValue(true) };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    const nodes = [makeKonvaNodeMock()];
    expect(weave.allNodesUnlocked(nodes as any)).toBe(false);
  });

  it('allNodesUnlocked skips nodes with no handler (continue branch)', () => {
    const { weave } = makeWeave();
    (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);
    const nodes = [makeKonvaNodeMock()];
    expect(weave.allNodesUnlocked(nodes as any)).toBe(true);
  });

  it('lockNode calls handler.lock() when handler exists', () => {
    const { weave } = makeWeave();
    const handler = { lock: vi.fn() };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    const node = makeKonvaNodeMock();
    weave.lockNode(node as any);
    expect(handler.lock).toHaveBeenCalledWith(node);
  });

  it('lockNode returns early when handler is missing', () => {
    const { weave } = makeWeave();
    (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);
    expect(() => weave.lockNode(makeKonvaNodeMock() as any)).not.toThrow();
  });

  it('lockNodes calls handler.lock() for each node with a handler', () => {
    const { weave } = makeWeave();
    const handler = { lock: vi.fn() };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    const nodes = [makeKonvaNodeMock(), makeKonvaNodeMock()];
    weave.lockNodes(nodes as any);
    expect(handler.lock).toHaveBeenCalledTimes(2);
  });

  it('lockNodes skips nodes with no handler', () => {
    const { weave } = makeWeave();
    (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);
    expect(() => weave.lockNodes([makeKonvaNodeMock() as any])).not.toThrow();
  });

  it('unlockNode calls handler.unlock() when handler exists', () => {
    const { weave } = makeWeave();
    const handler = { unlock: vi.fn() };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    const node = makeKonvaNodeMock();
    weave.unlockNode(node as any);
    expect(handler.unlock).toHaveBeenCalledWith(node);
  });

  it('unlockNode returns early when handler is missing', () => {
    const { weave } = makeWeave();
    (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);
    expect(() => weave.unlockNode(makeKonvaNodeMock() as any)).not.toThrow();
  });

  it('unlockNodes calls handler.unlock() for each node', () => {
    const { weave } = makeWeave();
    const handler = { unlock: vi.fn() };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    const nodes = [makeKonvaNodeMock(), makeKonvaNodeMock()];
    weave.unlockNodes(nodes as any);
    expect(handler.unlock).toHaveBeenCalledTimes(2);
  });

  it('unlockNodes skips nodes with no handler', () => {
    const { weave } = makeWeave();
    (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);
    expect(() => weave.unlockNodes([makeKonvaNodeMock() as any])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Suite 38 — Show / Hide methods
// ---------------------------------------------------------------------------

describe('Weave — show/hide methods', () => {
  it('allNodesVisible returns true when all handlers report visible', () => {
    const { weave } = makeWeave();
    const handler = { isVisible: vi.fn().mockReturnValue(true) };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    expect(weave.allNodesVisible([makeKonvaNodeMock() as any])).toBe(true);
  });

  it('allNodesVisible returns false when any handler reports hidden', () => {
    const { weave } = makeWeave();
    const handler = { isVisible: vi.fn().mockReturnValue(false) };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    expect(weave.allNodesVisible([makeKonvaNodeMock() as any])).toBe(false);
  });

  it('allNodesVisible skips nodes with no handler', () => {
    const { weave } = makeWeave();
    (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);
    expect(weave.allNodesVisible([makeKonvaNodeMock() as any])).toBe(true);
  });

  it('allNodesHidden returns true when all handlers report hidden', () => {
    const { weave } = makeWeave();
    const handler = { isVisible: vi.fn().mockReturnValue(false) };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    expect(weave.allNodesHidden([makeKonvaNodeMock() as any])).toBe(true);
  });

  it('allNodesHidden returns false when any handler reports visible', () => {
    const { weave } = makeWeave();
    const handler = { isVisible: vi.fn().mockReturnValue(true) };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    expect(weave.allNodesHidden([makeKonvaNodeMock() as any])).toBe(false);
  });

  it('allNodesHidden skips nodes with no handler', () => {
    const { weave } = makeWeave();
    (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);
    expect(weave.allNodesHidden([makeKonvaNodeMock() as any])).toBe(true);
  });

  it('hideNode calls handler.hide() when handler exists', () => {
    const { weave } = makeWeave();
    const handler = { hide: vi.fn() };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    const node = makeKonvaNodeMock();
    weave.hideNode(node as any);
    expect(handler.hide).toHaveBeenCalledWith(node);
  });

  it('hideNode returns early when handler is missing', () => {
    const { weave } = makeWeave();
    (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);
    expect(() => weave.hideNode(makeKonvaNodeMock() as any)).not.toThrow();
  });

  it('hideNodes calls handler.hide() for each node', () => {
    const { weave } = makeWeave();
    const handler = { hide: vi.fn() };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    weave.hideNodes([makeKonvaNodeMock() as any, makeKonvaNodeMock() as any]);
    expect(handler.hide).toHaveBeenCalledTimes(2);
  });

  it('hideNodes skips nodes with no handler', () => {
    const { weave } = makeWeave();
    (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);
    expect(() => weave.hideNodes([makeKonvaNodeMock() as any])).not.toThrow();
  });

  it('showNode calls handler.show() when handler exists', () => {
    const { weave } = makeWeave();
    const handler = { show: vi.fn() };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    const node = makeKonvaNodeMock();
    weave.showNode(node as any);
    expect(handler.show).toHaveBeenCalledWith(node);
  });

  it('showNode returns early when handler is missing', () => {
    const { weave } = makeWeave();
    (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);
    expect(() => weave.showNode(makeKonvaNodeMock() as any)).not.toThrow();
  });

  it('showNodes calls handler.show() for each node', () => {
    const { weave } = makeWeave();
    const handler = { show: vi.fn() };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    weave.showNodes([makeKonvaNodeMock() as any, makeKonvaNodeMock() as any]);
    expect(handler.show).toHaveBeenCalledTimes(2);
  });

  it('showNodes skips nodes with no handler', () => {
    const { weave } = makeWeave();
    (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);
    expect(() => weave.showNodes([makeKonvaNodeMock() as any])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Suite 39 — Async element methods
// ---------------------------------------------------------------------------

describe('Weave — async element methods', () => {
  it('checkForAsyncElements() delegates to asyncManager', () => {
    const { weave } = makeWeave();
    const state = {} as any;
    weave.checkForAsyncElements(state);
    expect((weave as any).asyncManager.checkForAsyncElements).toHaveBeenCalledWith(state);
  });

  it('asyncElementsLoaded() delegates to asyncManager', () => {
    const { weave } = makeWeave();
    (weave as any).asyncManager.asyncElementsLoaded.mockReturnValue(true);
    expect(weave.asyncElementsLoaded()).toBe(true);
  });

  it('loadAsyncElement() delegates to asyncManager', () => {
    const { weave } = makeWeave();
    weave.loadAsyncElement('n1', 'image');
    expect((weave as any).asyncManager.loadAsyncElement).toHaveBeenCalledWith('n1', 'image');
  });

  it('resolveAsyncElement() delegates to asyncManager', () => {
    const { weave } = makeWeave();
    weave.resolveAsyncElement('n1', 'image');
    expect((weave as any).asyncManager.resolveAsyncElement).toHaveBeenCalledWith('n1', 'image');
  });
});

// ---------------------------------------------------------------------------
// Suite 40 — isServerSide()
// ---------------------------------------------------------------------------

describe('Weave — isServerSide()', () => {
  it('returns true when _weave_isServerSide is true (node env)', () => {
    const { weave } = makeWeave();
    globalThis._weave_isServerSide = true;
    expect(weave.isServerSide()).toBe(true);
  });

  it('returns false when _weave_isServerSide is false', () => {
    const { weave } = makeWeave();
    globalThis._weave_isServerSide = false;
    expect(weave.isServerSide()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 41 — Hooks management proxies
// ---------------------------------------------------------------------------

describe('Weave — hooks management proxies', () => {
  it('registerHook() delegates to hooksManager.registerHook()', () => {
    const { weave } = makeWeave();
    const hook = vi.fn();
    weave.registerHook('myHook', hook);
    expect((weave as any).hooksManager.registerHook).toHaveBeenCalledWith('myHook', hook);
  });

  it('runPhaseHooks() delegates to hooksManager.runPhaseHooks()', () => {
    const { weave } = makeWeave();
    const execution = vi.fn();
    weave.runPhaseHooks('onRemoveNode', execution);
    expect((weave as any).hooksManager.runPhaseHooks).toHaveBeenCalledWith('onRemoveNode', execution);
  });

  it('getHook() delegates to hooksManager.getHook()', () => {
    const { weave } = makeWeave();
    const hook = vi.fn();
    (weave as any).hooksManager.getHook.mockReturnValue(hook);
    expect(weave.getHook('myHook')).toBe(hook);
  });

  it('unregisterHook() delegates to hooksManager.unregisterHook()', () => {
    const { weave } = makeWeave();
    weave.unregisterHook('myHook');
    expect((weave as any).hooksManager.unregisterHook).toHaveBeenCalledWith('myHook');
  });

  it('getHooks() returns the Hookable instance', () => {
    const { weave } = makeWeave();
    const hooks = weave.getHooks();
    expect(hooks).toBeDefined();
    expect(typeof hooks.hook).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Suite 42 — Mutex management proxies
// ---------------------------------------------------------------------------

describe('Weave — mutex management proxies', () => {
  it('acquireMutexLock() delegates to mutexManager.acquireMutexLock()', async () => {
    const { weave } = makeWeave();
    (weave as any).mutexManager.acquireMutexLock.mockResolvedValue(undefined);
    const action = vi.fn();
    await weave.acquireMutexLock({ nodeIds: ['n1'], operation: 'op' }, action);
    expect((weave as any).mutexManager.acquireMutexLock).toHaveBeenCalledWith(
      { nodeIds: ['n1'], operation: 'op' },
      action
    );
  });

  it('setMutexLock() delegates to mutexManager.setMutexLock()', () => {
    const { weave } = makeWeave();
    (weave as any).mutexManager.setMutexLock.mockReturnValue(true);
    const result = weave.setMutexLock({ nodeIds: ['n1'], operation: 'op' });
    expect(result).toBe(true);
    expect((weave as any).mutexManager.setMutexLock).toHaveBeenCalledWith({
      nodeIds: ['n1'],
      operation: 'op',
    });
  });

  it('releaseMutexLock() delegates to mutexManager.releaseMutexLock()', () => {
    const { weave } = makeWeave();
    weave.releaseMutexLock();
    expect((weave as any).mutexManager.releaseMutexLock).toHaveBeenCalled();
  });

  it('getLockDetails() delegates to mutexManager.getUserMutexLock()', () => {
    const { weave } = makeWeave();
    const lock = { lockId: 'lock-1' };
    (weave as any).mutexManager.getUserMutexLock.mockReturnValue(lock);
    expect(weave.getLockDetails('lock-1')).toBe(lock);
  });

  it('getNodeMutexLock() delegates to mutexManager.getNodeMutexLock()', () => {
    const { weave } = makeWeave();
    const lock = { nodeId: 'n1' };
    (weave as any).mutexManager.getNodeMutexLock.mockReturnValue(lock);
    expect(weave.getNodeMutexLock('n1')).toBe(lock);
  });
});

// ---------------------------------------------------------------------------
// Suite 43 — Users management proxy
// ---------------------------------------------------------------------------

describe('Weave — users management proxy', () => {
  it('getUsers() delegates to usersManager.getUsers()', () => {
    const { weave } = makeWeave();
    const users = [{ id: 'user-1' }];
    (weave as any).usersManager.getUsers.mockReturnValue(users);
    expect(weave.getUsers()).toBe(users);
  });
});

// ---------------------------------------------------------------------------
// Suite 44 — Drag and drop proxies
// ---------------------------------------------------------------------------

describe('Weave — drag and drop proxies', () => {
  it('getDragStartedId() delegates to dragAndDropManager', () => {
    const { weave } = makeWeave();
    (weave as any).dragAndDropManager.getDragStartedId.mockReturnValue('node-1');
    expect(weave.getDragStartedId()).toBe('node-1');
  });

  it('isDragStarted() delegates to dragAndDropManager', () => {
    const { weave } = makeWeave();
    (weave as any).dragAndDropManager.isDragStarted.mockReturnValue(true);
    expect(weave.isDragStarted()).toBe(true);
  });

  it('startDrag(id) delegates to dragAndDropManager', () => {
    const { weave } = makeWeave();
    weave.startDrag('node-1');
    expect((weave as any).dragAndDropManager.startDrag).toHaveBeenCalledWith('node-1');
  });

  it('endDrag(id) delegates to dragAndDropManager', () => {
    const { weave } = makeWeave();
    weave.endDrag('node-1');
    expect((weave as any).dragAndDropManager.endDrag).toHaveBeenCalledWith('node-1');
  });

  it('setDragProperties(props) delegates to dragAndDropManager', () => {
    const { weave } = makeWeave();
    const props = { data: 'value' };
    weave.setDragProperties(props);
    expect((weave as any).dragAndDropManager.setDragProperties).toHaveBeenCalledWith(props);
  });

  it('getDragProperties() delegates to dragAndDropManager', () => {
    const { weave } = makeWeave();
    const props = { data: 'value' };
    (weave as any).dragAndDropManager.getDragProperties.mockReturnValue(props);
    expect(weave.getDragProperties()).toBe(props);
  });
});

// ---------------------------------------------------------------------------
// Suite 45 — getEventsController()
// ---------------------------------------------------------------------------

describe('Weave — getEventsController()', () => {
  it('returns undefined initially', () => {
    const { weave } = makeWeave();
    expect(() => weave.getEventsController()).toThrow('Events controller not initialized');
  });

  it('returns the AbortController when set directly', () => {
    const { weave } = makeWeave();
    const ctrl = new AbortController();
    (weave as any).eventsController = ctrl;
    expect(weave.getEventsController()).toBe(ctrl);
  });
});

// ---------------------------------------------------------------------------
// Suite 46 — Metadata methods
// ---------------------------------------------------------------------------

describe('Weave — metadata methods', () => {
  it('getMetadata() reads from store.getDocument().getMap("weaveMetadata").toJSON()', () => {
    const { weave, doc } = makeWeave();
    const meta = { title: 'test' };
    doc.getMap.mockReturnValue({ toJSON: vi.fn().mockReturnValue(meta) });
    const result = weave.getMetadata();
    expect(doc.getMap).toHaveBeenCalledWith('weaveMetadata');
    expect(result).toEqual(meta);
  });

  it('saveMetadata() wraps in stateTransactional and calls stateManager.syncMetadata()', () => {
    const { weave } = makeWeave();
    (weave as any).stateManager.stateTransactional.mockImplementation((cb: () => void) => cb());
    const meta = { title: 'updated' };
    weave.saveMetadata(meta);
    expect((weave as any).stateManager.stateTransactional).toHaveBeenCalled();
    expect((weave as any).stateManager.syncMetadata).toHaveBeenCalledWith(meta);
  });
});
