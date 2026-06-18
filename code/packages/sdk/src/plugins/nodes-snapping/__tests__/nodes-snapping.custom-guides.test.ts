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
  },
}));
vi.mock('../utils', () => ({
  roundNumber: vi.fn().mockImplementation((v: number) => v),
}));
vi.mock('@/nodes/frame/constants', () => ({ WEAVE_FRAME_NODE_TYPE: 'frame' }));
vi.mock('../nodes-selection/nodes-selection', () => ({}));

// ─── imports ──────────────────────────────────────────────────────────────────

import { WeaveNodesSnappingCustomGuides } from '../nodes-snapping.custom-guides';
import { GUIDE_KIND } from '../constants';
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
