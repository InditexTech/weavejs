// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import Konva from 'konva';
import {
  clearContainerTargets,
  containerOverCursor,
  getBoundingBox,
  getExportBoundingBox,
  getSelectedNodesMetadata,
  getStageClickPoint,
  getTargetAndSkipNodes,
  getTargetedNode,
  getVisibleNodes,
  getVisibleNodesInViewport,
  moveNodeToContainer,
  moveNodeToContainerNT,
} from '../utils';
import { WEAVE_NODE_CUSTOM_EVENTS } from '@inditextech/weave-types';

// ---------------------------------------------------------------------------
// Helpers / types
// ---------------------------------------------------------------------------

type AugmentedGroup = Konva.Group & {
  canMoveToContainer: ReturnType<typeof vi.fn>;
  getRealClientRect: ReturnType<typeof vi.fn>;
  getExportClientRect: ReturnType<typeof vi.fn>;
};

type MockStage = {
  getRelativePointerPosition: ReturnType<typeof vi.fn>;
  getPointerPosition: ReturnType<typeof vi.fn>;
  getIntersection: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  scaleX: ReturnType<typeof vi.fn>;
  position: ReturnType<typeof vi.fn>;
  width: ReturnType<typeof vi.fn>;
  height: ReturnType<typeof vi.fn>;
};

type MockSelectionPlugin = {
  getTransformer: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
};

function makeMockStage(): MockStage {
  return {
    getRelativePointerPosition: vi.fn().mockReturnValue(null),
    getPointerPosition: vi.fn().mockReturnValue(null),
    getIntersection: vi.fn().mockReturnValue(null),
    find: vi.fn().mockReturnValue([]),
    findOne: vi.fn().mockReturnValue(null),
    scale: vi.fn().mockReturnValue({ x: 1, y: 1 }),
    scaleX: vi.fn().mockReturnValue(1),
    position: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    width: vi.fn().mockReturnValue(1920),
    height: vi.fn().mockReturnValue(1080),
  };
}

function makeMockInstance(overrides?: Partial<{
  stage: MockStage;
  containers: Konva.Node[];
  locked: boolean;
  plugin: MockSelectionPlugin | null;
}>) {
  const stage = overrides?.stage ?? makeMockStage();
  const containers = overrides?.containers ?? [];
  const locked = overrides?.locked ?? false;
  const plugin = overrides?.plugin !== undefined ? overrides.plugin : null;

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getContainerNodes: vi.fn().mockReturnValue(containers),
    allNodesLocked: vi.fn().mockReturnValue(locked),
    stateTransactional: vi.fn().mockImplementation((fn: () => void) => fn()),
    getNodeHandler: vi.fn().mockReturnValue(null),
    getNodeContainer: vi.fn().mockReturnValue(null),
    getPlugin: vi.fn().mockImplementation((key: string) =>
      key === 'nodesSelection' ? plugin : null
    ),
    getInstanceRecursive: vi.fn().mockImplementation((n: Konva.Node) => n),
    emitEvent: vi.fn(),
    removeNodeNT: vi.fn(),
    addNodeNT: vi.fn(),
  };
}

function makeAugmentedGroup(attrs: Record<string, unknown> = {}): AugmentedGroup {
  const group = new Konva.Group(attrs) as AugmentedGroup;
  group.canMoveToContainer = vi.fn().mockReturnValue(true);
  group.getRealClientRect = vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 });
  group.getExportClientRect = vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 });
  return group;
}

// ---------------------------------------------------------------------------
// Suite 15 — getBoundingBox
// ---------------------------------------------------------------------------

describe('15 — getBoundingBox', () => {
  it('15.1 empty array returns zero box', () => {
    expect(getBoundingBox([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('15.2 single node returns its rect', () => {
    const node = makeAugmentedGroup();
    node.getRealClientRect = vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 50 });
    const result = getBoundingBox([node as unknown as Konva.Node]);
    expect(result).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it('15.3 multiple nodes returns merged bounding box', () => {
    const n1 = makeAugmentedGroup();
    n1.getRealClientRect = vi.fn().mockReturnValue({ x: 0, y: 0, width: 50, height: 50 });
    const n2 = makeAugmentedGroup();
    n2.getRealClientRect = vi.fn().mockReturnValue({ x: 40, y: 30, width: 60, height: 40 });
    const result = getBoundingBox([n1, n2] as unknown as Konva.Node[]);
    expect(result).toEqual({ x: 0, y: 0, width: 100, height: 70 });
  });

  it('15.4 config is forwarded to getRealClientRect', () => {
    const node = makeAugmentedGroup();
    node.getRealClientRect = vi.fn().mockReturnValue({ x: 0, y: 0, width: 10, height: 10 });
    const config = { skipTransform: true };
    getBoundingBox([node as unknown as Konva.Node], config);
    expect(node.getRealClientRect).toHaveBeenCalledWith(config);
  });
});

// ---------------------------------------------------------------------------
// Suite 16 — getExportBoundingBox
// ---------------------------------------------------------------------------

describe('16 — getExportBoundingBox', () => {
  it('16.1 empty array returns zero box', () => {
    expect(getExportBoundingBox([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('16.2 single node returns its export rect', () => {
    const node = makeAugmentedGroup();
    node.getExportClientRect = vi.fn().mockReturnValue({ x: 5, y: 10, width: 200, height: 100 });
    const result = getExportBoundingBox([node as unknown as Konva.Node]);
    expect(result).toEqual({ x: 5, y: 10, width: 200, height: 100 });
  });

  it('16.3 multiple nodes returns merged bounding box', () => {
    const n1 = makeAugmentedGroup();
    n1.getExportClientRect = vi.fn().mockReturnValue({ x: 0, y: 0, width: 50, height: 50 });
    const n2 = makeAugmentedGroup();
    n2.getExportClientRect = vi.fn().mockReturnValue({ x: 50, y: 50, width: 50, height: 50 });
    const result = getExportBoundingBox([n1, n2] as unknown as Konva.Node[]);
    expect(result).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });
});

// ---------------------------------------------------------------------------
// Suite 17 — getStageClickPoint
// ---------------------------------------------------------------------------

describe('17 — getStageClickPoint', () => {
  it('17.1 scale=1 position=(0,0) — result equals pointer', () => {
    const stage = makeMockStage();
    stage.scale.mockReturnValue({ x: 1, y: 1 });
    stage.position.mockReturnValue({ x: 0, y: 0 });
    const instance = makeMockInstance({ stage });
    const result = getStageClickPoint(instance as never, { x: 400, y: 300 });
    expect(result).toEqual({ x: 400, y: 300 });
  });

  it('17.2 scale=2 position=(-100,-100) — transforms correctly', () => {
    const stage = makeMockStage();
    stage.scale.mockReturnValue({ x: 2, y: 2 });
    stage.position.mockReturnValue({ x: -100, y: -100 });
    const instance = makeMockInstance({ stage });
    // (400 - (-100)) / 2 = 250, (300 - (-100)) / 2 = 200
    const result = getStageClickPoint(instance as never, { x: 400, y: 300 });
    expect(result).toEqual({ x: 250, y: 200 });
  });
});

// ---------------------------------------------------------------------------
// Suite 18 — clearContainerTargets
// ---------------------------------------------------------------------------

describe('18 — clearContainerTargets', () => {
  it('18.1 no containers — nothing fires', () => {
    const instance = makeMockInstance({ containers: [] });
    clearContainerTargets(instance as never);
    expect(instance.getContainerNodes).toHaveBeenCalled();
  });

  it('18.2 two containers — fire onTargetLeave on each', () => {
    const c1 = new Konva.Group();
    const c2 = new Konva.Group();
    const fireSpy1 = vi.spyOn(c1, 'fire');
    const fireSpy2 = vi.spyOn(c2, 'fire');
    const instance = makeMockInstance({ containers: [c1, c2] });

    clearContainerTargets(instance as never);

    expect(fireSpy1).toHaveBeenCalledWith(
      WEAVE_NODE_CUSTOM_EVENTS.onTargetLeave,
      expect.objectContaining({ node: undefined })
    );
    expect(fireSpy2).toHaveBeenCalledWith(
      WEAVE_NODE_CUSTOM_EVENTS.onTargetLeave,
      expect.objectContaining({ node: undefined })
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 19 — getTargetedNode
// ---------------------------------------------------------------------------

describe('19 — getTargetedNode', () => {
  it('19.1 getPointerPosition returns null — returns undefined', () => {
    const stage = makeMockStage();
    stage.getPointerPosition.mockReturnValue(null);
    const instance = makeMockInstance({ stage });
    expect(getTargetedNode(instance as never)).toBeUndefined();
  });

  it('19.2 pointer exists but getIntersection returns null — returns undefined', () => {
    const stage = makeMockStage();
    stage.getPointerPosition.mockReturnValue({ x: 100, y: 100 });
    stage.getIntersection.mockReturnValue(null);
    const instance = makeMockInstance({ stage });
    expect(getTargetedNode(instance as never)).toBeUndefined();
  });

  it('19.3 intersection found — returns getInstanceRecursive result', () => {
    const shape = new Konva.Rect({ id: 'target' });
    const stage = makeMockStage();
    stage.getPointerPosition.mockReturnValue({ x: 100, y: 100 });
    stage.getIntersection.mockReturnValue(shape);
    const instance = makeMockInstance({ stage });
    instance.getInstanceRecursive.mockReturnValue(shape);

    const result = getTargetedNode(instance as never);
    expect(result).toBe(shape);
    expect(instance.getInstanceRecursive).toHaveBeenCalledWith(shape);
  });
});

// ---------------------------------------------------------------------------
// Suite 20 — getSelectedNodesMetadata
// ---------------------------------------------------------------------------

describe('20 — getSelectedNodesMetadata', () => {
  function makeMockTransformer(nodes: Array<{ rect: { x: number; y: number; width: number; height: number }; id: string }>) {
    const konvaNodes = nodes.map(({ rect, id }) => {
      const n = new Konva.Rect({ id, x: rect.x, y: rect.y, width: rect.width, height: rect.height });
      vi.spyOn(n, 'getClientRect').mockReturnValue(rect);
      vi.spyOn(n, 'getAttrs').mockReturnValue({ id });
      return n;
    });
    return {
      getNodes: vi.fn().mockReturnValue(konvaNodes),
    } as unknown as Konva.Transformer;
  }

  it('20.1 single node — width/height from its clientRect', () => {
    const transformer = makeMockTransformer([
      { rect: { x: 10, y: 20, width: 100, height: 50 }, id: 'n1' },
    ]);
    const result = getSelectedNodesMetadata(transformer);
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
    expect(result.nodes).toEqual(['n1']);
  });

  it('20.2 multiple nodes — bounding box spans all', () => {
    const transformer = makeMockTransformer([
      { rect: { x: 0, y: 0, width: 50, height: 50 }, id: 'n1' },
      { rect: { x: 60, y: 30, width: 40, height: 80 }, id: 'n2' },
    ]);
    const result = getSelectedNodesMetadata(transformer);
    // maxX = 60+40=100, minX=0 → width=100; maxY=30+80=110, minY=0 → height=110
    expect(result.width).toBe(100);
    expect(result.height).toBe(110);
    expect(result.nodes).toEqual(['n1', 'n2']);
  });
});

// ---------------------------------------------------------------------------
// Suite 21 — getVisibleNodesInViewport
// ---------------------------------------------------------------------------

describe('21 — getVisibleNodesInViewport', () => {
  function makeMockStageWithViewport(scale = 1, pos = { x: 0, y: 0 }, size = { w: 800, h: 600 }) {
    const stage = makeMockStage();
    stage.scaleX.mockReturnValue(scale);
    stage.position.mockReturnValue(pos);
    stage.width.mockReturnValue(size.w);
    stage.height.mockReturnValue(size.h);
    return stage;
  }

  it('21.1 referenceLayer is undefined — returns []', () => {
    const stage = makeMockStageWithViewport();
    const result = getVisibleNodesInViewport(stage as never, undefined);
    expect(result).toEqual([]);
  });

  it('21.2 node intersects viewport — included', () => {
    const stage = makeMockStageWithViewport(1, { x: 0, y: 0 }, { w: 800, h: 600 });
    const node = new Konva.Rect({ id: 'n1' });
    vi.spyOn(node, 'isVisible').mockReturnValue(true);
    vi.spyOn(node, 'getClientRect').mockReturnValue({ x: 100, y: 100, width: 50, height: 50 });

    const layer = {
      find: vi.fn().mockImplementation((selector: string) =>
        selector === '.node' ? [node] : []
      ),
    };

    const result = getVisibleNodesInViewport(stage as never, layer as never);
    expect(result).toContain(node);
  });

  it('21.3 node outside viewport — excluded', () => {
    const stage = makeMockStageWithViewport(1, { x: 0, y: 0 }, { w: 800, h: 600 });
    const node = new Konva.Rect({ id: 'n1' });
    vi.spyOn(node, 'isVisible').mockReturnValue(true);
    // Box is far outside viewport (x=2000)
    vi.spyOn(node, 'getClientRect').mockReturnValue({ x: 2000, y: 2000, width: 50, height: 50 });

    const layer = {
      find: vi.fn().mockImplementation((selector: string) =>
        selector === '.node' ? [node] : []
      ),
    };

    const result = getVisibleNodesInViewport(stage as never, layer as never);
    expect(result).not.toContain(node);
  });

  it('21.4 node not visible — excluded', () => {
    const stage = makeMockStageWithViewport();
    const node = new Konva.Rect({ id: 'n1' });
    vi.spyOn(node, 'isVisible').mockReturnValue(false);
    vi.spyOn(node, 'getClientRect').mockReturnValue({ x: 100, y: 100, width: 50, height: 50 });

    const layer = {
      find: vi.fn().mockImplementation((selector: string) =>
        selector === '.node' ? [node] : []
      ),
    };

    const result = getVisibleNodesInViewport(stage as never, layer as never);
    expect(result).not.toContain(node);
  });
});

// ---------------------------------------------------------------------------
// Suite 22 — containerOverCursor
// ---------------------------------------------------------------------------

describe('22 — containerOverCursor', () => {
  it('22.1 getRelativePointerPosition returns null — returns undefined', () => {
    const stage = makeMockStage();
    stage.getRelativePointerPosition.mockReturnValue(null);
    stage.find.mockReturnValue([]);
    const instance = makeMockInstance({ stage });
    const result = containerOverCursor(instance as never, []);
    expect(result).toBeUndefined();
  });

  it('22.2 no containerCapable nodes — returns undefined', () => {
    const stage = makeMockStage();
    stage.getRelativePointerPosition.mockReturnValue({ x: 50, y: 50 });
    stage.find.mockReturnValue([]);
    const instance = makeMockInstance({ stage });
    const result = containerOverCursor(instance as never, []);
    expect(result).toBeUndefined();
  });

  it('22.3 definedCursorPosition overrides getRelativePointerPosition', () => {
    const stage = makeMockStage();
    stage.getRelativePointerPosition.mockReturnValue(null);
    stage.find.mockReturnValue([]);
    const instance = makeMockInstance({ stage });
    // Should not crash even though getRelativePointerPosition would return null
    const result = containerOverCursor(instance as never, [], { x: 50, y: 50 });
    expect(result).toBeUndefined(); // no containers, but no crash
    expect(stage.getRelativePointerPosition).not.toHaveBeenCalled();
  });

  it('22.4 node in ignoreNodes — skipped even if at cursor', () => {
    const node = new Konva.Group({
      id: 'c1',
      isContainerPrincipal: true,
      containerId: 'container-1',
    });
    vi.spyOn(node, 'isVisible').mockReturnValue(true);
    // Mock getRealClientRect via augmentation
    (node as AugmentedGroup).getRealClientRect = vi.fn().mockReturnValue({
      x: 0, y: 0, width: 200, height: 200,
    });

    const stage = makeMockStage();
    stage.getRelativePointerPosition.mockReturnValue({ x: 100, y: 100 });
    stage.find.mockReturnValue([node]);
    const instance = makeMockInstance({ stage });

    // node is in ignoreNodes → should be skipped
    const result = containerOverCursor(instance as never, [node]);
    expect(result).toBeUndefined();
  });

  it('22.5 valid principal container at cursor — returned', () => {
    const container = new Konva.Group({
      id: 'c1',
      isContainerPrincipal: true,
      containerId: 'container-1',
    });
    vi.spyOn(container, 'isVisible').mockReturnValue(true);
    (container as AugmentedGroup).getRealClientRect = vi.fn().mockReturnValue({
      x: 0, y: 0, width: 200, height: 200,
    });

    const stage = makeMockStage();
    stage.getRelativePointerPosition.mockReturnValue({ x: 100, y: 100 });
    // find needs to return array with reverse() and forEach() chained
    stage.find.mockReturnValue({
      reverse: vi.fn().mockReturnValue({
        forEach: vi.fn().mockImplementation(
          (cb: (n: Konva.Node) => void) => cb(container)
        ),
      }),
    });
    const instance = makeMockInstance({ stage });

    const result = containerOverCursor(instance as never, []);
    expect(result).toBe(container);
  });
});

// ---------------------------------------------------------------------------
// Suite 23 — getTargetAndSkipNodes
// ---------------------------------------------------------------------------

describe('23 — getTargetAndSkipNodes', () => {
  it('23.1 no nodesSelection plugin — returns empty', () => {
    const instance = makeMockInstance({ plugin: null });
    const e = { type: 'dragmove', target: new Konva.Rect({ id: 'x' }) } as never;
    const result = getTargetAndSkipNodes(instance as never, e);
    expect(result).toEqual({ targetNode: undefined, skipNodes: [] });
  });

  it('23.2 dragmove + 1 transformer node (no eventTarget) — node and skipNodes', () => {
    const node = new Konva.Rect({ id: 'n1' });
    const mockTransformer = {
      nodes: vi.fn().mockReturnValue([node]),
    };
    const plugin = {
      getTransformer: vi.fn().mockReturnValue(mockTransformer),
    } as unknown as MockSelectionPlugin;
    const instance = makeMockInstance({ plugin });
    const e = { type: 'dragmove', target: node } as never;

    const result = getTargetAndSkipNodes(instance as never, e);
    expect(result.targetNode).toBe(node);
    expect(result.skipNodes).toContain('n1');
  });

  it('23.3 dragmove + 1 node with eventTarget — uses e.target', () => {
    const node = new Konva.Rect({ id: 'n1', eventTarget: true });
    const target = new Konva.Rect({ id: 'target' });
    const mockTransformer = {
      nodes: vi.fn().mockReturnValue([node]),
    };
    const plugin = {
      getTransformer: vi.fn().mockReturnValue(mockTransformer),
    } as unknown as MockSelectionPlugin;
    const instance = makeMockInstance({ plugin });
    const e = { type: 'dragmove', target } as never;

    const result = getTargetAndSkipNodes(instance as never, e);
    expect(result.targetNode).toBe(target);
    expect(result.skipNodes).toContain('target');
  });

  it('23.4 dragmove + multiple transformer nodes — skipNodes from metadata, targetNode = transformer', () => {
    const n1 = new Konva.Rect({ id: 'n1' });
    const n2 = new Konva.Rect({ id: 'n2' });
    vi.spyOn(n1, 'getClientRect').mockReturnValue({ x: 0, y: 0, width: 50, height: 50 });
    vi.spyOn(n2, 'getClientRect').mockReturnValue({ x: 50, y: 50, width: 50, height: 50 });
    vi.spyOn(n1, 'getAttrs').mockReturnValue({ id: 'n1' });
    vi.spyOn(n2, 'getAttrs').mockReturnValue({ id: 'n2' });

    const mockTransformer = {
      nodes: vi.fn().mockReturnValue([n1, n2]),
      getNodes: vi.fn().mockReturnValue([n1, n2]),
    };
    const plugin = {
      getTransformer: vi.fn().mockReturnValue(mockTransformer),
    } as unknown as MockSelectionPlugin;
    const instance = makeMockInstance({ plugin });
    const e = { type: 'dragmove', target: n1 } as never;

    const result = getTargetAndSkipNodes(instance as never, e);
    expect(result.targetNode).toBe(mockTransformer);
    expect(result.skipNodes).toEqual(['n1', 'n2']);
  });

  it('23.5 transform event — targetNode = e.target, skipNodes from transformer nodes', () => {
    const target = new Konva.Rect({ id: 'tgt' });
    vi.spyOn(target, 'getAttrs').mockReturnValue({ id: 'tgt' });
    const n1 = new Konva.Rect({ id: 'n1' });
    vi.spyOn(n1, 'getAttrs').mockReturnValue({ id: 'n1' });

    const mockTransformer = {
      nodes: vi.fn().mockReturnValue([n1]),
    };
    const plugin = {
      getTransformer: vi.fn().mockReturnValue(mockTransformer),
    } as unknown as MockSelectionPlugin;
    const instance = makeMockInstance({ plugin });
    const e = { type: 'transform', target } as never;

    const result = getTargetAndSkipNodes(instance as never, e);
    expect(result.targetNode).toBe(target);
    expect(result.skipNodes).toContain('tgt');
    expect(result.skipNodes).toContain('n1');
  });

  it('23.6 forceTransformer=true — always returns the transformer', () => {
    const node = new Konva.Rect({ id: 'n1' });
    const mockTransformer = {
      nodes: vi.fn().mockReturnValue([node]),
    };
    const plugin = {
      getTransformer: vi.fn().mockReturnValue(mockTransformer),
    } as unknown as MockSelectionPlugin;
    const instance = makeMockInstance({ plugin });
    const e = { type: 'dragmove', target: node } as never;

    const result = getTargetAndSkipNodes(instance as never, e, true);
    expect(result.targetNode).toBe(mockTransformer);
  });
});

// ---------------------------------------------------------------------------
// Suite 24 — getVisibleNodes
// ---------------------------------------------------------------------------

describe('24 — getVisibleNodes', () => {
  function makeNodeInViewport(attrs: Record<string, unknown> = {}) {
    const node = new Konva.Rect({ id: 'n1', ...attrs });
    vi.spyOn(node, 'isVisible').mockReturnValue(true);
    vi.spyOn(node, 'getClientRect').mockReturnValue({ x: 0, y: 0, width: 50, height: 50 });
    return node;
  }

  it('24.1 node filtered — parent container does not match referenceLayer', () => {
    const node = makeNodeInViewport({ id: 'n1', nodeType: 'rectangle' });
    const stage = makeMockStage();
    stage.scaleX.mockReturnValue(1);
    stage.position.mockReturnValue({ x: 0, y: 0 });
    stage.width.mockReturnValue(800);
    stage.height.mockReturnValue(600);

    const differentLayer = new Konva.Layer({ id: 'other' });
    const instance = makeMockInstance({ stage });
    instance.getNodeContainer.mockReturnValue(differentLayer);
    // getVisibleNodesInViewport needs the layer to have a find method
    const mockRefLayer = {
      find: vi.fn().mockImplementation((selector: string) =>
        selector === '.node' ? [node] : []
      ),
      getAttrs: vi.fn().mockReturnValue({ id: 'layer1' }),
    };

    const result = getVisibleNodes({
      instance: instance as never,
      skipNodes: [],
      referenceLayer: mockRefLayer as never,
    });
    expect(result).not.toContain(node);
  });

  it('24.2 node filtered — parent nodeType is "group"', () => {
    const stage = makeMockStage();
    stage.scaleX.mockReturnValue(1);
    stage.position.mockReturnValue({ x: 0, y: 0 });
    stage.width.mockReturnValue(800);
    stage.height.mockReturnValue(600);

    const parentGroup = new Konva.Group({ nodeType: 'group', id: 'parent' });
    const node = makeNodeInViewport({ id: 'n1', nodeType: 'rectangle' });
    parentGroup.add(node);

    const mockRefLayer = {
      find: vi.fn().mockImplementation((selector: string) =>
        selector === '.node' ? [node] : []
      ),
      getAttrs: vi.fn().mockReturnValue({ id: 'layer1' }),
    };

    const instance = makeMockInstance({ stage });
    instance.getNodeContainer.mockReturnValue(mockRefLayer);

    const result = getVisibleNodes({
      instance: instance as never,
      skipNodes: [],
      referenceLayer: mockRefLayer as never,
    });
    expect(result).not.toContain(node);
  });

  it('24.3 node filtered — nodeType is "connector"', () => {
    const stage = makeMockStage();
    stage.scaleX.mockReturnValue(1);
    stage.position.mockReturnValue({ x: 0, y: 0 });
    stage.width.mockReturnValue(800);
    stage.height.mockReturnValue(600);

    const node = makeNodeInViewport({ id: 'n1', nodeType: 'connector' });

    const mockRefLayer = {
      find: vi.fn().mockImplementation((selector: string) =>
        selector === '.node' ? [node] : []
      ),
      getAttrs: vi.fn().mockReturnValue({ id: 'layer1' }),
    };

    const instance = makeMockInstance({ stage });
    instance.getNodeContainer.mockReturnValue(mockRefLayer);

    const result = getVisibleNodes({
      instance: instance as never,
      skipNodes: [],
      referenceLayer: mockRefLayer as never,
    });
    expect(result).not.toContain(node);
  });

  it('24.4 node filtered — id is in skipNodes', () => {
    const stage = makeMockStage();
    stage.scaleX.mockReturnValue(1);
    stage.position.mockReturnValue({ x: 0, y: 0 });
    stage.width.mockReturnValue(800);
    stage.height.mockReturnValue(600);

    const node = makeNodeInViewport({ id: 'n1', nodeType: 'rectangle' });

    const mockRefLayer = {
      find: vi.fn().mockImplementation((selector: string) =>
        selector === '.node' ? [node] : []
      ),
      getAttrs: vi.fn().mockReturnValue({ id: 'layer1' }),
    };

    const instance = makeMockInstance({ stage });
    instance.getNodeContainer.mockReturnValue(mockRefLayer);

    const result = getVisibleNodes({
      instance: instance as never,
      skipNodes: ['n1'],
      referenceLayer: mockRefLayer as never,
    });
    expect(result).not.toContain(node);
  });

  it('24.5 transformer hidden and shown when nodesSelection plugin present', () => {
    const stage = makeMockStage();
    stage.scaleX.mockReturnValue(1);
    stage.position.mockReturnValue({ x: 0, y: 0 });
    stage.width.mockReturnValue(800);
    stage.height.mockReturnValue(600);

    const mockTransformer = { hide: vi.fn(), show: vi.fn() };
    const plugin = {
      getTransformer: vi.fn().mockReturnValue(mockTransformer),
    } as unknown as MockSelectionPlugin;

    const mockRefLayer = {
      find: vi.fn().mockReturnValue([]),
      getAttrs: vi.fn().mockReturnValue({ id: 'layer1' }),
    };

    const instance = makeMockInstance({ stage, plugin });
    getVisibleNodes({
      instance: instance as never,
      skipNodes: [],
      referenceLayer: mockRefLayer as never,
    });
    expect(mockTransformer.hide).toHaveBeenCalled();
    expect(mockTransformer.show).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 25 — moveNodeToContainer
// ---------------------------------------------------------------------------

describe('25 — moveNodeToContainer', () => {
  it('25.1 calls stateTransactional and delegates to moveNodeToContainerNT', () => {
    const instance = makeMockInstance({ locked: false });
    const node = new Konva.Rect({ id: 'n1', nodeType: 'rect' });
    const container = makeAugmentedGroup({ id: 'c1' });

    // Attach node to a parent layer so getParent works
    const layer = new Konva.Layer({ id: 'layer1' });
    layer.add(node);

    moveNodeToContainer(instance as never, node, container as never);
    expect(instance.stateTransactional).toHaveBeenCalled();
  });

  it('25.2 locked node returns false', () => {
    const instance = makeMockInstance({ locked: true });
    const node = new Konva.Rect({ id: 'n1' });
    const container = makeAugmentedGroup({ id: 'c1' });

    const result = moveNodeToContainer(instance as never, node, container as never);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 26 — moveNodeToContainerNT
// ---------------------------------------------------------------------------

describe('26 — moveNodeToContainerNT', () => {
  it('26.1 node is locked — returns false', () => {
    const instance = makeMockInstance({ locked: true });
    const node = new Konva.Rect({ id: 'n1' });
    const container = makeAugmentedGroup({ id: 'c1' });

    const result = moveNodeToContainerNT(instance as never, node, container as never);
    expect(result).toBe(false);
  });

  it('26.2 canMoveToContainer returns false — returns false', () => {
    const instance = makeMockInstance({ locked: false });
    const node = new Konva.Rect({ id: 'n1' });
    const container = makeAugmentedGroup({ id: 'c1' });
    container.canMoveToContainer.mockReturnValue(false);

    const layer = new Konva.Layer({ id: 'layer1' });
    layer.add(node);

    const result = moveNodeToContainerNT(instance as never, node, container as never);
    expect(result).toBe(false);
  });

  it('26.3 same container id — no move, returns false', () => {
    const instance = makeMockInstance({ locked: false });
    const layer = new Konva.Layer({ id: 'same' });
    const node = new Konva.Rect({ id: 'n1', nodeType: 'rect' });
    layer.add(node);
    const container = makeAugmentedGroup({ id: 'same' });

    const result = moveNodeToContainerNT(instance as never, node, container as never);
    expect(result).toBe(false);
  });

  it('26.4 nodeType in invalidOriginsTypes (frame) — layerToMove undefined, returns false', () => {
    const instance = makeMockInstance({ locked: false });
    const layer = new Konva.Layer({ id: 'layer1' });
    const node = new Konva.Rect({ id: 'n1', nodeType: 'frame' });
    layer.add(node);
    const container = makeAugmentedGroup({ id: 'c1' });

    const result = moveNodeToContainerNT(instance as never, node, container as never);
    expect(result).toBe(false);
  });

  it('26.5 no nodeHandler — returns false', () => {
    const instance = makeMockInstance({ locked: false });
    instance.getNodeHandler.mockReturnValue(null);
    const layer = new Konva.Layer({ id: 'layer1' });
    const node = new Konva.Rect({ id: 'n1', nodeType: 'rect' });
    layer.add(node);
    const container = makeAugmentedGroup({ id: 'c1' });

    const result = moveNodeToContainerNT(instance as never, node, container as never);
    expect(result).toBe(false);
  });

  it('26.6 all checks pass — moves node, emits event, returns true', () => {
    const nodeHandler = {
      serialize: vi.fn().mockReturnValue({ id: 'n1', nodeType: 'rect', props: {} }),
    };
    const stage = makeMockStage();
    stage.findOne.mockReturnValue(null);
    const instance = makeMockInstance({ locked: false, stage });
    instance.getNodeHandler.mockReturnValue(nodeHandler);

    const layer = new Konva.Layer({ id: 'layer1' });
    const node = new Konva.Rect({ id: 'n1', nodeType: 'rect' });
    layer.add(node);

    const container = makeAugmentedGroup({ id: 'c1', containerId: 'c1' });
    container.canMoveToContainer.mockReturnValue(true);

    const result = moveNodeToContainerNT(instance as never, node, container as never);
    expect(result).toBe(true);
    expect(instance.emitEvent).toHaveBeenCalledWith(
      'onNodeMovedToContainer',
      expect.objectContaining({ container })
    );
    expect(instance.removeNodeNT).toHaveBeenCalled();
    expect(instance.addNodeNT).toHaveBeenCalled();
  });
});
