// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Konva from 'konva';
import { WeaveGroupsManager } from '../groups';
import type { Weave } from '@/weave';
import type { WeaveStateElement } from '@inditextech/weave-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockLogger() {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function fakeNode(key: string, type = 'node'): WeaveStateElement {
  return {
    key,
    type,
    props: { id: key, nodeType: 'rect' },
  } as unknown as WeaveStateElement;
}

function makeSelectionPlugin() {
  const tr = { hide: vi.fn(), show: vi.fn(), forceUpdate: vi.fn() };
  const plugin = {
    getTransformer: vi.fn().mockReturnValue(tr),
    setSelectedNodes: vi.fn(),
  };
  return { plugin, tr };
}

function makeMultiSelectionPlugin() {
  return { cleanupSelectedHalos: vi.fn() };
}

function makeGroupHandler(groupNode?: WeaveStateElement) {
  const node = groupNode ?? fakeNode('gid', 'group');
  return {
    create: vi.fn().mockReturnValue(node),
    serialize: vi.fn().mockReturnValue(node),
  };
}

function makeNodeHandler(stateNode?: WeaveStateElement) {
  const node = stateNode ?? fakeNode('nid');
  return { serialize: vi.fn().mockReturnValue(node), scaleReset: vi.fn() };
}

interface MockWeaveOptions {
  weaveState?: Record<string, unknown>;
  stageMap?: Record<string, Konva.Node | object | null>;
  mainLayer?: Konva.Layer;
  selectionPlugin?: object | null;
  multiSelectionPlugin?: object | null;
  nodeHandlerMap?: Record<string, object | undefined>;
}

function makeMockWeave(options: MockWeaveOptions = {}) {
  const logger = makeMockLogger();
  const {
    weaveState = { layer: {} },
    stageMap = {},
    mainLayer = new Konva.Layer(),
    selectionPlugin = undefined,
    multiSelectionPlugin = undefined,
    nodeHandlerMap = {},
  } = options;

  const mockStage = {
    findOne: vi.fn((sel: string) => {
      const id = sel.startsWith('#') ? sel.slice(1) : sel;
      return (stageMap[id] as Konva.Node) ?? null;
    }),
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
  };

  const weave = {
    getChildLogger: vi.fn().mockReturnValue(logger),
    getStage: vi.fn().mockReturnValue(mockStage),
    getMainLayer: vi.fn().mockReturnValue(mainLayer),
    getStore: vi.fn().mockReturnValue({
      getState: vi.fn().mockReturnValue({ weave: weaveState }),
    }),
    getPlugin: vi.fn().mockImplementation((key: string) => {
      if (key === 'nodesSelection') return selectionPlugin;
      if (key === 'nodesMultiSelectionFeedback') return multiSelectionPlugin;
      return undefined;
    }),
    getNodeHandler: vi.fn().mockImplementation(
      (type: string) => nodeHandlerMap[type]
    ),
    stateTransactional: vi.fn().mockImplementation((fn: () => void) => fn()),
    addNodeNT: vi.fn(),
    updateNodeNT: vi.fn(),
    removeNodeNT: vi.fn(),
    removeNodes: vi.fn(),
  };

  return {
    weave: weave as unknown as Weave,
    logger,
    mockStage,
    mainLayer,
  };
}

// ---------------------------------------------------------------------------
// Suite 1 — constructor
// ---------------------------------------------------------------------------

describe('WeaveGroupsManager', () => {
  describe('constructor', () => {
    it('calls getChildLogger with "groups-manager"', () => {
      const { weave } = makeMockWeave();
      const _mgr = new WeaveGroupsManager(weave);
      expect(weave.getChildLogger).toHaveBeenCalledWith('groups-manager');
    });

    it('logs debug on creation', () => {
      const { weave, logger } = makeMockWeave();
      const _mgr = new WeaveGroupsManager(weave);
      expect(logger.debug).toHaveBeenCalledWith('Groups manager created');
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 2 — extractTransformFromMatrix() — pure math
  // ---------------------------------------------------------------------------

  describe('extractTransformFromMatrix()', () => {
    let mgr: WeaveGroupsManager;

    beforeEach(() => {
      const { weave } = makeMockWeave();
      mgr = new WeaveGroupsManager(weave);
    });

    it('identity matrix returns zeroed transform', () => {
      const result = mgr.extractTransformFromMatrix([1, 0, 0, 1, 0, 0]);
      expect(result).toMatchObject({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 });
    });

    it('translation matrix returns correct x/y', () => {
      const result = mgr.extractTransformFromMatrix([1, 0, 0, 1, 10, 20]);
      expect(result.x).toBe(10);
      expect(result.y).toBe(20);
    });

    it('90-degree rotation matrix returns rotation ≈ 90', () => {
      // [cos90, sin90, -sin90, cos90, 0, 0]
      const result = mgr.extractTransformFromMatrix([0, 1, -1, 0, 0, 0]);
      expect(result.rotation).toBeCloseTo(90, 0);
    });

    it('scale matrix returns correct scaleX/scaleY', () => {
      const result = mgr.extractTransformFromMatrix([2, 0, 0, 3, 0, 0]);
      expect(result.scaleX).toBeCloseTo(2);
      expect(result.scaleY).toBeCloseTo(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 3 — getNodesMultiSelectionFeedbackPlugin()
  // ---------------------------------------------------------------------------

  describe('getNodesMultiSelectionFeedbackPlugin()', () => {
    it('calls instance.getPlugin with the multi-selection feedback key', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveGroupsManager(weave);
      mgr.getNodesMultiSelectionFeedbackPlugin();
      expect(weave.getPlugin).toHaveBeenCalledWith('nodesMultiSelectionFeedback');
    });

    it('returns whatever getPlugin returns', () => {
      const mockPlugin = makeMultiSelectionPlugin();
      const { weave } = makeMockWeave({ multiSelectionPlugin: mockPlugin });
      const mgr = new WeaveGroupsManager(weave);
      expect(mgr.getNodesMultiSelectionFeedbackPlugin()).toBe(mockPlugin);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 4 — group()
  // ---------------------------------------------------------------------------

  describe('group()', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('returns early when state.weave is empty', () => {
      const { weave } = makeMockWeave({ weaveState: {} });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([fakeNode('n1')]);
      expect(weave.addNodeNT).not.toHaveBeenCalled();
    });

    it('hides transformer and clears selection when selectionPlugin is found', () => {
      const { plugin, tr } = makeSelectionPlugin();
      const { weave } = makeMockWeave({ selectionPlugin: plugin });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([fakeNode('n1')]);
      expect(tr.hide).toHaveBeenCalled();
      expect(plugin.setSelectedNodes).toHaveBeenCalledWith([]);
    });

    it('does not throw when selectionPlugin is not found', () => {
      const { weave } = makeMockWeave({ selectionPlugin: null });
      const mgr = new WeaveGroupsManager(weave);
      expect(() => mgr.group([fakeNode('n1')])).not.toThrow();
    });

    it('calls parentLayer.add when parentLayer is found in stage', () => {
      const mockParentLayer = { add: vi.fn(), getChildren: vi.fn().mockReturnValue([]) };
      const { weave } = makeMockWeave({
        stageMap: { mainLayer: mockParentLayer as unknown as Konva.Node },
      });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([fakeNode('n1')]);
      expect(mockParentLayer.add).toHaveBeenCalled();
    });

    it('does not throw when parentLayer is not found in stage', () => {
      const { weave } = makeMockWeave({ stageMap: {} });
      const mgr = new WeaveGroupsManager(weave);
      expect(() => mgr.group([fakeNode('n1')])).not.toThrow();
    });

    it('calls groupHandler.create and addNodeNT when groupHandler is found', () => {
      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        nodeHandlerMap: { group: groupHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([fakeNode('n1')]);
      expect(groupHandler.create).toHaveBeenCalled();
      expect(weave.addNodeNT).toHaveBeenCalled();
    });

    it('skips groupHandler create when groupHandler is not found', () => {
      const { weave } = makeMockWeave({ nodeHandlerMap: {} });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([fakeNode('n1')]);
      // addNodeNT should not be called since no groupHandler
      expect(weave.addNodeNT).not.toHaveBeenCalled();
    });

    it('processes group-type child: moves, serializes, calls addNodeNT', () => {
      const mainLayer = new Konva.Layer();
      const konvaChildGroup = new Konva.Group({ nodeType: 'group' });
      mainLayer.add(konvaChildGroup);

      const groupChild = { key: konvaChildGroup.id(), type: 'group', props: { id: konvaChildGroup.id(), nodeType: 'group' } } as unknown as WeaveStateElement;
      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        nodeHandlerMap: { group: groupHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([groupChild]);

      // groupHandler.serialize was called (for the group child or the outer group)
      expect(groupHandler.serialize).toHaveBeenCalled();
      expect(weave.addNodeNT).toHaveBeenCalled();
    });

    it('skips group child when konvaGroup not found in mainLayer', () => {
      // mainLayer is empty so findOne returns null
      const mainLayer = new Konva.Layer();
      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        nodeHandlerMap: { group: groupHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      const groupChild = fakeNode('missing-group', 'group');
      mgr.group([groupChild]);
      // serialize for group child should NOT be called (only called for the outer group creation)
      // groupHandler.create is called once; serialize on group child path is not
      expect(groupHandler.create).toHaveBeenCalledTimes(1);
    });

    it('processes plain node child: moves, serializes, calls addNodeNT', () => {
      const mainLayer = new Konva.Layer();
      const konvaRect = new Konva.Rect({ nodeType: 'rect' });
      mainLayer.add(konvaRect);

      const nodeHandler = makeNodeHandler();
      const nodeEl = { key: konvaRect.id(), type: 'node', props: { id: konvaRect.id(), nodeType: 'rect' } } as unknown as WeaveStateElement;
      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        nodeHandlerMap: { group: groupHandler, rect: nodeHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([nodeEl]);

      expect(nodeHandler.serialize).toHaveBeenCalled();
      expect(weave.addNodeNT).toHaveBeenCalled();
    });

    it('skips plain node when not found in mainLayer', () => {
      const mainLayer = new Konva.Layer();
      const nodeHandler = makeNodeHandler();
      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        nodeHandlerMap: { group: groupHandler, rect: nodeHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([fakeNode('missing-rect')]);
      expect(nodeHandler.serialize).not.toHaveBeenCalled();
    });

    it('skips plain node serialization when handler not found for nodeType', () => {
      const mainLayer = new Konva.Layer();
      const konvaRect = new Konva.Rect({ nodeType: 'unknown-type' });
      mainLayer.add(konvaRect);

      const nodeEl = { key: konvaRect.id(), type: 'node', props: { id: konvaRect.id(), nodeType: 'unknown-type' } } as unknown as WeaveStateElement;
      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        nodeHandlerMap: { group: groupHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      // addNodeNT called only for group creation, not for the unknown-type node
      mgr.group([nodeEl]);
      expect(weave.addNodeNT).toHaveBeenCalledTimes(1); // only the outer group
    });

    it('calls updateNodeNT when groupHandler and groupNode are both found', () => {
      const groupHandler = makeGroupHandler();
      const mockGroupNode = new Konva.Group({ id: 'group-stage-node' });
      // Return mockGroupNode for any findOne call (including the groupId lookup)
      const { weave } = makeMockWeave({
        stageMap: new Proxy({}, { get: () => mockGroupNode }) as Record<string, Konva.Node>,
        nodeHandlerMap: { group: groupHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([fakeNode('n1')]);
      expect(weave.updateNodeNT).toHaveBeenCalled();
    });

    it('setTimeout: calls cleanupSelectedHalos and shows transformer when found', () => {
      const multiSelectionPlugin = makeMultiSelectionPlugin();
      const { plugin, tr } = makeSelectionPlugin();
      const mockGroupNode = new Konva.Group({ id: 'group-stage-node' });
      const { weave } = makeMockWeave({
        stageMap: new Proxy({}, { get: () => mockGroupNode }) as Record<string, Konva.Node>,
        selectionPlugin: plugin,
        multiSelectionPlugin,
      });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([fakeNode('n1')]);
      vi.runAllTimers();
      expect(multiSelectionPlugin.cleanupSelectedHalos).toHaveBeenCalled();
      expect(tr.show).toHaveBeenCalled();
      expect(tr.forceUpdate).toHaveBeenCalled();
    });

    it('setTimeout: does not throw when groupNode or selectionPlugin absent', () => {
      const multiSelectionPlugin = makeMultiSelectionPlugin();
      // stageMap is empty so groupNode = null
      const { weave } = makeMockWeave({
        stageMap: {},
        selectionPlugin: null,
        multiSelectionPlugin,
      });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([fakeNode('n1')]);
      expect(() => vi.runAllTimers()).not.toThrow();
      expect(multiSelectionPlugin.cleanupSelectedHalos).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 5 — allNodesInSameParent() via group()
  // ---------------------------------------------------------------------------

  describe('allNodesInSameParent() via group()', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('empty nodes: group() does not crash and calls removeNodes with []', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([]);
      expect(weave.removeNodes).toHaveBeenCalledWith([]);
    });

    it('no frames: realNodes = nodes, all nodes are processed', () => {
      const mainLayer = new Konva.Layer();
      const rect1 = new Konva.Rect({ nodeType: 'rect' });
      const rect2 = new Konva.Rect({ nodeType: 'rect' });
      mainLayer.add(rect1);
      mainLayer.add(rect2);

      const n1 = { key: rect1.id(), type: 'node', props: { id: rect1.id(), nodeType: 'rect' } } as unknown as WeaveStateElement;
      const n2 = { key: rect2.id(), type: 'node', props: { id: rect2.id(), nodeType: 'rect' } } as unknown as WeaveStateElement;
      const nodeHandler = makeNodeHandler();
      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        nodeHandlerMap: { group: groupHandler, rect: nodeHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([n1, n2]);
      // Both nodes should have been serialized (not filtered out)
      expect(nodeHandler.serialize).toHaveBeenCalledTimes(2);
    });

    it('frame node present: its children are excluded from realNodes', () => {
      const mainLayer = new Konva.Layer();
      // The frame Konva node (nodeType: 'frame', explicit id matching frameEl.key)
      const frameKonva = new Konva.Group({ id: 'frame-key', nodeType: 'frame' });
      // Parent group simulating the frame container (has nodeId matching frame key)
      const frameContainer = new Konva.Group({ id: 'frame-container', nodeId: 'frame-key' });
      // Child inside the frame container
      const childKonva = new Konva.Rect({ id: 'child-key', nodeType: 'rect' });
      frameContainer.add(childKonva);
      // Other rect NOT inside any frame
      const otherKonva = new Konva.Rect({ id: 'other-key', nodeType: 'rect' });
      mainLayer.add(frameKonva);
      mainLayer.add(otherKonva);

      const frameEl = { key: 'frame-key', type: 'node', props: { id: 'frame-key', nodeType: 'frame' } } as unknown as WeaveStateElement;
      const childEl = { key: 'child-key', type: 'node', props: { id: 'child-key', nodeType: 'rect' } } as unknown as WeaveStateElement;
      const otherEl = { key: 'other-key', type: 'node', props: { id: 'other-key', nodeType: 'rect' } } as unknown as WeaveStateElement;

      const stageMap: Record<string, Konva.Node> = {
        'frame-key': frameKonva,
        'child-key': childKonva,
        'other-key': otherKonva,
      };
      const groupHandler = makeGroupHandler();
      const nodeHandler = makeNodeHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        stageMap,
        nodeHandlerMap: { group: groupHandler, rect: nodeHandler, frame: nodeHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([frameEl, childEl, otherEl]);
      // childEl should be excluded; removeNodes should not contain childEl
      expect(weave.removeNodes).toHaveBeenCalledWith(
        expect.not.arrayContaining([childEl])
      );
    });

    it('frame child NOT excluded when parent has no nodeId in framesIds', () => {
      const mainLayer = new Konva.Layer();
      const frameKonva = new Konva.Group({ nodeType: 'frame' });
      // Child whose parent has nodeId NOT in framesIds → should be included
      const parentWithOtherNodeId = new Konva.Group({ nodeId: 'other-id' });
      const childKonva = new Konva.Rect({ nodeType: 'rect' });
      parentWithOtherNodeId.add(childKonva);
      mainLayer.add(frameKonva);

      const frameEl = { key: 'frame-key', type: 'node', props: { id: 'frame-key', nodeType: 'frame' } } as unknown as WeaveStateElement;
      const childEl = { key: childKonva.id(), type: 'node', props: { id: childKonva.id(), nodeType: 'rect' } } as unknown as WeaveStateElement;

      const stageMap: Record<string, Konva.Node> = {
        'frame-key': frameKonva,
        [childKonva.id()]: childKonva,
      };
      const groupHandler = makeGroupHandler();
      const nodeHandler = makeNodeHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        stageMap,
        nodeHandlerMap: { group: groupHandler, rect: nodeHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([frameEl, childEl]);
      // childEl should be included (parent.nodeId = 'other-id' not in framesIds)
      expect(weave.removeNodes).toHaveBeenCalledWith(
        expect.arrayContaining([childEl])
      );
    });

    it('single parent with nodeId → parentId = nodeId used in addNodeNT', () => {
      const mainLayer = new Konva.Layer();
      const parent = new Konva.Group({ id: 'parent-id', nodeId: 'frame-node-id' });
      const rect1 = new Konva.Rect({ nodeType: 'rect' });
      const rect2 = new Konva.Rect({ nodeType: 'rect' });
      parent.add(rect1);
      parent.add(rect2);

      const n1 = { key: rect1.id(), type: 'node', props: { id: rect1.id(), nodeType: 'rect' } } as unknown as WeaveStateElement;
      const n2 = { key: rect2.id(), type: 'node', props: { id: rect2.id(), nodeType: 'rect' } } as unknown as WeaveStateElement;
      const stageMap: Record<string, Konva.Node> = {
        [rect1.id()]: rect1,
        [rect2.id()]: rect2,
      };
      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        stageMap,
        nodeHandlerMap: { group: groupHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([n1, n2]);
      // The group is added with parentNodeId = 'frame-node-id'
      expect(weave.addNodeNT).toHaveBeenCalledWith(
        expect.anything(),
        'frame-node-id',
        expect.anything()
      );
    });

    it('multiple parents → parentId = undefined → uses WEAVE_NODE_LAYER_ID', () => {
      const mainLayer = new Konva.Layer();
      const parent1 = new Konva.Group({ id: 'parent-1' });
      const parent2 = new Konva.Group({ id: 'parent-2' });
      const rect1 = new Konva.Rect({ id: 'rect-1', nodeType: 'rect' });
      const rect2 = new Konva.Rect({ id: 'rect-2', nodeType: 'rect' });
      parent1.add(rect1);
      parent2.add(rect2);

      const n1 = { key: 'rect-1', type: 'node', props: { id: 'rect-1', nodeType: 'rect' } } as unknown as WeaveStateElement;
      const n2 = { key: 'rect-2', type: 'node', props: { id: 'rect-2', nodeType: 'rect' } } as unknown as WeaveStateElement;
      const stageMap: Record<string, Konva.Node> = {
        'rect-1': rect1,
        'rect-2': rect2,
      };
      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        stageMap,
        nodeHandlerMap: { group: groupHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      mgr.group([n1, n2]);
      // parentId = undefined → parentNodeId = WEAVE_NODE_LAYER_ID = 'mainLayer'
      expect(weave.addNodeNT).toHaveBeenCalledWith(
        expect.anything(),
        'mainLayer',
        expect.anything()
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 6 — unGroup()
  // ---------------------------------------------------------------------------

  describe('unGroup()', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('returns early when konvaGroup not found in stage', () => {
      const { weave, logger } = makeMockWeave({ stageMap: {} });
      const mgr = new WeaveGroupsManager(weave);
      mgr.unGroup(fakeNode('group-id', 'group'));
      expect(logger.debug).toHaveBeenCalledWith(
        expect.anything(),
        "Group instance doesn't exists, cannot un-group"
      );
      expect(weave.addNodeNT).not.toHaveBeenCalled();
    });

    it('sets newLayer to parent when parent is Konva.Group with nodeId', () => {
      const mainLayer = new Konva.Layer();
      const parentGroup = new Konva.Group({ id: 'parent-g', nodeId: 'frame-id' });
      const konvaGroup = new Konva.Group({ id: 'grp' });
      parentGroup.add(konvaGroup);
      mainLayer.add(parentGroup);

      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        stageMap: { grp: konvaGroup },
        nodeHandlerMap: { group: groupHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      const groupEl = { key: 'grp', type: 'group', props: { id: 'grp' } } as unknown as WeaveStateElement;
      expect(() => mgr.unGroup(groupEl)).not.toThrow();
    });

    it('sets newLayer to parent when parent is Konva.Group without nodeId', () => {
      const mainLayer = new Konva.Layer();
      const parentGroup = new Konva.Group({ id: 'parent-g' }); // no nodeId
      const konvaGroup = new Konva.Group({ id: 'grp' });
      parentGroup.add(konvaGroup);
      mainLayer.add(parentGroup);

      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        stageMap: { grp: konvaGroup },
        nodeHandlerMap: { group: groupHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      const groupEl = { key: 'grp', type: 'group', props: { id: 'grp' } } as unknown as WeaveStateElement;
      expect(() => mgr.unGroup(groupEl)).not.toThrow();
    });

    it('sets newLayer to Konva.Layer when parent is a Layer', () => {
      const mainLayer = new Konva.Layer();
      const konvaGroup = new Konva.Group({ id: 'grp' });
      mainLayer.add(konvaGroup);

      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        stageMap: { grp: konvaGroup },
        nodeHandlerMap: { group: groupHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      const groupEl = { key: 'grp', type: 'group', props: { id: 'grp' } } as unknown as WeaveStateElement;
      expect(() => mgr.unGroup(groupEl)).not.toThrow();
    });

    it('returns early when newLayer cannot be determined', () => {
      // Group with no parent at all → getMainLayer() returns undefined → newLayer = undefined
      const konvaGroup = new Konva.Group({ id: 'grp' });
      const groupHandler = makeGroupHandler();
      const { weave, logger } = makeMockWeave({
        stageMap: { grp: konvaGroup },
        nodeHandlerMap: { group: groupHandler },
      });
      // Override getMainLayer to return undefined so newLayer starts as undefined
      (weave.getMainLayer as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      const mgr = new WeaveGroupsManager(weave);
      const groupEl = { key: 'grp', type: 'group', props: { id: 'grp' } } as unknown as WeaveStateElement;
      mgr.unGroup(groupEl);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.anything(),
        "Group target container doesn't exists, cannot un-group"
      );
    });

    it('serializes child with handler, adds with new id, and destroys child', () => {
      const mainLayer = new Konva.Layer();
      const child = new Konva.Rect({ id: 'child-1', nodeType: 'rect' });
      const konvaGroup = new Konva.Group({ id: 'grp' });
      konvaGroup.add(child);
      mainLayer.add(konvaGroup);

      const nodeHandler = makeNodeHandler(
        { key: 'child-1', type: 'node', props: { id: 'child-1', nodeType: 'rect' } } as unknown as WeaveStateElement
      );
      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        stageMap: { grp: konvaGroup },
        nodeHandlerMap: { group: groupHandler, rect: nodeHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      const groupEl = { key: 'grp', type: 'group', props: { id: 'grp' } } as unknown as WeaveStateElement;
      mgr.unGroup(groupEl);
      expect(nodeHandler.serialize).toHaveBeenCalled();
      expect(weave.addNodeNT).toHaveBeenCalled();
    });

    it('replaces oldId with newNodeId in string props', () => {
      const mainLayer = new Konva.Layer();
      const child = new Konva.Rect({ id: 'child-1', nodeType: 'rect' });
      const konvaGroup = new Konva.Group({ id: 'grp' });
      konvaGroup.add(child);
      mainLayer.add(konvaGroup);

      const stateChild = {
        key: 'child-1',
        type: 'node',
        props: { id: 'child-1', nodeType: 'rect', someRef: 'child-1' },
      } as unknown as WeaveStateElement;
      const nodeHandler = makeNodeHandler(stateChild);
      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        stageMap: { grp: konvaGroup },
        nodeHandlerMap: { group: groupHandler, rect: nodeHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      const groupEl = { key: 'grp', type: 'group', props: { id: 'grp' } } as unknown as WeaveStateElement;
      mgr.unGroup(groupEl);
      // someRef should have had 'child-1' replaced with the newNodeId
      expect(stateChild.props['someRef']).not.toBe('child-1');
    });

    it('skips non-string props in the replacement loop', () => {
      const mainLayer = new Konva.Layer();
      const child = new Konva.Rect({ id: 'child-1', nodeType: 'rect' });
      const konvaGroup = new Konva.Group({ id: 'grp' });
      konvaGroup.add(child);
      mainLayer.add(konvaGroup);

      const stateChild = {
        key: 'child-1',
        type: 'node',
        props: { id: 'child-1', nodeType: 'rect', numericProp: 42 },
      } as unknown as WeaveStateElement;
      const nodeHandler = makeNodeHandler(stateChild);
      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        stageMap: { grp: konvaGroup },
        nodeHandlerMap: { group: groupHandler, rect: nodeHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      const groupEl = { key: 'grp', type: 'group', props: { id: 'grp' } } as unknown as WeaveStateElement;
      expect(() => mgr.unGroup(groupEl)).not.toThrow();
      // numeric prop remains unchanged
      expect(stateChild.props['numericProp']).toBe(42);
    });

    it('skips addNodeNT when child has no handler', () => {
      const mainLayer = new Konva.Layer();
      const child = new Konva.Rect({ id: 'child-1', nodeType: 'unknown' });
      const konvaGroup = new Konva.Group({ id: 'grp' });
      konvaGroup.add(child);
      mainLayer.add(konvaGroup);

      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        stageMap: { grp: konvaGroup },
        nodeHandlerMap: { group: groupHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      const groupEl = { key: 'grp', type: 'group', props: { id: 'grp' } } as unknown as WeaveStateElement;
      mgr.unGroup(groupEl);
      expect(weave.addNodeNT).not.toHaveBeenCalled();
    });

    it('calls removeNodeNT when groupHandler is found', () => {
      const mainLayer = new Konva.Layer();
      const konvaGroup = new Konva.Group({ id: 'grp' });
      mainLayer.add(konvaGroup);

      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        stageMap: { grp: konvaGroup },
        nodeHandlerMap: { group: groupHandler },
      });
      const mgr = new WeaveGroupsManager(weave);
      const groupEl = { key: 'grp', type: 'group', props: { id: 'grp' } } as unknown as WeaveStateElement;
      mgr.unGroup(groupEl);
      expect(weave.removeNodeNT).toHaveBeenCalled();
    });

    it('setTimeout: calls cleanupSelectedHalos and setSelectedNodes when firstElement found', () => {
      const mainLayer = new Konva.Layer();
      const child = new Konva.Rect({ id: 'child-1', nodeType: 'rect' });
      const konvaGroup = new Konva.Group({ id: 'grp' });
      konvaGroup.add(child);
      mainLayer.add(konvaGroup);

      const multiSelectionPlugin = makeMultiSelectionPlugin();
      const { plugin } = makeSelectionPlugin();
      const nodeHandler = makeNodeHandler(
        { key: 'child-1', type: 'node', props: { id: 'child-1', nodeType: 'rect' } } as unknown as WeaveStateElement
      );
      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        stageMap: { grp: konvaGroup },
        nodeHandlerMap: { group: groupHandler, rect: nodeHandler },
        selectionPlugin: plugin,
        multiSelectionPlugin,
      });
      const mgr = new WeaveGroupsManager(weave);
      const groupEl = { key: 'grp', type: 'group', props: { id: 'grp' } } as unknown as WeaveStateElement;
      mgr.unGroup(groupEl);

      // Re-add a fake node to newLayer with the newChildId so firstElement is found
      // newChildId = child.getAttrs().id = 'child-1' (set before node.key is changed)
      // child is destroyed, so we add a fresh node with id 'child-1'
      const fakeFirstElement = new Konva.Rect({ id: 'child-1' });
      mainLayer.add(fakeFirstElement);

      vi.runAllTimers();
      expect(multiSelectionPlugin.cleanupSelectedHalos).toHaveBeenCalled();
      expect(plugin.setSelectedNodes).toHaveBeenCalledWith([fakeFirstElement]);
    });

    it('setTimeout: does not throw when firstElement or selectionPlugin absent', () => {
      const mainLayer = new Konva.Layer();
      const konvaGroup = new Konva.Group({ id: 'grp' });
      mainLayer.add(konvaGroup);

      const multiSelectionPlugin = makeMultiSelectionPlugin();
      const groupHandler = makeGroupHandler();
      const { weave } = makeMockWeave({
        mainLayer,
        stageMap: { grp: konvaGroup },
        nodeHandlerMap: { group: groupHandler },
        selectionPlugin: null,
        multiSelectionPlugin,
      });
      const mgr = new WeaveGroupsManager(weave);
      const groupEl = { key: 'grp', type: 'group', props: { id: 'grp' } } as unknown as WeaveStateElement;
      mgr.unGroup(groupEl);
      expect(() => vi.runAllTimers()).not.toThrow();
    });
  });
});
