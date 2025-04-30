// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  STATE_ACTIONS,
  WEAVE_EXPORT_FORMATS,
  WEAVE_EXPORT_FILE_FORMAT,
  WEAVE_INSTANCE_STATUS,
  WEAVE_NODE_POSITION,
} from './constants';
import { type WeaveNodeBase } from '@/base/node';
import { type WeaveActionBase } from '@/base/action';
import { type WeavePluginBase } from '@/base/plugin';
import { type WeaveStoreBase } from '@/base/store';
import type { Vector2d } from 'konva/lib/types';

// Configuration handling

export type WeaveConfig = {
  store: WeaveStoreBase;
  nodes?: WeaveNodeBase[];
  actions?: WeaveActionBase[];
  plugins?: WeavePluginBase[];
  fonts?: WeaveFont[];
  callbacks?: WeaveCallbacks;
  logger?: WeaveLoggerConfig;
};

// Base types

export type WeaveStatusKeys = keyof typeof WEAVE_INSTANCE_STATUS;
export type WeaveStatus = (typeof WEAVE_INSTANCE_STATUS)[WeaveStatusKeys];

export type StateActionKeys = keyof typeof STATE_ACTIONS;
export type StateAction = (typeof STATE_ACTIONS)[StateActionKeys];

export type NodesStateChange = {
  action: StateAction;
  value: NodeSerializable;
};

export type GroupsStateChange = {
  action: StateAction;
  value: GroupSerializable;
};

export type NodeSerializable = Konva.NodeConfig & {
  id: string;
  type: string;
};

export type GroupSerializable = Konva.NodeConfig & {
  id: string;
  type: 'group';
  nodes: string[];
};

export type WeaveElementAttributes = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  id?: string;
  nodeType?: string;
  children?: WeaveStateElement[];
};

export type WeaveStateElement = {
  key: string;
  type: string;
  props: WeaveElementAttributes;
};

export type WeaveState = {
  weave:
    | {
        key: 'stage';
        type: 'stage';
        props: {
          [key: string]: unknown;
          id: 'stage';
          children: WeaveStateElement[];
        };
      }
    | Record<string, WeaveStateElement>;
};

export type WeaveSelection = {
  instance: Konva.Shape | Konva.Group;
  node: WeaveStateElement;
};

export type WeaveMousePointInfoSimple = {
  mousePoint: Vector2d;
  container: Konva.Layer | Konva.Group | undefined;
};

export type WeaveMousePointInfo = WeaveMousePointInfoSimple & {
  measureContainer: Konva.Layer | Konva.Group | undefined;
};

export type WeaveSerializedGroup =
  | {
      serializedNodes: WeaveStateElement[];
      minPoint: Vector2d;
    }
  | undefined;

export type WeaveNodeFound = {
  node: WeaveStateElement | null;
  parent: WeaveStateElement | null;
  index: number;
};

// Awareness handler

export type WeaveAwarenessChange<K extends string, T> = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  [key in K]: T;
};

// Nodes reconciler

export type WeaveElementInstance = Konva.Layer | Konva.Group | Konva.Shape;

// Logger handling

export type WeaveLoggerConfig = {
  disabled?: boolean;
  level?: 'debug' | 'info' | 'warn' | 'error';
};

// zIndex handling

export type WeavePositionKeys = keyof typeof WEAVE_NODE_POSITION;
export type WeavePosition = (typeof WEAVE_NODE_POSITION)[WeavePositionKeys];

// Export nodes handling

export type WeaveExportNodeOptions = {
  format?: typeof WEAVE_EXPORT_FORMATS.PNG;
  padding?: number;
  pixelRatio?: number;
  backgroundColor?: string;
  quality?: number;
};

export type WeaveExportFormatKeys = keyof typeof WEAVE_EXPORT_FORMATS;
export type WeaveExportFormat =
  (typeof WEAVE_EXPORT_FORMATS)[WeaveExportFormatKeys];

export type WeaveExportFileFormatKeys = keyof typeof WEAVE_EXPORT_FILE_FORMAT;
export type WeaveExportFileFormat =
  (typeof WEAVE_EXPORT_FILE_FORMAT)[WeaveExportFileFormatKeys];

// User object format

export type WeaveUser = {
  name: string;
  email: string;
};

// Font descriptor format

export type WeaveFont = {
  id: string;
  name: string;
};

// Undo/redo manager handling

export type WeaveUndoManagerOptions = {
  captureTimeout?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackedOrigins?: Set<any>;
};

export type WeaveUndoRedoChange = {
  canRedo: boolean;
  canUndo: boolean;
  redoStackLength: number;
  undoStackLength: number;
};

// Callbacks

export type WeaveCallbacks = {
  onRender?: () => void;
  onRoomLoaded?: (loaded: boolean) => void;
  onInstanceStatus?: (status: WeaveStatus) => void;
  onActiveActionChange?: (actionName: string | undefined) => void;
  onStateChange?: (state: WeaveState) => void;
  onUndoManagerStatusChange?: (undoManagerStatus: WeaveUndoRedoChange) => void;
};
