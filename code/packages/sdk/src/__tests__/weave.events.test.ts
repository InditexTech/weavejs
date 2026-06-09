// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */

// @vitest-environment jsdom
import 'vitest-canvas-mock';
import { describe, expect, it, vi } from 'vitest';
import {
  WEAVE_INSTANCE_STATUS,
  WEAVE_NODE_CHANGE_TYPE,
  WEAVE_STORE_CONNECTION_STATUS,
} from '@inditextech/weave-types';
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
    getMap: vi.fn().mockReturnValue({ toJSON: vi.fn().mockReturnValue({}) }),
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
  (weave as any).registerManager.getNodesHandlers.mockReturnValue({});
  (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);
  (weave as any).stateManager.getElementsTree.mockReturnValue([]);

  return { weave, renderer, store, stage };
}

// ---------------------------------------------------------------------------
// Suite 3 — setStatus / getStatus
// ---------------------------------------------------------------------------

describe('Weave — setStatus / getStatus', () => {
  it('setStatus stores the value; getStatus returns it', () => {
    const { weave } = makeWeave();
    weave.setStatus(WEAVE_INSTANCE_STATUS.RUNNING);
    expect(weave.getStatus()).toBe(WEAVE_INSTANCE_STATUS.RUNNING);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — handleStoreConnectionStatusChange (private, called directly)
// ---------------------------------------------------------------------------

describe('Weave — handleStoreConnectionStatusChange()', () => {
  it('ERROR when not initialized → sets CONNECTING_ERROR and emits onInstanceStatus', async () => {
    const { weave } = makeWeave();
    (weave as any).initialized = false;
    const listener = vi.fn();
    weave.addEventListener('onInstanceStatus', listener);
    (weave as any).handleStoreConnectionStatusChange(WEAVE_STORE_CONNECTION_STATUS.ERROR);
    expect(weave.getStatus()).toBe(WEAVE_INSTANCE_STATUS.CONNECTING_ERROR);
    await Promise.resolve();
    expect(listener).toHaveBeenCalledWith(WEAVE_INSTANCE_STATUS.CONNECTING_ERROR);
  });

  it('CONNECTED when not initialized → sets LOADING_ROOM and emits onInstanceStatus', async () => {
    const { weave } = makeWeave();
    (weave as any).initialized = false;
    const listener = vi.fn();
    weave.addEventListener('onInstanceStatus', listener);
    (weave as any).handleStoreConnectionStatusChange(WEAVE_STORE_CONNECTION_STATUS.CONNECTED);
    expect(weave.getStatus()).toBe(WEAVE_INSTANCE_STATUS.LOADING_ROOM);
    await Promise.resolve();
    expect(listener).toHaveBeenCalledWith(WEAVE_INSTANCE_STATUS.LOADING_ROOM);
  });

  it('ERROR after initialized → does not change status', () => {
    const { weave } = makeWeave();
    (weave as any).initialized = true;
    weave.setStatus(WEAVE_INSTANCE_STATUS.RUNNING);
    (weave as any).handleStoreConnectionStatusChange(WEAVE_STORE_CONNECTION_STATUS.ERROR);
    expect(weave.getStatus()).toBe(WEAVE_INSTANCE_STATUS.RUNNING);
  });

  it('CONNECTED after initialized → does not change status', () => {
    const { weave } = makeWeave();
    (weave as any).initialized = true;
    weave.setStatus(WEAVE_INSTANCE_STATUS.RUNNING);
    (weave as any).handleStoreConnectionStatusChange(WEAVE_STORE_CONNECTION_STATUS.CONNECTED);
    expect(weave.getStatus()).toBe(WEAVE_INSTANCE_STATUS.RUNNING);
  });
});

// ---------------------------------------------------------------------------
// Suite 11 — Event methods
// ---------------------------------------------------------------------------

describe('Weave — event methods', () => {
  it('emitEvent fires registered listener', async () => {
    const { weave } = makeWeave();
    const listener = vi.fn();
    weave.addEventListener('testEvent', listener);
    weave.emitEvent('testEvent', { value: 42 });
    await Promise.resolve();
    expect(listener).toHaveBeenCalledWith({ value: 42 });
  });

  it('addEventListener registers a persistent listener', async () => {
    const { weave } = makeWeave();
    const listener = vi.fn();
    weave.addEventListener('testEvent', listener);
    weave.emitEvent('testEvent', 'first');
    weave.emitEvent('testEvent', 'second');
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('addOnceEventListener registers a one-time listener', async () => {
    const { weave } = makeWeave();
    const listener = vi.fn();
    weave.addOnceEventListener('testEvent', listener);
    weave.emitEvent('testEvent', 'payload');
    await new Promise((r) => setTimeout(r, 0));
    expect(listener).toHaveBeenCalledWith('payload');
  });

  it('removeEventListener unregisters the listener', async () => {
    const { weave } = makeWeave();
    const listener = vi.fn();
    weave.addEventListener('testEvent', listener);
    weave.removeEventListener('testEvent', listener);
    weave.emitEvent('testEvent', 'ignored');
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 12 — emitUserChangeEvent()
// ---------------------------------------------------------------------------

describe('Weave — emitUserChangeEvent()', () => {
  it('returns early when no parent found (both findOne calls return null)', async () => {
    const { weave } = makeWeave();
    const userChangeListener = vi.fn();
    weave.addEventListener('onUserChange', userChangeListener);
    const node = { key: 'n1', type: 'rect', props: {}, children: [] };
    weave.emitUserChangeEvent({ node: node as any }, WEAVE_NODE_CHANGE_TYPE.CREATE);
    await Promise.resolve();
    expect(userChangeListener).not.toHaveBeenCalled();
  });

  it('uses parentId from argument when provided', async () => {
    const { weave, stage } = makeWeave();
    const parentNode = {
      getAttrs: vi.fn().mockReturnValue({ nodeType: 'rect', id: 'parent-1' }),
      setAttr: vi.fn(),
      zIndex: vi.fn().mockReturnValue(0),
      getParent: vi.fn().mockReturnValue(null),
    };
    stage.findOne.mockReturnValue(parentNode);
    const handler = { serialize: vi.fn().mockReturnValue({ key: 'parent-1', type: 'rect', props: {}, children: [] }) };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);

    const userChangeListener = vi.fn();
    weave.addEventListener('onUserChange', userChangeListener);
    const node = { key: 'n1', type: 'rect', props: { transactionId: undefined }, children: [] };
    weave.emitUserChangeEvent({ node: node as any, parentId: 'parent-1' }, WEAVE_NODE_CHANGE_TYPE.CREATE);
    await Promise.resolve();
    expect(userChangeListener).toHaveBeenCalled();
  });

  it('derives nodeParent via stage.findOne(node.key) when no parentId', async () => {
    const { weave, stage } = makeWeave();
    const container = {
      getAttrs: vi.fn().mockReturnValue({ nodeType: 'rect', id: 'container-1' }),
      setAttr: vi.fn(),
      zIndex: vi.fn().mockReturnValue(0),
      getParent: vi.fn().mockReturnValue(null),
    };
    const parentNode = {
      getAttrs: vi.fn().mockReturnValue({}),
      getParent: vi.fn().mockReturnValue(container),
      setAttr: vi.fn(),
    };
    stage.findOne.mockReturnValue(parentNode);
    const handler = { serialize: vi.fn().mockReturnValue({ key: 'container-1', type: 'rect', props: {}, children: [] }) };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);

    const userChangeListener = vi.fn();
    weave.addEventListener('onUserChange', userChangeListener);
    const node = { key: 'n1', type: 'rect', props: { transactionId: undefined }, children: [] };
    weave.emitUserChangeEvent({ node: node as any }, WEAVE_NODE_CHANGE_TYPE.CREATE);
    await Promise.resolve();
    expect(userChangeListener).toHaveBeenCalled();
  });

  it('returns early when handler is not found for nodeParent', async () => {
    const { weave, stage } = makeWeave();
    const parentNode = {
      getAttrs: vi.fn().mockReturnValue({ nodeType: 'rect' }),
      getParent: vi.fn().mockReturnValue(null),
    };
    stage.findOne.mockReturnValue(parentNode);
    (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);

    const userChangeListener = vi.fn();
    weave.addEventListener('onUserChange', userChangeListener);
    const node = { key: 'n1', type: 'rect', props: {}, children: [] };
    weave.emitUserChangeEvent({ node: node as any, parentId: 'parent-1' }, WEAVE_NODE_CHANGE_TYPE.CREATE);
    await Promise.resolve();
    expect(userChangeListener).not.toHaveBeenCalled();
  });

  it('emits onUserChange with correct payload when all deps are satisfied', async () => {
    const { weave, stage, store } = makeWeave();
    const realNode = {
      getAttrs: vi.fn().mockReturnValue({ nodeType: 'rect', id: 'parent-1', transactionId: 'tid-1' }),
      setAttr: vi.fn(),
      zIndex: vi.fn().mockReturnValue(0),
      getParent: vi.fn().mockReturnValue(null),
    };
    stage.findOne.mockReturnValue(realNode);
    const parentElement = { key: 'parent-1', type: 'rect', props: {}, children: [] };
    const handler = { serialize: vi.fn().mockReturnValue(parentElement) };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);

    const userChangeListener = vi.fn();
    weave.addEventListener('onUserChange', userChangeListener);
    const node = { key: 'n1', type: 'rect', props: { transactionId: 'tid-1' }, children: [] };
    weave.emitUserChangeEvent({ node: node as any, parentId: 'parent-1' }, WEAVE_NODE_CHANGE_TYPE.UPDATE);
    await Promise.resolve();

    expect(userChangeListener).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ id: 'user-1' }),
        changeType: WEAVE_NODE_CHANGE_TYPE.UPDATE,
        parent: parentElement,
        node: node,
      })
    );
    // store.getUser was called
    expect(store.getUser).toHaveBeenCalled();
  });

  it('calls cleanupTransactionIdToInstance after emitting (setAttr called)', async () => {
    const { weave, stage } = makeWeave();
    const realNode = {
      getAttrs: vi.fn().mockReturnValue({ nodeType: 'rect', id: 'parent-1' }),
      setAttr: vi.fn(),
      zIndex: vi.fn().mockReturnValue(0),
      getParent: vi.fn().mockReturnValue(null),
    };
    stage.findOne.mockReturnValue(realNode);
    const handler = { serialize: vi.fn().mockReturnValue({ key: 'p', type: 'rect', props: {}, children: [] }) };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);

    const node = { key: 'n1', type: 'rect', props: {}, children: [] };
    weave.emitUserChangeEvent({ node: node as any, parentId: 'parent-1' }, WEAVE_NODE_CHANGE_TYPE.DELETE);
    await Promise.resolve();
    expect(realNode.setAttr).toHaveBeenCalledWith('transactionId', undefined);
  });

  it('returns early when stage.findOne for parentId returns null', async () => {
    const { weave, stage } = makeWeave();
    stage.findOne.mockReturnValue(null);

    const userChangeListener = vi.fn();
    weave.addEventListener('onUserChange', userChangeListener);
    const node = { key: 'n1', type: 'rect', props: {}, children: [] };
    weave.emitUserChangeEvent({ node: node as any, parentId: 'p1' }, WEAVE_NODE_CHANGE_TYPE.CREATE);
    await Promise.resolve();
    expect(userChangeListener).not.toHaveBeenCalled();
  });

  it('returns early when stage.findOne for node.key returns null (no parentId)', async () => {
    const { weave, stage } = makeWeave();
    stage.findOne.mockReturnValue(null);

    const userChangeListener = vi.fn();
    weave.addEventListener('onUserChange', userChangeListener);
    const node = { key: 'n1', type: 'rect', props: {}, children: [] };
    weave.emitUserChangeEvent({ node: node as any }, WEAVE_NODE_CHANGE_TYPE.CREATE);
    await Promise.resolve();
    expect(userChangeListener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 33 — selectNodesByKey()
// ---------------------------------------------------------------------------

describe('Weave — selectNodesByKey()', () => {
  it('calls setSelectedNodes with mapped instances when nodesSelection plugin is present', () => {
    const { weave, stage } = makeWeave();
    const instance = { id: 'node-1' };
    stage.findOne.mockReturnValue(instance);

    const selectionPlugin = { setSelectedNodes: vi.fn() };
    (weave as any).registerManager.getPlugin.mockReturnValue(selectionPlugin);

    weave.selectNodesByKey(['node-1', 'node-2']);
    expect(selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([instance, instance]);
  });

  it('does nothing when nodesSelection plugin is not present', () => {
    const { weave } = makeWeave();
    (weave as any).registerManager.getPlugin.mockReturnValue(undefined);
    expect(() => weave.selectNodesByKey(['node-1'])).not.toThrow();
  });
});
