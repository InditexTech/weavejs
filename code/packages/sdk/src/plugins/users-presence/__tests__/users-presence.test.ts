// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));

import { WeaveUsersPresencePlugin } from '../users-presence';
import {
  WEAVE_USERS_PRESENCE_PLUGIN_KEY,
  WEAVE_USER_PRESENCE_KEY,
  WEAVE_USERS_PRESENCE_CONFIG_DEFAULT_PROPS,
} from '../constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

type R = Record<string, unknown>;

function makeConfig() {
  return {
    getUser: vi.fn().mockReturnValue({ id: 'user-1', name: 'Alice' }),
  };
}

function makeMockWeave() {
  const eventHandlers: Record<string, (data?: unknown) => void> = {};
  const stage = { findOne: vi.fn().mockReturnValue(undefined) };
  const store = { setAwarenessInfo: vi.fn() };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getStore: vi.fn().mockReturnValue(store),
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
    _eventHandlers: eventHandlers,
  };
}

function makeMockNode(
  id: string,
  parentId: string,
  parentHasNodeId = false,
  existingAttrs: R = {}
) {
  const parent = {
    id: vi.fn().mockReturnValue(parentId),
    getAttrs: vi.fn().mockReturnValue(
      parentHasNodeId ? { nodeId: parentId } : {}
    ),
  };
  return {
    getParent: vi.fn().mockReturnValue(parent),
    getAttrs: vi.fn().mockReturnValue({ id, ...existingAttrs }),
    setAttrs: vi.fn(),
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveUsersPresencePlugin', () => {
  let plugin: WeaveUsersPresencePlugin;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let config: ReturnType<typeof makeConfig>;

  beforeEach(() => {
    vi.useFakeTimers();
    config = makeConfig();
    plugin = new WeaveUsersPresencePlugin({ config });
    mockWeave = makeMockWeave();
    plugin.register(mockWeave as unknown as Parameters<typeof plugin.register>[0]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── Suite 1: constructor / initialize() ────────────────────────────────────

  describe('constructor / initialize()', () => {
    it('1.1 userPresence is {} after construction', () => {
      expect((plugin as unknown as R)['userPresence']).toEqual({});
    });

    it('1.2 awarenessThrottleMs defaults to DEFAULT_THROTTLE_MS (50) when not in params', () => {
      const internalConfig = (plugin as unknown as R)['config'] as R;
      expect(internalConfig['awarenessThrottleMs']).toBe(
        WEAVE_USERS_PRESENCE_CONFIG_DEFAULT_PROPS.awarenessThrottleMs
      );
    });

    it('1.3 awarenessThrottleMs can be overridden via params', () => {
      const p = new WeaveUsersPresencePlugin({
        config: { getUser: vi.fn(), awarenessThrottleMs: 999 } as R as Parameters<typeof WeaveUsersPresencePlugin>[0]['config'],
      });
      const internalConfig = (p as unknown as R)['config'] as R;
      expect(internalConfig['awarenessThrottleMs']).toBe(999);
    });

    it('1.4 config.getUser is accessible and callable from internal config', () => {
      const internalConfig = (plugin as unknown as R)['config'] as R;
      const result = (internalConfig['getUser'] as () => unknown)();
      expect(result).toEqual({ id: 'user-1', name: 'Alice' });
    });
  });

  // ── Suite 2: getName() / onRender ─────────────────────────────────────────

  describe('getName() / onRender', () => {
    it('2.1 getName() returns usersPresence key', () => {
      expect(plugin.getName()).toBe(WEAVE_USERS_PRESENCE_PLUGIN_KEY);
      expect(plugin.getName()).toBe('usersPresence');
    });

    it('2.2 onRender is undefined', () => {
      expect(plugin.onRender).toBeUndefined();
    });
  });

  // ── Suite 3: onInit() — onAwarenessChange branches ───────────────────────

  describe('onInit() — onAwarenessChange', () => {
    beforeEach(() => {
      plugin.onInit();
    });

    it('3.1 change missing userPresence key → skipped, no findOne called', () => {
      mockWeave._eventHandlers['onAwarenessChange']?.([{ otherKey: 'value' }]);
      expect(mockWeave._stage.findOne).not.toHaveBeenCalled();
    });

    it('3.2 change has userPresence key but object has no node keys → skipped', () => {
      mockWeave._eventHandlers['onAwarenessChange']?.([
        { [WEAVE_USER_PRESENCE_KEY]: {} },
      ]);
      expect(mockWeave._stage.findOne).not.toHaveBeenCalled();
    });

    it('3.3 presenceInfo.userId === selfUser.id → own user skipped', () => {
      const change = {
        [WEAVE_USER_PRESENCE_KEY]: {
          n1: { userId: 'user-1', parentId: 'parent', nodeId: 'n1', attrs: {} },
        },
      };
      mockWeave._eventHandlers['onAwarenessChange']?.([change]);
      expect(mockWeave._stage.findOne).not.toHaveBeenCalled();
    });

    it('3.4 stage.findOne returns undefined → skipped, no setAttrs', () => {
      mockWeave._stage.findOne.mockReturnValue(undefined);
      const change = {
        [WEAVE_USER_PRESENCE_KEY]: {
          n1: { userId: 'user-2', parentId: 'parent', nodeId: 'n1', attrs: {} },
        },
      };
      mockWeave._eventHandlers['onAwarenessChange']?.([change]);
      // findOne was called but returned undefined — no error
      expect(mockWeave._stage.findOne).toHaveBeenCalledWith('#n1');
    });

    it('3.5 parent.getAttrs().nodeId exists → used as parentId', () => {
      const node = makeMockNode('n1', 'frame-1', true);
      mockWeave._stage.findOne.mockReturnValue(node);
      const change = {
        [WEAVE_USER_PRESENCE_KEY]: {
          n1: { userId: 'user-2', parentId: 'frame-1', nodeId: 'n1', attrs: { fill: 'blue' } },
        },
      };
      mockWeave._eventHandlers['onAwarenessChange']?.([change]);
      expect(node.setAttrs).toHaveBeenCalled();
    });

    it('3.6 parent.getAttrs().nodeId is falsy → fallback to parent.id()', () => {
      const node = makeMockNode('n1', 'layer-1', false);
      mockWeave._stage.findOne.mockReturnValue(node);
      const change = {
        [WEAVE_USER_PRESENCE_KEY]: {
          n1: { userId: 'user-2', parentId: 'layer-1', nodeId: 'n1', attrs: { fill: 'red' } },
        },
      };
      mockWeave._eventHandlers['onAwarenessChange']?.([change]);
      expect(node.setAttrs).toHaveBeenCalled();
    });

    it('3.7 getParent() returns undefined → parentId falls back to ""', () => {
      const node = {
        getParent: vi.fn().mockReturnValue(undefined),
        getAttrs: vi.fn().mockReturnValue({ id: 'n1' }),
        setAttrs: vi.fn(),
      };
      mockWeave._stage.findOne.mockReturnValue(node);
      const change = {
        [WEAVE_USER_PRESENCE_KEY]: {
          n1: { userId: 'user-2', parentId: '', nodeId: 'n1', attrs: { x: 10 } },
        },
      };
      mockWeave._eventHandlers['onAwarenessChange']?.([change]);
      // parentId is '' and presenceInfo.parentId is '' → match → setAttrs called
      expect(node.setAttrs).toHaveBeenCalled();
    });

    it('3.8 parentId matches presenceInfo.parentId → setAttrs called with merged attrs', () => {
      const node = makeMockNode('n1', 'p1', false, { x: 0, y: 0 });
      mockWeave._stage.findOne.mockReturnValue(node);
      const change = {
        [WEAVE_USER_PRESENCE_KEY]: {
          n1: { userId: 'user-2', parentId: 'p1', nodeId: 'n1', attrs: { x: 50, fill: 'green' } },
        },
      };
      mockWeave._eventHandlers['onAwarenessChange']?.([change]);
      expect(node.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({ x: 50, fill: 'green' })
      );
    });

    it('3.9 parentId does NOT match presenceInfo.parentId → setAttrs NOT called', () => {
      const node = makeMockNode('n1', 'layer-1', false);
      mockWeave._stage.findOne.mockReturnValue(node);
      const change = {
        [WEAVE_USER_PRESENCE_KEY]: {
          n1: { userId: 'user-2', parentId: 'different-parent', nodeId: 'n1', attrs: {} },
        },
      };
      mockWeave._eventHandlers['onAwarenessChange']?.([change]);
      expect(node.setAttrs).not.toHaveBeenCalled();
    });

    it('3.10 multiple changes, multiple nodes — all processed', () => {
      const n1 = makeMockNode('n1', 'p1', false);
      const n2 = makeMockNode('n2', 'p2', false);
      mockWeave._stage.findOne.mockImplementation((selector: unknown) => {
        if (selector === '#n1') return n1;
        if (selector === '#n2') return n2;
        return undefined;
      });
      const changes = [
        {
          [WEAVE_USER_PRESENCE_KEY]: {
            n1: { userId: 'user-2', parentId: 'p1', nodeId: 'n1', attrs: { x: 1 } },
          },
        },
        {
          [WEAVE_USER_PRESENCE_KEY]: {
            n2: { userId: 'user-3', parentId: 'p2', nodeId: 'n2', attrs: { x: 2 } },
          },
        },
      ];
      mockWeave._eventHandlers['onAwarenessChange']?.(changes);
      expect(n1.setAttrs).toHaveBeenCalled();
      expect(n2.setAttrs).toHaveBeenCalled();
    });
  });

  // ── Suite 4: sendPresence() ───────────────────────────────────────────────

  describe('sendPresence()', () => {
    it('4.1 calls store.setAwarenessInfo with WEAVE_USER_PRESENCE_KEY and current userPresence', () => {
      plugin.sendPresence();
      expect(mockWeave._store.setAwarenessInfo).toHaveBeenCalledWith(
        WEAVE_USER_PRESENCE_KEY,
        {}
      );
    });

    it('4.2 sends the state of userPresence at the time of call', () => {
      (plugin as unknown as R)['userPresence'] = {
        n1: { userId: 'user-1', parentId: 'p1', nodeId: 'n1', attrs: { x: 5 } },
      };
      plugin.sendPresence();
      expect(mockWeave._store.setAwarenessInfo).toHaveBeenCalledWith(
        WEAVE_USER_PRESENCE_KEY,
        expect.objectContaining({ n1: expect.objectContaining({ nodeId: 'n1' }) })
      );
    });
  });

  // ── Suite 5: setPresence() ────────────────────────────────────────────────

  describe('setPresence()', () => {
    it('5.1 stores entry with correct shape { userId, parentId, nodeId, attrs }', () => {
      plugin.setPresence('n1', 'p1', { fill: 'red' }, false);
      const presence = (plugin as unknown as R)['userPresence'] as R;
      expect(presence['n1']).toEqual({
        userId: 'user-1',
        parentId: 'p1',
        nodeId: 'n1',
        attrs: { fill: 'red' },
      });
    });

    it('5.2 forceUpdate=true (default) → sendPresence called immediately', () => {
      plugin.setPresence('n1', 'p1', {});
      expect(mockWeave._store.setAwarenessInfo).toHaveBeenCalledTimes(1);
    });

    it('5.3 forceUpdate=true → after 250 ms timer fires: userPresence reset to {} and sendPresence called again', () => {
      plugin.setPresence('n1', 'p1', {});
      mockWeave._store.setAwarenessInfo.mockClear();
      vi.advanceTimersByTime(250);
      expect((plugin as unknown as R)['userPresence']).toEqual({});
      expect(mockWeave._store.setAwarenessInfo).toHaveBeenCalledWith(
        WEAVE_USER_PRESENCE_KEY,
        {}
      );
    });

    it('5.4 forceUpdate=false → sendPresence NOT called, no timer', () => {
      plugin.setPresence('n1', 'p1', {}, false);
      expect(mockWeave._store.setAwarenessInfo).not.toHaveBeenCalled();
      vi.advanceTimersByTime(250);
      expect(mockWeave._store.setAwarenessInfo).not.toHaveBeenCalled();
    });

    it('5.5 multiple nodes stored as independent keys in userPresence', () => {
      plugin.setPresence('n1', 'p1', { x: 1 }, false);
      plugin.setPresence('n2', 'p2', { x: 2 }, false);
      const presence = (plugin as unknown as R)['userPresence'] as R;
      expect(Object.keys(presence)).toHaveLength(2);
      expect(presence['n1']).toBeDefined();
      expect(presence['n2']).toBeDefined();
    });
  });

  // ── Suite 6: forceSendPresence() ──────────────────────────────────────────

  describe('forceSendPresence()', () => {
    it('6.1 calls sendPresence immediately', () => {
      (plugin as unknown as R)['userPresence'] = {
        n1: { userId: 'user-1', parentId: 'p1', nodeId: 'n1', attrs: {} },
      };
      plugin.forceSendPresence();
      expect(mockWeave._store.setAwarenessInfo).toHaveBeenCalledTimes(1);
      expect(mockWeave._store.setAwarenessInfo).toHaveBeenCalledWith(
        WEAVE_USER_PRESENCE_KEY,
        expect.objectContaining({ n1: expect.anything() })
      );
    });

    it('6.2 after 250 ms: userPresence reset to {} and sendPresence called again', () => {
      plugin.forceSendPresence();
      mockWeave._store.setAwarenessInfo.mockClear();
      vi.advanceTimersByTime(250);
      expect((plugin as unknown as R)['userPresence']).toEqual({});
      expect(mockWeave._store.setAwarenessInfo).toHaveBeenCalledWith(
        WEAVE_USER_PRESENCE_KEY,
        {}
      );
    });
  });

  // ── Suite 7: enable() / disable() ────────────────────────────────────────

  describe('enable() / disable()', () => {
    it('7.1 enable() sets enabled to true', () => {
      plugin.disable();
      plugin.enable();
      expect((plugin as unknown as R)['enabled']).toBe(true);
    });

    it('7.2 disable() sets enabled to false', () => {
      plugin.disable();
      expect((plugin as unknown as R)['enabled']).toBe(false);
    });
  });
});
