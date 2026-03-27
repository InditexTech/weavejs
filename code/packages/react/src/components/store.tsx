// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave, type WeaveConnectedUsers } from '@inditextech/weave-sdk';
import {
  WEAVE_INSTANCE_STATUS,
  type WeaveSelection,
  type WeaveState,
  type WeaveStateElement,
  type WeaveStatus,
} from '@inditextech/weave-types';
import { create, type UseBoundStore, type StoreApi } from 'zustand';

interface WeaveRuntimeState {
  instance: Weave | null;
  appState: WeaveState;
  status: WeaveStatus;
  connection: {
    status: string;
  };
  room: {
    id: string | null;
    switching: boolean;
    loaded: boolean;
  };
  asyncElements: {
    state: 'idle' | 'loading' | 'loaded';
    loaded: number;
    total: number;
  };
  users: WeaveConnectedUsers;
  undoRedo: {
    canUndo: boolean;
    canRedo: boolean;
  };
  usersLocks: Record<string, unknown>;
  zoom: {
    value: number;
    canZoomIn: boolean;
    canZoomOut: boolean;
  };
  selection: {
    active: boolean;
    nodes: WeaveSelection[];
    node: WeaveStateElement | undefined;
  };
  actions: {
    active: boolean;
    actual: string | undefined;
  };
  setInstance: (newInstance: Weave | null) => void;
  setStatus: (newStatus: WeaveStatus) => void;
  setAppState: (newAppState: WeaveState) => void;
  setConnectionStatus: (newConnectionStatus: string) => void;
  setRoomId: (newRoomId: string | null) => void;
  setRoomSwitching: (newRoomSwitching: boolean) => void;
  setRoomLoaded: (newStatus: boolean) => void;
  setAsyncElements: (loaded: number, total: number) => void;
  setAsyncElementsState: (newState: 'idle' | 'loading' | 'loaded') => void;
  setUsers: (newUsers: WeaveConnectedUsers) => void;
  setCanUndo: (newCanUndo: boolean) => void;
  setCanRedo: (newCanRedo: boolean) => void;
  setUsersLocks: (newUsersLocks: Record<string, unknown>) => void;
  setZoom: (newZoom: number) => void;
  setCanZoomIn: (newCanZoomIn: boolean) => void;
  setCanZoomOut: (newCanZoomOut: boolean) => void;
  setSelectionActive: (newSelectionActive: boolean) => void;
  setSelectedNodes: (newSelectedNodes: WeaveSelection[]) => void;
  setNode: (newNode: WeaveStateElement | undefined) => void;
  setActualAction: (newActualAction: string | undefined) => void;
}

export const useWeave: UseBoundStore<StoreApi<WeaveRuntimeState>> =
  create<WeaveRuntimeState>()((set) => ({
    instance: null,
    appState: { weave: {} },
    status: WEAVE_INSTANCE_STATUS.IDLE,
    room: {
      id: null,
      switching: false,
      loaded: false,
    },
    asyncElements: {
      state: 'idle',
      loaded: 0,
      total: 0,
    },
    connection: {
      status: 'disconnected',
    },
    users: {},
    undoRedo: {
      canUndo: false,
      canRedo: false,
    },
    usersLocks: {},
    zoom: {
      value: 1,
      canZoomIn: false,
      canZoomOut: false,
    },
    contextMenu: {
      show: false,
      position: { x: 0, y: 0 },
      options: [],
    },
    selection: {
      active: false,
      nodes: [],
      node: undefined,
    },
    actions: {
      active: false,
      actual: undefined,
    },
    setInstance: (newInstance) =>
      set((state) => ({ ...state, instance: newInstance })),
    setStatus: (newStatus) => set((state) => ({ ...state, status: newStatus })),
    setAppState: (newAppState) =>
      set((state) => ({ ...state, appState: newAppState })),
    setConnectionStatus: (newConnectionStatus) =>
      set((state) => ({
        ...state,
        connection: { ...state.connection, status: newConnectionStatus },
      })),
    setRoomId: (newRoomId) =>
      set((state) => ({
        ...state,
        room: { ...state.room, id: newRoomId },
      })),
    setRoomSwitching: (newRoomSwitching) =>
      set((state) => ({
        ...state,
        room: { ...state.room, switching: newRoomSwitching },
      })),
    setRoomLoaded: (newStatus) =>
      set((state) => ({
        ...state,
        room: { ...state.room, loaded: newStatus },
      })),
    setAsyncElements: (loaded, total) =>
      set((state) => ({
        ...state,
        asyncElements: {
          ...state.asyncElements,
          loaded,
          total,
        },
      })),
    setAsyncElementsState: (newState) =>
      set((state) => ({
        ...state,
        asyncElements: {
          ...state.asyncElements,
          state: newState,
        },
      })),
    setUsers: (newUsers) => set((state) => ({ ...state, users: newUsers })),
    setCanUndo: (newCanUndo) =>
      set((state) => ({
        ...state,
        undoRedo: { ...state.undoRedo, canUndo: newCanUndo },
      })),
    setCanRedo: (newCanRedo) =>
      set((state) => ({
        ...state,
        undoRedo: { ...state.undoRedo, canRedo: newCanRedo },
      })),
    setUsersLocks: (newUsersLocks) =>
      set((state) => ({ ...state, usersLocks: newUsersLocks })),
    setZoom: (newZoom) =>
      set((state) => ({ ...state, zoom: { ...state.zoom, value: newZoom } })),
    setCanZoomIn: (newCanZoomIn) =>
      set((state) => ({
        ...state,
        zoom: { ...state.zoom, canZoomIn: newCanZoomIn },
      })),
    setCanZoomOut: (newCanZoomOut) =>
      set((state) => ({
        ...state,
        zoom: { ...state.zoom, canZoomOut: newCanZoomOut },
      })),
    setSelectionActive: (newSelectionActive) =>
      set((state) => ({
        ...state,
        selection: { ...state.selection, active: newSelectionActive },
      })),
    setSelectedNodes: (newSelectedNodes) =>
      set((state) => ({
        ...state,
        selection: { ...state.selection, nodes: newSelectedNodes },
      })),
    setNode: (newNode) =>
      set((state) => ({
        ...state,
        selection: { ...state.selection, node: newNode },
      })),
    setActualAction: (newActualAction) =>
      set((state) => ({
        ...state,
        actions: {
          ...state.actions,
          active: typeof newActualAction !== 'undefined',
          actual: newActualAction,
        },
      })),
  }));
