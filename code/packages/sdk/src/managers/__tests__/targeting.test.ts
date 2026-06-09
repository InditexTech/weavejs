// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Konva from 'konva';
import { type Weave } from '@/weave';
import { WeaveTargetingManager } from '@/managers/targeting';
import { containerOverCursor, getBoundingBox } from '@/utils/utils';

vi.mock('@/utils/utils', () => ({
  containerOverCursor: vi.fn(),
  getBoundingBox: vi.fn(),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeStage() {
  return {
    find: vi.fn().mockReturnValue([]),
    findOne: vi.fn().mockReturnValue(null),
    getPointerPosition: vi.fn().mockReturnValue(null),
    getRelativePointerPosition: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    getIntersection: vi.fn().mockReturnValue(null),
  };
}

function makeMainLayer() {
  return {
    getIntersection: vi.fn().mockReturnValue(null),
    getRelativePointerPosition: vi.fn().mockReturnValue({ x: 5, y: 5 }),
    getAttrs: vi.fn().mockReturnValue({ id: 'mainLayer' }),
  };
}

function makeMockWeave() {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const stage = makeStage();
  const mainLayer = makeMainLayer();
  return {
    getChildLogger: vi.fn().mockReturnValue(logger),
    getStage: vi.fn().mockReturnValue(stage),
    getMainLayer: vi.fn().mockReturnValue(mainLayer),
    getUtilityLayer: vi.fn().mockReturnValue(undefined),
    getPlugin: vi.fn().mockReturnValue(undefined),
    _logger: logger,
    _stage: stage,
    _mainLayer: mainLayer,
  };
}

type MockRect = { x: number; y: number; width: number; height: number };

const DEFAULT_MAKE_NODE_ATTRS: Record<string, unknown> = {};
const DEFAULT_MAKE_NODE_RECT: MockRect = { x: 0, y: 0, width: 10, height: 10 };
function makeNode(attrs: Record<string, unknown> = DEFAULT_MAKE_NODE_ATTRS, rect: MockRect = DEFAULT_MAKE_NODE_RECT) {
  return {
    getAttrs: vi.fn().mockReturnValue(attrs),
    getClientRect: vi.fn().mockReturnValue(rect),
    getRealClientRect: vi.fn().mockReturnValue(rect),
    getParent: vi.fn().mockReturnValue(null),
  } as unknown as Konva.Node;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('WeaveTargetingManager', () => {
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let manager: WeaveTargetingManager;

  beforeEach(() => {
    mockWeave = makeMockWeave();
    manager = new WeaveTargetingManager(mockWeave as unknown as Weave);
    vi.mocked(getBoundingBox).mockReturnValue({ x: 0, y: 0, width: 10, height: 10 });
    vi.mocked(containerOverCursor).mockReturnValue(undefined);
  });

  // ─── Suite 1: constructor ────────────────────────────────────────────────

  describe('constructor', () => {
    it('calls getChildLogger with "targeting-manager"', () => {
      expect(mockWeave.getChildLogger).toHaveBeenCalledWith('targeting-manager');
    });

    it('logs debug "Targeting manager created"', () => {
      expect(mockWeave._logger.debug).toHaveBeenCalledWith('Targeting manager created');
    });
  });

  // ─── Suite 2: resolveNode ────────────────────────────────────────────────

  describe('resolveNode', () => {
    it('returns undefined when nodeId present but stage.findOne returns null', () => {
      const node = makeNode({ nodeId: 'inner' });
      mockWeave._stage.findOne.mockReturnValue(null);
      expect(manager.resolveNode(node as Konva.Node)).toBeUndefined();
    });

    it('recurses when nodeId present and parent is found — returns resolved node', () => {
      // parent has nodeType='rect' (not 'layer') → resolved to parent on recursion
      const parent = makeNode({ nodeType: 'rect' });
      const node = makeNode({ nodeId: 'inner' });
      mockWeave._stage.findOne.mockReturnValue(parent as unknown as Konva.Node);
      expect(manager.resolveNode(node as Konva.Node)).toBe(parent);
    });

    it('returns node when nodeType is truthy and not "layer"', () => {
      const node = makeNode({ nodeType: 'rect' });
      expect(manager.resolveNode(node as Konva.Node)).toBe(node);
    });

    it('returns undefined when nodeType is "layer"', () => {
      const node = makeNode({ nodeType: 'layer' });
      expect(manager.resolveNode(node as Konva.Node)).toBeUndefined();
    });

    it('returns undefined when no nodeId and no nodeType', () => {
      const node = makeNode({});
      expect(manager.resolveNode(node as Konva.Node)).toBeUndefined();
    });
  });

  // ─── Suite 3: pointIntersectsElement ────────────────────────────────────

  describe('pointIntersectsElement', () => {
    it('uses provided point directly', () => {
      const pt = { x: 20, y: 30 };
      manager.pointIntersectsElement(pt);
      expect(mockWeave._mainLayer.getIntersection).toHaveBeenCalledWith(pt);
      expect(mockWeave._stage.getPointerPosition).not.toHaveBeenCalled();
    });

    it('falls back to {x:0,y:0} when point is not provided and getPointerPosition returns null', () => {
      mockWeave._stage.getPointerPosition.mockReturnValue(null);
      mockWeave.getMainLayer.mockReturnValue(mockWeave._mainLayer);
      manager.pointIntersectsElement();
      expect(mockWeave._mainLayer.getIntersection).toHaveBeenCalledWith({ x: 0, y: 0 });
    });

    it('returns null when mainLayer is null', () => {
      mockWeave.getMainLayer.mockReturnValue(null);
      expect(manager.pointIntersectsElement({ x: 0, y: 0 })).toBeNull();
    });

    it('returns the intersection result from mainLayer', () => {
      const intersectedNode = makeNode({ nodeType: 'rect' });
      mockWeave._mainLayer.getIntersection.mockReturnValue(intersectedNode);
      const result = manager.pointIntersectsElement({ x: 5, y: 5 });
      expect(result).toBe(intersectedNode);
    });
  });

  // ─── Suite 4: isBoundingBoxIntersecting ──────────────────────────────────

  describe('isBoundingBoxIntersecting', () => {
    it('returns false when A is to the left of B', () => {
      const a = makeNode({}, { x: 0, y: 0, width: 5, height: 10 });
      const b = makeNode({}, { x: 10, y: 0, width: 10, height: 10 });
      expect(manager.isBoundingBoxIntersecting(a as Konva.Node, b as Konva.Node)).toBe(false);
    });

    it('returns false when A is to the right of B', () => {
      const a = makeNode({}, { x: 20, y: 0, width: 10, height: 10 });
      const b = makeNode({}, { x: 0, y: 0, width: 5, height: 10 });
      expect(manager.isBoundingBoxIntersecting(a as Konva.Node, b as Konva.Node)).toBe(false);
    });

    it('returns false when A is above B', () => {
      const a = makeNode({}, { x: 0, y: 0, width: 10, height: 5 });
      const b = makeNode({}, { x: 0, y: 10, width: 10, height: 10 });
      expect(manager.isBoundingBoxIntersecting(a as Konva.Node, b as Konva.Node)).toBe(false);
    });

    it('returns false when A is below B', () => {
      const a = makeNode({}, { x: 0, y: 20, width: 10, height: 10 });
      const b = makeNode({}, { x: 0, y: 0, width: 10, height: 5 });
      expect(manager.isBoundingBoxIntersecting(a as Konva.Node, b as Konva.Node)).toBe(false);
    });

    it('returns true when A overlaps B', () => {
      const a = makeNode({}, { x: 0, y: 0, width: 20, height: 20 });
      const b = makeNode({}, { x: 10, y: 10, width: 20, height: 20 });
      expect(manager.isBoundingBoxIntersecting(a as Konva.Node, b as Konva.Node)).toBe(true);
    });
  });

  // ─── Suite 5: isNodesBoundingBoxIntersecting ─────────────────────────────

  describe('isNodesBoundingBoxIntersecting', () => {
    it('returns false when bounding box is to the left of nodeB', () => {
      vi.mocked(getBoundingBox).mockReturnValue({ x: 0, y: 0, width: 5, height: 10 });
      const nodeB = makeNode({}, { x: 10, y: 0, width: 10, height: 10 });
      expect(manager.isNodesBoundingBoxIntersecting([], nodeB as Konva.Node)).toBe(false);
    });

    it('returns false when bounding box is above nodeB', () => {
      vi.mocked(getBoundingBox).mockReturnValue({ x: 0, y: 0, width: 10, height: 5 });
      const nodeB = makeNode({}, { x: 0, y: 10, width: 10, height: 10 });
      expect(manager.isNodesBoundingBoxIntersecting([], nodeB as Konva.Node)).toBe(false);
    });

    it('returns true when bounding boxes overlap', () => {
      vi.mocked(getBoundingBox).mockReturnValue({ x: 0, y: 0, width: 20, height: 20 });
      const nodeB = makeNode({}, { x: 10, y: 10, width: 20, height: 20 });
      expect(manager.isNodesBoundingBoxIntersecting([], nodeB as Konva.Node)).toBe(true);
    });
  });

  // ─── Suite 6: nodeIntersectsContainerElement ─────────────────────────────

  describe('nodeIntersectsContainerElement', () => {
    // Helper: create a fake Transformer (instanceof check passes, constructor not called)
    function makeFakeTransformer(nodes: Konva.Node[] = []) {
      const t = Object.create(Konva.Transformer.prototype) as Konva.Transformer;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t as any).nodes = vi.fn().mockReturnValue(nodes);
      return t;
    }

    // ── Transformer branch ───────────────────────────────────────────────

    it('skips container that is in the selection (Transformer branch)', () => {
      const selNode = makeNode({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selNode as any).getParent = vi.fn().mockReturnValue(
        makeNode({ nodeId: 'frame1' })
      );
      mockWeave._stage.findOne.mockReturnValue(makeNode({ id: 'frame1-id' }));

      const container = makeNode({ id: 'frame1-id' });
      mockWeave._stage.find.mockReturnValue([container]);

      vi.spyOn(manager, 'isNodesBoundingBoxIntersecting').mockReturnValue(true);

      const transformer = makeFakeTransformer([selNode as Konva.Node]);
      const result = manager.nodeIntersectsContainerElement(transformer);
      expect(result).toBeUndefined();
    });

    it('includes container not in selection when it intersects (Transformer branch)', () => {
      const selNode = makeNode({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selNode as any).getParent = vi.fn().mockReturnValue(makeNode({})); // no nodeId

      const container = makeNode({ id: 'container1' });
      mockWeave._stage.find.mockReturnValue([container]);

      vi.spyOn(manager, 'isNodesBoundingBoxIntersecting').mockReturnValue(true);
      vi.spyOn(manager, 'resolveNode').mockReturnValue(container as unknown as Konva.Node);

      const transformer = makeFakeTransformer([selNode as Konva.Node]);
      // actualLayer has different id
      const actualLayer = { getAttrs: () => ({ id: 'otherLayer' }) } as unknown as Konva.Layer;
      // container has no nodeId → falls into second path
      const result = manager.nodeIntersectsContainerElement(transformer, actualLayer);
      expect(result).toBe(container);
    });

    it('skips container in intersections when stage.findOne returns null (Transformer branch)', () => {
      const selNode = makeNode({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selNode as any).getParent = vi.fn().mockReturnValue(makeNode({}));

      const container = makeNode({ id: 'c1', nodeId: 'frame-content' });
      mockWeave._stage.find.mockReturnValue([container]);
      mockWeave._stage.findOne.mockReturnValue(null); // findOne for resolving nodeId → null

      vi.spyOn(manager, 'isNodesBoundingBoxIntersecting').mockReturnValue(true);

      const transformer = makeFakeTransformer([selNode as Konva.Node]);
      const result = manager.nodeIntersectsContainerElement(transformer);
      expect(result).toBeUndefined();
    });

    it('returns parent when container nodeId resolves and id differs from actualLayer (Transformer branch)', () => {
      const selNode = makeNode({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selNode as any).getParent = vi.fn().mockReturnValue(makeNode({}));

      const container = makeNode({ id: 'c1', nodeId: 'frame-content' });
      const parentNode = makeNode({ id: 'frame-parent', nodeType: 'frame' });
      mockWeave._stage.find.mockReturnValue([container]);
      mockWeave._stage.findOne.mockImplementation((sel: string) => {
        if (sel === '#frame-content') return parentNode as unknown as Konva.Node;
        return null;
      });

      vi.spyOn(manager, 'isNodesBoundingBoxIntersecting').mockReturnValue(true);
      vi.spyOn(manager, 'resolveNode').mockReturnValue(parentNode as unknown as Konva.Node);

      const transformer = makeFakeTransformer([selNode as Konva.Node]);
      const actualLayer = { getAttrs: () => ({ id: 'otherLayer' }) } as unknown as Konva.Layer;
      const result = manager.nodeIntersectsContainerElement(transformer, actualLayer);
      expect(result).toBe(parentNode);
    });

    // ── Non-transformer branch ───────────────────────────────────────────

    it('resolves nodeActualContainer via stage.findOne when parent has nodeId (non-Transformer)', () => {
      const parentWithNodeId = makeNode({ nodeId: 'frame1' });
      const node = makeNode({ id: 'node1' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).getParent = vi.fn().mockReturnValue(parentWithNodeId);

      const realParent = makeNode({ id: 'frame1-id' });
      mockWeave._stage.findOne.mockReturnValue(realParent as unknown as Konva.Node);
      mockWeave._stage.find.mockReturnValue([]); // no containers → no intersections

      const result = manager.nodeIntersectsContainerElement(node as Konva.Node);
      expect(mockWeave._stage.findOne).toHaveBeenCalledWith('#frame1');
      expect(result).toBeUndefined(); // no containers to intersect
    });

    it('pushes intersecting container with different id and returns it (non-Transformer)', () => {
      const node = makeNode({ id: 'node1' });
      const container = makeNode({ id: 'container1' });
      mockWeave._stage.find.mockReturnValue([container]);

      vi.spyOn(manager, 'isBoundingBoxIntersecting').mockReturnValue(true);

      const actualLayer = { getAttrs: () => ({ id: 'layerId' }) } as unknown as Konva.Layer;
      const result = manager.nodeIntersectsContainerElement(node as Konva.Node, actualLayer);
      expect(result).toBe(container);
    });

    it('skips container when container.id === node.id (non-Transformer)', () => {
      const node = makeNode({ id: 'same-id' });
      const container = makeNode({ id: 'same-id' });
      mockWeave._stage.find.mockReturnValue([container]);
      vi.spyOn(manager, 'isBoundingBoxIntersecting').mockReturnValue(true);

      const result = manager.nodeIntersectsContainerElement(node as Konva.Node);
      expect(result).toBeUndefined();
    });

    it('skips container in final loop when container.id === actualLayer.id (no nodeId)', () => {
      const node = makeNode({ id: 'node1' });
      const container = makeNode({ id: 'theLayer' });
      mockWeave._stage.find.mockReturnValue([container]);
      vi.spyOn(manager, 'isBoundingBoxIntersecting').mockReturnValue(true);

      const actualLayer = { getAttrs: () => ({ id: 'theLayer' }) } as unknown as Konva.Layer;
      const result = manager.nodeIntersectsContainerElement(node as Konva.Node, actualLayer);
      expect(result).toBeUndefined();
    });

    it('skips container in final loop when resolvedNode.id === actualLayer.id (nodeId present)', () => {
      const node = makeNode({ id: 'node1' });
      const container = makeNode({ id: 'c1', nodeId: 'frame1' });
      const parentNode = makeNode({ id: 'frame-parent' });
      mockWeave._stage.find.mockReturnValue([container]);
      mockWeave._stage.findOne.mockReturnValue(parentNode as unknown as Konva.Node);
      vi.spyOn(manager, 'isBoundingBoxIntersecting').mockReturnValue(true);
      // resolveNode returns a node whose id equals actualLayer.id → NOT assigned
      vi.spyOn(manager, 'resolveNode').mockReturnValue(makeNode({ id: 'theLayer' }) as unknown as Konva.Node);

      const actualLayer = { getAttrs: () => ({ id: 'theLayer' }) } as unknown as Konva.Layer;
      const result = manager.nodeIntersectsContainerElement(node as Konva.Node, actualLayer);
      expect(result).toBeUndefined();
    });
  });

  // ─── Suite 7: getMousePointer ────────────────────────────────────────────

  describe('getMousePointer', () => {
    it('uses provided point directly and returns it as mousePoint', () => {
      const pt = { x: 42, y: 77 };
      vi.mocked(containerOverCursor).mockReturnValue(undefined);
      const result = manager.getMousePointer(pt);
      expect(result.mousePoint).toEqual(pt);
    });

    it('uses containerAlt.getRelativePointerPosition when point is undefined and containerAlt found', () => {
      const containerPos = { x: 9, y: 9 };
      const containerAlt = {
        getRelativePointerPosition: vi.fn().mockReturnValue(containerPos),
        getAttrs: vi.fn().mockReturnValue({}),
      } as unknown as Konva.Group;
      vi.mocked(containerOverCursor).mockReturnValue(containerAlt);

      const result = manager.getMousePointer(undefined);
      expect(result.mousePoint).toEqual(containerPos);
      expect(result.container).toBe(containerAlt);
    });

    it('falls back to mainLayer when point is undefined and no containerAlt', () => {
      vi.mocked(containerOverCursor).mockReturnValue(undefined);
      const mainLayerPos = { x: 3, y: 3 };
      mockWeave._mainLayer.getRelativePointerPosition.mockReturnValue(mainLayerPos);

      const result = manager.getMousePointer(undefined);
      expect(result.container).toBe(mockWeave._mainLayer);
      expect(result.mousePoint).toEqual(mainLayerPos);
    });

    it('calls utilityLayer.visible(false) then visible(true) when utilityLayer exists', () => {
      const utilityLayer = { visible: vi.fn() };
      mockWeave.getUtilityLayer.mockReturnValue(utilityLayer);
      vi.mocked(containerOverCursor).mockReturnValue(undefined);

      manager.getMousePointer({ x: 0, y: 0 });
      expect(utilityLayer.visible).toHaveBeenCalledWith(false);
      expect(utilityLayer.visible).toHaveBeenCalledWith(true);
    });

    it('does not call utilityLayer.visible when utilityLayer is undefined', () => {
      mockWeave.getUtilityLayer.mockReturnValue(undefined);
      // should not throw — no visible() called
      expect(() => manager.getMousePointer({ x: 0, y: 0 })).not.toThrow();
    });

    it('calls transformer.visible(false/true) when nodesSelection plugin exists', () => {
      const transformer = { visible: vi.fn() };
      const nodesSelection = { getTransformer: vi.fn().mockReturnValue(transformer) };
      mockWeave.getPlugin.mockReturnValue(nodesSelection);
      vi.mocked(containerOverCursor).mockReturnValue(undefined);

      manager.getMousePointer({ x: 0, y: 0 });
      expect(transformer.visible).toHaveBeenCalledWith(false);
      expect(transformer.visible).toHaveBeenCalledWith(true);
    });

    it('does not call transformer.visible when nodesSelection plugin is undefined', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      // should not throw
      expect(() => manager.getMousePointer({ x: 0, y: 0 })).not.toThrow();
    });
  });

  // ─── Suite 8: getMousePointerRelativeToContainer ─────────────────────────

  describe('getMousePointerRelativeToContainer', () => {
    it('returns container pointer position when available', () => {
      const pos = { x: 7, y: 8 };
      const container = {
        getRelativePointerPosition: vi.fn().mockReturnValue(pos),
      } as unknown as Konva.Layer;
      const result = manager.getMousePointerRelativeToContainer(container);
      expect(result.mousePoint).toEqual(pos);
      expect(result.container).toBe(container);
    });

    it('falls back to {x:0,y:0} when getRelativePointerPosition returns null', () => {
      const container = {
        getRelativePointerPosition: vi.fn().mockReturnValue(null),
      } as unknown as Konva.Layer;
      const result = manager.getMousePointerRelativeToContainer(container);
      expect(result.mousePoint).toEqual({ x: 0, y: 0 });
    });
  });

  // ─── Suite 9: getRealSelectedNode ────────────────────────────────────────

  describe('getRealSelectedNode', () => {
    it('returns nodeTarget unchanged when parent is not a Transformer and no nodeId', () => {
      const node = makeNode({ id: 'n1' });
      expect(manager.getRealSelectedNode(node as Konva.Node)).toBe(node);
    });

    it('sets realNodeTarget to intersection when parent is a Transformer and intersection found', () => {
      const intersected = makeNode({ id: 'found' });
      mockWeave._stage.getPointerPosition.mockReturnValue({ x: 1, y: 1 });
      mockWeave._stage.getIntersection.mockReturnValue(intersected as unknown as Konva.Node);

      const fakeTransformerLayer = { listening: vi.fn() };
      const fakeTransformer = Object.create(Konva.Transformer.prototype) as Konva.Transformer;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fakeTransformer as any).getParent = vi.fn().mockReturnValue(fakeTransformerLayer);

      const node = makeNode({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).getParent = vi.fn().mockReturnValue(fakeTransformer);

      const result = manager.getRealSelectedNode(node as Konva.Node);
      expect(result).toBe(intersected);
      expect(fakeTransformerLayer.listening).toHaveBeenCalledWith(false);
      expect(fakeTransformerLayer.listening).toHaveBeenCalledWith(true);
    });

    it('keeps original node when parent is a Transformer but no intersection found', () => {
      mockWeave._stage.getPointerPosition.mockReturnValue({ x: 1, y: 1 });
      mockWeave._stage.getIntersection.mockReturnValue(null);

      const fakeTransformerLayer = { listening: vi.fn() };
      const fakeTransformer = Object.create(Konva.Transformer.prototype) as Konva.Transformer;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fakeTransformer as any).getParent = vi.fn().mockReturnValue(fakeTransformerLayer);

      const node = makeNode({ id: 'original' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).getParent = vi.fn().mockReturnValue(fakeTransformer);

      const result = manager.getRealSelectedNode(node as Konva.Node);
      expect(result).toBe(node);
    });

    it('resolves nodeId to the real node via stage.findOne', () => {
      const realNode = makeNode({ id: 'real' });
      mockWeave._stage.findOne.mockReturnValue(realNode as unknown as Konva.Node);

      const node = makeNode({ nodeId: 'real' });
      const result = manager.getRealSelectedNode(node as Konva.Node);
      expect(result).toBe(realNode);
    });

    it('keeps realNodeTarget unchanged when nodeId present but stage.findOne returns null', () => {
      mockWeave._stage.findOne.mockReturnValue(null);
      const node = makeNode({ nodeId: 'missing' });
      const result = manager.getRealSelectedNode(node as Konva.Node);
      expect(result).toBe(node);
    });
  });
});
