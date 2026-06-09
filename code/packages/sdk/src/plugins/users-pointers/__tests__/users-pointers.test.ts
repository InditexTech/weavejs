// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('lodash/throttle', () => ({ default: (fn: (...a: unknown[]) => unknown) => fn }));

let mockLayerInstance: ReturnType<typeof makeMockLayerInstance>;
let mockGroupInstances: ReturnType<typeof makeMockGroupInstance>[] = [];
let mockCircleInstances: Record<string, unknown>[] = [];
let mockTextInstances: ReturnType<typeof makeMockTextInstance>[] = [];
let mockRectInstances: Record<string, unknown>[] = [];

function makeMockLayerInstance() {
  return {
    add: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    find: vi.fn().mockReturnValue([]),
  };
}

function makeMockGroupInstance(attrs: Record<string, unknown> = {}) {
  return {
    ...attrs,
    add: vi.fn(),
    moveToTop: vi.fn(),
    setAttrs: vi.fn(),
  };
}

function makeMockTextInstance(attrs: Record<string, unknown> = {}) {
  return {
    ...attrs,
    getTextWidth: vi.fn().mockReturnValue(10),
    getTextHeight: vi.fn().mockReturnValue(8),
    width: vi.fn(),
    height: vi.fn(),
    y: vi.fn().mockReturnValue(0),
    setAttrs: vi.fn(),
  };
}

vi.mock('konva', () => {
  return {
    default: {
      Layer: vi.fn(() => {
        mockLayerInstance = makeMockLayerInstance();
        return mockLayerInstance;
      }),
      Group: vi.fn((attrs: Record<string, unknown>) => {
        const g = makeMockGroupInstance(attrs);
        mockGroupInstances.push(g);
        return g;
      }),
      Circle: vi.fn((attrs: Record<string, unknown>) => {
        const c = { ...attrs, setAttrs: vi.fn() };
        mockCircleInstances.push(c);
        return c;
      }),
      Text: vi.fn((attrs: Record<string, unknown>) => {
        const t = makeMockTextInstance(attrs);
        mockTextInstances.push(t);
        return t;
      }),
      Rect: vi.fn((attrs: Record<string, unknown>) => {
        const r = { ...attrs, y: vi.fn().mockReturnValue(0), height: vi.fn().mockReturnValue(16) };
        mockRectInstances.push(r);
        return r;
      }),
    },
  };
});

import { WeaveUsersPointersPlugin } from '../users-pointers';
import {
  WEAVE_USERS_POINTERS_KEY,
  WEAVE_USER_POINTER_KEY,
  WEAVE_USERS_POINTERS_CONFIG_DEFAULT_PROPS,
} from '../constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

type R = Record<string, unknown>;

function makeConfig() {
  return {
    getUser: vi.fn().mockReturnValue({ id: 'user-1', name: 'Alice' }),
    getUserBackgroundColor: vi.fn().mockReturnValue('#ff0000'),
    getUserForegroundColor: vi.fn().mockReturnValue('#ffffff'),
  };
}

function makeMockWeave() {
  const stageHandlers: Record<string, (e?: unknown) => void> = {};
  const eventHandlers: Record<string, (data?: unknown) => void> = {};

  const stage = {
    add: vi.fn(),
    findOne: vi.fn().mockReturnValue(undefined),
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    getRelativePointerPosition: vi.fn().mockReturnValue(null),
    on: vi.fn((events: string, handler: (e?: unknown) => void) => {
      for (const ev of events.split(' ')) {
        stageHandlers[ev.trim()] = handler;
      }
    }),
  };

  const store = { setAwarenessInfo: vi.fn() };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getStore: vi.fn().mockReturnValue(store),
    getUsers: vi.fn().mockReturnValue([]),
    getLockDetails: vi.fn().mockReturnValue(undefined),
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

function makeUserPointer(userId: string, x = 10, y = 20) {
  return {
    rawUser: { id: userId, name: userId },
    user: userId,
    name: userId,
    x,
    y,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveUsersPointersPlugin', () => {
  let plugin: WeaveUsersPointersPlugin;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let config: ReturnType<typeof makeConfig>;

  beforeEach(() => {
    mockGroupInstances = [];
    mockCircleInstances = [];
    mockTextInstances = [];
    mockRectInstances = [];
    config = makeConfig();
    plugin = new WeaveUsersPointersPlugin({ config });
    mockWeave = makeMockWeave();
    plugin.register(mockWeave as unknown as Parameters<typeof plugin.register>[0]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Suite 1: constructor / initialize() ────────────────────────────────────

  describe('constructor / initialize()', () => {
    it('1.1 usersPointers is {} after construction', () => {
      expect((plugin as unknown as R)['usersPointers']).toEqual({});
    });

    it('1.2 usersOperations is {} after construction', () => {
      expect((plugin as unknown as R)['usersOperations']).toEqual({});
    });

    it('1.3 default config props applied (awarenessThrottleMs, ui, getOperationName)', () => {
      const internalConfig = (plugin as unknown as R)['config'] as R;
      expect(internalConfig['awarenessThrottleMs']).toBe(
        WEAVE_USERS_POINTERS_CONFIG_DEFAULT_PROPS.awarenessThrottleMs
      );
      expect((internalConfig['ui'] as R)['separation']).toBe(
        WEAVE_USERS_POINTERS_CONFIG_DEFAULT_PROPS.ui.separation
      );
      expect(typeof internalConfig['getOperationName']).toBe('function');
    });

    it('1.4 getUser, getUserBackgroundColor, getUserForegroundColor are memoized', () => {
      const rawGetUser = vi.fn().mockReturnValue({ id: 'u1', name: 'Bob' });
      const rawBg = vi.fn().mockReturnValue('#aaa');
      const rawFg = vi.fn().mockReturnValue('#bbb');
      const p = new WeaveUsersPointersPlugin({
        config: { getUser: rawGetUser, getUserBackgroundColor: rawBg, getUserForegroundColor: rawFg },
      });
      const cfg = (p as unknown as R)['config'] as R;
      // Call each memoized fn twice with same args
      (cfg['getUser'] as () => unknown)();
      (cfg['getUser'] as () => unknown)();
      expect(rawGetUser).toHaveBeenCalledTimes(1);

      const u = { id: 'u1', name: 'Bob' };
      (cfg['getUserBackgroundColor'] as (u: unknown) => unknown)(u);
      (cfg['getUserBackgroundColor'] as (u: unknown) => unknown)(u);
      expect(rawBg).toHaveBeenCalledTimes(1);

      (cfg['getUserForegroundColor'] as (u: unknown) => unknown)(u);
      (cfg['getUserForegroundColor'] as (u: unknown) => unknown)(u);
      expect(rawFg).toHaveBeenCalledTimes(1);
    });

    it('1.5 custom ui props override defaults', () => {
      const p = new WeaveUsersPointersPlugin({
        config: {
          getUser: vi.fn(),
          getUserBackgroundColor: vi.fn(),
          getUserForegroundColor: vi.fn(),
          ui: {
            separation: 99,
            pointer: { circleRadius: 10, circleStrokeWidth: 2 },
            name: { fontFamily: 'Verdana', fontSize: 14, backgroundCornerRadius: 4, backgroundPaddingX: 12, backgroundPaddingY: 6 },
            operationSeparation: 10,
          },
        },
      });
      const cfg = (p as unknown as R)['config'] as R;
      expect((cfg['ui'] as R)['separation']).toBe(99);
    });
  });

  // ── Suite 2: getName() / getLayerName() ───────────────────────────────────

  describe('getName() / getLayerName()', () => {
    it('2.1 getName() returns usersPointers key', () => {
      expect(plugin.getName()).toBe(WEAVE_USERS_POINTERS_KEY);
      expect(plugin.getName()).toBe('usersPointers');
    });

    it('2.2 getLayerName() returns usersPointersLayer', () => {
      expect((plugin as unknown as R)['getLayerName']()).toBe('usersPointersLayer');
    });
  });

  // ── Suite 3: initLayer() ──────────────────────────────────────────────────

  describe('initLayer()', () => {
    it('3.1 creates Konva.Layer with correct id, draggable=false, listening=false', async () => {
      const Konva = await import('konva');
      vi.mocked(Konva.default.Layer).mockClear();
      plugin.initLayer();
      expect(Konva.default.Layer).toHaveBeenCalledWith({
        id: 'usersPointersLayer',
        draggable: false,
        listening: false,
      });
    });

    it('3.2 layer added to stage', () => {
      plugin.initLayer();
      expect(mockWeave._stage.add).toHaveBeenCalledWith(mockLayerInstance);
    });
  });

  // ── Suite 4: getLayer() ───────────────────────────────────────────────────

  describe('getLayer()', () => {
    it('4.1 returns result of stage.findOne("#usersPointersLayer")', () => {
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
    it('5.1 delegates to renderPointers (layer.find called)', () => {
      const layer = { ...makeMockLayerInstance() };
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.onRender();
      expect(layer.find).toHaveBeenCalled();
    });
  });

  // ── Suite 6: onInit() — onStoreConnectionStatusChange ────────────────────

  describe('onInit() — onStoreConnectionStatusChange', () => {
    beforeEach(() => {
      const layer = { ...makeMockLayerInstance() };
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.onInit();
    });

    it('6.1 disconnected → store.setAwarenessInfo(key, undefined)', () => {
      mockWeave._store.setAwarenessInfo.mockClear();
      mockWeave._eventHandlers['onStoreConnectionStatusChange']?.('disconnected');
      expect(mockWeave._store.setAwarenessInfo).toHaveBeenCalledWith(
        WEAVE_USER_POINTER_KEY,
        undefined
      );
    });

    it('6.2 connected → setAwarenessInfo NOT called', () => {
      mockWeave._store.setAwarenessInfo.mockClear();
      mockWeave._eventHandlers['onStoreConnectionStatusChange']?.('connected');
      expect(mockWeave._store.setAwarenessInfo).not.toHaveBeenCalled();
    });
  });

  // ── Suite 7: onInit() — onAwarenessChange ────────────────────────────────

  describe('onInit() — onAwarenessChange', () => {
    let layer: ReturnType<typeof makeMockLayerInstance>;

    beforeEach(() => {
      layer = { ...makeMockLayerInstance() };
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.onInit();
    });

    it('7.1 change missing userPointer key → skipped, usersPointers unchanged', () => {
      layer.find.mockClear();
      mockWeave._eventHandlers['onAwarenessChange']?.([{ someOtherKey: 'value' }]);
      expect((plugin as unknown as R)['usersPointers']).toEqual({});
    });

    it('7.2 userPointer.user === selfUser.id → own user skipped', () => {
      const change = {
        [WEAVE_USER_POINTER_KEY]: makeUserPointer('user-1'),
      };
      mockWeave._eventHandlers['onAwarenessChange']?.([change]);
      expect((plugin as unknown as R)['usersPointers']).not.toHaveProperty('user-1');
    });

    it('7.3 userPointer.user !== selfUser.id → stored in usersPointers, renderPointers called', () => {
      layer.find.mockClear();
      const change = {
        [WEAVE_USER_POINTER_KEY]: makeUserPointer('user-2'),
      };
      mockWeave._eventHandlers['onAwarenessChange']?.([change]);
      expect((plugin as unknown as R)['usersPointers']).toHaveProperty('user-2');
      expect(layer.find).toHaveBeenCalled();
    });

    it('7.4 user present in usersPointers but NOT in current changes → removed (inactive cleanup)', () => {
      // Seed an existing pointer
      (plugin as unknown as R)['usersPointers'] = {
        'user-2': makeUserPointer('user-2'),
      };
      // Awareness change with a different user (user-2 is now inactive)
      const change = {
        [WEAVE_USER_POINTER_KEY]: makeUserPointer('user-3'),
      };
      mockWeave._eventHandlers['onAwarenessChange']?.([change]);
      expect((plugin as unknown as R)['usersPointers']).not.toHaveProperty('user-2');
      expect((plugin as unknown as R)['usersPointers']).toHaveProperty('user-3');
    });

    it('7.5 multiple changes in same batch → all processed', () => {
      const changes = [
        { [WEAVE_USER_POINTER_KEY]: makeUserPointer('user-2') },
        { [WEAVE_USER_POINTER_KEY]: makeUserPointer('user-3') },
      ];
      mockWeave._eventHandlers['onAwarenessChange']?.(changes);
      expect((plugin as unknown as R)['usersPointers']).toHaveProperty('user-2');
      expect((plugin as unknown as R)['usersPointers']).toHaveProperty('user-3');
    });
  });

  // ── Suite 8: onInit() — stage events dragmove / pointermove ──────────────

  describe('onInit() — stage dragmove / pointermove', () => {
    beforeEach(() => {
      const layer = { ...makeMockLayerInstance() };
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.onInit();
      mockWeave._store.setAwarenessInfo.mockClear();
    });

    it('8.1 dragmove with non-null pointer position → sendAwarenessUpdate fires', () => {
      mockWeave._stage.getRelativePointerPosition.mockReturnValue({ x: 5, y: 10 });
      mockWeave._stageHandlers['dragmove']?.();
      expect(mockWeave._store.setAwarenessInfo).toHaveBeenCalledWith(
        WEAVE_USER_POINTER_KEY,
        expect.objectContaining({ x: 5, y: 10, user: 'user-1' })
      );
    });

    it('8.2 dragmove with null pointer position → sendAwarenessUpdate NOT called', () => {
      mockWeave._stage.getRelativePointerPosition.mockReturnValue(null);
      mockWeave._stageHandlers['dragmove']?.();
      expect(mockWeave._store.setAwarenessInfo).not.toHaveBeenCalled();
    });

    it('8.3 pointermove with non-null pointer position → setAwarenessInfo called', () => {
      mockWeave._stage.getRelativePointerPosition.mockReturnValue({ x: 15, y: 25 });
      mockWeave._stageHandlers['pointermove']?.();
      expect(mockWeave._store.setAwarenessInfo).toHaveBeenCalledWith(
        WEAVE_USER_POINTER_KEY,
        expect.objectContaining({ x: 15, y: 25 })
      );
    });

    it('8.4 pointermove with null pointer position → setAwarenessInfo NOT called', () => {
      mockWeave._stage.getRelativePointerPosition.mockReturnValue(null);
      mockWeave._stageHandlers['pointermove']?.();
      expect(mockWeave._store.setAwarenessInfo).not.toHaveBeenCalled();
    });
  });

  // ── Suite 9: onInit() — onMutexLockChange ────────────────────────────────

  describe('onInit() — onMutexLockChange', () => {
    beforeEach(() => {
      const layer = { ...makeMockLayerInstance() };
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.onInit();
    });

    it('9.1 getLockDetails returns data → stored in usersOperations, renderPointers called', () => {
      const lockInfo = { operation: 'editing', user: 'user-2' };
      mockWeave.getLockDetails.mockReturnValue(lockInfo);
      const layer = { ...makeMockLayerInstance() };
      mockWeave._stage.findOne.mockReturnValue(layer);
      layer.find.mockClear();
      mockWeave._eventHandlers['onMutexLockChange']?.({ locks: ['lock-1'] });
      expect((plugin as unknown as R)['usersOperations']).toHaveProperty('lock-1');
      expect(layer.find).toHaveBeenCalled();
    });

    it('9.2 getLockDetails returns undefined → NOT stored in usersOperations', () => {
      mockWeave.getLockDetails.mockReturnValue(undefined);
      mockWeave._eventHandlers['onMutexLockChange']?.({ locks: ['lock-1'] });
      expect((plugin as unknown as R)['usersOperations']).not.toHaveProperty('lock-1');
    });

    it('9.3 multiple lock keys processed in one call', () => {
      mockWeave.getLockDetails
        .mockReturnValueOnce({ operation: 'op1', user: 'u2' })
        .mockReturnValueOnce({ operation: 'op2', user: 'u3' });
      mockWeave._eventHandlers['onMutexLockChange']?.({ locks: ['lock-1', 'lock-2'] });
      expect((plugin as unknown as R)['usersOperations']).toHaveProperty('lock-1');
      expect((plugin as unknown as R)['usersOperations']).toHaveProperty('lock-2');
    });
  });

  // ── Suite 10: renderPointers() ────────────────────────────────────────────

  describe('renderPointers()', () => {
    it('10.1 !enabled → early return, no Konva shapes created', async () => {
      const Konva = await import('konva');
      plugin.disable();
      const layer = { ...makeMockLayerInstance() };
      mockWeave._stage.findOne.mockReturnValue(layer);
      vi.mocked(Konva.default.Group).mockClear();
      plugin.onRender();
      expect(Konva.default.Group).not.toHaveBeenCalled();
    });

    it('10.2 existing .pointer shapes destroyed before re-render', () => {
      const existingPointer = { destroy: vi.fn() };
      const layer = {
        ...makeMockLayerInstance(),
        find: vi.fn().mockImplementation((name: string) =>
          name === '.pointer' ? [existingPointer] : []
        ),
      };
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.onRender();
      expect(existingPointer.destroy).toHaveBeenCalled();
    });

    it('10.3 empty usersPointers → no Group/Circle/Text/Rect created', async () => {
      const Konva = await import('konva');
      const layer = { ...makeMockLayerInstance() };
      mockWeave._stage.findOne.mockReturnValue(layer);
      vi.mocked(Konva.default.Group).mockClear();
      vi.mocked(Konva.default.Circle).mockClear();
      vi.mocked(Konva.default.Text).mockClear();
      vi.mocked(Konva.default.Rect).mockClear();
      plugin.onRender();
      expect(Konva.default.Group).not.toHaveBeenCalled();
      expect(Konva.default.Circle).not.toHaveBeenCalled();
      expect(Konva.default.Text).not.toHaveBeenCalled();
      expect(Konva.default.Rect).not.toHaveBeenCalled();
    });

    it('10.4 one user entry → Group + Circle + Text (name) + Rect (name background) created', async () => {
      const Konva = await import('konva');
      (plugin as unknown as R)['usersPointers'] = {
        'user-2': makeUserPointer('user-2', 50, 60),
      };
      const layer = { ...makeMockLayerInstance() };
      mockWeave._stage.findOne.mockReturnValue(layer);
      mockGroupInstances = [];
      vi.mocked(Konva.default.Group).mockClear();
      vi.mocked(Konva.default.Circle).mockClear();
      vi.mocked(Konva.default.Text).mockClear();
      vi.mocked(Konva.default.Rect).mockClear();
      plugin.onRender();
      expect(Konva.default.Group).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'pointer_user-2', x: 50, y: 60 })
      );
      expect(Konva.default.Circle).toHaveBeenCalled();
      expect(Konva.default.Text).toHaveBeenCalled();
      expect(Konva.default.Rect).toHaveBeenCalled();
      expect(layer.add).toHaveBeenCalled();
    });

    it('10.5 usersOperations[user] exists → operation Text + Rect also created', async () => {
      const Konva = await import('konva');
      const rawUser = { id: 'user-2', name: 'Bob' };
      (plugin as unknown as R)['usersPointers'] = {
        'user-2': { rawUser, user: 'user-2', name: 'Bob', x: 0, y: 0 },
      };
      (plugin as unknown as R)['usersOperations'] = {
        'user-2': { operation: 'Drawing', user: 'user-2' },
      };
      const layer = { ...makeMockLayerInstance() };
      mockWeave._stage.findOne.mockReturnValue(layer);
      mockTextInstances = [];
      vi.mocked(Konva.default.Text).mockClear();
      vi.mocked(Konva.default.Rect).mockClear();
      plugin.onRender();
      // Name Text + Operation Text = 2 Text nodes
      expect(Konva.default.Text).toHaveBeenCalledTimes(2);
      // Name Rect + Operation Rect = 2 Rect nodes
      expect(Konva.default.Rect).toHaveBeenCalledTimes(2);
    });

    it('10.6 usersOperations has NO entry for user → only name Text + Rect (no operation nodes)', async () => {
      const Konva = await import('konva');
      (plugin as unknown as R)['usersPointers'] = {
        'user-2': makeUserPointer('user-2'),
      };
      (plugin as unknown as R)['usersOperations'] = {};
      const layer = { ...makeMockLayerInstance() };
      mockWeave._stage.findOne.mockReturnValue(layer);
      vi.mocked(Konva.default.Text).mockClear();
      vi.mocked(Konva.default.Rect).mockClear();
      plugin.onRender();
      // Only 1 Text (name) and 1 Rect (name background)
      expect(Konva.default.Text).toHaveBeenCalledTimes(1);
      expect(Konva.default.Rect).toHaveBeenCalledTimes(1);
    });

    it('10.7 .selector shapes moved to bottom after rendering', () => {
      const selector = { moveToBottom: vi.fn() };
      const layer = {
        add: vi.fn(),
        find: vi.fn().mockImplementation((name: string) =>
          name === '.selector' ? [selector] : []
        ),
      };
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.onRender();
      expect(selector.moveToBottom).toHaveBeenCalled();
    });
  });

  // ── Suite 11: enable() / disable() ───────────────────────────────────────

  describe('enable() / disable()', () => {
    it('11.1 enable(): layer.show() called, enabled=true', () => {
      const layer = { show: vi.fn(), hide: vi.fn() };
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.disable();
      plugin.enable();
      expect(layer.show).toHaveBeenCalled();
      expect((plugin as unknown as R)['enabled']).toBe(true);
    });

    it('11.2 disable(): layer.hide() called, enabled=false', () => {
      const layer = { show: vi.fn(), hide: vi.fn() };
      mockWeave._stage.findOne.mockReturnValue(layer);
      plugin.disable();
      expect(layer.hide).toHaveBeenCalled();
      expect((plugin as unknown as R)['enabled']).toBe(false);
    });

    it('11.3 enable()/disable() when getLayer() returns undefined → no error', () => {
      mockWeave._stage.findOne.mockReturnValue(undefined);
      expect(() => plugin.enable()).not.toThrow();
      expect(() => plugin.disable()).not.toThrow();
    });
  });
});
