// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Weave, WeaveConnectedUsers } from '@inditextech/weave-sdk';
import type { WeaveStateElement, WeaveSelection } from '@inditextech/weave-types';
import { useWeaveEvents } from '../events';
import { useWeave } from '@/components/store';

vi.mock('@inditextech/weave-sdk', () => ({
  Weave: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockInstance = {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  getLockDetails: ReturnType<typeof vi.fn>;
};

function createMockInstance(): MockInstance {
  return {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getLockDetails: vi.fn(),
  };
}

function captureHandler(
  inst: MockInstance,
  eventName: string
): (...args: unknown[]) => void {
  const call = (inst.addEventListener.mock.calls as [string, (...args: unknown[]) => void][]).find(
    ([name]) => name === eventName
  );
  if (!call) throw new Error(`No handler registered for event "${eventName}"`);
  return call[1];
}

beforeEach(() => {
  useWeave.getState().reset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// No instance — no listeners
// ---------------------------------------------------------------------------

describe('useWeaveEvents - no instance', () => {
  it('does not register any listeners when instance is null', () => {
    const mockInstance = createMockInstance();
    renderHook(() => useWeaveEvents());
    expect(mockInstance.addEventListener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Listener registration
// ---------------------------------------------------------------------------

describe('useWeaveEvents - listener registration', () => {
  it('registers all 8 listeners when instance is set', () => {
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    expect(mockInstance.addEventListener).toHaveBeenCalledTimes(8);
  });

  it.each([
    'onStoreRoomChanged',
    'onRoomSwitchingStart',
    'onRoomSwitchingEnd',
    'onSelectionState',
    'onZoomChange',
    'onNodesChange',
    'onConnectedUsersChange',
    'onMutexLockChange',
  ])('registers listener for %s', (eventName) => {
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    const registeredNames = (
      mockInstance.addEventListener.mock.calls as [string, ...unknown[]][]
    ).map(([name]) => name);
    expect(registeredNames).toContain(eventName);
  });
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

describe('useWeaveEvents - cleanup on unmount', () => {
  it('removes all 8 listeners on unmount', () => {
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    const { unmount } = renderHook(() => useWeaveEvents());

    unmount();

    expect(mockInstance.removeEventListener).toHaveBeenCalledTimes(8);
  });

  it.each([
    'onStoreRoomChanged',
    'onRoomSwitchingStart',
    'onRoomSwitchingEnd',
    'onSelectionState',
    'onZoomChange',
    'onNodesChange',
    'onConnectedUsersChange',
    'onMutexLockChange',
  ])('removes listener for %s exactly once', (eventName) => {
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    const { unmount } = renderHook(() => useWeaveEvents());
    unmount();

    const removedForEvent = (
      mockInstance.removeEventListener.mock.calls as [string, ...unknown[]][]
    ).filter(([name]) => name === eventName);
    expect(removedForEvent).toHaveLength(1);
  });

  it('re-registers listeners when instance changes and removes old ones', () => {
    const instance1 = createMockInstance();
    const instance2 = createMockInstance();

    useWeave.getState().setInstance(instance1 as unknown as Weave);
    renderHook(() => useWeaveEvents());

    // Swap the instance — the effect cleanup should remove from instance1
    // and the new effect should add to instance2
    act(() => {
      useWeave.getState().setInstance(instance2 as unknown as Weave);
    });

    expect(instance1.removeEventListener).toHaveBeenCalledTimes(8);
    expect(instance2.addEventListener).toHaveBeenCalledTimes(8);
  });
});

// ---------------------------------------------------------------------------
// Handler: onStoreRoomChanged
// ---------------------------------------------------------------------------

describe('useWeaveEvents - onStoreRoomChanged', () => {
  it('calls setRoomId with the received room value', () => {
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    act(() => captureHandler(mockInstance, 'onStoreRoomChanged')({ room: 'room-42' }));

    expect(useWeave.getState().room.id).toBe('room-42');
  });

  it('clears roomId when null is received', () => {
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    act(() => captureHandler(mockInstance, 'onStoreRoomChanged')({ room: null }));

    expect(useWeave.getState().room.id).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Handlers: onRoomSwitchingStart / onRoomSwitchingEnd
// ---------------------------------------------------------------------------

describe('useWeaveEvents - room switching handlers', () => {
  it('onRoomSwitchingStart sets room.switching to true', () => {
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    act(() => captureHandler(mockInstance, 'onRoomSwitchingStart')());

    expect(useWeave.getState().room.switching).toBe(true);
  });

  it('onRoomSwitchingEnd sets room.switching to false', () => {
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    act(() => {
      captureHandler(mockInstance, 'onRoomSwitchingStart')();
      captureHandler(mockInstance, 'onRoomSwitchingEnd')();
    });

    expect(useWeave.getState().room.switching).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Handler: onSelectionState
// ---------------------------------------------------------------------------

describe('useWeaveEvents - onSelectionState', () => {
  it('sets selection.active to true when fired with true', () => {
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    act(() => captureHandler(mockInstance, 'onSelectionState')(true));

    expect(useWeave.getState().selection.active).toBe(true);
  });

  it('sets selection.active to false when fired with false', () => {
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    act(() => captureHandler(mockInstance, 'onSelectionState')(false));

    expect(useWeave.getState().selection.active).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Handler: onZoomChange
// ---------------------------------------------------------------------------

describe('useWeaveEvents - onZoomChange', () => {
  it('updates zoom value, canZoomIn, and canZoomOut', () => {
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    act(() =>
      captureHandler(mockInstance, 'onZoomChange')({ scale: 1.5, canZoomIn: true, canZoomOut: false })
    );

    expect(useWeave.getState().zoom.value).toBe(1.5);
    expect(useWeave.getState().zoom.canZoomIn).toBe(true);
    expect(useWeave.getState().zoom.canZoomOut).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Handler: onNodesChange
// ---------------------------------------------------------------------------

describe('useWeaveEvents - onNodesChange', () => {
  it('sets node and selectedNodes when 1 node with a different key arrives', () => {
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    const newNode = { key: 'n1', type: 'rect' } as unknown as WeaveStateElement;
    act(() => captureHandler(mockInstance, 'onNodesChange')([{ node: newNode }]));

    expect(useWeave.getState().selection.node).toEqual(newNode);
    expect(useWeave.getState().selection.nodes).toEqual([{ node: newNode }]);
  });

  it('does not change node when 1 node with the same key arrives', () => {
    const existingNode = { key: 'n1', type: 'rect' } as unknown as WeaveStateElement;
    useWeave.getState().setNode(existingNode);

    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    act(() => captureHandler(mockInstance, 'onNodesChange')([{ node: { key: 'n1' } }]));

    expect(useWeave.getState().selection.node).toEqual(existingNode);
    expect(useWeave.getState().selection.nodes).toEqual([{ node: { key: 'n1' } }]);
  });

  it('clears node when 0 nodes arrive', () => {
    useWeave.getState().setNode({ key: 'n1' } as unknown as WeaveStateElement);
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    act(() => captureHandler(mockInstance, 'onNodesChange')([]));

    expect(useWeave.getState().selection.node).toBeUndefined();
    expect(useWeave.getState().selection.nodes).toEqual([]);
  });

  it('clears node when more than 1 node arrives', () => {
    useWeave.getState().setNode({ key: 'n1' } as unknown as WeaveStateElement);
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    const multiNodes = [{ node: { key: 'n1' } }, { node: { key: 'n2' } }] as unknown as WeaveSelection[];
    act(() => captureHandler(mockInstance, 'onNodesChange')(multiNodes));

    expect(useWeave.getState().selection.node).toBeUndefined();
    expect(useWeave.getState().selection.nodes).toEqual(multiNodes);
  });

  it('always updates selectedNodes regardless of node count', () => {
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    const nodes = [{ node: { key: 'a' } }, { node: { key: 'b' } }] as unknown as WeaveSelection[];
    act(() => captureHandler(mockInstance, 'onNodesChange')(nodes));

    expect(useWeave.getState().selection.nodes).toEqual(nodes);
  });
});

// ---------------------------------------------------------------------------
// Handler: onConnectedUsersChanged
// ---------------------------------------------------------------------------

describe('useWeaveEvents - onConnectedUsersChanged', () => {
  it('updates the users map', () => {
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    const users = { u1: { id: 'u1', name: 'Alice' } } as unknown as WeaveConnectedUsers;
    act(() => captureHandler(mockInstance, 'onConnectedUsersChange')(users));

    expect(useWeave.getState().users).toEqual(users);
  });
});

// ---------------------------------------------------------------------------
// Handler: onMutexLockChange
// ---------------------------------------------------------------------------

describe('useWeaveEvents - onMutexLockChange', () => {
  it('builds usersLocks from getLockDetails for each lock key', () => {
    const mockInstance = createMockInstance();
    const lockInfo = { user: 'u1', nodeKey: 'n1' };
    mockInstance.getLockDetails.mockReturnValue(lockInfo);
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    act(() => captureHandler(mockInstance, 'onMutexLockChange')({ locks: ['lock-1', 'lock-2'] }));

    expect(useWeave.getState().usersLocks).toEqual({
      'lock-1': lockInfo,
      'lock-2': lockInfo,
    });
  });

  it('omits lock keys for which getLockDetails returns null/undefined', () => {
    const mockInstance = createMockInstance();
    mockInstance.getLockDetails.mockImplementation((key: string) =>
      key === 'lock-1' ? { user: 'u1' } : null
    );
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    act(() => captureHandler(mockInstance, 'onMutexLockChange')({ locks: ['lock-1', 'lock-2'] }));

    expect(useWeave.getState().usersLocks).toEqual({ 'lock-1': { user: 'u1' } });
  });

  it('sets usersLocks to empty object when no locks are provided', () => {
    const mockInstance = createMockInstance();
    useWeave.getState().setInstance(mockInstance as unknown as Weave);
    renderHook(() => useWeaveEvents());

    act(() => captureHandler(mockInstance, 'onMutexLockChange')({ locks: [] }));

    expect(useWeave.getState().usersLocks).toEqual({});
  });
});
