// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));

let mockLayerInstance: ReturnType<typeof makeMockLayerInstance>;
let mockGroupInstances: ReturnType<typeof makeMockGroupInstance>[] = [];
let mockRectInstances: Record<string, unknown>[] = [];

function makeMockLayerInstance() {
  return {
    add: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    find: vi.fn().mockReturnValue([]),
  };
}

function makeMockGroupInstance() {
  return {
    add: vi.fn(),
    moveToBottom: vi.fn(),
  };
}

vi.mock('konva', () => {
  return {
    default: {
      Layer: vi.fn(() => {
        mockLayerInstance = makeMockLayerInstance();
        return mockLayerInstance;
      }),
      Group: vi.fn(() => {
        const g = makeMockGroupInstance();
        mockGroupInstances.push(g);
        return g;
      }),
      Rect: vi.fn((attrs: Record<string, unknown>) => {
        const r = { ...attrs };
        mockRectInstances.push(r);
        return r;
      }),
    },
  };
});

import { WeaveUsersSelectionPlugin } from '../users-selection';
import {
  WEAVE_USERS_SELECTION_KEY,
  WEAVE_USER_SELECTION_KEY,
} from '../constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

type R = Record<string, unknown>;

function makeConfig() {
  return {
    getUser: vi.fn().mockReturnValue({ id: 'user-1', name: 'Alice' }),
    getUserColor: vi.fn().mockReturnValue('#ff0000'),
  };
}

function makeMockNode(id: string, rect = { x: 0, y: 0, width: 100, height: 50 }) {
  return {
    getAttrs: vi.fn().mockReturnValue({ id }),
    getClientRect: vi.fn().mockReturnValue(rect),
  };
}

function makeMockWeave() {
  const stageHandlers: Record<string, (e?: unknown) => void> = {};
  const eventHandlers: Record<string, (data?: unknown) => void> = {};

  const stageContainer = { style: { cursor: '' }, tabIndex: 0, focus: vi.fn(), blur: vi.fn() };
  const stage = {
    add: vi.fn(),
    findOne: vi.fn().mockReturnValue(undefined),
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    container: vi.fn().mockReturnValue(stageContainer),
    on: vi.fn((events: string, handler: (e?: unknown) => void) => {
      for (const ev of events.split(' ')) {
        stageHandlers[ev.trim()] = handler;
      }
    }),
  };

  const store = {
    setAwarenessInfo: vi.fn(),
  };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getStore: vi.fn().mockReturnValue(store),
    getUsers: vi.fn().mockReturnValue([]),
    addEventListener: vi.fn((event: string, handler: (data?: unknown) => void) => {
      eventHandlers[event] = handler;
    }),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
    _stage: stage,
    _store: store,
    _stageHandlers: stageHandlers,
    _eventHandlers: eventHandlers,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveUsersSelectionPlugin', () => {
  let plugin: WeaveUsersSelectionPlugin;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let config: ReturnType<typeof makeConfig>;

  beforeEach(() => {
    mockGroupInstances = [];
    mockRectInstances = [];
    config = makeConfig();
    plugin = new WeaveUsersSelectionPlugin({ config });
    mockWeave = makeMockWeave();
    plugin.register(mockWeave as unknown as Parameters<typeof plugin.register>[0]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Suite 1: constructor / initialize() ────────────────────────────────────

  describe('constructor / initialize()', () => {
    it('1.1 usersSelection is {} after construction', () => {
      expect((plugin as unknown as R)['usersSelection']).toEqual({});
    });

    it('1.2 config.getUser is memoized (called only once for same args)', () => {
      const rawGetUser = vi.fn().mockReturnValue({ id: 'u1', name: 'Bob' });
      const p = new WeaveUsersSelectionPlugin({ config: { getUser: rawGetUser, getUserColor: vi.fn() } });
      const memoized = (p as unknown as R)['config'] as R;
      (memoized['getUser'] as () => unknown)();
      (memoized['getUser'] as () => unknown)();
      expect(rawGetUser).toHaveBeenCalledTimes(1);
    });

    it('1.3 config.getUserColor is memoized (called only once for same args)', () => {
      const rawGetUserColor = vi.fn().mockReturnValue('#aabbcc');
      const user = { id: 'u1', name: 'Bob' };
      const p = new WeaveUsersSelectionPlugin({ config: { getUser: vi.fn().mockReturnValue(user), getUserColor: rawGetUserColor } });
      const memoized = (p as unknown as R)['config'] as R;
      (memoized['getUserColor'] as (u: unknown) => unknown)(user);
      (memoized['getUserColor'] as (u: unknown) => unknown)(user);
      expect(rawGetUserColor).toHaveBeenCalledTimes(1);
    });

    it('1.4 padding is 1', () => {
      expect((plugin as unknown as R)['padding']).toBe(1);
    });
  });

  // ── Suite 2: getName() / getLayerName() ───────────────────────────────────

  describe('getName() / getLayerName()', () => {
    it('2.1 getName() returns usersSelection key', () => {
      expect(plugin.getName()).toBe(WEAVE_USERS_SELECTION_KEY);
      expect(plugin.getName()).toBe('usersSelection');
    });

    it('2.2 getLayerName() returns usersPointersLayer', () => {
      expect((plugin as unknown as R)['getLayerName']()).toBe('usersPointersLayer');
    });
  });

  // ── Suite 3: initLayer() ──────────────────────────────────────────────────

  describe('initLayer()', () => {
    it('3.1 creates Konva.Layer with correct id and listening=false', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Layer).mockClear();
      plugin.initLayer();
      expect(Konva.default.Layer).toHaveBeenCalledWith({
        id: 'usersPointersLayer',
        listening: false,
      });
    });

    it('3.2 layer is added to stage', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Layer).mockClear();
      plugin.initLayer();
      expect(mockWeave._stage.add).toHaveBeenCalledWith(mockLayerInstance);
    });
  });

  // ── Suite 4: getLayer() ───────────────────────────────────────────────────

  describe('getLayer()', () => {
    it('4.1 returns the layer found by stage.findOne', () => {
      const fakeLayer = { add: vi.fn() };
      mockWeave._stage.findOne.mockReturnValue(fakeLayer);
      const result = (plugin as unknown as R)['getLayer']();
      expect(result).toBe(fakeLayer);
      expect(mockWeave._stage.findOne).toHaveBeenCalledWith('#usersPointersLayer');
    });

    it('4.2 returns undefined when stage.findOne returns nothing', () => {
      mockWeave._stage.findOne.mockReturnValue(undefined);
      expect((plugin as unknown as R)['getLayer']()).toBeUndefined();
    });
  });

  // ── Suite 5: onRender() ───────────────────────────────────────────────────

  describe('onRender()', () => {
    it('5.1 delegates to renderSelectors — destroys existing selectors', () => {
      const selector = { destroy: vi.fn() };
      const layer = { ...makeMockLayerInstance(), find: vi.fn().mockImplementation((name: string) => name === '.selector' ? [selector] : []) };
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.onRender();
      expect(selector.destroy).toHaveBeenCalled();
    });
  });

  // ── Suite 6: onInit() — onStoreConnectionStatusChange ────────────────────

  describe('onInit() — onStoreConnectionStatusChange', () => {
    beforeEach(() => {
      plugin.onInit();
    });

    it('6.1 disconnected → usersSelection reset to {}', () => {
      (plugin as unknown as R)['usersSelection'] = { 'user-2': { user: 'user-2', nodes: [], rawUser: { id: 'user-2', name: 'Bob' } } };
      mockWeave._eventHandlers['onStoreConnectionStatusChange']?.('disconnected');
      expect((plugin as unknown as R)['usersSelection']).toEqual({});
    });

    it('6.2 disconnected → store.setAwarenessInfo called with undefined', () => {
      mockWeave._eventHandlers['onStoreConnectionStatusChange']?.('disconnected');
      expect(mockWeave._store.setAwarenessInfo).toHaveBeenCalledWith(WEAVE_USER_SELECTION_KEY, undefined);
    });

    it('6.3 connected → usersSelection unchanged, setAwarenessInfo not called', () => {
      const existing = { 'user-2': { user: 'user-2', nodes: [], rawUser: { id: 'user-2' } } };
      (plugin as unknown as R)['usersSelection'] = { ...existing };
      mockWeave._store.setAwarenessInfo.mockClear();
      mockWeave._eventHandlers['onStoreConnectionStatusChange']?.('connected');
      expect((plugin as unknown as R)['usersSelection']).toEqual(existing);
      expect(mockWeave._store.setAwarenessInfo).not.toHaveBeenCalled();
    });
  });

  // ── Suite 7: onInit() — onAwarenessChange ────────────────────────────────

  describe('onInit() — onAwarenessChange', () => {
    const layer = {
      add: vi.fn(),
      find: vi.fn().mockReturnValue([]),
    };

    beforeEach(() => {
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.onInit();
    });

    it('7.1 change with userSelection key and user ≠ self → stored in usersSelection', () => {
      const change = { [WEAVE_USER_SELECTION_KEY]: { user: 'user-2', nodes: [], rawUser: { id: 'user-2' } } };
      mockWeave._eventHandlers['onAwarenessChange']?.([change]);
      expect((plugin as unknown as R)['usersSelection']).toHaveProperty('user-2');
    });

    it('7.2 change from self (user === selfUser.id) → NOT stored', () => {
      const change = { [WEAVE_USER_SELECTION_KEY]: { user: 'user-1', nodes: [], rawUser: { id: 'user-1' } } };
      mockWeave._eventHandlers['onAwarenessChange']?.([change]);
      expect((plugin as unknown as R)['usersSelection']).not.toHaveProperty('user-1');
    });

    it('7.3 change without userSelection key → ignored', () => {
      const change = { otherKey: 'someValue' };
      mockWeave._eventHandlers['onAwarenessChange']?.([change]);
      expect(Object.keys((plugin as unknown as R)['usersSelection'] as R)).toHaveLength(0);
    });

    it('7.4 renderSelectors() called after processing (layer.find invoked)', () => {
      layer.find.mockClear();
      const change = { [WEAVE_USER_SELECTION_KEY]: { user: 'user-2', nodes: [], rawUser: { id: 'user-2' } } };
      mockWeave._eventHandlers['onAwarenessChange']?.([change]);
      expect(layer.find).toHaveBeenCalled();
    });
  });

  // ── Suite 8: onInit() — onUsersChange ────────────────────────────────────

  describe('onInit() — onUsersChange', () => {
    const layer = {
      add: vi.fn(),
      find: vi.fn().mockReturnValue([]),
    };

    beforeEach(() => {
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.onInit();
    });

    it('8.1 user still in actualUsers → not removed, renderSelectors NOT called extra times', () => {
      (plugin as unknown as R)['usersSelection'] = { 'user-2': { user: 'user-2', nodes: [], rawUser: { id: 'user-2' } } };
      mockWeave.getUsers.mockReturnValue([{ id: 'user-2', name: 'Bob' }]);
      layer.find.mockClear();
      mockWeave._eventHandlers['onUsersChange']?.();
      expect((plugin as unknown as R)['usersSelection']).toHaveProperty('user-2');
      // renderSelectors not called (hasChanges=false)
      expect(layer.find).not.toHaveBeenCalled();
    });

    it('8.2 user no longer in actualUsers → removed from usersSelection, renderSelectors called', () => {
      (plugin as unknown as R)['usersSelection'] = { 'user-2': { user: 'user-2', nodes: [], rawUser: { id: 'user-2' } } };
      mockWeave.getUsers.mockReturnValue([]);
      layer.find.mockClear();
      mockWeave._eventHandlers['onUsersChange']?.();
      expect((plugin as unknown as R)['usersSelection']).not.toHaveProperty('user-2');
      expect(layer.find).toHaveBeenCalled();
    });

    it('8.3 empty usersSelection → no changes, renderSelectors NOT called', () => {
      (plugin as unknown as R)['usersSelection'] = {};
      mockWeave.getUsers.mockReturnValue([]);
      layer.find.mockClear();
      mockWeave._eventHandlers['onUsersChange']?.();
      expect(layer.find).not.toHaveBeenCalled();
    });
  });

  // ── Suite 9: onInit() — stage events + immediate renderSelectors ──────────

  describe('onInit() — stage events + immediate renderSelectors', () => {
    const layer = {
      add: vi.fn(),
      find: vi.fn().mockReturnValue([]),
    };

    beforeEach(() => {
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.onInit();
    });

    it('9.1 dragstart/dragmove/dragend each trigger renderSelectors', () => {
      for (const ev of ['dragstart', 'dragmove', 'dragend']) {
        layer.find.mockClear();
        mockWeave._stageHandlers[ev]?.();
        expect(layer.find).toHaveBeenCalled();
      }
    });

    it('9.2 transformstart/transform/transformend each trigger renderSelectors', () => {
      for (const ev of ['transformstart', 'transform', 'transformend']) {
        layer.find.mockClear();
        mockWeave._stageHandlers[ev]?.();
        expect(layer.find).toHaveBeenCalled();
      }
    });

    it('9.3 onInit() calls renderSelectors() immediately at the end', () => {
      // In beforeEach, onInit was called — layer.find should have been called
      expect(layer.find).toHaveBeenCalled();
    });
  });

  // ── Suite 10: sendSelectionAwarenessInfo() ────────────────────────────────

  describe('sendSelectionAwarenessInfo()', () => {
    it('10.1 calls store.setAwarenessInfo with correct payload', () => {
      const tr = {
        nodes: vi.fn().mockReturnValue([
          { getAttrs: vi.fn().mockReturnValue({ id: 'node-1' }) },
          { getAttrs: vi.fn().mockReturnValue({ id: 'node-2' }) },
        ]),
      };
      plugin.sendSelectionAwarenessInfo(tr as unknown as Parameters<typeof plugin.sendSelectionAwarenessInfo>[0]);
      expect(mockWeave._store.setAwarenessInfo).toHaveBeenCalledWith(
        WEAVE_USER_SELECTION_KEY,
        expect.objectContaining({
          rawUser: { id: 'user-1', name: 'Alice' },
          user: 'user-1',
          nodes: ['node-1', 'node-2'],
        })
      );
    });

    it('10.2 nodes are mapped from tr.nodes() via getAttrs().id', () => {
      const tr = {
        nodes: vi.fn().mockReturnValue([
          { getAttrs: vi.fn().mockReturnValue({ id: 'n-abc' }) },
        ]),
      };
      plugin.sendSelectionAwarenessInfo(tr as unknown as Parameters<typeof plugin.sendSelectionAwarenessInfo>[0]);
      const call = mockWeave._store.setAwarenessInfo.mock.calls[0];
      expect((call[1] as R)['nodes']).toEqual(['n-abc']);
    });
  });

  // ── Suite 11: removeSelectionAwarenessInfo() ──────────────────────────────

  describe('removeSelectionAwarenessInfo()', () => {
    it('11.1 calls store.setAwarenessInfo(key, undefined)', () => {
      plugin.removeSelectionAwarenessInfo();
      expect(mockWeave._store.setAwarenessInfo).toHaveBeenCalledWith(
        WEAVE_USER_SELECTION_KEY,
        undefined
      );
    });
  });

  // ── Suite 12: getSelectedNodesRect() — via onRender ───────────────────────

  describe('getSelectedNodesRect() — via renderSelectors', () => {
    function seedUser(nodes: string[]) {
      (plugin as unknown as R)['usersSelection'] = {
        'user-2': { user: 'user-2', nodes, rawUser: { id: 'user-2' } },
      };
    }

    it('12.1 single node found → bounding rect from getClientRect', async () => {
      const Konva = await import('konva');
      seedUser(['n1']);
      const node = makeMockNode('n1', { x: 10, y: 20, width: 80, height: 40 });
      mockWeave._stage.findOne.mockImplementation((selector: unknown) =>
        selector === '#n1' ? node : makeMockLayerInstance()
      );
      const layer = { add: vi.fn(), find: vi.fn().mockReturnValue([]) };
      mockWeave._stage.findOne.mockImplementation((selector: unknown) => {
        if (selector === '#usersPointersLayer') return layer;
        if (selector === '#n1') return node;
        return undefined;
      });
      mockGroupInstances = [];
      mockRectInstances = [];
      vi.mocked(Konva.default.Group).mockClear();
      plugin.onRender();
      // A Group should have been created with x=10, y=20 (from node rect)
      expect(Konva.default.Group).toHaveBeenCalledWith(
        expect.objectContaining({ x: 10, y: 20 })
      );
    });

    it('12.2 multiple nodes → bounding rect is union (min/max of all rects)', async () => {
      const Konva = await import('konva');
      seedUser(['n1', 'n2']);
      const n1 = makeMockNode('n1', { x: 5, y: 10, width: 50, height: 30 });
      const n2 = makeMockNode('n2', { x: 20, y: 5, width: 80, height: 60 });
      const layer = { add: vi.fn(), find: vi.fn().mockReturnValue([]) };
      mockWeave._stage.findOne.mockImplementation((selector: unknown) => {
        if (selector === '#usersPointersLayer') return layer;
        if (selector === '#n1') return n1;
        if (selector === '#n2') return n2;
        return undefined;
      });
      mockGroupInstances = [];
      vi.mocked(Konva.default.Group).mockClear();
      plugin.onRender();
      // min x = 5, min y = 5 → Group at x=5, y=5
      expect(Konva.default.Group).toHaveBeenCalledWith(
        expect.objectContaining({ x: 5, y: 5 })
      );
    });

    it('12.3 node ID not found → skipped, no error', () => {
      seedUser(['n-missing']);
      const layer = { add: vi.fn(), find: vi.fn().mockReturnValue([]) };
      mockWeave._stage.findOne.mockImplementation((selector: unknown) => {
        if (selector === '#usersPointersLayer') return layer;
        return undefined;
      });
      expect(() => plugin.onRender()).not.toThrow();
    });

    it('12.4 width and height are scaled by stage.scaleX/scaleY', async () => {
      const Konva = await import('konva');
      mockWeave._stage.scaleX.mockReturnValue(2);
      mockWeave._stage.scaleY.mockReturnValue(3);
      seedUser(['n1']);
      const node = makeMockNode('n1', { x: 0, y: 0, width: 100, height: 50 });
      const layer = { add: vi.fn(), find: vi.fn().mockReturnValue([]) };
      mockWeave._stage.findOne.mockImplementation((selector: unknown) => {
        if (selector === '#usersPointersLayer') return layer;
        if (selector === '#n1') return node;
        return undefined;
      });
      mockRectInstances = [];
      vi.mocked(Konva.default.Rect).mockClear();
      plugin.onRender();
      // width = 100 * 2 = 200 (before adding padding offset in Rect)
      // Rect gets (selectionRect.width + 2*padding) / scaleX
      const rectCall = vi.mocked(Konva.default.Rect).mock.calls[0]?.[0] as R;
      // selectionRect.width = 100*2=200; Rect.width = (200+2)/2 = 101
      expect(rectCall?.['width']).toBe((100 * 2 + 2) / 2);
    });

    it('12.5 all 4 min/max conditions updated when nodes span all directions', async () => {
      const Konva = await import('konva');
      // n1 at (100,100) sets initial min/max, n2 expands all directions
      seedUser(['n1', 'n2']);
      const n1 = makeMockNode('n1', { x: 10, y: 20, width: 30, height: 40 });
      const n2 = makeMockNode('n2', { x: 5, y: 15, width: 200, height: 150 });
      const layer = { add: vi.fn(), find: vi.fn().mockReturnValue([]) };
      mockWeave._stage.findOne.mockImplementation((selector: unknown) => {
        if (selector === '#usersPointersLayer') return layer;
        if (selector === '#n1') return n1;
        if (selector === '#n2') return n2;
        return undefined;
      });
      vi.mocked(Konva.default.Group).mockClear();
      plugin.onRender();
      // min x=5, min y=15 → Group at x=5, y=15
      expect(Konva.default.Group).toHaveBeenCalledWith(
        expect.objectContaining({ x: 5, y: 15 })
      );
    });
  });

  // ── Suite 13: renderSelectors() ──────────────────────────────────────────

  describe('renderSelectors()', () => {
    it('13.1 !enabled → early return, no Konva shapes created', async () => {
      const Konva = await import('konva');
      plugin.disable();
      const layer = { add: vi.fn(), find: vi.fn().mockReturnValue([]) };
      mockWeave._stage.findOne.mockReturnValue(layer);
      vi.mocked(Konva.default.Group).mockClear();
      plugin.onRender();
      expect(Konva.default.Group).not.toHaveBeenCalled();
    });

    it('13.2 existing selectors are destroyed before re-rendering', () => {
      const selector = { destroy: vi.fn() };
      const layer = {
        add: vi.fn(),
        find: vi.fn().mockImplementation((name: string) =>
          name === '.selector' ? [selector] : []
        ),
      };
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.onRender();
      expect(selector.destroy).toHaveBeenCalled();
    });

    it('13.3 empty usersSelection → no Group/Rect created', async () => {
      const Konva = await import('konva');
      const layer = { add: vi.fn(), find: vi.fn().mockReturnValue([]) };
      mockWeave._stage.findOne.mockReturnValue(layer);
      vi.mocked(Konva.default.Group).mockClear();
      vi.mocked(Konva.default.Rect).mockClear();
      plugin.onRender();
      expect(Konva.default.Group).not.toHaveBeenCalled();
      expect(Konva.default.Rect).not.toHaveBeenCalled();
    });

    it('13.4 one user in usersSelection → Group and Rect created, both added to layer', async () => {
      const Konva = await import('konva');
      (plugin as unknown as R)['usersSelection'] = {
        'user-2': { user: 'user-2', nodes: [], rawUser: { id: 'user-2' } },
      };
      const layer = { add: vi.fn(), find: vi.fn().mockReturnValue([]) };
      mockWeave._stage.findOne.mockReturnValue(layer);
      mockGroupInstances = [];
      vi.mocked(Konva.default.Group).mockClear();
      vi.mocked(Konva.default.Rect).mockClear();
      plugin.onRender();
      expect(Konva.default.Group).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'selector_user-2', name: 'selector' })
      );
      expect(Konva.default.Rect).toHaveBeenCalled();
      expect(layer.add).toHaveBeenCalled();
    });

    it('13.5 getUserColor(rawUser) return value used as rect stroke', async () => {
      const Konva = await import('konva');
      // The plugin constructor mutates the config object (replaces fns with memoized wrappers),
      // so we must create a fresh plugin with the desired color pre-configured.
      const rawUser = { id: 'user-3', name: 'Charlie' };
      const colorConfig = {
        getUser: vi.fn().mockReturnValue({ id: 'user-1', name: 'Alice' }),
        getUserColor: vi.fn().mockReturnValue('#0000ff'),
      };
      const p = new WeaveUsersSelectionPlugin({ config: colorConfig });
      p.register(mockWeave as unknown as Parameters<typeof p.register>[0]);
      (p as unknown as R)['usersSelection'] = {
        'user-3': { user: 'user-3', nodes: [], rawUser },
      };
      const layer = { add: vi.fn(), find: vi.fn().mockReturnValue([]) };
      mockWeave._stage.findOne.mockReturnValue(layer);
      vi.mocked(Konva.default.Rect).mockClear();
      p.onRender();
      const rectCall = vi.mocked(Konva.default.Rect).mock.calls[0]?.[0] as R;
      expect(rectCall?.['stroke']).toBe('#0000ff');
    });

    it('13.6 pointer nodes (.pointer) are moved to top after rendering', () => {
      const pointer = { moveToTop: vi.fn() };
      const layer = {
        add: vi.fn(),
        find: vi.fn().mockImplementation((name: string) =>
          name === '.pointer' ? [pointer] : []
        ),
      };
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.onRender();
      expect(pointer.moveToTop).toHaveBeenCalled();
    });
  });

  // ── Suite 14: enable() / disable() ───────────────────────────────────────

  describe('enable() / disable()', () => {
    it('14.1 enable(): layer.show() called, enabled=true', () => {
      const layer = { show: vi.fn(), hide: vi.fn() };
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.disable();
      plugin.enable();
      expect(layer.show).toHaveBeenCalled();
      expect((plugin as unknown as R)['enabled']).toBe(true);
    });

    it('14.2 disable(): layer.hide() called, enabled=false', () => {
      const layer = { show: vi.fn(), hide: vi.fn() };
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.disable();
      expect(layer.hide).toHaveBeenCalled();
      expect((plugin as unknown as R)['enabled']).toBe(false);
    });

    it('14.3 enable()/disable() when getLayer() returns undefined → no error', () => {
      mockWeave._stage.findOne.mockReturnValue(undefined);
      expect(() => plugin.enable()).not.toThrow();
      expect(() => plugin.disable()).not.toThrow();
    });
  });
});
