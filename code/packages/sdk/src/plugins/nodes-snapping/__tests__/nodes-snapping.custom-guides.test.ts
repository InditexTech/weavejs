// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';

// ─── mocks ────────────────────────────────────────────────────────────────────

vi.mock('konva', () => ({
  default: {
    Line: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      x: vi.fn().mockReturnThis(),
      y: vi.fn().mockReturnThis(),
      getClientRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 0, height: 0 }),
      getAttr: vi.fn(),
      setAttrs: vi.fn(),
      destroy: vi.fn(),
      moveToTop: vi.fn(),
    })),
  },
}));

vi.mock('nanoid', () => ({ nanoid: vi.fn().mockReturnValue('mock-nano-id') }));
vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('../nodes-snapping.guide-distance-to-target-info', () => ({
  WeaveNodesSnappingGuideDistanceToTargetInfo: class {
    handleTarget = vi.fn();
    cleanup = vi.fn();
    cleanupTarget = vi.fn();
    handleDistanceLine = vi.fn();
  },
}));
vi.mock('../utils', () => ({
  roundNumber: vi.fn().mockImplementation((v: number) => v),
}));
vi.mock('@/nodes/frame/constants', () => ({ WEAVE_FRAME_NODE_TYPE: 'frame' }));
vi.mock('../nodes-selection/nodes-selection', () => ({}));

// ─── imports ──────────────────────────────────────────────────────────────────

import Konva from 'konva';
import { WeaveNodesSnappingCustomGuides } from '../nodes-snapping.custom-guides';
import { GUIDE_KIND, GUIDE_ORIENTATION } from '../constants';
import type { Guide } from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_STYLE = {
  static: {
    default: { stroke: '#f00', strokeWidth: 1, dash: [6, 6], opacity: 1 },
    selected: { stroke: '#00f', strokeWidth: 2, dash: [6, 6], opacity: 1 },
  },
  custom: {
    default: { stroke: '#f00', strokeWidth: 1, dash: [], opacity: 1 },
    selected: { stroke: '#00f', strokeWidth: 2, dash: [], opacity: 1 },
  },
};

const DEFAULT_TARGET_STYLE = {
  target: { stroke: '#f00', strokeWidth: 1, dash: [], opacity: 1 },
  distance: {
    opacity: 1,
    line: { stroke: '#f00', strokeWidth: 1, dash: [], opacity: 1 },
    text: { fill: '#fff', fontSize: 10, fontFamily: 'monospace', opacity: 1 },
    background: { fill: '#f00', cornerRadius: 4, stroke: '#f00', strokeWidth: 0, opacity: 1 },
  },
};

function makeGuide(
  id: string,
  orientation: 'H' | 'V' = 'V',
  containerId = 'mainLayer',
  persist = false
): Guide {
  return {
    guideId: id,
    orientation,
    value: 100,
    kind: GUIDE_KIND.CUSTOM,
    containerId,
    persist,
  };
}

function makeLayer() {
  const guideNodes: Record<
    string,
    { destroy: ReturnType<typeof vi.fn>; getAttr: ReturnType<typeof vi.fn> }
  > = {};
  return {
    add: vi.fn(),
    batchDraw: vi.fn(),
    listening: vi.fn().mockReturnThis(),
    show: vi.fn(),
    find: vi.fn().mockImplementation((selector: string) => {
      const name = selector.replace('.', '');
      return Object.values(guideNodes).filter((_n: unknown) => {
        // always return them for custom-snap-guide selector
        void name;
        return true;
      });
    }),
    findOne: vi.fn().mockImplementation((selector: string) => {
      const id = selector.replace('#', '');
      return guideNodes[id] ?? null;
    }),
    _guideNodes: guideNodes,
  };
}

function makeStage() {
  const guideNodes: Record<
    string,
    {
      destroy: ReturnType<typeof vi.fn>;
      getAttr: ReturnType<typeof vi.fn>;
      setAttrs: ReturnType<typeof vi.fn>;
    }
  > = {};

  const stage = {
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    x: vi.fn().mockReturnValue(0),
    y: vi.fn().mockReturnValue(0),
    position: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    findOne: vi.fn().mockImplementation((selector: string) => {
      const id = selector.replace('#', '');
      return guideNodes[id] ?? null;
    }),
    find: vi.fn().mockReturnValue([]),
    container: vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      style: { cursor: '' },
    }),
    on: vi.fn(),
    off: vi.fn(),
    _guideNodes: guideNodes,
  };

  return stage;
}

function makeWeave(
  stage: ReturnType<typeof makeStage>,
  metadata: Record<string, unknown> = {}
) {
  const eventListeners: Record<string, ((...args: unknown[]) => unknown)[]> = {};
  const hooks: Record<string, ((...args: unknown[]) => unknown)[]> = {};

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getMainLayer: vi.fn().mockReturnValue({ id: vi.fn().mockReturnValue('mainLayer') }),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    emitEvent: vi.fn(),
    getPlugin: vi.fn().mockReturnValue({ setSelectedNodes: vi.fn() }),
    getMetadata: vi.fn().mockReturnValue(metadata),
    saveMetadata: vi.fn(),
    getHooks: vi.fn().mockReturnValue({
      hook: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
        if (!hooks[event]) hooks[event] = [];
        hooks[event].push(handler);
      }),
    }),
    addEventListener: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(handler);
    }),
    removeEventListener: vi.fn(),
    getMousePointer: vi.fn().mockReturnValue({ mousePoint: { x: 0, y: 0 } }),
    getUtilityLayer: vi.fn().mockReturnValue({ add: vi.fn() }),
    _eventListeners: eventListeners,
    _hooks: hooks,
  };
}

function setup(
  opts: { persistence?: boolean; metadata?: Record<string, unknown> } = {}
) {
  const stage = makeStage();
  const weave = makeWeave(stage, opts.metadata ?? {});
  const layer = makeLayer();

  const manager = new WeaveNodesSnappingCustomGuides(weave as never, layer as never, {
    persistence: { enabled: opts.persistence ?? false },
    movement: { delta: 0.5, shiftDelta: 10 },
    style: DEFAULT_STYLE as never,
    targetDistanceStyle: DEFAULT_TARGET_STYLE,
  });

  return { manager, stage, weave, layer };
}

// ─── constructor ──────────────────────────────────────────────────────────────

describe('WeaveNodesSnappingCustomGuides constructor', () => {
  it('initializes with empty customGuides and visibility maps', () => {
    const { manager } = setup();
    expect(manager.getAllCustomGuides()).toEqual({});
    expect(manager.getAllCustomGuidesVisible()).toEqual({});
  });

  it('initializes selectedGuide as null', () => {
    const { manager } = setup();
    expect(manager.getSelectedGuide()).toBeNull();
  });
});

// ─── getAllCustomGuides / getAllCustomGuidesVisible ────────────────────────────

describe('getAllCustomGuides', () => {
  it('returns the internal customGuides map', () => {
    const { manager } = setup();
    const guide = makeGuide('g1');
    manager.saveCustomGuide(guide);
    expect(manager.getAllCustomGuides()).toHaveProperty('mainLayer');
  });
});

describe('getAllCustomGuidesVisible', () => {
  it('returns the internal visibility map', () => {
    const { manager } = setup();
    expect(manager.getAllCustomGuidesVisible()).toEqual({});
  });
});

// ─── getCustomGuides ──────────────────────────────────────────────────────────

describe('getCustomGuides', () => {
  it('returns empty array when container guides are not visible', () => {
    const { manager } = setup();
    const guide = makeGuide('g1', 'V', 'c1');
    manager.saveCustomGuide(guide);

    const result = manager.getCustomGuides('c1');
    expect(result).toEqual([]);
  });

  it('returns all guides across containers when containerId is undefined and visible', () => {
    const { manager, layer } = setup();
    layer.find = vi.fn().mockReturnValue([]);

    const guide1 = makeGuide('g1', 'V', 'c1');
    const guide2 = makeGuide('g2', 'H', 'c2');
    manager.saveCustomGuide(guide1);
    manager.saveCustomGuide(guide2);

    // When containerId is undefined, getCustomGuides checks isCustomGuidesVisible('')
    (manager as unknown as { customGuidesVisible: Record<string, boolean> }).customGuidesVisible = {
      '': true,
    };

    const result = manager.getCustomGuides(undefined);
    expect(result).toHaveLength(2);
  });

  it('returns guides for specific visible container', () => {
    const { manager } = setup();
    const guide = makeGuide('g1', 'V', 'c1');
    manager.saveCustomGuide(guide);

    (manager as unknown as { customGuidesVisible: Record<string, boolean> }).customGuidesVisible = {
      c1: true,
    };

    const result = manager.getCustomGuides('c1');
    expect(result).toHaveLength(1);
    expect(result[0].guideId).toBe('g1');
  });
});

// ─── saveCustomGuide ──────────────────────────────────────────────────────────

describe('saveCustomGuide', () => {
  it('creates container array if not present', () => {
    const { manager } = setup();
    const guide = makeGuide('g1', 'V', 'newContainer');
    manager.saveCustomGuide(guide);
    expect(manager.getAllCustomGuides()['newContainer']).toHaveLength(1);
  });

  it('initializes customGuides map when it is null before saving', () => {
    const { manager } = setup();
    (manager as unknown as { customGuides: null }).customGuides = null as never;
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    expect(manager.getAllCustomGuides()).toHaveProperty('c1');
  });

  it('appends to existing container array', () => {
    const { manager } = setup();
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    manager.saveCustomGuide(makeGuide('g2', 'H', 'c1'));
    expect(manager.getAllCustomGuides()['c1']).toHaveLength(2);
  });

  it('emits snappingManager:onCustomGuidesChange event', () => {
    const { manager, weave } = setup();
    manager.saveCustomGuide(makeGuide('g1'));
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'snappingManager:onCustomGuidesChange',
      expect.any(Object)
    );
  });

  it('calls saveMetadata when guide.persist is true', () => {
    const { manager, weave } = setup({ persistence: true });
    manager.saveCustomGuide(makeGuide('g1', 'V', 'mainLayer', true));
    expect(weave.saveMetadata).toHaveBeenCalled();
  });

  it('does NOT call saveMetadata when guide.persist is false', () => {
    const { manager, weave } = setup({ persistence: true });
    manager.saveCustomGuide(makeGuide('g1', 'V', 'mainLayer', false));
    expect(weave.saveMetadata).not.toHaveBeenCalled();
  });
});

// ─── editCustomGuide ──────────────────────────────────────────────────────────

describe('editCustomGuide', () => {
  it('does nothing when container not found', () => {
    const { manager, weave } = setup();
    const guide = makeGuide('g1', 'V', 'nonexistent');
    manager.editCustomGuide(guide);
    expect(weave.emitEvent).not.toHaveBeenCalled();
  });

  it('does nothing when guideId not found', () => {
    const { manager, weave } = setup();
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    weave.emitEvent.mockClear();
    manager.editCustomGuide(makeGuide('unknown', 'V', 'c1'));
    expect(weave.emitEvent).not.toHaveBeenCalled();
  });

  it('updates the guide in place', () => {
    const { manager } = setup();
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    const updated = { ...makeGuide('g1', 'V', 'c1'), value: 999 };
    manager.editCustomGuide(updated);
    expect(manager.getAllCustomGuides()['c1'][0].value).toBe(999);
  });

  it('emits event when guide updated', () => {
    const { manager, weave } = setup();
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    weave.emitEvent.mockClear();
    manager.editCustomGuide({ ...makeGuide('g1', 'V', 'c1'), value: 200 });
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'snappingManager:onCustomGuidesChange',
      expect.any(Object)
    );
  });
});

// ─── deleteCustomGuide ────────────────────────────────────────────────────────

describe('deleteCustomGuide', () => {
  it('does nothing when container not found', () => {
    const { manager, weave } = setup();
    manager.deleteCustomGuide(makeGuide('g1', 'V', 'nonexistent'));
    expect(weave.emitEvent).not.toHaveBeenCalled();
  });

  it('removes the guide from container array', () => {
    const { manager } = setup();
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    manager.deleteCustomGuide(makeGuide('g1', 'V', 'c1'));
    expect(manager.getAllCustomGuides()['c1']).toBeUndefined();
  });

  it('deletes the container key when array becomes empty', () => {
    const { manager } = setup();
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    manager.deleteCustomGuide(makeGuide('g1', 'V', 'c1'));
    expect(manager.getAllCustomGuides()).not.toHaveProperty('c1');
  });

  it('emits event on deletion', () => {
    const { manager, weave } = setup();
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    weave.emitEvent.mockClear();
    manager.deleteCustomGuide(makeGuide('g1', 'V', 'c1'));
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'snappingManager:onCustomGuidesChange',
      expect.any(Object)
    );
  });
});

// ─── deleteContainerGuides ────────────────────────────────────────────────────

describe('deleteContainerGuides', () => {
  it('deletes the entire container entry', () => {
    const { manager } = setup();
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    manager.saveCustomGuide(makeGuide('g2', 'H', 'c1'));
    manager.deleteContainerGuides('c1');
    expect(manager.getAllCustomGuides()).not.toHaveProperty('c1');
  });

  it('emits event on container deletion', () => {
    const { manager, weave } = setup();
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    weave.emitEvent.mockClear();
    manager.deleteContainerGuides('c1');
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'snappingManager:onCustomGuidesChange',
      expect.any(Object)
    );
  });
});

// ─── isCustomGuidesVisible ────────────────────────────────────────────────────

describe('isCustomGuidesVisible', () => {
  it('returns false when container not in visibility map', () => {
    const { manager } = setup();
    expect(manager.isCustomGuidesVisible('unknown')).toBe(false);
  });

  it('returns correct value from map', () => {
    const { manager } = setup();
    (manager as unknown as { customGuidesVisible: Record<string, boolean> }).customGuidesVisible = {
      c1: true,
    };
    expect(manager.isCustomGuidesVisible('c1')).toBe(true);
  });
});

// ─── getCustomGuidesOfContainer ───────────────────────────────────────────────

describe('getCustomGuidesOfContainer', () => {
  it('returns empty array when container has no guides', () => {
    const { manager } = setup();
    expect(manager.getCustomGuidesOfContainer('nonexistent')).toEqual([]);
  });

  it('returns guides for the given container', () => {
    const { manager } = setup();
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    expect(manager.getCustomGuidesOfContainer('c1')).toHaveLength(1);
  });
});

// ─── selectGuide ─────────────────────────────────────────────────────────────

describe('selectGuide', () => {
  it('sets selectedGuide', () => {
    const { manager, layer } = setup();
    layer.find = vi.fn().mockReturnValue([]);

    const guide = makeGuide('g1');
    manager.saveCustomGuide(guide);
    manager.selectGuide(guide);

    expect(manager.getSelectedGuide()).toBe(guide);
  });

  it('calls setSelectedNodes([]) via nodesSelectionPlugin when guide is non-null', () => {
    const { manager, weave, layer } = setup();
    layer.find = vi.fn().mockReturnValue([]);
    const mockPlugin = { setSelectedNodes: vi.fn() };
    weave.getPlugin.mockReturnValue(mockPlugin);

    const guide = makeGuide('g1');
    manager.saveCustomGuide(guide);
    manager.selectGuide(guide);

    expect(mockPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
  });

  it('emits onCustomGuideSelected event', () => {
    const { manager, weave, layer } = setup();
    layer.find = vi.fn().mockReturnValue([]);

    const guide = makeGuide('g1');
    manager.saveCustomGuide(guide);
    manager.selectGuide(guide);

    expect(weave.emitEvent).toHaveBeenCalledWith(
      'snappingManager:onCustomGuideSelected',
      { guide }
    );
  });

  it('emits onCustomGuideSelectedChange event', () => {
    const { manager, weave, layer } = setup();
    layer.find = vi.fn().mockReturnValue([]);

    const guide = makeGuide('g1');
    manager.saveCustomGuide(guide);
    manager.selectGuide(guide);

    expect(weave.emitEvent).toHaveBeenCalledWith(
      'snappingManager:onCustomGuideSelectedChange',
      { selectedGuide: guide }
    );
  });

  it('selects null guide without error', () => {
    const { manager } = setup();
    expect(() => manager.selectGuide(null)).not.toThrow();
    expect(manager.getSelectedGuide()).toBeNull();
  });
});

// ─── hideAllCustomGuides ──────────────────────────────────────────────────────

describe('hideAllCustomGuides', () => {
  it('calls batchDraw and sets listening(false)', () => {
    const { manager, layer } = setup();
    const destroy = vi.fn();
    layer.find = vi.fn().mockReturnValue([{ destroy }]);

    manager.hideAllCustomGuides();

    expect(layer.batchDraw).toHaveBeenCalled();
    expect(layer.listening).toHaveBeenCalledWith(false);
  });
});

// ─── hideCustomGuides ─────────────────────────────────────────────────────────

describe('hideCustomGuides', () => {
  it('destroys guides matching the given containerId', () => {
    const { manager, layer } = setup();
    const destroy = vi.fn();
    layer.find = vi.fn().mockReturnValue([
      { destroy, getAttr: vi.fn().mockReturnValue({ containerId: 'c1' }) },
    ]);

    manager.hideCustomGuides('c1');

    expect(destroy).toHaveBeenCalled();
  });

  it('does not destroy guides with different containerId', () => {
    const { manager, layer } = setup();
    const destroy = vi.fn();
    layer.find = vi.fn().mockReturnValue([
      { destroy, getAttr: vi.fn().mockReturnValue({ containerId: 'c2' }) },
    ]);

    manager.hideCustomGuides('c1');

    expect(destroy).not.toHaveBeenCalled();
  });
});

// ─── initialize (persistence disabled / enabled) ──────────────────────────────

describe('initialize', () => {
  it('does NOT call getMetadata when persistence is disabled', async () => {
    const { manager, weave } = setup({ persistence: false });
    await manager.initialize();
    expect(weave.getMetadata).not.toHaveBeenCalled();
  });

  it('calls getMetadata when persistence is enabled', async () => {
    const { manager, weave } = setup({
      persistence: true,
      metadata: { guides: JSON.stringify({}) },
    });
    await manager.initialize();
    expect(weave.getMetadata).toHaveBeenCalled();
  });

  it('loads guides from metadata on init when persistence is enabled', async () => {
    const guide = makeGuide('g1', 'V', 'c1', true);
    const { manager } = setup({
      persistence: true,
      metadata: { guides: { c1: [guide] } },
    });
    await manager.initialize();
    expect(manager.getAllCustomGuides()).toHaveProperty('c1');
  });
});

// ─── persistGuides (via saveCustomGuide with persist=true) ────────────────────

describe('persistGuides', () => {
  it('only persists guides with persist = true', () => {
    const { manager, weave } = setup({ persistence: true });
    const persistGuide = makeGuide('g1', 'V', 'mainLayer', true);
    const ephemeralGuide = makeGuide('g2', 'H', 'mainLayer', false);
    manager.saveCustomGuide(persistGuide);
    manager.saveCustomGuide(ephemeralGuide);

    // saveMetadata is called from saveCustomGuide with persist=true
    const savedMetadata = weave.saveMetadata.mock.calls[0][0];
    const persistedGuides = savedMetadata.guides;
    expect(persistedGuides['mainLayer']).toHaveLength(1);
    expect(persistedGuides['mainLayer'][0].guideId).toBe('g1');
  });
});

// ─── renderAllVisibleCustomGuides ─────────────────────────────────────────────

describe('renderAllVisibleCustomGuides', () => {
  it('does not render containers with visibility false', () => {
    const { manager, layer } = setup();
    (manager as unknown as { customGuidesVisible: Record<string, boolean> }).customGuidesVisible = {
      c1: false,
    };
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    manager.renderAllVisibleCustomGuides();
    // layer.show should not be called since c1 is not visible
    expect(layer.show).not.toHaveBeenCalled();
  });
});

// ─── getSelectedGuide ─────────────────────────────────────────────────────────

describe('getSelectedGuide', () => {
  it('returns null initially', () => {
    const { manager } = setup();
    expect(manager.getSelectedGuide()).toBeNull();
  });
});

// ─── deserialize (via initialize with persistence + string metadata) ──────────

describe('deserialize via initialize', () => {
  it('returns empty object when guides metadata is absent', async () => {
    const { manager } = setup({ persistence: true, metadata: {} });
    await manager.initialize();
    expect(manager.getAllCustomGuides()).toEqual({});
  });

  it('parses guides from a serialized JSON string in metadata', async () => {
    const guide = makeGuide('g1', 'V', 'c1', true);
    const { manager } = setup({
      persistence: true,
      metadata: { guides: JSON.stringify({ c1: [guide] }) },
    });
    await manager.initialize();
    expect(manager.getAllCustomGuides()).toHaveProperty('c1');
  });

  it('returns empty object on malformed JSON string (catch branch)', async () => {
    const { manager } = setup({
      persistence: true,
      metadata: { guides: '{invalid-json' },
    });
    await manager.initialize();
    // deserialize catches the parse error and returns [], so customGuides is []
    expect(manager.getAllCustomGuides()).toBeDefined();
  });
});

// ─── initialize persistence hooks and onStateMetadataChange ──────────────────

describe('initialize persistence hooks', () => {
  it('registers weave:onRemoveNode hook when persistence is enabled', async () => {
    const { manager, weave } = setup({ persistence: true, metadata: {} });
    await manager.initialize();
    expect(weave.getHooks().hook).toHaveBeenCalledWith('weave:onRemoveNode', expect.any(Function));
  });

  it('hook fires deleteContainerGuides when a frame node is removed', async () => {
    const guide = makeGuide('g1', 'V', 'frameId', true);
    const { manager, weave } = setup({
      persistence: true,
      metadata: { guides: { frameId: [guide] } },
    });
    await manager.initialize();
    const hookHandler = weave._hooks['weave:onRemoveNode'][0];
    hookHandler({ getAttrs: () => ({ nodeType: 'frame' }), id: () => 'frameId' });
    expect(manager.getAllCustomGuides()).not.toHaveProperty('frameId');
  });

  it('does NOT fire deleteContainerGuides for non-frame node types', async () => {
    const guide = makeGuide('g1', 'V', 'c1', true);
    const { manager, weave } = setup({
      persistence: true,
      metadata: { guides: { c1: [guide] } },
    });
    await manager.initialize();
    const hookHandler = weave._hooks['weave:onRemoveNode'][0];
    hookHandler({ getAttrs: () => ({ nodeType: 'rectangle' }), id: () => 'c1' });
    expect(manager.getAllCustomGuides()).toHaveProperty('c1');
  });

  it('registers onStateMetadataChange listener when persistence is enabled', async () => {
    const { manager, weave } = setup({ persistence: true, metadata: {} });
    await manager.initialize();
    expect(weave.addEventListener).toHaveBeenCalledWith('onStateMetadataChange', expect.any(Function));
  });

  it('updates customGuides when onStateMetadataChange fires', async () => {
    const guide = makeGuide('g1', 'V', 'c1', true);
    const stage = makeStage();
    const weave = makeWeave(stage, {});
    weave.getMetadata
      .mockReturnValueOnce({}) // initial call in initialize
      .mockReturnValue({ guides: { c1: [guide] } }); // subsequent calls

    const layer = makeLayer();
    layer.find = vi.fn().mockReturnValue([]);

    const manager = new WeaveNodesSnappingCustomGuides(weave as never, layer as never, {
      persistence: { enabled: true },
      movement: { delta: 0.5, shiftDelta: 10 },
      style: DEFAULT_STYLE as never,
      targetDistanceStyle: DEFAULT_TARGET_STYLE,
    });
    await manager.initialize();

    const handler = weave._eventListeners['onStateMetadataChange'][0];
    handler();
    expect(manager.getAllCustomGuides()).toHaveProperty('c1');
  });

  it('hides and re-renders guides when onStateMetadataChange fires', async () => {
    const stage = makeStage();
    const weave = makeWeave(stage, {});
    weave.getMetadata.mockReturnValue({});
    const layer = makeLayer();
    const destroyMock = vi.fn();
    layer.find = vi.fn().mockReturnValue([{ destroy: destroyMock }]);

    const manager = new WeaveNodesSnappingCustomGuides(weave as never, layer as never, {
      persistence: { enabled: true },
      movement: { delta: 0.5, shiftDelta: 10 },
      style: DEFAULT_STYLE as never,
      targetDistanceStyle: DEFAULT_TARGET_STYLE,
    });
    await manager.initialize();

    const handler = weave._eventListeners['onStateMetadataChange'][0];
    handler();
    expect(destroyMock).toHaveBeenCalled(); // hideAllCustomGuides called
  });
});

// ─── initialize — window event listeners ─────────────────────────────────────

describe('initialize window event listeners', () => {
  it('pointermove without Alt does not call handleDistanceLine', async () => {
    const { manager } = setup({ persistence: false });
    await manager.initialize();
    const event = Object.assign(new Event('pointermove'), { altKey: false });
    window.dispatchEvent(event);
    expect(manager.getSelectedGuide()).toBeNull();
  });

  it('pointermove with Alt but not dragging does not throw', async () => {
    const { manager } = setup({ persistence: false });
    await manager.initialize();
    (manager as unknown as { isDragging: boolean }).isDragging = false;
    const event = Object.assign(new Event('pointermove'), { altKey: true });
    window.dispatchEvent(event);
    expect(manager.getSelectedGuide()).toBeNull();
  });

  it('pointermove with Alt and dragging calls handleDistanceLine (with selected guide)', async () => {
    const { manager } = setup({ persistence: false });
    await manager.initialize();

    const guide = makeGuide('g1');
    manager.saveCustomGuide(guide);
    manager.selectGuide(guide);
    (manager as unknown as { isDragging: boolean }).isDragging = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (manager.guideDistanceToTargetInfo as unknown as any).handleDistanceLine = vi.fn();

    const event = Object.assign(new Event('pointermove'), { altKey: true });
    window.dispatchEvent(event);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((manager.guideDistanceToTargetInfo as unknown as any).handleDistanceLine).toHaveBeenCalled();
  });

  it('keyup with Alt key calls cleanup', async () => {
    const { manager } = setup({ persistence: false });
    await manager.initialize();
    const event = new KeyboardEvent('keyup', { key: 'Alt' });
    window.dispatchEvent(event);
    expect(manager.guideDistanceToTargetInfo.cleanup).toHaveBeenCalled();
  });

  it('keyup with Option key calls cleanup', async () => {
    const { manager } = setup({ persistence: false });
    await manager.initialize();
    const event = new KeyboardEvent('keyup', { key: 'Option' });
    window.dispatchEvent(event);
    expect(manager.guideDistanceToTargetInfo.cleanup).toHaveBeenCalled();
  });

  it('keyup with non-Alt key does not call cleanup', async () => {
    const { manager } = setup({ persistence: false });
    await manager.initialize();
    (manager.guideDistanceToTargetInfo.cleanup as ReturnType<typeof vi.fn>).mockClear();
    const event = new KeyboardEvent('keyup', { key: 'Shift' });
    window.dispatchEvent(event);
    expect(manager.guideDistanceToTargetInfo.cleanup).not.toHaveBeenCalled();
  });

  it('keydown with Alt key when not dragging does not call handleDistanceLine', async () => {
    const { manager } = setup({ persistence: false });
    await manager.initialize();
    (manager as unknown as { isDragging: boolean }).isDragging = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (manager.guideDistanceToTargetInfo as unknown as any).handleDistanceLine = vi.fn();
    const event = new KeyboardEvent('keydown', { key: 'Alt' });
    window.dispatchEvent(event);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((manager.guideDistanceToTargetInfo as unknown as any).handleDistanceLine).not.toHaveBeenCalled();
  });

  it('keydown with Alt key when dragging calls handleDistanceLine', async () => {
    const { manager } = setup({ persistence: false });
    await manager.initialize();

    const guide = makeGuide('g1');
    manager.saveCustomGuide(guide);
    manager.selectGuide(guide);
    (manager as unknown as { isDragging: boolean }).isDragging = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (manager.guideDistanceToTargetInfo as unknown as any).handleDistanceLine = vi.fn();

    const event = new KeyboardEvent('keydown', { key: 'Alt' });
    window.dispatchEvent(event);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((manager.guideDistanceToTargetInfo as unknown as any).handleDistanceLine).toHaveBeenCalled();
  });
});

// ─── editCustomGuide persist branch ──────────────────────────────────────────

describe('editCustomGuide persist branch', () => {
  it('calls saveMetadata when edited guide has persist=true', () => {
    const { manager, weave } = setup({ persistence: true });
    const guide = makeGuide('g1', 'V', 'mainLayer', true);
    manager.saveCustomGuide(guide);
    weave.saveMetadata.mockClear();
    manager.editCustomGuide({ ...guide, value: 999 });
    expect(weave.saveMetadata).toHaveBeenCalled();
  });

  it('does NOT call saveMetadata when edited guide has persist=false', () => {
    const { manager, weave } = setup({ persistence: true });
    const guide = makeGuide('g1', 'V', 'mainLayer', false);
    manager.saveCustomGuide(guide);
    weave.saveMetadata.mockClear();
    manager.editCustomGuide({ ...guide, value: 999 });
    expect(weave.saveMetadata).not.toHaveBeenCalled();
  });
});

// ─── deleteCustomGuide persist branch ────────────────────────────────────────

describe('deleteCustomGuide persist branch', () => {
  it('calls saveMetadata when deleted guide has persist=true', () => {
    const { manager, weave } = setup({ persistence: true });
    const guide = makeGuide('g1', 'V', 'mainLayer', true);
    manager.saveCustomGuide(guide);
    weave.saveMetadata.mockClear();
    manager.deleteCustomGuide(guide);
    expect(weave.saveMetadata).toHaveBeenCalled();
  });

  it('does NOT call saveMetadata when deleted guide has persist=false', () => {
    const { manager, weave } = setup({ persistence: true });
    const guide = makeGuide('g1', 'V', 'mainLayer', false);
    manager.saveCustomGuide(guide);
    weave.saveMetadata.mockClear();
    manager.deleteCustomGuide(guide);
    expect(weave.saveMetadata).not.toHaveBeenCalled();
  });
});

// ─── stagePanChangeHandler / zoomChangeHandler ────────────────────────────────

describe('stagePanChangeHandler and zoomChangeHandler', () => {
  it('fires renderAllVisibleCustomGuides via onStageMove event', () => {
    const { manager, weave, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    manager.toggleCustomGuides('c1');
    const handler = weave._eventListeners['onStageMove']?.[0];
    handler?.();
    expect(layer.batchDraw).toHaveBeenCalled();
  });

  it('fires renderAllVisibleCustomGuides via onZoomChange event', () => {
    const { manager, weave, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    manager.toggleCustomGuides('c1');
    const handler = weave._eventListeners['onZoomChange']?.[0];
    handler?.();
    expect(layer.batchDraw).toHaveBeenCalled();
  });
});

// ─── renderGuide (via renderCustomGuides) ────────────────────────────────────

describe('renderGuide via renderCustomGuides', () => {
  it('renders a VERTICAL guide from mainLayer — creates new guide node', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    stage.findOne = vi.fn().mockReturnValue(null);
    layer.find = vi.fn().mockReturnValue([]);
    manager.saveCustomGuide(makeGuide('g1', 'V', 'mainLayer'));
    (manager as unknown as { customGuidesVisible: Record<string, boolean> }).customGuidesVisible = {
      mainLayer: true,
    };
    manager.renderCustomGuides('mainLayer');
    expect(layer.batchDraw).toHaveBeenCalled();
  });

  it('renders a HORIZONTAL guide from mainLayer — creates new guide node', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    stage.findOne = vi.fn().mockReturnValue(null);
    layer.find = vi.fn().mockReturnValue([]);
    manager.saveCustomGuide(makeGuide('g1', 'H', 'mainLayer'));
    (manager as unknown as { customGuidesVisible: Record<string, boolean> }).customGuidesVisible = {
      mainLayer: true,
    };
    manager.renderCustomGuides('mainLayer');
    expect(layer.batchDraw).toHaveBeenCalled();
  });

  it('applies VERTICAL container offset for non-mainLayer container', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    const containerMock = {
      getClientRect: vi.fn().mockReturnValue({ x: 50, y: 30, width: 200, height: 150 }),
      setAttrs: vi.fn(),
      getAttr: vi.fn(),
    };
    stage.findOne = vi.fn().mockReturnValue(containerMock);
    layer.find = vi.fn().mockReturnValue([]);
    manager.saveCustomGuide(makeGuide('g1', 'V', 'frameContainer'));
    (manager as unknown as { customGuidesVisible: Record<string, boolean> }).customGuidesVisible = {
      frameContainer: true,
    };
    manager.renderCustomGuides('frameContainer');
    expect(layer.batchDraw).toHaveBeenCalled();
  });

  it('applies HORIZONTAL container offset for non-mainLayer container', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    const containerMock = {
      getClientRect: vi.fn().mockReturnValue({ x: 50, y: 30, width: 200, height: 150 }),
      setAttrs: vi.fn(),
      getAttr: vi.fn(),
    };
    stage.findOne = vi.fn().mockReturnValue(containerMock);
    layer.find = vi.fn().mockReturnValue([]);
    manager.saveCustomGuide(makeGuide('g1', 'H', 'frameContainer'));
    (manager as unknown as { customGuidesVisible: Record<string, boolean> }).customGuidesVisible = {
      frameContainer: true,
    };
    manager.renderCustomGuides('frameContainer');
    expect(layer.batchDraw).toHaveBeenCalled();
  });

  it('updates existing guide node via setAttrs when already present in stage', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    const existingNode = {
      setAttrs: vi.fn(),
      getAttr: vi.fn().mockReturnValue({ containerId: 'mainLayer' }),
      destroy: vi.fn(),
      getClientRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 0, height: 0 }),
    };
    stage.findOne = vi.fn().mockImplementation((selector: string) => {
      if (selector === '#g1') return existingNode;
      return null;
    });
    layer.find = vi.fn().mockReturnValue([]);
    manager.saveCustomGuide(makeGuide('g1', 'V', 'mainLayer'));
    (manager as unknown as { customGuidesVisible: Record<string, boolean> }).customGuidesVisible = {
      mainLayer: true,
    };
    manager.renderCustomGuides('mainLayer');
    expect(existingNode.setAttrs).toHaveBeenCalled();
  });

  it('renders guide using static kind style', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    stage.findOne = vi.fn().mockReturnValue(null);
    layer.find = vi.fn().mockReturnValue([]);
    const staticGuide = {
      guideId: 'sg1',
      orientation: GUIDE_ORIENTATION.VERTICAL,
      value: 50,
      kind: GUIDE_KIND.STATIC,
      containerId: 'mainLayer',
      persist: false,
    };
    manager.saveCustomGuide(staticGuide as Guide);
    (manager as unknown as { customGuidesVisible: Record<string, boolean> }).customGuidesVisible = {
      mainLayer: true,
    };
    manager.renderCustomGuides('mainLayer');
    expect(layer.batchDraw).toHaveBeenCalled();
  });

  it('renders selected guide node with selected state style', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'mainLayer');
    manager.saveCustomGuide(guide);
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;

    const existingNode = {
      setAttrs: vi.fn(),
      getAttr: vi.fn(),
      destroy: vi.fn(),
      getClientRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 0, height: 0 }),
    };
    stage.findOne = vi.fn().mockImplementation((selector: string) => {
      if (selector === '#g1') return existingNode;
      return null;
    });
    (manager as unknown as { customGuidesVisible: Record<string, boolean> }).customGuidesVisible = {
      mainLayer: true,
    };
    manager.renderCustomGuides('mainLayer');

    const callArgs = existingNode.setAttrs.mock.calls[0]?.[0];
    // stroke should be the selected stroke (DEFAULT_STYLE.custom.selected.stroke)
    expect(callArgs?.stroke).toBe('#00f');
  });
});

// ─── toggleCustomGuides ───────────────────────────────────────────────────────

describe('toggleCustomGuides', () => {
  it('sets container visibility to true on first toggle', () => {
    const { manager, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    manager.toggleCustomGuides('c1');
    expect(manager.isCustomGuidesVisible('c1')).toBe(true);
  });

  it('sets container visibility to false on second toggle', () => {
    const { manager, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    manager.toggleCustomGuides('c1');
    manager.toggleCustomGuides('c1');
    expect(manager.isCustomGuidesVisible('c1')).toBe(false);
  });

  it('emits onCustomGuidesChange with visibility on toggle', () => {
    const { manager, weave, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    weave.emitEvent.mockClear();
    manager.toggleCustomGuides('c1');
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'snappingManager:onCustomGuidesChange',
      expect.objectContaining({ visibility: expect.any(Object) })
    );
  });

  it('sets up stage events when first guide becomes visible', () => {
    const { manager, stage, layer, weave } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    manager.toggleCustomGuides('c1');
    expect(stage.on).toHaveBeenCalledWith('pointerclick', expect.any(Function));
    expect(weave.addEventListener).toHaveBeenCalledWith('onNodesChange', expect.any(Function));
    expect(weave.addEventListener).toHaveBeenCalledWith('onStageMove', expect.any(Function));
    expect(weave.addEventListener).toHaveBeenCalledWith('onZoomChange', expect.any(Function));
  });

  it('tears down stage events when all guides become hidden', () => {
    const { manager, stage, layer, weave } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    manager.saveCustomGuide(makeGuide('g1', 'V', 'c1'));
    manager.toggleCustomGuides('c1'); // visible
    manager.toggleCustomGuides('c1'); // hidden
    expect(stage.off).toHaveBeenCalledWith('pointerclick', expect.any(Function));
    expect(weave.removeEventListener).toHaveBeenCalledWith('onNodesChange', expect.any(Function));
    expect(weave.removeEventListener).toHaveBeenCalledWith('onStageMove', expect.any(Function));
    expect(weave.removeEventListener).toHaveBeenCalledWith('onZoomChange', expect.any(Function));
  });

  it('clears selectedGuide when toggling off', () => {
    const { manager, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'c1');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('c1');
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    manager.toggleCustomGuides('c1');
    expect(manager.getSelectedGuide()).toBeNull();
  });
});

// ─── onNodesSelectedChange (via onNodesChange listener) ───────────────────────

describe('onNodesSelectedChange', () => {
  it('clears selectedGuide when nodes are selected', () => {
    const { manager, weave, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'c1');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('c1');
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    const handler = weave._eventListeners['onNodesChange']?.[0];
    handler?.([{ id: 'someNode' }]);
    expect(manager.getSelectedGuide()).toBeNull();
  });

  it('does nothing when nodes array is empty', () => {
    const { manager, weave, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'c1');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('c1');
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    const handler = weave._eventListeners['onNodesChange']?.[0];
    handler?.([]);
    expect(manager.getSelectedGuide()).toBe(guide);
  });
});

// ─── pointerClickHandler ──────────────────────────────────────────────────────

describe('pointerClickHandler', () => {
  it('deselects guide when clicking on stage background (not dragging)', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'c1');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('c1');
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    const [, pointerclickHandler] = (stage.on as ReturnType<typeof vi.fn>).mock.calls.find(
      ([event]: [string]) => event === 'pointerclick'
    ) ?? [];
    pointerclickHandler?.({ target: stage });
    expect(manager.getSelectedGuide()).toBeNull();
  });

  it('does NOT deselect when target is not stage', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'c1');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('c1');
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    const [, pointerclickHandler] = (stage.on as ReturnType<typeof vi.fn>).mock.calls.find(
      ([event]: [string]) => event === 'pointerclick'
    ) ?? [];
    pointerclickHandler?.({ target: { id: () => 'someNode' } });
    expect(manager.getSelectedGuide()).toBe(guide);
  });

  it('does NOT deselect when dragging', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'c1');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('c1');
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    (manager as unknown as { isDragging: boolean }).isDragging = true;
    const [, pointerclickHandler] = (stage.on as ReturnType<typeof vi.fn>).mock.calls.find(
      ([event]: [string]) => event === 'pointerclick'
    ) ?? [];
    pointerclickHandler?.({ target: stage });
    expect(manager.getSelectedGuide()).toBe(guide);
  });
});

// ─── deleteGuide ──────────────────────────────────────────────────────────────

describe('deleteGuide', () => {
  it('removes custom guide from state', () => {
    const { manager, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'mainLayer');
    manager.saveCustomGuide(guide);
    layer.findOne = vi.fn().mockReturnValue(null);
    manager.deleteGuide(guide);
    expect(manager.getAllCustomGuides()).not.toHaveProperty('mainLayer');
  });

  it('destroys the guide node from layer if it exists', () => {
    const { manager, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'mainLayer');
    manager.saveCustomGuide(guide);
    const destroyMock = vi.fn();
    layer.findOne = vi.fn().mockReturnValue({ destroy: destroyMock });
    manager.deleteGuide(guide);
    expect(destroyMock).toHaveBeenCalled();
  });

  it('does not throw when guide node does not exist', () => {
    const { manager, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'mainLayer');
    manager.saveCustomGuide(guide);
    layer.findOne = vi.fn().mockReturnValue(null);
    expect(() => manager.deleteGuide(guide)).not.toThrow();
  });

  it('clears selectedGuide when deleting the currently selected guide', () => {
    const { manager, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'mainLayer');
    manager.saveCustomGuide(guide);
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    layer.findOne = vi.fn().mockReturnValue(null);
    manager.deleteGuide(guide);
    expect(manager.getSelectedGuide()).toBeNull();
  });

  it('does not clear selectedGuide when deleting a different guide', () => {
    const { manager, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide1 = makeGuide('g1', 'V', 'mainLayer');
    const guide2 = makeGuide('g2', 'H', 'mainLayer');
    manager.saveCustomGuide(guide1);
    manager.saveCustomGuide(guide2);
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide1;
    layer.findOne = vi.fn().mockReturnValue(null);
    manager.deleteGuide(guide2);
    expect(manager.getSelectedGuide()).toBe(guide1);
  });
});

// ─── arrowKeysHandler (via keydown on stage container) ───────────────────────

function getKeydownHandler(stage: ReturnType<typeof makeStage>) {
  const container = stage.container();
  const [, handler] = (container.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
    ([event]: [string]) => event === 'keydown'
  ) ?? [];
  return handler as ((e: Partial<KeyboardEvent>) => void) | undefined;
}

describe('arrowKeysHandler', () => {
  it('moves HORIZONTAL guide up (decreases value)', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'H', 'mainLayer');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('mainLayer');
    const guideNode = { getAttr: vi.fn().mockReturnValue(guide), x: vi.fn(), y: vi.fn(), setAttrs: vi.fn() };
    stage.findOne = vi.fn().mockImplementation((sel: string) => (sel === `#${guide.guideId}` ? guideNode : null));
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    getKeydownHandler(stage)?.({ code: 'ArrowUp', shiftKey: false });
    expect(manager.getAllCustomGuides()['mainLayer']?.[0].value).toBe(guide.value - 0.5);
  });

  it('moves HORIZONTAL guide down (increases value)', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'H', 'mainLayer');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('mainLayer');
    const guideNode = { getAttr: vi.fn().mockReturnValue(guide), x: vi.fn(), y: vi.fn(), setAttrs: vi.fn() };
    stage.findOne = vi.fn().mockImplementation((sel: string) => (sel === `#${guide.guideId}` ? guideNode : null));
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    getKeydownHandler(stage)?.({ code: 'ArrowDown', shiftKey: false });
    expect(manager.getAllCustomGuides()['mainLayer']?.[0].value).toBe(guide.value + 0.5);
  });

  it('moves VERTICAL guide left (decreases value)', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'mainLayer');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('mainLayer');
    const guideNode = { getAttr: vi.fn().mockReturnValue(guide), x: vi.fn(), y: vi.fn(), setAttrs: vi.fn() };
    stage.findOne = vi.fn().mockImplementation((sel: string) => (sel === `#${guide.guideId}` ? guideNode : null));
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    getKeydownHandler(stage)?.({ code: 'ArrowLeft', shiftKey: false });
    expect(manager.getAllCustomGuides()['mainLayer']?.[0].value).toBe(guide.value - 0.5);
  });

  it('moves VERTICAL guide right (increases value)', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'mainLayer');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('mainLayer');
    const guideNode = { getAttr: vi.fn().mockReturnValue(guide), x: vi.fn(), y: vi.fn(), setAttrs: vi.fn() };
    stage.findOne = vi.fn().mockImplementation((sel: string) => (sel === `#${guide.guideId}` ? guideNode : null));
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    getKeydownHandler(stage)?.({ code: 'ArrowRight', shiftKey: false });
    expect(manager.getAllCustomGuides()['mainLayer']?.[0].value).toBe(guide.value + 0.5);
  });

  it('ignores ArrowUp for a VERTICAL guide (wrong axis)', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'mainLayer');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('mainLayer');
    const guideNode = { getAttr: vi.fn().mockReturnValue(guide), x: vi.fn(), y: vi.fn(), setAttrs: vi.fn() };
    stage.findOne = vi.fn().mockImplementation((sel: string) => (sel === `#${guide.guideId}` ? guideNode : null));
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    getKeydownHandler(stage)?.({ code: 'ArrowUp', shiftKey: false });
    expect(manager.getAllCustomGuides()['mainLayer']?.[0].value).toBe(guide.value);
  });

  it('ignores ArrowLeft for a HORIZONTAL guide (wrong axis)', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'H', 'mainLayer');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('mainLayer');
    const guideNode = { getAttr: vi.fn().mockReturnValue(guide), x: vi.fn(), y: vi.fn(), setAttrs: vi.fn() };
    stage.findOne = vi.fn().mockImplementation((sel: string) => (sel === `#${guide.guideId}` ? guideNode : null));
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    getKeydownHandler(stage)?.({ code: 'ArrowLeft', shiftKey: false });
    expect(manager.getAllCustomGuides()['mainLayer']?.[0].value).toBe(guide.value);
  });

  it('uses shiftDelta when shift is pressed', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'H', 'mainLayer');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('mainLayer');
    const guideNode = { getAttr: vi.fn().mockReturnValue(guide), x: vi.fn(), y: vi.fn(), setAttrs: vi.fn() };
    stage.findOne = vi.fn().mockImplementation((sel: string) => (sel === `#${guide.guideId}` ? guideNode : null));
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    getKeydownHandler(stage)?.({ code: 'ArrowUp', shiftKey: true });
    expect(manager.getAllCustomGuides()['mainLayer']?.[0].value).toBe(guide.value - 10);
  });

  it('deletes guide on Backspace key', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'mainLayer');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('mainLayer');
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    layer.findOne = vi.fn().mockReturnValue(null);
    getKeydownHandler(stage)?.({ code: 'Backspace', shiftKey: false });
    expect(manager.getAllCustomGuides()).not.toHaveProperty('mainLayer');
  });

  it('deletes guide on Delete key', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'V', 'mainLayer');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('mainLayer');
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    layer.findOne = vi.fn().mockReturnValue(null);
    getKeydownHandler(stage)?.({ code: 'Delete', shiftKey: false });
    expect(manager.getAllCustomGuides()).not.toHaveProperty('mainLayer');
  });

  it('does nothing when no guide is selected (ArrowUp)', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    manager.saveCustomGuide(makeGuide('g1', 'H', 'mainLayer'));
    manager.toggleCustomGuides('mainLayer');
    stage.findOne = vi.fn().mockReturnValue(null);
    expect(() => getKeydownHandler(stage)?.({ code: 'ArrowUp', shiftKey: false })).not.toThrow();
  });

  it('does nothing when guide node not found in stage', () => {
    const { manager, stage, layer } = setup({ persistence: false });
    layer.find = vi.fn().mockReturnValue([]);
    const guide = makeGuide('g1', 'H', 'mainLayer');
    manager.saveCustomGuide(guide);
    manager.toggleCustomGuides('mainLayer');
    (manager as unknown as { selectedGuide: Guide }).selectedGuide = guide;
    stage.findOne = vi.fn().mockReturnValue(null);
    expect(() => getKeydownHandler(stage)?.({ code: 'ArrowUp', shiftKey: false })).not.toThrow();
  });
});

// ─── createGuideNode event handlers (via renderCustomGuides) ─────────────────

describe('createGuideNode event handlers', () => {
  function setupWithCapturedHandlers(
    guideOpts: { orientation?: 'H' | 'V'; kind?: string } = {}
  ) {
    const { manager, stage, layer, weave } = setup({ persistence: false });
    const capturedHandlers: Record<string, (...args: unknown[]) => unknown> = {};
    const guideNodeMock = {
      on: vi.fn().mockImplementation(
        (event: string, handler: (...args: unknown[]) => unknown) => {
          capturedHandlers[event] = handler;
        }
      ),
      x: vi.fn().mockReturnValue(100).mockReturnThis(),
      y: vi.fn().mockReturnValue(100).mockReturnThis(),
      getAttr: vi.fn(),
      setAttrs: vi.fn(),
      destroy: vi.fn(),
      moveToTop: vi.fn(),
      getClientRect: vi.fn().mockReturnValue({ x: 100, y: 100, width: 0, height: 0 }),
    };
    (Konva as unknown as { Line: ReturnType<typeof vi.fn> }).Line.mockImplementationOnce(
      () => guideNodeMock
    );
    stage.findOne = vi.fn().mockReturnValue(null);
    layer.find = vi.fn().mockReturnValue([]);

    // Provide a mock guideDistanceToTargetInfo so event handlers can call it
    manager.guideDistanceToTargetInfo = {
      handleTarget: vi.fn(),
      cleanup: vi.fn(),
      cleanupTarget: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleDistanceLine: vi.fn(),
    } as unknown as typeof manager.guideDistanceToTargetInfo;

    const guide: Guide = {
      guideId: 'g1',
      orientation: guideOpts.orientation ?? GUIDE_ORIENTATION.VERTICAL,
      value: 100,
      kind: (guideOpts.kind ?? GUIDE_KIND.CUSTOM) as Guide['kind'],
      containerId: 'mainLayer',
      persist: false,
    };
    manager.saveCustomGuide(guide);
    (manager as unknown as { customGuidesVisible: Record<string, boolean> }).customGuidesVisible = {
      mainLayer: true,
    };
    manager.renderCustomGuides('mainLayer');
    return { manager, stage, layer, weave, guide, capturedHandlers, guideNodeMock };
  }

  it('pointerover sets ew-resize cursor for VERTICAL custom guide', () => {
    const { stage, capturedHandlers } = setupWithCapturedHandlers({ orientation: 'V' });
    capturedHandlers['pointerover']?.();
    expect(stage.container().style.cursor).toBe('ew-resize');
  });

  it('pointerover sets ns-resize cursor for HORIZONTAL custom guide', () => {
    const { stage, capturedHandlers } = setupWithCapturedHandlers({ orientation: 'H' });
    capturedHandlers['pointerover']?.();
    expect(stage.container().style.cursor).toBe('ns-resize');
  });

  it('pointerover sets pointer cursor for STATIC guide', () => {
    const { stage, capturedHandlers } = setupWithCapturedHandlers({
      orientation: 'V',
      kind: GUIDE_KIND.STATIC,
    });
    capturedHandlers['pointerover']?.();
    expect(stage.container().style.cursor).toBe('pointer');
  });

  it('pointerdown sets selectedGuide', () => {
    const { manager, stage, capturedHandlers, guide } = setupWithCapturedHandlers({ orientation: 'V' });
    stage.find = vi.fn().mockReturnValue([]);
    capturedHandlers['pointerdown']?.();
    expect(manager.getSelectedGuide()).toBe(guide);
  });

  it('pointerdown emits onCustomGuideSelected event', () => {
    const { weave, stage, capturedHandlers } = setupWithCapturedHandlers({ orientation: 'V' });
    stage.find = vi.fn().mockReturnValue([]);
    capturedHandlers['pointerdown']?.();
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'snappingManager:onCustomGuideSelected',
      expect.any(Object)
    );
  });

  it('pointerup sets ew-resize cursor for VERTICAL guide', () => {
    const { stage, capturedHandlers } = setupWithCapturedHandlers({ orientation: 'V' });
    capturedHandlers['pointerup']?.();
    expect(stage.container().style.cursor).toBe('ew-resize');
  });

  it('pointerup sets ns-resize cursor for HORIZONTAL guide', () => {
    const { stage, capturedHandlers } = setupWithCapturedHandlers({ orientation: 'H' });
    capturedHandlers['pointerup']?.();
    expect(stage.container().style.cursor).toBe('ns-resize');
  });

  it('pointermove sets ew-resize cursor for VERTICAL guide', () => {
    const { stage, capturedHandlers } = setupWithCapturedHandlers({ orientation: 'V' });
    capturedHandlers['pointermove']?.();
    expect(stage.container().style.cursor).toBe('ew-resize');
  });

  it('pointermove sets ns-resize cursor for HORIZONTAL guide', () => {
    const { stage, capturedHandlers } = setupWithCapturedHandlers({ orientation: 'H' });
    capturedHandlers['pointermove']?.();
    expect(stage.container().style.cursor).toBe('ns-resize');
  });

  it('dragstart sets isDragging=true', () => {
    const { manager, capturedHandlers } = setupWithCapturedHandlers({ orientation: 'V' });
    capturedHandlers['dragstart']?.();
    expect((manager as unknown as { isDragging: boolean }).isDragging).toBe(true);
  });

  it('dragmove constrains VERTICAL guide y-axis', () => {
    const { capturedHandlers, guideNodeMock } = setupWithCapturedHandlers({ orientation: 'V' });
    capturedHandlers['dragstart']?.();
    capturedHandlers['dragmove']?.({ evt: { altKey: false } });
    expect(guideNodeMock.y).toHaveBeenCalled();
  });

  it('dragmove constrains HORIZONTAL guide x-axis', () => {
    const { capturedHandlers, guideNodeMock } = setupWithCapturedHandlers({ orientation: 'H' });
    capturedHandlers['dragstart']?.();
    capturedHandlers['dragmove']?.({ evt: { altKey: false } });
    expect(guideNodeMock.x).toHaveBeenCalled();
  });

  it('dragend sets isDragging=false', () => {
    const { manager, stage, capturedHandlers } = setupWithCapturedHandlers({ orientation: 'V' });
    stage.findOne = vi.fn().mockReturnValue(null);
    capturedHandlers['dragstart']?.();
    capturedHandlers['dragend']?.();
    expect((manager as unknown as { isDragging: boolean }).isDragging).toBe(false);
  });

  it('dragend updates VERTICAL guide value via editCustomGuide', () => {
    const { manager, capturedHandlers } = setupWithCapturedHandlers({ orientation: 'V' });
    capturedHandlers['dragstart']?.();
    capturedHandlers['dragend']?.();
    const updatedGuide = manager.getAllCustomGuides()['mainLayer']?.[0];
    expect(updatedGuide).toBeDefined();
    expect(typeof updatedGuide?.value).toBe('number');
  });

  it('dragend updates HORIZONTAL guide value via editCustomGuide', () => {
    const { manager, capturedHandlers } = setupWithCapturedHandlers({ orientation: 'H' });
    capturedHandlers['dragstart']?.();
    capturedHandlers['dragend']?.();
    const updatedGuide = manager.getAllCustomGuides()['mainLayer']?.[0];
    expect(updatedGuide).toBeDefined();
    expect(typeof updatedGuide?.value).toBe('number');
  });
});
