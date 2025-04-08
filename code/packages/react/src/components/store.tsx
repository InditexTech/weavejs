// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave, WeaveConnectedUsersChanged } from '@inditextech/weavejs-sdk';
import {
  WEAVE_INSTANCE_STATUS,
  WeaveSelection,
  WeaveState,
  WeaveStateElement,
  WeaveStatus,
} from '@inditextech/weavejs-types';
import { WeaveStoreWebsocketsConnectionStatus } from '@inditextech/weavejs-store-websockets';
import { create } from 'zustand';

interface WeaveRuntimeState {
  instance: Weave | null;
  appState: WeaveState;
  status: WeaveStatus;
  connection: {
    status: WeaveStoreWebsocketsConnectionStatus;
  };
  room: {
    loaded: boolean;
  };
  users: WeaveConnectedUsersChanged;
  undoRedo: {
    canUndo: boolean;
    canRedo: boolean;
  };
  zoom: {
    value: number;
    canZoomIn: boolean;
    canZoomOut: boolean;
  };
  selection: {
    nodes: WeaveSelection[];
    node: WeaveStateElement | undefined;
  };
  actions: {
    active: boolean;
    actual: string | undefined;
  };
  setInstance: (newInstance: Weave) => void;
  setStatus: (newStatus: WeaveStatus) => void;
  setAppState: (newAppState: WeaveState) => void;
  setConnectionStatus: (
    newConnectionStatus: WeaveStoreWebsocketsConnectionStatus
  ) => void;
  setRoomLoaded: (newStatus: boolean) => void;
  setUsers: (newUsers: WeaveConnectedUsersChanged) => void;
  setCanUndo: (newCanUndo: boolean) => void;
  setCanRedo: (newCanRedo: boolean) => void;
  setZoom: (newZoom: number) => void;
  setCanZoomIn: (newCanZoomIn: boolean) => void;
  setCanZoomOut: (newCanZoomOut: boolean) => void;
  setSelectedNodes: (newSelectedNodes: WeaveSelection[]) => void;
  setNode: (newNode: WeaveStateElement | undefined) => void;
  setActualAction: (newActualAction: string | undefined) => void;
}

export const useWeave = create<WeaveRuntimeState>()((set) => ({
  instance: null,
  appState: { weave: {} },
  status: WEAVE_INSTANCE_STATUS.IDLE,
  room: {
    loaded: false,
  },
  connection: {
    status: 'disconnected',
  },
  users: {},
  undoRedo: {
    canUndo: false,
    canRedo: false,
  },
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
  setRoomLoaded: (newStatus) =>
    set((state) => ({ ...state, room: { ...state.room, loaded: newStatus } })),
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
