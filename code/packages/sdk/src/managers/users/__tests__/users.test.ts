// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WeaveAwarenessChange, WeaveUser } from '@inditextech/weave-types';
import { WeaveUsersManager } from '../users';
import { WEAVE_USER_INFO_KEY } from '../constants';
import type { WeaveUserInfoKey } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

const USER1: WeaveUser = { id: 'u1', name: 'Alice', color: '#fff' };
const USER2: WeaveUser = { id: 'u2', name: 'Bob',   color: '#000' };

type Change = WeaveAwarenessChange<WeaveUserInfoKey, WeaveUser>;

function makeChange(user: WeaveUser | undefined): Change {
  return (user ? { [WEAVE_USER_INFO_KEY]: user } : {}) as unknown as Change;
}

function makeMockWeave() {
  const listeners: Record<string, (...args: unknown[]) => void> = {};
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  return {
    instance: {
      getChildLogger: vi.fn().mockReturnValue(logger),
      addEventListener: vi.fn().mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
        listeners[event] = cb;
      }),
      emitEvent: vi.fn(),
    } as unknown,
    logger,
    listeners,
  };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('WeaveUsersManager', () => {
  let mock: ReturnType<typeof makeMockWeave>;
  let manager: WeaveUsersManager;

  beforeEach(() => {
    mock = makeMockWeave();
    manager = new WeaveUsersManager(mock.instance as never);
  });

  // ── constructor ────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('calls getChildLogger with "users-manager"', () => {
      expect((mock.instance as { getChildLogger: ReturnType<typeof vi.fn> }).getChildLogger)
        .toHaveBeenCalledWith('users-manager');
    });

    it('logs debug "Users manager created"', () => {
      expect(mock.logger.debug).toHaveBeenCalledWith('Users manager created');
    });

    it('registers onAwarenessChange listener via addEventListener', () => {
      expect((mock.instance as { addEventListener: ReturnType<typeof vi.fn> }).addEventListener)
        .toHaveBeenCalledWith('onAwarenessChange', expect.any(Function));
    });
  });

  // ── onAwarenessChange listener ─────────────────────────────────────────

  describe('onAwarenessChange listener', () => {
    function trigger(changes: Change[]) {
      mock.listeners['onAwarenessChange'](changes);
    }

    it('skips a change with no userInfo (continue branch)', () => {
      trigger([makeChange(undefined)]);
      expect(manager.getUsers()).toHaveLength(0);
      expect((mock.instance as { emitEvent: ReturnType<typeof vi.fn> }).emitEvent).not.toHaveBeenCalled();
    });

    it('adds a new user and sets usersChanged = true, logs debug', () => {
      trigger([makeChange(USER1)]);
      expect(manager.getUsers()).toEqual([USER1]);
      expect(mock.logger.debug).toHaveBeenCalledWith(`User connected: ${USER1.name}`);
    });

    it('does not re-add a user already present in connectedUsers', () => {
      trigger([makeChange(USER1)]);
      vi.clearAllMocks();
      trigger([makeChange(USER1)]);
      expect(manager.getUsers()).toHaveLength(1);
      expect(mock.logger.debug).not.toHaveBeenCalled();
    });

    it('removes a user absent from new changes, sets usersChanged = true, logs debug', () => {
      trigger([makeChange(USER1)]);
      trigger([]); // USER1 no longer present
      expect(manager.getUsers()).toHaveLength(0);
      expect(mock.logger.debug).toHaveBeenCalledWith(`User disconnected: ${USER1.name}`);
    });

    it('emits onUsersChange when usersChanged is true', () => {
      trigger([makeChange(USER1)]);
      expect((mock.instance as { emitEvent: ReturnType<typeof vi.fn> }).emitEvent)
        .toHaveBeenCalledWith('onUsersChange');
    });

    it('does NOT emit onUsersChange when nothing changed (user already present)', () => {
      trigger([makeChange(USER1)]);
      const emitEvent = (mock.instance as { emitEvent: ReturnType<typeof vi.fn> }).emitEvent;
      emitEvent.mockClear();
      trigger([makeChange(USER1)]); // no change
      expect(emitEvent).not.toHaveBeenCalled();
    });

    it('handles mixed event: new user added + existing user removed in the same call', () => {
      trigger([makeChange(USER1)]);
      const emitEvent = (mock.instance as { emitEvent: ReturnType<typeof vi.fn> }).emitEvent;
      emitEvent.mockClear();
      trigger([makeChange(USER2)]); // USER1 removed, USER2 added
      expect(manager.getUsers()).toEqual([USER2]);
      expect(mock.logger.debug).toHaveBeenCalledWith(`User connected: ${USER2.name}`);
      expect(mock.logger.debug).toHaveBeenCalledWith(`User disconnected: ${USER1.name}`);
      expect(emitEvent).toHaveBeenCalledWith('onUsersChange');
    });
  });

  // ── getUsers ───────────────────────────────────────────────────────────

  describe('getUsers()', () => {
    it('returns [] when no users are connected', () => {
      expect(manager.getUsers()).toEqual([]);
    });

    it('returns all connected users as an array', () => {
      mock.listeners['onAwarenessChange']([makeChange(USER1), makeChange(USER2)]);
      expect(manager.getUsers()).toEqual(expect.arrayContaining([USER1, USER2]));
      expect(manager.getUsers()).toHaveLength(2);
    });
  });
});
