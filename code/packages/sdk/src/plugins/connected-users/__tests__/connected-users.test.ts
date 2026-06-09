// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));

import { WeaveConnectedUsersPlugin } from '../connected-users';
import {
  WEAVE_CONNECTED_USERS_KEY,
  WEAVE_CONNECTED_USER_INFO_KEY,
} from '../constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

type EventHandler = (data?: unknown) => void;

function makeUser(id = 'u1', name = 'Alice') {
  return { id, name };
}

function makeWeave(opts: { users?: ReturnType<typeof makeUser>[] } = {}) {
  const store = { setAwarenessInfo: vi.fn() };
  const eventHandlers: Record<string, EventHandler> = {};

  return {
    store,
    weave: {
      getStore: vi.fn().mockReturnValue(store),
      getUsers: vi.fn().mockReturnValue(opts.users ?? []),
      addEventListener: vi.fn((event: string, handler: EventHandler) => {
        eventHandlers[event] = handler;
      }),
      emitEvent: vi.fn(),
      getChildLogger: vi.fn().mockReturnValue({
        debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
      }),
    },
    eventHandlers,
  };
}

function setup(opts: { users?: ReturnType<typeof makeUser>[] } = {}) {
  const user = makeUser();
  const { store, weave, eventHandlers } = makeWeave(opts);
  const plugin = new WeaveConnectedUsersPlugin({
    config: { getUser: vi.fn().mockReturnValue(user) },
  });
  // @ts-expect-error — accessing protected instance for test setup
  plugin.instance = weave;
  plugin.onInit();
  return { plugin, weave, store, eventHandlers, user };
}

// ─── Suite 1: constructor + initialize() + getName() + statics ────────────────

describe('WeaveConnectedUsersPlugin - constructor + initialize() + statics', () => {
  it('1.1 constructor stores config', () => {
    const config = { getUser: vi.fn().mockReturnValue(makeUser()) };
    const plugin = new WeaveConnectedUsersPlugin({ config });
    // @ts-expect-error — accessing private config for test assertions
    expect(plugin.config).toBe(config);
  });

  it('1.2 initialize() resets connectedUsers to {}', () => {
    const { plugin, eventHandlers } = setup({ users: [makeUser()] });
    eventHandlers['onUsersChange']?.();
    plugin.initialize();
    // @ts-expect-error — accessing private connectedUsers for test assertions
    expect(plugin.connectedUsers).toEqual({});
  });

  it('1.3 getName() returns correct key', () => {
    const { plugin } = setup();
    expect(plugin.getName()).toBe(WEAVE_CONNECTED_USERS_KEY);
  });

  it('1.4 getLayerName, initLayer, onRender are undefined', () => {
    const { plugin } = setup();
    expect(plugin.getLayerName).toBeUndefined();
    expect(plugin.initLayer).toBeUndefined();
    expect(plugin.onRender).toBeUndefined();
  });
});

// ─── Suite 2: onInit() — initial setup ───────────────────────────────────────

describe('WeaveConnectedUsersPlugin - onInit() initial setup', () => {
  afterEach(() => vi.clearAllMocks());

  it('2.1 sets awarenessInfo with userInfo and emits onConnectedUsersChange', () => {
    const { store, weave, user } = setup();
    expect(store.setAwarenessInfo).toHaveBeenCalledWith(WEAVE_CONNECTED_USER_INFO_KEY, user);
    expect(weave.emitEvent).toHaveBeenCalledWith('onConnectedUsersChange', {
      [user.id]: user,
    });
  });

  it('2.2 addEventListener registered for onStoreConnectionStatusChange and onUsersChange', () => {
    const { weave } = setup();
    const events = (weave.addEventListener as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[0]
    );
    expect(events).toContain('onStoreConnectionStatusChange');
    expect(events).toContain('onUsersChange');
  });
});

// ─── Suite 3: onStoreConnectionStatusChange handler ──────────────────────────

describe('WeaveConnectedUsersPlugin - onStoreConnectionStatusChange', () => {
  afterEach(() => vi.clearAllMocks());

  it('3.1 status="connected" → setAwarenessInfo called with userInfo', () => {
    const { store, eventHandlers, user } = setup();
    store.setAwarenessInfo.mockClear();
    eventHandlers['onStoreConnectionStatusChange']?.('connected');
    expect(store.setAwarenessInfo).toHaveBeenCalledWith(WEAVE_CONNECTED_USER_INFO_KEY, user);
  });

  it('3.2 status="disconnected" → setAwarenessInfo called with undefined', () => {
    const { store, eventHandlers } = setup();
    store.setAwarenessInfo.mockClear();
    eventHandlers['onStoreConnectionStatusChange']?.('disconnected');
    expect(store.setAwarenessInfo).toHaveBeenCalledWith(WEAVE_CONNECTED_USER_INFO_KEY, undefined);
  });

  it('3.3 status="reconnecting" (any non-connected) → setAwarenessInfo called with undefined', () => {
    const { store, eventHandlers } = setup();
    store.setAwarenessInfo.mockClear();
    eventHandlers['onStoreConnectionStatusChange']?.('reconnecting');
    expect(store.setAwarenessInfo).toHaveBeenCalledWith(WEAVE_CONNECTED_USER_INFO_KEY, undefined);
  });
});

// ─── Suite 4: onUsersChange handler ──────────────────────────────────────────

describe('WeaveConnectedUsersPlugin - onUsersChange', () => {
  afterEach(() => vi.clearAllMocks());

  it('4.1 !enabled → emits onConnectedUsersChange with {}, returns early (getUsers not called)', () => {
    const { plugin, weave, eventHandlers } = setup();
    plugin.disable();
    weave.emitEvent.mockClear();
    eventHandlers['onUsersChange']?.();
    expect(weave.emitEvent).toHaveBeenCalledWith('onConnectedUsersChange', {});
    expect(weave.getUsers).not.toHaveBeenCalled();
  });

  it('4.2 users changed → emits onConnectedUsersChange with new users, updates connectedUsers', () => {
    const newUser = makeUser('u2', 'Bob');
    const { weave, eventHandlers, plugin } = setup({ users: [newUser] });
    weave.emitEvent.mockClear();
    eventHandlers['onUsersChange']?.();
    expect(weave.emitEvent).toHaveBeenCalledWith('onConnectedUsersChange', {
      [newUser.id]: newUser,
    });
    // @ts-expect-error — accessing private connectedUsers for test assertions
    expect(plugin.connectedUsers).toEqual({ [newUser.id]: newUser });
  });

  it('4.3 users unchanged (same as previous) → emitEvent NOT called again, connectedUsers updated', () => {
    const user = makeUser('u1', 'Alice');
    const { weave, eventHandlers, plugin } = setup({ users: [user] });
    // First call sets connectedUsers to { u1: user }
    eventHandlers['onUsersChange']?.();
    weave.emitEvent.mockClear();
    // Second call with same users — isEqual returns true → no emit
    eventHandlers['onUsersChange']?.();
    expect(weave.emitEvent).not.toHaveBeenCalled();
    // @ts-expect-error — accessing private connectedUsers for test assertions
    expect(plugin.connectedUsers).toEqual({ [user.id]: user });
  });

  it('4.4 empty users array → newUsers={}, compared with connectedUsers, connectedUsers updated', () => {
    const { weave, eventHandlers, plugin } = setup({ users: [] });
    weave.emitEvent.mockClear();
    // connectedUsers starts as {} (from initialize), users=[] → newUsers={} → isEqual → no emit
    eventHandlers['onUsersChange']?.();
    expect(weave.emitEvent).not.toHaveBeenCalled();
    // @ts-expect-error — accessing private connectedUsers for test assertions
    expect(plugin.connectedUsers).toEqual({});
  });
});

// ─── Suite 5: enable() / disable() ───────────────────────────────────────────

describe('WeaveConnectedUsersPlugin - enable() / disable()', () => {
  it('5.1 disable() then enable() toggles enabled correctly', () => {
    const { plugin } = setup();
    plugin.disable();
    expect(plugin.enabled).toBe(false);
    plugin.enable();
    expect(plugin.enabled).toBe(true);
  });
});
