// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */

// @vitest-environment jsdom
import 'vitest-canvas-mock';
import { describe, expect, it, vi } from 'vitest';
import { WEAVE_NODE_CHANGE_TYPE } from '@inditextech/weave-types';
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

function makeNode(key = 'n1') {
  return { key, type: 'rect', props: {}, children: [] };
}

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
  (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);
  (weave as any).registerManager.getNodesHandlers.mockReturnValue({});
  (weave as any).stateManager.getElementsTree.mockReturnValue([]);

  return { weave, store, stage };
}

// Helper: returns a Konva.Node mock that supports transactionId lifecycle
function makeRealNode(transactionId?: string) {
  const attrs: Record<string, any> = { transactionId };
  return {
    getAttrs: vi.fn(() => attrs),
    setAttr: vi.fn((k: string, v: any) => {
      attrs[k] = v;
    }),
    zIndex: vi.fn().mockReturnValue(0),
    getParent: vi.fn().mockReturnValue(null),
  };
}

// ---------------------------------------------------------------------------
// Suite 22 — addNode / addNodeNT
// ---------------------------------------------------------------------------

describe('Weave — addNode() / addNodeNT()', () => {
  it('addNode wraps call in stateTransactional and executes callback', () => {
    const { weave } = makeWeave();
    const node = makeNode();
    (weave as any).stateManager.stateTransactional.mockImplementation((cb: () => void) => cb());
    const addNodeNTSpy = vi.spyOn(weave, 'addNodeNT').mockImplementation(vi.fn());
    weave.addNode(node as any);
    expect((weave as any).stateManager.stateTransactional).toHaveBeenCalled();
    expect(addNodeNTSpy).toHaveBeenCalled();
  });

  it('addNodeNT without emitUserChangeEvent calls stateManager.addNode', () => {
    const { weave } = makeWeave();
    const node = makeNode();
    weave.addNodeNT(node as any, 'mainLayer', { emitUserChangeEvent: false });
    expect((weave as any).stateManager.addNode).toHaveBeenCalledWith(node, 'mainLayer', undefined);
  });

  it('addNodeNT with emitUserChangeEvent=true tries setTransactionIdToInstance', () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const node = makeNode();
    weave.addNodeNT(node as any, 'mainLayer', { emitUserChangeEvent: true });
    expect(realNode.setAttr).toHaveBeenCalledWith('transactionId', expect.any(String));
    expect(node.props.transactionId).toBeDefined();
  });

  it('addNodeNT with emitUserChangeEvent=true registers onNodeRenderedAdded listener', () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const addEventSpy = vi.spyOn(weave, 'addEventListener');
    const node = makeNode();
    weave.addNodeNT(node as any, 'mainLayer', { emitUserChangeEvent: true });
    expect(addEventSpy).toHaveBeenCalledWith('onNodeRenderedAdded', expect.any(Function));
  });

  it('listener fires emitUserChangeEvent when transactionId matches', async () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const emitUserChangeSpy = vi.spyOn(weave, 'emitUserChangeEvent').mockImplementation(vi.fn());
    const node = makeNode();
    weave.addNodeNT(node as any, 'mainLayer', { emitUserChangeEvent: true });

    // Fire the listener with a matching transactionId
    const addedMock = {
      getAttrs: vi.fn(() => ({ transactionId: node.props.transactionId })),
    };
    weave.emitEvent('onNodeRenderedAdded', addedMock as any);
    await Promise.resolve();
    expect(emitUserChangeSpy).toHaveBeenCalled();
  });

  it('listener does NOT fire emitUserChangeEvent when transactionId does not match', async () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const emitUserChangeSpy = vi.spyOn(weave, 'emitUserChangeEvent').mockImplementation(vi.fn());
    const node = makeNode();
    weave.addNodeNT(node as any, 'mainLayer', { emitUserChangeEvent: true });

    const addedMock = { getAttrs: vi.fn(() => ({ transactionId: 'wrong-id' })) };
    weave.emitEvent('onNodeRenderedAdded', addedMock as any);
    await Promise.resolve();
    expect(emitUserChangeSpy).not.toHaveBeenCalled();
  });

  it('addNodeNT uses overrideUserChangeType when provided', async () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const emitUserChangeSpy = vi.spyOn(weave, 'emitUserChangeEvent').mockImplementation(vi.fn());
    const node = makeNode();
    weave.addNodeNT(node as any, 'mainLayer', {
      emitUserChangeEvent: true,
      overrideUserChangeType: WEAVE_NODE_CHANGE_TYPE.UPDATE,
    });
    const addedMock = {
      getAttrs: vi.fn(() => ({ transactionId: node.props.transactionId })),
    };
    weave.emitEvent('onNodeRenderedAdded', addedMock as any);
    await Promise.resolve();
    expect(emitUserChangeSpy).toHaveBeenCalledWith(
      expect.any(Object),
      WEAVE_NODE_CHANGE_TYPE.UPDATE
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 23 — updateNode / updateNodeNT
// ---------------------------------------------------------------------------

describe('Weave — updateNode() / updateNodeNT()', () => {
  it('updateNode wraps call in stateTransactional and executes callback', () => {
    const { weave } = makeWeave();
    const node = makeNode();
    (weave as any).stateManager.stateTransactional.mockImplementation((cb: () => void) => cb());
    const updateNodeNTSpy = vi.spyOn(weave, 'updateNodeNT').mockImplementation(vi.fn());
    weave.updateNode(node as any);
    expect((weave as any).stateManager.stateTransactional).toHaveBeenCalled();
    expect(updateNodeNTSpy).toHaveBeenCalled();
  });

  it('updateNodeNT without emitUserChangeEvent calls stateManager.updateNode', () => {
    const { weave } = makeWeave();
    const node = makeNode();
    weave.updateNodeNT(node as any, { emitUserChangeEvent: false });
    expect((weave as any).stateManager.updateNode).toHaveBeenCalledWith(node);
  });

  it('updateNodeNT with emitUserChangeEvent=true sets transactionId', () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const node = makeNode();
    weave.updateNodeNT(node as any, { emitUserChangeEvent: true });
    expect(realNode.setAttr).toHaveBeenCalledWith('transactionId', expect.any(String));
  });

  it('updateNodeNT with emitUserChangeEvent=true registers onNodeRenderedUpdated listener', () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const addEventSpy = vi.spyOn(weave, 'addEventListener');
    const node = makeNode();
    weave.updateNodeNT(node as any, { emitUserChangeEvent: true });
    expect(addEventSpy).toHaveBeenCalledWith('onNodeRenderedUpdated', expect.any(Function));
  });

  it('listener fires emitUserChangeEvent(UPDATE) when transactionId matches', async () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const emitUserChangeSpy = vi.spyOn(weave, 'emitUserChangeEvent').mockImplementation(vi.fn());
    const node = makeNode();
    weave.updateNodeNT(node as any, { emitUserChangeEvent: true });

    const updatedMock = { getAttrs: vi.fn(() => ({ transactionId: node.props.transactionId })) };
    weave.emitEvent('onNodeRenderedUpdated', updatedMock as any);
    await Promise.resolve();
    expect(emitUserChangeSpy).toHaveBeenCalledWith(expect.any(Object), WEAVE_NODE_CHANGE_TYPE.UPDATE);
  });

  it('listener does NOT fire when transactionId does not match', async () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const emitUserChangeSpy = vi.spyOn(weave, 'emitUserChangeEvent').mockImplementation(vi.fn());
    const node = makeNode();
    weave.updateNodeNT(node as any, { emitUserChangeEvent: true });

    const updatedMock = { getAttrs: vi.fn(() => ({ transactionId: 'wrong-id' })) };
    weave.emitEvent('onNodeRenderedUpdated', updatedMock as any);
    await Promise.resolve();
    expect(emitUserChangeSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 24 — updateNodes / updateNodesNT
// ---------------------------------------------------------------------------

describe('Weave — updateNodes() / updateNodesNT()', () => {
  it('updateNodes wraps call in stateTransactional and executes callback', () => {
    const { weave } = makeWeave();
    (weave as any).stateManager.stateTransactional.mockImplementation((cb: () => void) => cb());
    const updateNodesNTSpy = vi.spyOn(weave, 'updateNodesNT').mockImplementation(vi.fn());
    weave.updateNodes([makeNode() as any]);
    expect((weave as any).stateManager.stateTransactional).toHaveBeenCalled();
    expect(updateNodesNTSpy).toHaveBeenCalled();
  });

  it('updateNodesNT without emitUserChangeEvent calls stateManager.updateNodes', () => {
    const { weave } = makeWeave();
    const nodes = [makeNode('n1') as any, makeNode('n2') as any];
    weave.updateNodesNT(nodes, { emitUserChangeEvent: false });
    expect((weave as any).stateManager.updateNodes).toHaveBeenCalledWith(nodes);
  });

  it('updateNodesNT with emitUserChangeEvent=true sets transactionId for each node', () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const nodes = [makeNode('n1') as any, makeNode('n2') as any];
    weave.updateNodesNT(nodes, { emitUserChangeEvent: true });
    expect(nodes[0].props.transactionId).toBeDefined();
    expect(nodes[1].props.transactionId).toBeDefined();
  });

  it('listener fires emitUserChangeEvent for matching node', async () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const emitUserChangeSpy = vi.spyOn(weave, 'emitUserChangeEvent').mockImplementation(vi.fn());
    const nodes = [makeNode('n1') as any];
    weave.updateNodesNT(nodes, { emitUserChangeEvent: true });

    const updatedMock = { getAttrs: vi.fn(() => ({ transactionId: nodes[0].props.transactionId })) };
    weave.emitEvent('onNodeRenderedUpdated', updatedMock as any);
    await Promise.resolve();
    expect(emitUserChangeSpy).toHaveBeenCalled();
  });

  it('removes listener when all transactionsIds are cleared', async () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    vi.spyOn(weave, 'emitUserChangeEvent').mockImplementation(vi.fn());
    const removeEventSpy = vi.spyOn(weave, 'removeEventListener');
    const nodes = [makeNode('n1') as any];
    weave.updateNodesNT(nodes, { emitUserChangeEvent: true });

    const updatedMock = { getAttrs: vi.fn(() => ({ transactionId: nodes[0].props.transactionId })) };
    weave.emitEvent('onNodeRenderedUpdated', updatedMock as any);
    await Promise.resolve();
    expect(removeEventSpy).toHaveBeenCalledWith('onNodeRenderedUpdated', expect.any(Function));
  });
});

// ---------------------------------------------------------------------------
// Suite 25 — removeNode / removeNodeNT
// ---------------------------------------------------------------------------

describe('Weave — removeNode() / removeNodeNT()', () => {
  it('removeNode clears selection if nodesSelection plugin exists', () => {
    const { weave } = makeWeave();
    const selectionPlugin = { setSelectedNodes: vi.fn() };
    (weave as any).registerManager.getPlugin.mockReturnValue(selectionPlugin);
    (weave as any).stateManager.stateTransactional.mockImplementation((cb: () => void) => cb());
    const node = makeNode();
    weave.removeNode(node as any);
    expect(selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
  });

  it('removeNode works without nodesSelection plugin', () => {
    const { weave } = makeWeave();
    (weave as any).registerManager.getPlugin.mockReturnValue(undefined);
    (weave as any).stateManager.stateTransactional.mockImplementation((cb: () => void) => cb());
    const node = makeNode();
    expect(() => weave.removeNode(node as any)).not.toThrow();
  });

  it('removeNodeNT without emitUserChangeEvent calls stateManager.removeNode', () => {
    const { weave } = makeWeave();
    const node = makeNode();
    weave.removeNodeNT(node as any, { emitUserChangeEvent: false });
    expect((weave as any).stateManager.removeNode).toHaveBeenCalledWith(node);
  });

  it('removeNodeNT with emitUserChangeEvent=true sets transactionId and registers listener', () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const addEventSpy = vi.spyOn(weave, 'addEventListener');
    const node = makeNode();
    weave.removeNodeNT(node as any, { emitUserChangeEvent: true });
    expect(realNode.setAttr).toHaveBeenCalledWith('transactionId', expect.any(String));
    expect(addEventSpy).toHaveBeenCalledWith('onNodeRenderedRemoved', expect.any(Function));
  });

  it('listener fires emitUserChangeEvent(DELETE) when transactionId matches', async () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const emitUserChangeSpy = vi.spyOn(weave, 'emitUserChangeEvent').mockImplementation(vi.fn());
    const node = makeNode();
    weave.removeNodeNT(node as any, { emitUserChangeEvent: true });

    const removedMock = { getAttrs: vi.fn(() => ({ transactionId: node.props.transactionId })) };
    weave.emitEvent('onNodeRenderedRemoved', removedMock as any);
    await Promise.resolve();
    expect(emitUserChangeSpy).toHaveBeenCalledWith(expect.any(Object), WEAVE_NODE_CHANGE_TYPE.DELETE);
  });

  it('listener does NOT fire when transactionId does not match', async () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const emitUserChangeSpy = vi.spyOn(weave, 'emitUserChangeEvent').mockImplementation(vi.fn());
    const node = makeNode();
    weave.removeNodeNT(node as any, { emitUserChangeEvent: true });

    const removedMock = { getAttrs: vi.fn(() => ({ transactionId: 'wrong-id' })) };
    weave.emitEvent('onNodeRenderedRemoved', removedMock as any);
    await Promise.resolve();
    expect(emitUserChangeSpy).not.toHaveBeenCalled();
  });

  it('calls hooks.callHook(weave:onRemoveNode) when nodeInstance is found', () => {
    const { weave, stage } = makeWeave();
    const nodeInstance = { id: 'instance-1' };
    stage.findOne.mockReturnValue(nodeInstance);
    const hooksSpy = vi.spyOn((weave as any).hooks, 'callHook');
    const node = makeNode();
    weave.removeNodeNT(node as any);
    expect(hooksSpy).toHaveBeenCalledWith('weave:onRemoveNode', nodeInstance);
  });

  it('calls runPhaseHooks(onRemoveNode) passing nodeInstance when found', () => {
    const { weave, stage } = makeWeave();
    const nodeInstance = { id: 'instance-1' };
    stage.findOne.mockReturnValue(nodeInstance);
    // Make hooksManager.runPhaseHooks execute the execution callback with a mock hook
    const mockHook = vi.fn();
    (weave as any).hooksManager.runPhaseHooks.mockImplementation(
      (_phase: string, execution: (hook: (...args: any[]) => void) => void) => {
        execution(mockHook);
      }
    );
    const node = makeNode();
    weave.removeNodeNT(node as any);
    expect((weave as any).hooksManager.runPhaseHooks).toHaveBeenCalledWith('onRemoveNode', expect.any(Function));
    expect(mockHook).toHaveBeenCalledWith({ node: nodeInstance });
  });
});

// ---------------------------------------------------------------------------
// Suite 26 — removeNodes / removeNodesNT
// ---------------------------------------------------------------------------

describe('Weave — removeNodes() / removeNodesNT()', () => {
  it('removeNodes wraps call in stateTransactional and executes callback', () => {
    const { weave } = makeWeave();
    (weave as any).stateManager.stateTransactional.mockImplementation((cb: () => void) => cb());
    const removeNodeNTSpy = vi.spyOn(weave, 'removeNodeNT').mockImplementation(vi.fn());
    const nodes = [makeNode() as any];
    weave.removeNodes(nodes);
    expect((weave as any).stateManager.stateTransactional).toHaveBeenCalled();
    expect(removeNodeNTSpy).toHaveBeenCalled();
  });

  it('removeNodes clears nodesSelection when plugin exists', () => {
    const { weave } = makeWeave();
    (weave as any).stateManager.stateTransactional.mockImplementation((cb: () => void) => cb());
    vi.spyOn(weave, 'removeNodeNT').mockImplementation(vi.fn());
    const selectionPlugin = { setSelectedNodes: vi.fn() };
    (weave as any).registerManager.getPlugin.mockReturnValue(selectionPlugin);
    weave.removeNodes([makeNode() as any]);
    expect(selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
  });

  it('removeNodesNT calls removeNodeNT for each node', () => {
    const { weave } = makeWeave();
    const removeNodeNTSpy = vi.spyOn(weave, 'removeNodeNT');
    const nodes = [makeNode('n1') as any, makeNode('n2') as any];
    weave.removeNodesNT(nodes);
    expect(removeNodeNTSpy).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Suite 27 — zMoveNode / zMoveNodeNT
// ---------------------------------------------------------------------------

describe('Weave — zMoveNode() / zMoveNodeNT()', () => {
  it('zMoveNode wraps call in stateTransactional and executes callback', () => {
    const { weave } = makeWeave();
    (weave as any).stateManager.stateTransactional.mockImplementation((cb: () => void) => cb());
    const zMoveNodeNTSpy = vi.spyOn(weave, 'zMoveNodeNT').mockImplementation(vi.fn());
    weave.zMoveNode(makeNode() as any, 'up' as any);
    expect((weave as any).stateManager.stateTransactional).toHaveBeenCalled();
    expect(zMoveNodeNTSpy).toHaveBeenCalled();
  });

  it('zMoveNodeNT without emitUserChangeEvent calls stateManager.zMoveNode', () => {
    const { weave } = makeWeave();
    const node = makeNode();
    weave.zMoveNodeNT(node as any, 'up' as any, { emitUserChangeEvent: false });
    expect((weave as any).stateManager.zMoveNode).toHaveBeenCalledWith(node, 'up');
  });

  it('zMoveNodeNT with emitUserChangeEvent=true sets transactionId and registers listener', () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const addEventSpy = vi.spyOn(weave, 'addEventListener');
    const node = makeNode();
    weave.zMoveNodeNT(node as any, 'up' as any, { emitUserChangeEvent: true });
    expect(realNode.setAttr).toHaveBeenCalledWith('transactionId', expect.any(String));
    expect(addEventSpy).toHaveBeenCalledWith('onNodeRenderedUpdated', expect.any(Function));
  });

  it('listener fires emitUserChangeEvent(UPDATE) when transactionId matches', async () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const emitUserChangeSpy = vi.spyOn(weave, 'emitUserChangeEvent').mockImplementation(vi.fn());
    const node = makeNode();
    weave.zMoveNodeNT(node as any, 'up' as any, { emitUserChangeEvent: true });

    const movedMock = { getAttrs: vi.fn(() => ({ transactionId: node.props.transactionId })) };
    weave.emitEvent('onNodeRenderedUpdated', movedMock as any);
    await Promise.resolve();
    expect(emitUserChangeSpy).toHaveBeenCalledWith(expect.any(Object), WEAVE_NODE_CHANGE_TYPE.UPDATE);
  });

  it('listener does NOT fire when transactionId does not match', async () => {
    const { weave, stage } = makeWeave();
    const realNode = makeRealNode();
    stage.findOne.mockReturnValue(realNode);
    const emitUserChangeSpy = vi.spyOn(weave, 'emitUserChangeEvent').mockImplementation(vi.fn());
    const node = makeNode();
    weave.zMoveNodeNT(node as any, 'up' as any, { emitUserChangeEvent: true });

    const movedMock = { getAttrs: vi.fn(() => ({ transactionId: 'wrong-id' })) };
    weave.emitEvent('onNodeRenderedUpdated', movedMock as any);
    await Promise.resolve();
    expect(emitUserChangeSpy).not.toHaveBeenCalled();
  });
});
