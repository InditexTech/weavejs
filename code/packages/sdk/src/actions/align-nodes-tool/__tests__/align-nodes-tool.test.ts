// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Break circular dependency: action.ts → @/weave → managers/async → @/index.node → index.common → zoom-out-tool → action.ts
vi.mock('@/weave', () => ({ Weave: class Weave {} }));
// Break circular dependency: nodes-selection → context-menu → nodes-selection
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));

import { WeaveAlignNodesToolAction } from '../align-nodes-tool';
import {
  ALIGN_NODES_TOOL_ACTION_NAME,
  ALIGN_NODES_ALIGN_TO,
  ALIGN_NODES_TOOL_STATE,
} from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';

// ─── helpers ─────────────────────────────────────────────────────────────────

type ClientRect = { x: number; y: number; width: number; height: number };

function makeMockNode(opts: {
  x?: number;
  y?: number;
  clientRect?: ClientRect;
  parentId?: string;
  nodeId?: string;
  nodeType?: string;
} = {}) {
  const {
    x = 0,
    y = 0,
    clientRect = { x: 0, y: 0, width: 100, height: 100 },
    parentId = 'mainLayer',
    nodeId,
    nodeType = 'rect',
  } = opts;

  return {
    getAttrs: vi.fn().mockReturnValue({ nodeType, ...(nodeId ? { nodeId } : {}) }),
    getClientRect: vi.fn().mockReturnValue(clientRect),
    getParent: vi.fn().mockReturnValue({ getAttrs: vi.fn().mockReturnValue({ id: parentId }) }),
    x: vi.fn().mockReturnValue(x),
    y: vi.fn().mockReturnValue(y),
  };
}

function makeMockWeave() {
  const container = { tabIndex: 0, focus: vi.fn() };
  const layer = { getAttrs: vi.fn().mockReturnValue({ id: 'mainLayer' }) };
  const stage = {
    container: vi.fn().mockReturnValue(container),
    findOne: vi.fn().mockReturnValue(undefined),
  };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getMainLayer: vi.fn().mockReturnValue(layer),
    getPlugin: vi.fn().mockReturnValue(undefined),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    updateNode: vi.fn(),
    triggerAction: vi.fn(),
    emitEvent: vi.fn(),
    _stage: stage,
    _layer: layer,
    _container: container,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveAlignNodesToolAction', () => {
  let action: WeaveAlignNodesToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;

  beforeEach(() => {
    action = new WeaveAlignNodesToolAction();
    mockWeave = makeMockWeave();
    // Setting instance goes through the Proxy — mockWeave.emitEvent will be called
    (action as unknown as Record<string, unknown>)['instance'] = mockWeave;
    // Pre-set cancelAction for private method tests that call alignNodes
    (action as unknown as Record<string, unknown>)['cancelAction'] = vi.fn();
  });

  // ── constructor / initialize ───────────────────────────────────────────────

  describe('constructor / initialize', () => {
    it('initialized is false after construction', () => {
      expect((action as unknown as Record<string, unknown>)['initialized']).toBe(false);
    });

    it('state is IDLE after construction', () => {
      expect((action as unknown as Record<string, unknown>)['state']).toBe(
        ALIGN_NODES_TOOL_STATE.IDLE
      );
    });

    it('onPropsChange and onInit are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
    });
  });

  // ── getName ────────────────────────────────────────────────────────────────

  describe('getName', () => {
    it('returns ALIGN_NODES_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(ALIGN_NODES_TOOL_ACTION_NAME);
    });
  });

  // ── trigger ────────────────────────────────────────────────────────────────

  describe('trigger', () => {
    it('throws "Instance not defined" when instance is falsy', () => {
      const bare = new WeaveAlignNodesToolAction();
      expect(() =>
        bare.trigger(vi.fn(), { alignTo: ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL })
      ).toThrow('Instance not defined');
    });

    it('calls setupEvents (sets initialized = true) on first trigger', () => {
      expect((action as unknown as Record<string, unknown>)['initialized']).toBe(false);
      action.trigger(vi.fn(), { alignTo: ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL });
      expect((action as unknown as Record<string, unknown>)['initialized']).toBe(true);
    });

    it('does NOT call setupEvents again when already initialized', () => {
      const setupSpy = vi.spyOn(action as unknown as Record<string, () => void>, 'setupEvents' as never);
      action.trigger(vi.fn(), { alignTo: ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL });
      const callsAfterFirst = setupSpy.mock.calls.length;
      action.trigger(vi.fn(), { alignTo: ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL });
      expect(setupSpy.mock.calls.length).toBe(callsAfterFirst); // no extra call
    });

    it('sets container tabIndex = 1 and calls focus()', () => {
      action.trigger(vi.fn(), { alignTo: ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL });
      expect(mockWeave._container.tabIndex).toBe(1);
      expect(mockWeave._container.focus).toHaveBeenCalled();
    });

    it('triggerSelectionTool defaults to true', () => {
      action.trigger(vi.fn(), { alignTo: ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL });
      expect((action as unknown as Record<string, unknown>)['triggerSelectionTool']).toBe(true);
    });

    it('triggerSelectionTool can be set to false', () => {
      action.trigger(vi.fn(), {
        alignTo: ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL,
        triggerSelectionTool: false,
      });
      expect((action as unknown as Record<string, unknown>)['triggerSelectionTool']).toBe(false);
    });
  });

  // ── cleanup ────────────────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('calls triggerAction(SELECTION_TOOL_ACTION_NAME) when triggerSelectionTool = true', () => {
      (action as unknown as Record<string, unknown>)['triggerSelectionTool'] = true;
      action.cleanup();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('does NOT call triggerAction when triggerSelectionTool = false', () => {
      (action as unknown as Record<string, unknown>)['triggerSelectionTool'] = false;
      action.cleanup();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('resets state to IDLE', () => {
      (action as unknown as Record<string, unknown>)['state'] = 'some-other-state';
      action.cleanup();
      expect((action as unknown as Record<string, unknown>)['state']).toBe(
        ALIGN_NODES_TOOL_STATE.IDLE
      );
    });
  });

  // ── canAlignSelectedNodes ──────────────────────────────────────────────────

  describe('canAlignSelectedNodes', () => {
    it('returns true when no nodesSelection plugin (selectedNodes = [])', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(action.canAlignSelectedNodes()).toBe(true);
    });

    it('returns true when all selected nodes share one parent', () => {
      const node1 = makeMockNode({ parentId: 'layer1' });
      const node2 = makeMockNode({ parentId: 'layer1' });
      mockWeave.getPlugin.mockReturnValue({
        getSelectedNodes: vi.fn().mockReturnValue([node1, node2]),
      });
      expect(action.canAlignSelectedNodes()).toBe(true);
    });

    it('returns false when selected nodes have multiple different parents', () => {
      const node1 = makeMockNode({ parentId: 'group1' });
      const node2 = makeMockNode({ parentId: 'group2' });
      mockWeave.getPlugin.mockReturnValue({
        getSelectedNodes: vi.fn().mockReturnValue([node1, node2]),
      });
      expect(action.canAlignSelectedNodes()).toBe(false);
    });

    it('returns true when zero nodes are selected', () => {
      mockWeave.getPlugin.mockReturnValue({
        getSelectedNodes: vi.fn().mockReturnValue([]),
      });
      expect(action.canAlignSelectedNodes()).toBe(true);
    });
  });

  // ── getParents (private) ───────────────────────────────────────────────────

  describe('getParents (private)', () => {
    const getParents = (nodes: unknown[]) =>
      (action as unknown as Record<string, (n: unknown[]) => string[]>)['getParents'](nodes);

    it('returns [] for empty nodes array', () => {
      expect(getParents([])).toEqual([]);
    });

    it('returns parent id when node has no nodeId attr', () => {
      const node = makeMockNode({ parentId: 'myLayer' });
      const result = getParents([node]);
      expect(result).toEqual(['myLayer']);
    });

    it('resolves realNode via stage.findOne when nodeId attr is set', () => {
      const proxy = makeMockNode({ nodeId: 'realId', parentId: 'proxyParent' });
      const realNode = makeMockNode({ parentId: 'realParent' });
      mockWeave._stage.findOne.mockReturnValue(realNode);

      const result = getParents([proxy]);
      expect(mockWeave._stage.findOne).toHaveBeenCalledWith('#realId');
      expect(result).toEqual(['realParent']);
    });

    it('skips node when realNode is undefined (findOne returns nothing)', () => {
      const proxy = makeMockNode({ nodeId: 'missing' });
      mockWeave._stage.findOne.mockReturnValue(undefined);

      const result = getParents([proxy]);
      expect(result).toEqual([]);
    });

    it('increments count for same parent; creates new entry for different parents', () => {
      const n1 = makeMockNode({ parentId: 'layer1' });
      const n2 = makeMockNode({ parentId: 'layer1' });
      const n3 = makeMockNode({ parentId: 'layer2' });

      const result = getParents([n1, n2, n3]);
      expect(result).toHaveLength(2);
      expect(result).toContain('layer1');
      expect(result).toContain('layer2');
    });
  });

  // ── updateNode (private) ───────────────────────────────────────────────────

  describe('updateNode (private)', () => {
    const callUpdateNode = (node: unknown) =>
      (action as unknown as Record<string, (n: unknown) => void>)['updateNode'](node);

    it('calls nodeHandler.serialize and instance.updateNode when handler found', () => {
      const serialized = { id: 'n1', type: 'rect', props: {} };
      const handler = { serialize: vi.fn().mockReturnValue(serialized) };
      mockWeave.getNodeHandler.mockReturnValue(handler);

      const node = makeMockNode();
      callUpdateNode(node);

      expect(handler.serialize).toHaveBeenCalledWith(node);
      expect(mockWeave.updateNode).toHaveBeenCalledWith(serialized);
    });

    it('does nothing when getNodeHandler returns undefined', () => {
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      const node = makeMockNode();
      callUpdateNode(node);
      expect(mockWeave.updateNode).not.toHaveBeenCalled();
    });
  });

  // ── alignToLeftHorizontal (private) ───────────────────────────────────────

  describe('alignToLeftHorizontal (private)', () => {
    const callAlign = (nodes: unknown[]) =>
      (action as unknown as Record<string, (n: unknown[]) => void>)['alignToLeftHorizontal'](nodes);

    it('moves all nodes x to the leftmost bounding box x', () => {
      const n1 = makeMockNode({ x: 30, clientRect: { x: 30, y: 0, width: 100, height: 50 } });
      const n2 = makeMockNode({ x: 10, clientRect: { x: 10, y: 0, width: 100, height: 50 } });

      callAlign([n1, n2]);

      // targetX = 10; deltaX for n1 = 10 - 30 = -20 → x(30 + -20 = 10)
      expect(n1.x).toHaveBeenCalledWith(10);
      // deltaX for n2 = 10 - 10 = 0 → x(10 + 0 = 10)
      expect(n2.x).toHaveBeenCalledWith(10);
    });

    it('uses realNode.x() when nodeId resolves via findOne', () => {
      const proxy = makeMockNode({ nodeId: 'realId', x: 30, clientRect: { x: 10, y: 0, width: 50, height: 50 } });
      const realNode = makeMockNode({ x: 50 });
      mockWeave._stage.findOne.mockReturnValue(realNode);

      callAlign([proxy]);
      // targetX = 10 (from proxy's clientRect.x); deltaX = 10 - 10 = 0 → realNode.x(50 + 0 = 50)
      expect(mockWeave._stage.findOne).toHaveBeenCalledWith('#realId');
      expect(realNode.x).toHaveBeenCalledWith(50);
    });

    it('skips node when realNode is null (findOne returns undefined)', () => {
      const proxy = makeMockNode({ nodeId: 'missing', clientRect: { x: 20, y: 0, width: 50, height: 50 } });
      mockWeave._stage.findOne.mockReturnValue(undefined);

      callAlign([proxy]);
      // proxy.x setter should NOT be called (node is skipped)
      const setterCalls = proxy.x.mock.calls.filter((c: unknown[]) => c.length > 0);
      expect(setterCalls).toHaveLength(0);
    });
  });

  // ── alignToCenterHorizontal (private) ─────────────────────────────────────

  describe('alignToCenterHorizontal (private)', () => {
    const callAlign = (nodes: unknown[]) =>
      (action as unknown as Record<string, (n: unknown[]) => void>)['alignToCenterHorizontal'](nodes);

    it('centers all nodes horizontally at (minX + maxX) / 2', () => {
      // n1: x=0 → right=100; n2: x=50 → right=150; center=75
      const n1 = makeMockNode({ x: 0, clientRect: { x: 0, y: 0, width: 100, height: 50 } });
      const n2 = makeMockNode({ x: 50, clientRect: { x: 50, y: 0, width: 100, height: 50 } });

      callAlign([n1, n2]);

      // targetX=75; n1: deltaX = 75-(0+50)=25 → x(0+25=25)
      expect(n1.x).toHaveBeenCalledWith(25);
      // n2: deltaX = 75-(50+50)=-25 → x(50-25=25)
      expect(n2.x).toHaveBeenCalledWith(25);
    });

    it('skips node when realNode is null', () => {
      const proxy = makeMockNode({ nodeId: 'missing', clientRect: { x: 0, y: 0, width: 100, height: 50 } });
      mockWeave._stage.findOne.mockReturnValue(undefined);
      callAlign([proxy]);
      const setterCalls = proxy.x.mock.calls.filter((c: unknown[]) => c.length > 0);
      expect(setterCalls).toHaveLength(0);
    });

    it('updates both minX and maxX tracking branches', () => {
      // single node triggers both minX < and maxX > updates
      const n1 = makeMockNode({ x: 10, clientRect: { x: 10, y: 0, width: 80, height: 50 } });
      callAlign([n1]);
      // minX=10, maxX=90, targetX=50, center=10+40=50, delta=0 → x(10)
      expect(n1.x).toHaveBeenCalledWith(10);
    });
  });

  // ── alignToRightHorizontal (private) ──────────────────────────────────────

  describe('alignToRightHorizontal (private)', () => {
    const callAlign = (nodes: unknown[]) =>
      (action as unknown as Record<string, (n: unknown[]) => void>)['alignToRightHorizontal'](nodes);

    it('moves all nodes so right edge aligns to rightmost edge', () => {
      // n1 right=100; n2 right=150; targetX=150
      const n1 = makeMockNode({ x: 0, clientRect: { x: 0, y: 0, width: 100, height: 50 } });
      const n2 = makeMockNode({ x: 50, clientRect: { x: 50, y: 0, width: 100, height: 50 } });

      callAlign([n1, n2]);

      // n1: deltaX=150-100=50 → x(0+50=50)
      expect(n1.x).toHaveBeenCalledWith(50);
      // n2: deltaX=150-150=0 → x(50+0=50)
      expect(n2.x).toHaveBeenCalledWith(50);
    });

    it('skips node when realNode is null', () => {
      const proxy = makeMockNode({ nodeId: 'missing', clientRect: { x: 0, y: 0, width: 100, height: 50 } });
      mockWeave._stage.findOne.mockReturnValue(undefined);
      callAlign([proxy]);
      const setterCalls = proxy.x.mock.calls.filter((c: unknown[]) => c.length > 0);
      expect(setterCalls).toHaveLength(0);
    });
  });

  // ── alignToTopVertical (private) ──────────────────────────────────────────

  describe('alignToTopVertical (private)', () => {
    const callAlign = (nodes: unknown[]) =>
      (action as unknown as Record<string, (n: unknown[]) => void>)['alignToTopVertical'](nodes);

    it('moves all nodes y to the topmost bounding box y', () => {
      // n1 y=30; n2 y=10 → targetY=10
      const n1 = makeMockNode({ y: 30, clientRect: { x: 0, y: 30, width: 50, height: 50 } });
      const n2 = makeMockNode({ y: 10, clientRect: { x: 0, y: 10, width: 50, height: 50 } });

      callAlign([n1, n2]);

      // n1: deltaY=10-30=-20 → y(30-20=10)
      expect(n1.y).toHaveBeenCalledWith(10);
      // n2: deltaY=0 → y(10)
      expect(n2.y).toHaveBeenCalledWith(10);
    });

    it('skips node when realNode is null', () => {
      const proxy = makeMockNode({ nodeId: 'missing', clientRect: { x: 0, y: 10, width: 50, height: 50 } });
      mockWeave._stage.findOne.mockReturnValue(undefined);
      callAlign([proxy]);
      const setterCalls = proxy.y.mock.calls.filter((c: unknown[]) => c.length > 0);
      expect(setterCalls).toHaveLength(0);
    });
  });

  // ── alignToCenterVertical (private) ───────────────────────────────────────

  describe('alignToCenterVertical (private)', () => {
    const callAlign = (nodes: unknown[]) =>
      (action as unknown as Record<string, (n: unknown[]) => void>)['alignToCenterVertical'](nodes);

    it('centers all nodes vertically at (minY + maxY) / 2', () => {
      // n1: y=0 → bottom=100; n2: y=50 → bottom=150; center=75
      const n1 = makeMockNode({ y: 0, clientRect: { x: 0, y: 0, width: 50, height: 100 } });
      const n2 = makeMockNode({ y: 50, clientRect: { x: 0, y: 50, width: 50, height: 100 } });

      callAlign([n1, n2]);

      // targetY=75; n1: deltaY=75-50=25 → y(25)
      expect(n1.y).toHaveBeenCalledWith(25);
      // n2: deltaY=75-100=-25 → y(25)
      expect(n2.y).toHaveBeenCalledWith(25);
    });

    it('skips node when realNode is null', () => {
      const proxy = makeMockNode({ nodeId: 'missing', clientRect: { x: 0, y: 0, width: 50, height: 100 } });
      mockWeave._stage.findOne.mockReturnValue(undefined);
      callAlign([proxy]);
      const setterCalls = proxy.y.mock.calls.filter((c: unknown[]) => c.length > 0);
      expect(setterCalls).toHaveLength(0);
    });

    it('updates both minY and maxY tracking branches', () => {
      const n1 = makeMockNode({ y: 10, clientRect: { x: 0, y: 10, width: 50, height: 80 } });
      callAlign([n1]);
      // minY=10, maxY=90, targetY=50, center=10+40=50, delta=0 → y(10)
      expect(n1.y).toHaveBeenCalledWith(10);
    });
  });

  // ── alignToBottomVertical (private) ───────────────────────────────────────

  describe('alignToBottomVertical (private)', () => {
    const callAlign = (nodes: unknown[]) =>
      (action as unknown as Record<string, (n: unknown[]) => void>)['alignToBottomVertical'](nodes);

    it('moves all nodes so bottom edge aligns to bottommost edge', () => {
      // n1 bottom=100; n2 bottom=150; targetY=150
      const n1 = makeMockNode({ y: 0, clientRect: { x: 0, y: 0, width: 50, height: 100 } });
      const n2 = makeMockNode({ y: 50, clientRect: { x: 0, y: 50, width: 50, height: 100 } });

      callAlign([n1, n2]);

      // n1: deltaY=150-100=50 → y(50)
      expect(n1.y).toHaveBeenCalledWith(50);
      // n2: deltaY=0 → y(50)
      expect(n2.y).toHaveBeenCalledWith(50);
    });

    it('skips node when realNode is null', () => {
      const proxy = makeMockNode({ nodeId: 'missing', clientRect: { x: 0, y: 0, width: 50, height: 100 } });
      mockWeave._stage.findOne.mockReturnValue(undefined);
      callAlign([proxy]);
      const setterCalls = proxy.y.mock.calls.filter((c: unknown[]) => c.length > 0);
      expect(setterCalls).toHaveLength(0);
    });
  });

  // ── alignNodes (private) ───────────────────────────────────────────────────

  describe('alignNodes (private)', () => {
    const callAlignNodes = (alignTo: string) =>
      (action as unknown as Record<string, (a: string) => void>)['alignNodes'](alignTo);

    beforeEach(() => {
      // Spy on private align methods
      vi.spyOn(action as unknown as Record<string, () => void>, 'alignToLeftHorizontal' as never).mockImplementation(() => {});
      vi.spyOn(action as unknown as Record<string, () => void>, 'alignToCenterHorizontal' as never).mockImplementation(() => {});
      vi.spyOn(action as unknown as Record<string, () => void>, 'alignToRightHorizontal' as never).mockImplementation(() => {});
      vi.spyOn(action as unknown as Record<string, () => void>, 'alignToTopVertical' as never).mockImplementation(() => {});
      vi.spyOn(action as unknown as Record<string, () => void>, 'alignToCenterVertical' as never).mockImplementation(() => {});
      vi.spyOn(action as unknown as Record<string, () => void>, 'alignToBottomVertical' as never).mockImplementation(() => {});
    });

    it('uses empty selectedNodes when no nodesSelection plugin', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      callAlignNodes(ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL);
      // No plugin → selectedNodes = [] → passes alignToLeftHorizontal with []
      expect((action as unknown as Record<string, ReturnType<typeof vi.fn>>)['alignToLeftHorizontal']).toHaveBeenCalledWith([]);
    });

    it('uses getSelectedNodes() from plugin when plugin is present', () => {
      const node = makeMockNode({ parentId: 'mainLayer' });
      // Ensure stage.findOne('#mainLayer') returns a node with matching id so filter passes
      mockWeave._stage.findOne.mockReturnValue({ getAttrs: vi.fn().mockReturnValue({ id: 'mainLayer' }) });
      mockWeave.getPlugin.mockReturnValue({ getSelectedNodes: vi.fn().mockReturnValue([node]) });
      callAlignNodes(ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL);
      expect((action as unknown as Record<string, ReturnType<typeof vi.fn>>)['alignToLeftHorizontal']).toHaveBeenCalledWith([node]);
    });

    it('sets parent to stage.findOne when parentsIds.length === 1', () => {
      const group = { getAttrs: vi.fn().mockReturnValue({ id: 'group1' }) };
      mockWeave._stage.findOne.mockReturnValue(group);

      const node = makeMockNode({ parentId: 'group1' });
      mockWeave.getPlugin.mockReturnValue({ getSelectedNodes: vi.fn().mockReturnValue([node]) });

      callAlignNodes(ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL);
      expect(mockWeave._stage.findOne).toHaveBeenCalledWith('#group1');
    });

    it('calls cancelAction and returns early when parentsIds > 1 and mainLayer not included', () => {
      const cancelAction = vi.fn();
      (action as unknown as Record<string, unknown>)['cancelAction'] = cancelAction;

      const n1 = makeMockNode({ parentId: 'group1' });
      const n2 = makeMockNode({ parentId: 'group2' });
      mockWeave.getPlugin.mockReturnValue({ getSelectedNodes: vi.fn().mockReturnValue([n1, n2]) });

      callAlignNodes(ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL);

      expect(cancelAction).toHaveBeenCalled();
      expect((action as unknown as Record<string, ReturnType<typeof vi.fn>>)['alignToLeftHorizontal']).not.toHaveBeenCalled();
    });

    it('does NOT cancel when parentsIds > 1 but mainLayer IS included', () => {
      const cancelAction = vi.fn();
      (action as unknown as Record<string, unknown>)['cancelAction'] = cancelAction;

      const n1 = makeMockNode({ parentId: 'mainLayer' });
      const n2 = makeMockNode({ parentId: 'group1' });
      mockWeave.getPlugin.mockReturnValue({ getSelectedNodes: vi.fn().mockReturnValue([n1, n2]) });

      callAlignNodes(ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL);

      // cancelAction may be called at the end of alignNodes, but NOT from the early-return guard
      expect((action as unknown as Record<string, ReturnType<typeof vi.fn>>)['alignToLeftHorizontal']).toHaveBeenCalled();
    });

    it('filters selectedNodes to only those whose parent matches current parent', () => {
      // n1 is directly under mainLayer — passes filter
      const n1 = makeMockNode({ parentId: 'mainLayer' });
      // n2Proxy has a nodeId that resolves to a real node under 'group1' — filtered out
      const n2Proxy = makeMockNode({ nodeId: 'n2real', parentId: 'mainLayer' });
      const n2Real = makeMockNode({ parentId: 'group1' });
      mockWeave._stage.findOne.mockImplementation((sel: string) =>
        sel === '#n2real' ? n2Real : undefined
      );
      mockWeave.getPlugin.mockReturnValue({
        getSelectedNodes: vi.fn().mockReturnValue([n1, n2Proxy]),
      });
      // parentsIds = ['mainLayer', 'group1'] → length 2, includes mainLayer → no cancel
      // parent = getMainLayer() → layer (id='mainLayer')
      // n1 passes (parent id matches), n2Proxy fails (realNode parent = 'group1')

      callAlignNodes(ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL);

      const passedNodes = (action as unknown as Record<string, ReturnType<typeof vi.fn>>)['alignToLeftHorizontal'].mock.calls[0][0] as unknown[];
      expect(passedNodes).toContain(n1);
      expect(passedNodes).not.toContain(n2Proxy);
    });

    it.each([
      [ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL, 'alignToLeftHorizontal'],
      [ALIGN_NODES_ALIGN_TO.CENTER_HORIZONTAL, 'alignToCenterHorizontal'],
      [ALIGN_NODES_ALIGN_TO.RIGHT_HORIZONTAL, 'alignToRightHorizontal'],
      [ALIGN_NODES_ALIGN_TO.TOP_VERTICAL, 'alignToTopVertical'],
      [ALIGN_NODES_ALIGN_TO.CENTER_VERTICAL, 'alignToCenterVertical'],
      [ALIGN_NODES_ALIGN_TO.BOTTOM_VERTICAL, 'alignToBottomVertical'],
    ])('dispatches %s to %s', (alignTo, methodName) => {
      callAlignNodes(alignTo);
      expect((action as unknown as Record<string, ReturnType<typeof vi.fn>>)[methodName]).toHaveBeenCalled();
    });

    it('hits default branch without error for unknown alignTo value', () => {
      expect(() => callAlignNodes('unknown-align-to')).not.toThrow();
    });
  });
});
