// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Weave } from '@/weave';
import { type WeaveUser } from '@inditextech/weave-types';
import { WeaveMutexManager } from '@/managers/mutex/mutex';

// ─── Constants ───────────────────────────────────────────────────────────────

const USER1: WeaveUser = { id: 'user1', name: 'User One', email: 'u1@test.com' };
const USER2: WeaveUser = { id: 'user2', name: 'User Two', email: 'u2@test.com' };

// Awareness change keys (matching the private const + imported constant)
const USER_INFO_KEY = 'userInfo';   // WEAVE_CONNECTED_USER_INFO_KEY
const MUTEX_LOCK_KEY = 'userMutexLock'; // WEAVE_USER_MUTEX_LOCK_KEY

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMockNode() {
  return { lockMutex: vi.fn(), releaseMutex: vi.fn() };
}

function makeMockWeave(actUser: WeaveUser = USER1) {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const listeners: Record<string, (...args: unknown[]) => void> = {};
  const stage = { findOne: vi.fn().mockReturnValue(null) };
  return {
    getChildLogger: vi.fn().mockReturnValue(logger),
    addEventListener: vi.fn().mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
      listeners[event] = cb;
    }),
    getStore: vi.fn().mockReturnValue({
      getUser: vi.fn().mockReturnValue(actUser),
      setAwarenessInfo: vi.fn(),
    }),
    emitEvent: vi.fn(),
    getStage: vi.fn().mockReturnValue(stage),
    _logger: logger,
    _listeners: listeners,
    _stage: stage,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('WeaveMutexManager', () => {
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let manager: WeaveMutexManager;

  beforeEach(() => {
    mockWeave = makeMockWeave(USER1);
    manager = new WeaveMutexManager(mockWeave as unknown as Weave);
  });

  // ─── Suite 1: constructor ────────────────────────────────────────────────

  describe('constructor', () => {
    it('calls getChildLogger with "mutex-manager"', () => {
      expect(mockWeave.getChildLogger).toHaveBeenCalledWith('mutex-manager');
    });

    it('logs debug "Mutex manager created"', () => {
      expect(mockWeave._logger.debug).toHaveBeenCalledWith('Mutex manager created');
    });

    it('registers onConnectedUsersChange and onAwarenessChange listeners', () => {
      expect(mockWeave.addEventListener).toHaveBeenCalledWith(
        'onConnectedUsersChange',
        expect.any(Function)
      );
      expect(mockWeave.addEventListener).toHaveBeenCalledWith(
        'onAwarenessChange',
        expect.any(Function)
      );
    });
  });

  // ─── Suite 2: onConnectedUsersChange listener ────────────────────────────

  describe('onConnectedUsersChange listener', () => {
    it('does nothing when no users are locked', () => {
      const releaseSpy = vi.spyOn(manager, 'releaseMutexLockRemote');
      mockWeave._listeners['onConnectedUsersChange']({ user2: USER2 });
      expect(releaseSpy).not.toHaveBeenCalled();
    });

    it('skips the current user\'s own lock key', () => {
      // Lock USER1 (the actUser)
      manager.setMutexLock({ nodeIds: [], operation: 'op' }); // locks user1
      const releaseSpy = vi.spyOn(manager, 'releaseMutexLockRemote');
      // USER1 absent from users map — but it's actUser.id so should be skipped
      mockWeave._listeners['onConnectedUsersChange']({});
      expect(releaseSpy).not.toHaveBeenCalled();
    });

    it('skips foreign user who is still in the connected users map', () => {
      manager.setMutexLockRemote({ nodeIds: [], operation: 'op' }, USER2);
      const releaseSpy = vi.spyOn(manager, 'releaseMutexLockRemote');
      // USER2 is still present in users
      mockWeave._listeners['onConnectedUsersChange']({ user2: USER2 });
      expect(releaseSpy).not.toHaveBeenCalled();
    });

    it('calls releaseMutexLockRemote for foreign disconnected user', () => {
      manager.setMutexLockRemote({ nodeIds: [], operation: 'op' }, USER2);
      const releaseSpy = vi.spyOn(manager, 'releaseMutexLockRemote');
      // USER2 absent from users → disconnected
      mockWeave._listeners['onConnectedUsersChange']({});
      expect(releaseSpy).toHaveBeenCalledWith(USER2);
    });
  });

  // ─── Suite 3: onAwarenessChange listener ─────────────────────────────────

  describe('onAwarenessChange listener', () => {
    it('skips change when userInfo is falsy', () => {
      const releaseSpy = vi.spyOn(manager, 'releaseMutexLockRemote');
      const setSpy = vi.spyOn(manager, 'setMutexLockRemote');
      mockWeave._listeners['onAwarenessChange']([{ [USER_INFO_KEY]: null }]);
      expect(releaseSpy).not.toHaveBeenCalled();
      expect(setSpy).not.toHaveBeenCalled();
    });

    it('calls releaseMutexLockRemote when remote lock is removed (userMutexLock undefined)', () => {
      // First register a lock for USER2
      manager.setMutexLockRemote({ nodeIds: [], operation: 'op' }, USER2);
      const releaseSpy = vi.spyOn(manager, 'releaseMutexLockRemote');

      mockWeave._listeners['onAwarenessChange']([
        { [USER_INFO_KEY]: USER2, [MUTEX_LOCK_KEY]: undefined },
      ]);
      expect(releaseSpy).toHaveBeenCalledWith(USER2);
    });

    it('calls setMutexLockRemote when remote lock appears (userMutexLock defined)', () => {
      const setSpy = vi.spyOn(manager, 'setMutexLockRemote');
      const lockInfo = { nodeIds: ['n1'], operation: 'move', metadata: undefined };

      mockWeave._listeners['onAwarenessChange']([
        { [USER_INFO_KEY]: USER2, [MUTEX_LOCK_KEY]: lockInfo },
      ]);
      expect(setSpy).toHaveBeenCalledWith(
        { nodeIds: ['n1'], operation: 'move', metadata: undefined },
        USER2
      );
    });

    it('skips when the change is from the current user (actUser.id === remoteUser.id)', () => {
      const releaseSpy = vi.spyOn(manager, 'releaseMutexLockRemote');
      const setSpy = vi.spyOn(manager, 'setMutexLockRemote');
      // Change from USER1 (same as actUser)
      mockWeave._listeners['onAwarenessChange']([
        { [USER_INFO_KEY]: USER1, [MUTEX_LOCK_KEY]: undefined },
      ]);
      expect(releaseSpy).not.toHaveBeenCalled();
      expect(setSpy).not.toHaveBeenCalled();
    });

    it('does not release when userMutexLock is undefined and no existing lock in map', () => {
      // No lock registered for USER2 → actualMutexLock === undefined → condition false
      const releaseSpy = vi.spyOn(manager, 'releaseMutexLockRemote');
      mockWeave._listeners['onAwarenessChange']([
        { [USER_INFO_KEY]: USER2, [MUTEX_LOCK_KEY]: undefined },
      ]);
      expect(releaseSpy).not.toHaveBeenCalled();
    });
  });

  // ─── Suite 4: acquireMutexLock ───────────────────────────────────────────

  describe('acquireMutexLock', () => {
    it('calls action and releases lock when mutex is acquired', async () => {
      let called = false;
      await manager.acquireMutexLock({ nodeIds: [], operation: 'op' }, () => { called = true; });
      expect(called).toBe(true);
      // After release, user no longer locked
      expect(manager.getUserMutexLock('user1')).toBeUndefined();
    });

    it('does NOT call action when mutex cannot be acquired', async () => {
      manager.setMutexLock({ nodeIds: [], operation: 'existing' }); // pre-lock
      let called = false;
      await manager.acquireMutexLock({ nodeIds: [], operation: 'op' }, () => { called = true; });
      expect(called).toBe(false);
    });

    it('awaits a Promise-returning action before releasing', async () => {
      const order: string[] = [];
      await manager.acquireMutexLock(
        { nodeIds: [], operation: 'op' },
        async () => {
          await Promise.resolve();
          order.push('action');
        }
      );
      order.push('after');
      expect(order).toEqual(['action', 'after']);
    });
  });

  // ─── Suite 5: getUserMutexLock / getNodeMutexLock ────────────────────────

  describe('getUserMutexLock / getNodeMutexLock', () => {
    it('getUserMutexLock returns the lock when key exists', () => {
      manager.setMutexLock({ nodeIds: [], operation: 'op' });
      expect(manager.getUserMutexLock('user1')).toBeDefined();
    });

    it('getUserMutexLock returns undefined when key not in map', () => {
      expect(manager.getUserMutexLock('missing')).toBeUndefined();
    });

    it('getNodeMutexLock returns the lock when key exists', () => {
      manager.setMutexLock({ nodeIds: ['n1'], operation: 'op' });
      expect(manager.getNodeMutexLock('n1')).toBeDefined();
    });

    it('getNodeMutexLock returns undefined when key not in map', () => {
      expect(manager.getNodeMutexLock('missing')).toBeUndefined();
    });
  });

  // ─── Suite 6: getUserMutexKey / getNodeMutexKey ──────────────────────────

  describe('getUserMutexKey / getNodeMutexKey', () => {
    it('getUserMutexKey returns store.getUser().id when no user provided', () => {
      expect(manager.getUserMutexKey()).toBe('user1');
    });

    it('getUserMutexKey returns provided user.id when user is given', () => {
      expect(manager.getUserMutexKey(USER2)).toBe('user2');
    });

    it('getNodeMutexKey returns the nodeId unchanged', () => {
      expect(manager.getNodeMutexKey('rect-abc')).toBe('rect-abc');
    });
  });

  // ─── Suite 7: setMutexLockRemote ─────────────────────────────────────────

  describe('setMutexLockRemote', () => {
    it('delegates to setMutexLock with sendAwareness=false (no setAwarenessInfo call)', () => {
      manager.setMutexLockRemote({ nodeIds: [], operation: 'op' }, USER2);
      expect(mockWeave.getStore().setAwarenessInfo).not.toHaveBeenCalled();
      // But user2 should be locked
      expect(manager.getUserMutexLock('user2')).toBeDefined();
    });
  });

  // ─── Suite 8: setMutexLock ───────────────────────────────────────────────

  describe('setMutexLock', () => {
    it('returns false immediately when user is already locked', () => {
      manager.setMutexLock({ nodeIds: [], operation: 'first' });
      const result = manager.setMutexLock({ nodeIds: [], operation: 'second' });
      expect(result).toBe(false);
    });

    it('returns false when the first node is already locked by another user', () => {
      manager.setMutexLockRemote({ nodeIds: ['n1'], operation: 'op' }, USER2);
      const result = manager.setMutexLock({ nodeIds: ['n1', 'n2'], operation: 'op' });
      expect(result).toBe(false);
    });

    it('rolls back partially locked nodes when a later node is already locked', () => {
      // Pre-lock n2 for user2
      manager.setMutexLockRemote({ nodeIds: ['n2'], operation: 'op' }, USER2);
      // Try to lock n1+n2 for user1 — n1 succeeds, n2 breaks, n1 should be rolled back
      manager.setMutexLock({ nodeIds: ['n1', 'n2'], operation: 'op' });
      // n1 should have been rolled back
      expect(manager.getNodeMutexLock('n1')).toBeUndefined();
    });

    it('calls nodeInstance.lockMutex(user) when nodeInstance is found', () => {
      const mockNode = makeMockNode();
      mockWeave._stage.findOne.mockReturnValue(mockNode);
      manager.setMutexLock({ nodeIds: ['n1'], operation: 'op' });
      expect(mockNode.lockMutex).toHaveBeenCalledWith(USER1);
    });

    it('does not throw when nodeInstance is null (no lockMutex call)', () => {
      mockWeave._stage.findOne.mockReturnValue(null);
      expect(() => manager.setMutexLock({ nodeIds: ['n1'], operation: 'op' })).not.toThrow();
    });

    it('calls store.setAwarenessInfo when sendAwareness is true (default)', () => {
      manager.setMutexLock({ nodeIds: [], operation: 'op' });
      expect(mockWeave.getStore().setAwarenessInfo).toHaveBeenCalledWith(
        'userMutexLock',
        expect.objectContaining({ user: USER1, operation: 'op' })
      );
    });

    it('does NOT call setAwarenessInfo when sendAwareness is false', () => {
      manager.setMutexLock({ nodeIds: [], operation: 'op' }, undefined, false);
      expect(mockWeave.getStore().setAwarenessInfo).not.toHaveBeenCalled();
    });

    it('emits onMutexLockChange with locked user keys on success', () => {
      manager.setMutexLock({ nodeIds: [], operation: 'op' });
      expect(mockWeave.emitEvent).toHaveBeenCalledWith(
        'onMutexLockChange',
        { locks: ['user1'] }
      );
    });
  });

  // ─── Suite 9: releaseMutexLockRemote ─────────────────────────────────────

  describe('releaseMutexLockRemote', () => {
    it('delegates to releaseMutexLock with sendAwareness=false (no setAwarenessInfo)', () => {
      manager.setMutexLockRemote({ nodeIds: [], operation: 'op' }, USER2);
      mockWeave.getStore().setAwarenessInfo.mockClear();

      manager.releaseMutexLockRemote(USER2);

      expect(mockWeave.getStore().setAwarenessInfo).not.toHaveBeenCalled();
      expect(manager.getUserMutexLock('user2')).toBeUndefined();
    });
  });

  // ─── Suite 10: releaseMutexLock ──────────────────────────────────────────

  describe('releaseMutexLock', () => {
    it('does nothing when user is not locked', () => {
      expect(() => manager.releaseMutexLock()).not.toThrow();
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onMutexLockChange', expect.anything());
    });

    it('calls nodeInstance.releaseMutex() and removes node lock when nodeInstance found', () => {
      const mockNode = makeMockNode();
      mockWeave._stage.findOne.mockReturnValue(mockNode);
      manager.setMutexLock({ nodeIds: ['n1'], operation: 'op' });
      mockWeave._stage.findOne.mockReturnValue(mockNode); // still available on release
      manager.releaseMutexLock();
      expect(mockNode.releaseMutex).toHaveBeenCalled();
      expect(manager.getNodeMutexLock('n1')).toBeUndefined();
    });

    it('removes node lock without calling releaseMutex when nodeInstance is null', () => {
      mockWeave._stage.findOne.mockReturnValue(null);
      manager.setMutexLock({ nodeIds: ['n1'], operation: 'op' });
      manager.releaseMutexLock();
      expect(manager.getNodeMutexLock('n1')).toBeUndefined();
    });

    it('calls store.setAwarenessInfo(key, undefined) when sendAwareness is true', () => {
      manager.setMutexLock({ nodeIds: [], operation: 'op' });
      mockWeave.getStore().setAwarenessInfo.mockClear();
      manager.releaseMutexLock();
      expect(mockWeave.getStore().setAwarenessInfo).toHaveBeenCalledWith('userMutexLock', undefined);
    });

    it('does NOT call setAwarenessInfo when sendAwareness is false', () => {
      manager.setMutexLock({ nodeIds: [], operation: 'op' });
      mockWeave.getStore().setAwarenessInfo.mockClear();
      manager.releaseMutexLock(undefined, false);
      expect(mockWeave.getStore().setAwarenessInfo).not.toHaveBeenCalled();
    });

    it('emits onMutexLockChange with empty locks array after release', () => {
      manager.setMutexLock({ nodeIds: [], operation: 'op' });
      mockWeave.emitEvent.mockClear();
      manager.releaseMutexLock();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onMutexLockChange', { locks: [] });
    });
  });
});
