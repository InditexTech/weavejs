// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';

// ─── mocks ────────────────────────────────────────────────────────────────────

vi.mock('konva', () => ({
  default: {
    Layer: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      batchDraw: vi.fn(),
      getZIndex: vi.fn().mockReturnValue(0),
      zIndex: vi.fn(),
      find: vi.fn().mockReturnValue([]),
      findOne: vi.fn().mockReturnValue(null),
      id: vi.fn().mockReturnValue('mainLayer'),
    })),
  },
}));

vi.mock('@/weave', () => ({ Weave: class Weave {} }));

vi.mock('../nodes-snapping.custom-guides', () => ({
  WeaveNodesSnappingCustomGuides: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    isCustomGuidesVisible: vi.fn().mockReturnValue(false),
    hideCustomGuides: vi.fn(),
    renderCustomGuides: vi.fn(),
    getCustomGuides: vi.fn().mockReturnValue([]),
    getGuidesManager: vi.fn().mockReturnThis(),
    getSelectedGuide: vi.fn().mockReturnValue(null),
  })),
}));

vi.mock('../nodes-snapping.guides', () => ({
  WeaveNodesSnappingGuides: vi.fn().mockImplementation(() => ({
    performSnapping: vi.fn(),
    clearSnapGuides: vi.fn(),
    getGuidesFromOtherNodes: vi.fn().mockReturnValue([]),
    renderSnapGuides: vi.fn(),
    copyContainerGuidesToClipboard: vi.fn().mockResolvedValue(undefined),
    pasteGuidesFromClipboard: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../nodes-snapping.distance', () => ({
  WeaveNodesSnappingDistance: vi.fn().mockImplementation(() => ({
    performDistanceSnapping: vi.fn(),
    clearSnapDistanceGuides: vi.fn(),
  })),
}));

vi.mock('@/utils/utils', () => ({
  getVisibleNodes: vi.fn().mockReturnValue([]),
  mergeExceptArrays: vi.fn().mockImplementation(
    (a: Record<string, unknown>, b: Record<string, unknown> | undefined) => ({
      ...a,
      ...(b ?? {}),
    })
  ),
}));

vi.mock('../utils', () => ({
  getNodeRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 50 }),
  getNodesRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 50 }),
  applySnap: vi.fn(),
}));

// ─── imports ──────────────────────────────────────────────────────────────────

import { WeaveNodesSnappingPlugin } from '../nodes-snapping';
import {
  WEAVE_NODES_SNAPPING_PLUGIN_KEY,
  DEFAULT_SNAPPING_MANAGER_CONFIG,
} from '../constants';
import { getNodeRect, getNodesRect } from '../utils';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeMainLayer() {
  return {
    id: vi.fn().mockReturnValue('mainLayer'),
    getZIndex: vi.fn().mockReturnValue(0),
    batchDraw: vi.fn(),
    find: vi.fn().mockReturnValue([]),
    findOne: vi.fn().mockReturnValue(null),
  };
}

function makeStage(_mainLayer: ReturnType<typeof makeMainLayer>) {
  const handlers: Record<string, ((...args: unknown[]) => unknown)[]> = {};

  return {
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    x: vi.fn().mockReturnValue(0),
    y: vi.fn().mockReturnValue(0),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    position: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    add: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    }),
    off: vi.fn(),
    findOne: vi.fn().mockReturnValue(null),
    find: vi.fn().mockReturnValue([]),
    _handlers: handlers,
    fire(event: string, e?: unknown) {
      handlers[event]?.forEach((h) => h(e));
    },
  };
}

function makeWeave(stage: ReturnType<typeof makeStage>, mainLayer: ReturnType<typeof makeMainLayer>) {
  const hooks: Record<string, ((...args: unknown[]) => unknown)[]> = {};
  const eventListeners: Record<string, ((...args: unknown[]) => unknown)[]> = {};

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getMainLayer: vi.fn().mockReturnValue(mainLayer),
    getEventsController: vi.fn().mockReturnValue(undefined),
    emitEvent: vi.fn(),
    getPlugin: vi.fn().mockReturnValue(undefined),
    getHooks: vi.fn().mockReturnValue({
      hook: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
        if (!hooks[event]) hooks[event] = [];
        hooks[event].push(handler);
      }),
      removeHook: vi.fn(),
    }),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
    addEventListener: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(handler);
    }),
    removeEventListener: vi.fn(),
    _hooks: hooks,
    _eventListeners: eventListeners,
  };
}

function setup(params: ConstructorParameters<typeof WeaveNodesSnappingPlugin>[0] = {}) {
  const mainLayer = makeMainLayer();
  const stage = makeStage(mainLayer);
  const weave = makeWeave(stage, mainLayer);
  const plugin = new WeaveNodesSnappingPlugin(params);

  return { plugin, stage, weave, mainLayer };
}

// ─── getName ──────────────────────────────────────────────────────────────────

describe('WeaveNodesSnappingPlugin.getName', () => {
  it('returns WEAVE_NODES_SNAPPING_PLUGIN_KEY', () => {
    const { plugin } = setup();
    expect(plugin.getName()).toBe(WEAVE_NODES_SNAPPING_PLUGIN_KEY);
  });
});

// ─── constructor / config merging ─────────────────────────────────────────────

describe('WeaveNodesSnappingPlugin constructor', () => {
  it('uses default config when no params provided', () => {
    const { plugin } = setup();
    expect(plugin.config.snap.tolerance).toBe(
      DEFAULT_SNAPPING_MANAGER_CONFIG.snap.tolerance
    );
  });

  it('merges custom config with defaults', () => {
    const { plugin } = setup({ config: { snap: { tolerance: 20 } } });
    expect(plugin.config.snap.tolerance).toBe(20);
  });
});

// ─── onInit ───────────────────────────────────────────────────────────────────

describe('WeaveNodesSnappingPlugin.onInit', () => {
  it('creates snapping layer and adds it to stage', () => {
    const { plugin, stage, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    expect(stage.add).toHaveBeenCalled();
  });

  it('emits snappingManager:onInitialized event', () => {
    const { plugin, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    expect(weave.emitEvent).toHaveBeenCalledWith('snappingManager:onInitialized');
  });

  it('initializes all three sub-managers', async () => {
    const { plugin, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    expect(plugin.snappingManagerCustomGuides).toBeDefined();
    expect(plugin.snappingManagerGuides).toBeDefined();
    expect(plugin.snappingManagerDistance).toBeDefined();
  });

  it('sets up stage pointerup handler', () => {
    const { plugin, stage, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    expect(stage.on).toHaveBeenCalledWith('pointerup', expect.any(Function));
  });
});

// ─── getGuidesManager ─────────────────────────────────────────────────────────

describe('WeaveNodesSnappingPlugin.getGuidesManager', () => {
  it('returns snappingManagerCustomGuides', () => {
    const { plugin, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    expect(plugin.getGuidesManager()).toBe(plugin.snappingManagerCustomGuides);
  });
});

// ─── extractContainer (private, via dragStartHandler) ────────────────────────

describe('WeaveNodesSnappingPlugin extractContainer', () => {
  it('returns parent for a single node', () => {
    const { plugin, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    const parent = {
      id: vi.fn().mockReturnValue('mainLayer'),
      getAttrs: vi.fn().mockReturnValue({}),
    };
    const node = { getParent: vi.fn().mockReturnValue(parent) };

    // dragStartHandler sets relativeTo from the container (parent)
    // Since parent doesn't have nodeId attr, relativeTo stays null, which is fine for this test
    const hooks = weave._hooks;
    const dragStartHook = hooks['weave:onTransformerDragStart']?.[0];

    if (dragStartHook) {
      dragStartHook({ e: { evt: { ctrlKey: false, metaKey: false } }, nodes: [node] });
    }

    expect(node.getParent).toHaveBeenCalled();
  });

  it('returns null when nodes array is empty', () => {
    const { plugin, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    // dragStartHandler with empty nodes should not throw
    const hooks = weave._hooks;
    const dragStartHook = hooks['weave:onTransformerDragStart']?.[0];

    expect(() => {
      if (dragStartHook) {
        dragStartHook({ e: { evt: { ctrlKey: false, metaKey: false } }, nodes: [] });
      }
    }).not.toThrow();
  });

  it('returns null when nodes have different parents', () => {
    const { plugin, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    const parent1 = { id: vi.fn().mockReturnValue('parent1') };
    const parent2 = { id: vi.fn().mockReturnValue('parent2') };
    const node1 = { getParent: vi.fn().mockReturnValue(parent1) };
    const node2 = { getParent: vi.fn().mockReturnValue(parent2) };

    const hooks = weave._hooks;
    const dragStartHook = hooks['weave:onTransformerDragStart']?.[0];

    // Should not throw (just returns early since no common container)
    expect(() => {
      if (dragStartHook) {
        dragStartHook({ e: { evt: {} }, nodes: [node1, node2] });
      }
    }).not.toThrow();
  });
});

// ─── dragMoveHandler ──────────────────────────────────────────────────────────

describe('WeaveNodesSnappingPlugin dragMoveHandler', () => {
  it('calls performSnapping and performDistanceSnapping when relativeTo is set', () => {
    const { plugin, weave, mainLayer } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    // Set relativeTo directly to simulate after dragStart
    plugin.relativeToId = 'mainLayer';
    plugin.relativeTo = mainLayer as never;
    plugin.selectionOffsets = [{ x: 0, y: 0 }];

    const node = { getParent: vi.fn().mockReturnValue(mainLayer) };

    const hooks = weave._hooks;
    const dragMoveHook = hooks['weave:onTransformerDragMove']?.[0];

    if (dragMoveHook) {
      dragMoveHook({ e: {}, nodes: [node] });
    }

    expect(plugin.snappingManagerGuides.performSnapping).toHaveBeenCalled();
    expect(plugin.snappingManagerDistance.performDistanceSnapping).toHaveBeenCalled();
  });

  it('does nothing when relativeToId is null', () => {
    const { plugin, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    plugin.relativeToId = null;
    plugin.relativeTo = null;

    const hooks = weave._hooks;
    const dragMoveHook = hooks['weave:onTransformerDragMove']?.[0];

    if (dragMoveHook) {
      dragMoveHook({ e: {}, nodes: [] });
    }

    expect(plugin.snappingManagerGuides.performSnapping).not.toHaveBeenCalled();
  });
});

// ─── pointerUpHandler ─────────────────────────────────────────────────────────

describe('WeaveNodesSnappingPlugin pointerUpHandler', () => {
  it('clears all snap guides on pointer up', () => {
    const { plugin, weave, stage } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    stage.fire('pointerup');

    expect(plugin.snappingManagerDistance.clearSnapDistanceGuides).toHaveBeenCalled();
    expect(plugin.snappingManagerGuides.clearSnapGuides).toHaveBeenCalled();
  });
});

// ─── dragEndHandler ───────────────────────────────────────────────────────────

describe('WeaveNodesSnappingPlugin dragEndHandler', () => {
  it('clears snappingGuides on drag end', () => {
    const { plugin, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    plugin.snappingGuides = [
      { guideId: 'g1', containerId: 'mainLayer', orientation: 'V', value: 100, kind: 'static' },
    ];

    const hooks = weave._hooks;
    const dragEndHook = hooks['weave:onTransformerDragEnd']?.[0];

    if (dragEndHook) {
      dragEndHook({ e: {}, nodes: [] });
    }

    expect(plugin.snappingGuides).toHaveLength(0);
  });
});

// ─── register ─────────────────────────────────────────────────────────────────

describe('WeaveNodesSnappingPlugin.register', () => {
  it('hooks weave:onNodeDragStart', () => {
    const { plugin, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();
    plugin.register(weave as never);

    const hooks = weave._hooks;
    expect(hooks['weave:onNodeDragStart']).toBeDefined();
  });

  it('hooks weave:onNodeDragEnd', () => {
    const { plugin, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();
    plugin.register(weave as never);

    const hooks = weave._hooks;
    expect(hooks['weave:onNodeDragEnd']).toBeDefined();
  });

  it('returns the plugin instance', () => {
    const { plugin, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();
    const result = plugin.register(weave as never);
    expect(result).toBe(plugin);
  });
});

// ─── worldToAbsolute (private, tested via snapTransform logic) ────────────────

describe('WeaveNodesSnappingPlugin coordinate helpers', () => {
  it('snapTransform returns snapped value when within tolerance', () => {
    const { plugin, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    plugin.snappingGuidesHorizontal = [
      {
        guideId: 'g1',
        containerId: 'mainLayer',
        orientation: 'V',
        value: 100,
        renderValue: 100,
        kind: 'static',
      },
    ];

    const matches: never[] = [];
    // @ts-expect-error accessing private for testing
    const result = plugin.snapTransform(103, 'V', matches);

    // 103 is within tolerance=5 of 100
    expect(result).toBe(100);
    expect(matches).toHaveLength(1);
  });

  it('snapTransform returns original value when no guide within tolerance', () => {
    const { plugin, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    plugin.snappingGuidesHorizontal = [
      {
        guideId: 'g1',
        containerId: 'mainLayer',
        orientation: 'V',
        value: 100,
        renderValue: 100,
        kind: 'static',
      },
    ];

    const matches: never[] = [];
    // @ts-expect-error accessing private for testing
    const result = plugin.snapTransform(200, 'V', matches);

    expect(result).toBe(200);
    expect(matches).toHaveLength(0);
  });
});

// ─── isAxisAligned (private) ──────────────────────────────────────────────────

describe('WeaveNodesSnappingPlugin isAxisAligned', () => {
  it('returns true for 0 degrees', () => {
    const { plugin } = setup();
    const node = { rotation: vi.fn().mockReturnValue(0) };
    // @ts-expect-error accessing private for testing
    expect(plugin.isAxisAligned(node)).toBe(true);
  });

  it('returns true for 90 degrees', () => {
    const { plugin } = setup();
    const node = { rotation: vi.fn().mockReturnValue(90) };
    // @ts-expect-error accessing private for testing
    expect(plugin.isAxisAligned(node)).toBe(true);
  });

  it('returns false for 45 degrees', () => {
    const { plugin } = setup();
    const node = { rotation: vi.fn().mockReturnValue(45) };
    // @ts-expect-error accessing private for testing
    expect(plugin.isAxisAligned(node)).toBe(false);
  });
});

// ─── getAxisAlignedAngle (private) ────────────────────────────────────────────

describe('WeaveNodesSnappingPlugin getAxisAlignedAngle', () => {
  it('returns 0 for 0 degrees', () => {
    const { plugin } = setup();
    // @ts-expect-error accessing private for testing
    expect(plugin.getAxisAlignedAngle(0)).toBe(0);
  });

  it('returns 90 for 90 degrees', () => {
    const { plugin } = setup();
    // @ts-expect-error accessing private for testing
    expect(plugin.getAxisAlignedAngle(90)).toBe(90);
  });

  it('returns 180 for 180 degrees', () => {
    const { plugin } = setup();
    // @ts-expect-error accessing private for testing
    expect(plugin.getAxisAlignedAngle(180)).toBe(180);
  });

  it('returns 270 for 270 degrees', () => {
    const { plugin } = setup();
    // @ts-expect-error accessing private for testing
    expect(plugin.getAxisAlignedAngle(270)).toBe(270);
  });

  it('returns 0 for 360 degrees', () => {
    const { plugin } = setup();
    // @ts-expect-error accessing private for testing
    expect(plugin.getAxisAlignedAngle(360)).toBe(0);
  });
});

// ─── mapAnchor (private) ──────────────────────────────────────────────────────

describe('WeaveNodesSnappingPlugin mapAnchor', () => {
  it('returns same anchor for angle 0', () => {
    const { plugin } = setup();
    // @ts-expect-error accessing private for testing
    expect(plugin.mapAnchor('top-left', 0)).toBe('top-left');
  });

  it('maps top-left to top-right at 90 degrees', () => {
    const { plugin } = setup();
    // @ts-expect-error accessing private for testing
    expect(plugin.mapAnchor('top-left', 90)).toBe('top-right');
  });

  it('maps top-left to bottom-right at 180 degrees', () => {
    const { plugin } = setup();
    // @ts-expect-error accessing private for testing
    expect(plugin.mapAnchor('top-left', 180)).toBe('bottom-right');
  });

  it('maps top-left to bottom-left at 270 degrees', () => {
    const { plugin } = setup();
    // @ts-expect-error accessing private for testing
    expect(plugin.mapAnchor('top-left', 270)).toBe('bottom-left');
  });
});

// ─── calculateSelectionOffsets (private) ─────────────────────────────────────
// These tests verify the fix for groups that "jump" when near a snap guide.
// A Weave group lives at (0, 0) in its parent layer but its children (the
// grouped shapes) keep their original canvas coordinates as relative positions
// inside the group.  The snap offset must therefore be *signed* so that
// `next.x = guide + snap.offset + selectionOffset.x` positions the group with
// its bounding-box left edge exactly on the guide.

describe('WeaveNodesSnappingPlugin calculateSelectionOffsets', () => {
  it('computes zero offset for a regular node whose origin matches its bounding box', () => {
    const { plugin, weave, mainLayer } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    const node = {
      x: vi.fn().mockReturnValue(50),
      y: vi.fn().mockReturnValue(50),
      getAttrs: vi.fn().mockReturnValue({}),
    };

    vi.mocked(getNodesRect).mockReturnValueOnce({ x: 50, y: 50, width: 100, height: 50 });
    vi.mocked(getNodeRect).mockReturnValueOnce({ x: 50, y: 50, width: 100, height: 50 });

    // @ts-expect-error accessing private method for testing
    plugin.calculateSelectionOffsets([node], mainLayer, mainLayer);

    expect(plugin.selectionOffsets[0]).toEqual({ x: 0, y: 0 });
  });

  it('computes a negative offset for a group whose bounding box extends beyond its origin', () => {
    // Group placed at (0, 0) but its children's bounding box starts at (100, 80).
    // Without the fix (Math.abs) the offset would be +100 and the group would
    // snap to guide + 200 instead of guide.
    const { plugin, weave, mainLayer } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    const group = {
      x: vi.fn().mockReturnValue(0),
      y: vi.fn().mockReturnValue(0),
      getAttrs: vi.fn().mockReturnValue({}),
    };

    vi.mocked(getNodesRect).mockReturnValueOnce({ x: 100, y: 80, width: 200, height: 150 });
    vi.mocked(getNodeRect).mockReturnValueOnce({ x: 100, y: 80, width: 200, height: 150 });

    // @ts-expect-error accessing private method for testing
    plugin.calculateSelectionOffsets([group], mainLayer, mainLayer);

    // signed diff: x = 0 - 100 = -100, y = 0 - 80 = -80
    expect(plugin.selectionOffsets[0]).toEqual({ x: -100, y: -80 });
  });

  it('maintains correct relative spacing between a group and a regular node in multi-selection', () => {
    // Group at (0, 0), children bounding box at x=100.
    // Rect at (300, 0), bounding box also at x=300.
    // Combined bounding box starts at x=100.
    const { plugin, weave, mainLayer } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    const group = {
      x: vi.fn().mockReturnValue(0),
      y: vi.fn().mockReturnValue(0),
      getAttrs: vi.fn().mockReturnValue({}),
    };
    const rect = {
      x: vi.fn().mockReturnValue(300),
      y: vi.fn().mockReturnValue(0),
      getAttrs: vi.fn().mockReturnValue({}),
    };

    vi.mocked(getNodesRect).mockReturnValueOnce({ x: 100, y: 0, width: 300, height: 100 });
    vi.mocked(getNodeRect)
      .mockReturnValueOnce({ x: 100, y: 0, width: 100, height: 100 })  // group bbox
      .mockReturnValueOnce({ x: 300, y: 0, width: 100, height: 100 }); // rect bbox

    // @ts-expect-error accessing private method for testing
    plugin.calculateSelectionOffsets([group, rect], mainLayer, mainLayer);

    // group: (100 - 100) + (0 - 100) = -100
    expect(plugin.selectionOffsets[0].x).toBe(-100);
    // rect: (300 - 100) + (300 - 300) = 200
    expect(plugin.selectionOffsets[1].x).toBe(200);
  });
});

// ─── copyContainerGuidesToClipboard / pasteGuidesFromClipboard ───────────────

describe('WeaveNodesSnappingPlugin clipboard delegation', () => {
  it('delegates copyContainerGuidesToClipboard to snappingManagerGuides', async () => {
    const { plugin, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    await plugin.copyContainerGuidesToClipboard('c1');

    expect(plugin.snappingManagerGuides.copyContainerGuidesToClipboard).toHaveBeenCalledWith('c1');
  });

  it('delegates pasteGuidesFromClipboard to snappingManagerGuides', async () => {
    const { plugin, weave } = setup();
    plugin.instance = weave as never;
    plugin.onInit();

    await plugin.pasteGuidesFromClipboard('c1');

    expect(plugin.snappingManagerGuides.pasteGuidesFromClipboard).toHaveBeenCalledWith('c1');
  });
});
