// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WEAVE_INSTANCE_STATUS } from '@inditextech/weave-types';
import type { WeaveState, WeaveSelection, WeaveStateElement } from '@inditextech/weave-types';
import type { Weave, WeaveConnectedUsers } from '@inditextech/weave-sdk';
import { useWeave } from '../store';

vi.mock('@inditextech/weave-sdk', () => ({
  Weave: vi.fn(),
}));

beforeEach(() => {
  useWeave.getState().reset();
});

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

describe('useWeave store - default state', () => {
  it('instance defaults to null', () => {
    expect(useWeave.getState().instance).toBeNull();
  });

  it('appState defaults to empty weave and weaveMetadata', () => {
    expect(useWeave.getState().appState).toEqual({ weave: {}, weaveMetadata: {} });
  });

  it('status defaults to WEAVE_INSTANCE_STATUS.IDLE', () => {
    expect(useWeave.getState().status).toBe(WEAVE_INSTANCE_STATUS.IDLE);
  });

  it('room defaults to id:null, switching:false, loaded:false', () => {
    expect(useWeave.getState().room).toEqual({ id: null, switching: false, loaded: false });
  });

  it('asyncElements defaults to idle state with zero counts', () => {
    expect(useWeave.getState().asyncElements).toEqual({ state: 'idle', loaded: 0, total: 0 });
  });

  it('connection defaults to disconnected', () => {
    expect(useWeave.getState().connection).toEqual({ status: 'disconnected' });
  });

  it('users defaults to empty object', () => {
    expect(useWeave.getState().users).toEqual({});
  });

  it('undoRedo defaults to canUndo:false and canRedo:false', () => {
    expect(useWeave.getState().undoRedo).toEqual({ canUndo: false, canRedo: false });
  });

  it('usersLocks defaults to empty object', () => {
    expect(useWeave.getState().usersLocks).toEqual({});
  });

  it('zoom defaults to value:1, canZoomIn:false, canZoomOut:false', () => {
    expect(useWeave.getState().zoom).toEqual({ value: 1, canZoomIn: false, canZoomOut: false });
  });

  it('selection defaults to inactive, empty nodes, undefined node', () => {
    expect(useWeave.getState().selection).toEqual({ active: false, nodes: [], node: undefined });
  });

  it('actions defaults to inactive with undefined actual', () => {
    expect(useWeave.getState().actions).toEqual({ active: false, actual: undefined });
  });
});

// ---------------------------------------------------------------------------
// Setters
// ---------------------------------------------------------------------------

describe('useWeave store - setters', () => {
  it('setInstance updates instance', () => {
    const mock = {} as unknown as Weave;
    useWeave.getState().setInstance(mock);
    expect(useWeave.getState().instance).toBe(mock);
  });

  it('setInstance to null clears instance', () => {
    useWeave.getState().setInstance({} as unknown as Weave);
    useWeave.getState().setInstance(null);
    expect(useWeave.getState().instance).toBeNull();
  });

  it('setStatus updates status', () => {
    useWeave.getState().setStatus(WEAVE_INSTANCE_STATUS.STARTING);
    expect(useWeave.getState().status).toBe(WEAVE_INSTANCE_STATUS.STARTING);
  });

  it('setAppState updates appState', () => {
    const newState = { weave: { nodeA: { id: 'a', type: 'rect' } }, weaveMetadata: {} } as unknown as WeaveState;
    useWeave.getState().setAppState(newState);
    expect(useWeave.getState().appState).toEqual(newState);
  });

  it('setConnectionStatus updates connection.status', () => {
    useWeave.getState().setConnectionStatus('connected');
    expect(useWeave.getState().connection.status).toBe('connected');
  });

  it('setConnectionStatus does not affect other state slices', () => {
    useWeave.getState().setRoomId('room-1');
    useWeave.getState().setConnectionStatus('connected');
    expect(useWeave.getState().room.id).toBe('room-1');
  });

  it('setRoomId updates room.id', () => {
    useWeave.getState().setRoomId('room-42');
    expect(useWeave.getState().room.id).toBe('room-42');
  });

  it('setRoomId to null clears room.id', () => {
    useWeave.getState().setRoomId('room-42');
    useWeave.getState().setRoomId(null);
    expect(useWeave.getState().room.id).toBeNull();
  });

  it('setRoomId preserves other room fields', () => {
    useWeave.getState().setRoomSwitching(true);
    useWeave.getState().setRoomId('room-1');
    expect(useWeave.getState().room.switching).toBe(true);
  });

  it('setRoomSwitching toggles room.switching', () => {
    useWeave.getState().setRoomSwitching(true);
    expect(useWeave.getState().room.switching).toBe(true);
    useWeave.getState().setRoomSwitching(false);
    expect(useWeave.getState().room.switching).toBe(false);
  });

  it('setRoomLoaded toggles room.loaded', () => {
    useWeave.getState().setRoomLoaded(true);
    expect(useWeave.getState().room.loaded).toBe(true);
    useWeave.getState().setRoomLoaded(false);
    expect(useWeave.getState().room.loaded).toBe(false);
  });

  it('setAsyncElements updates loaded and total counts', () => {
    useWeave.getState().setAsyncElements(3, 10);
    const { loaded, total } = useWeave.getState().asyncElements;
    expect(loaded).toBe(3);
    expect(total).toBe(10);
  });

  it('setAsyncElements preserves asyncElements.state', () => {
    useWeave.getState().setAsyncElementsState('loading');
    useWeave.getState().setAsyncElements(5, 10);
    expect(useWeave.getState().asyncElements.state).toBe('loading');
  });

  it('setAsyncElementsState transitions through idle, loading, loaded', () => {
    useWeave.getState().setAsyncElementsState('loading');
    expect(useWeave.getState().asyncElements.state).toBe('loading');
    useWeave.getState().setAsyncElementsState('loaded');
    expect(useWeave.getState().asyncElements.state).toBe('loaded');
    useWeave.getState().setAsyncElementsState('idle');
    expect(useWeave.getState().asyncElements.state).toBe('idle');
  });

  it('setUsers replaces users map', () => {
    const users = { u1: { id: 'u1' } } as unknown as WeaveConnectedUsers;
    useWeave.getState().setUsers(users);
    expect(useWeave.getState().users).toEqual(users);
  });

  it('setCanUndo updates undoRedo.canUndo', () => {
    useWeave.getState().setCanUndo(true);
    expect(useWeave.getState().undoRedo.canUndo).toBe(true);
  });

  it('setCanUndo does not affect canRedo', () => {
    useWeave.getState().setCanRedo(true);
    useWeave.getState().setCanUndo(false);
    expect(useWeave.getState().undoRedo.canRedo).toBe(true);
  });

  it('setCanRedo updates undoRedo.canRedo', () => {
    useWeave.getState().setCanRedo(true);
    expect(useWeave.getState().undoRedo.canRedo).toBe(true);
  });

  it('setCanRedo does not affect canUndo', () => {
    useWeave.getState().setCanUndo(true);
    useWeave.getState().setCanRedo(false);
    expect(useWeave.getState().undoRedo.canUndo).toBe(true);
  });

  it('setUsersLocks replaces usersLocks map', () => {
    const locks = { 'lock-1': { user: 'u1' } };
    useWeave.getState().setUsersLocks(locks);
    expect(useWeave.getState().usersLocks).toEqual(locks);
  });

  it('setZoom updates zoom.value', () => {
    useWeave.getState().setZoom(1.5);
    expect(useWeave.getState().zoom.value).toBe(1.5);
  });

  it('setZoom preserves canZoomIn and canZoomOut', () => {
    useWeave.getState().setCanZoomIn(true);
    useWeave.getState().setCanZoomOut(true);
    useWeave.getState().setZoom(2);
    expect(useWeave.getState().zoom.canZoomIn).toBe(true);
    expect(useWeave.getState().zoom.canZoomOut).toBe(true);
  });

  it('setCanZoomIn updates zoom.canZoomIn', () => {
    useWeave.getState().setCanZoomIn(true);
    expect(useWeave.getState().zoom.canZoomIn).toBe(true);
  });

  it('setCanZoomOut updates zoom.canZoomOut', () => {
    useWeave.getState().setCanZoomOut(true);
    expect(useWeave.getState().zoom.canZoomOut).toBe(true);
  });

  it('setSelectionActive toggles selection.active', () => {
    useWeave.getState().setSelectionActive(true);
    expect(useWeave.getState().selection.active).toBe(true);
    useWeave.getState().setSelectionActive(false);
    expect(useWeave.getState().selection.active).toBe(false);
  });

  it('setSelectedNodes replaces selection.nodes', () => {
    const nodes = [{ node: { key: 'n1', type: 'rect' } }] as unknown as WeaveSelection[];
    useWeave.getState().setSelectedNodes(nodes);
    expect(useWeave.getState().selection.nodes).toEqual(nodes);
  });

  it('setNode updates selection.node', () => {
    const node = { key: 'n1', type: 'rect' } as unknown as WeaveStateElement;
    useWeave.getState().setNode(node);
    expect(useWeave.getState().selection.node).toEqual(node);
  });

  it('setNode to undefined clears selection.node', () => {
    useWeave.getState().setNode({ key: 'n1' } as unknown as WeaveStateElement);
    useWeave.getState().setNode(undefined);
    expect(useWeave.getState().selection.node).toBeUndefined();
  });

  it('setActualAction with a value sets active=true and stores the action name', () => {
    useWeave.getState().setActualAction('draw');
    expect(useWeave.getState().actions.active).toBe(true);
    expect(useWeave.getState().actions.actual).toBe('draw');
  });

  it('setActualAction with undefined sets active=false and clears actual', () => {
    useWeave.getState().setActualAction('draw');
    useWeave.getState().setActualAction(undefined);
    expect(useWeave.getState().actions.active).toBe(false);
    expect(useWeave.getState().actions.actual).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe('useWeave store - reset', () => {
  it('restores all state to defaults after multiple mutations', () => {
    useWeave.getState().setRoomId('room-1');
    useWeave.getState().setRoomSwitching(true);
    useWeave.getState().setRoomLoaded(true);
    useWeave.getState().setZoom(2);
    useWeave.getState().setCanZoomIn(true);
    useWeave.getState().setCanZoomOut(true);
    useWeave.getState().setCanRedo(true);
    useWeave.getState().setActualAction('draw');
    useWeave.getState().setConnectionStatus('connected');
    useWeave.getState().setAsyncElementsState('loading');
    useWeave.getState().setAsyncElements(5, 10);
    useWeave.getState().setSelectionActive(true);
    useWeave.getState().setSelectedNodes([{ node: { key: 'n1' } }] as unknown as WeaveSelection[]);
    useWeave.getState().setNode({ key: 'n1' } as unknown as WeaveStateElement);
    useWeave.getState().setUsersLocks({ k: {} });

    useWeave.getState().reset();

    const s = useWeave.getState();
    expect(s.instance).toBeNull();
    expect(s.appState).toEqual({ weave: {}, weaveMetadata: {} });
    expect(s.status).toBe(WEAVE_INSTANCE_STATUS.IDLE);
    expect(s.room).toEqual({ id: null, switching: false, loaded: false });
    expect(s.asyncElements).toEqual({ state: 'idle', loaded: 0, total: 0 });
    expect(s.connection).toEqual({ status: 'disconnected' });
    expect(s.users).toEqual({});
    expect(s.undoRedo).toEqual({ canUndo: false, canRedo: false });
    expect(s.usersLocks).toEqual({});
    expect(s.zoom).toEqual({ value: 1, canZoomIn: false, canZoomOut: false });
    expect(s.selection).toEqual({ active: false, nodes: [], node: undefined });
    expect(s.actions).toEqual({ active: false, actual: undefined });
  });
});
