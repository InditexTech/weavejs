// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import * as Y from 'yjs';
import {
  STATE_ACTIONS,
  WEAVE_EXPORT_FORMATS,
  WEAVE_EXPORT_FILE_FORMAT,
  WEAVE_INSTANCE_STATUS,
  WEAVE_NODE_POSITION,
  WEAVE_TRANSFORMER_ANCHORS,
  WEAVE_STORE_CONNECTION_STATUS,
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
  logger?: WeaveLoggerConfig;
  serverSide?: boolean;
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
  nodeType: string;
};

export type GroupSerializable = Konva.NodeConfig & {
  id: string;
  nodeType: 'group';
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
  node: WeaveStateElement | undefined;
};

export type WeaveMousePointInfoSimple = {
  mousePoint: Vector2d;
  container: Konva.Layer | Konva.Node | undefined;
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

export const Wea = {
  onTargetEnter: 'onTargetEnter',
  onTargetLeave: 'onTargetLeave',
} as const;

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

export type WeaveExportFormatsKeys = keyof typeof WEAVE_EXPORT_FORMATS;
export type WeaveExportFormats =
  (typeof WEAVE_EXPORT_FORMATS)[WeaveExportFormatsKeys];

export type WeaveExportNodesOptions = {
  format?: WeaveExportFormats;
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
  id: string;
  name: string;
  email: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
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

// Store

export type WeaveStoreConnectionStatusKeys =
  keyof typeof WEAVE_STORE_CONNECTION_STATUS;
export type WeaveStoreConnectionStatus =
  (typeof WEAVE_STORE_CONNECTION_STATUS)[WeaveStoreConnectionStatusKeys];

export type WeaveStoreOnStoreConnectionStatusChangeEvent =
  WeaveStoreConnectionStatus;

export type WeaveStoreOnSyncHandleConnectionStatusChangeEvent =
  WeaveStoreOnPubSubClientStatusChange;

export type WeaveStoreOnPubSubClientStatusChange =
  | {
      status: 'connecting' | 'connect' | 'ready' | 'end';
      error?: undefined;
      delay?: undefined;
    }
  | {
      status: 'error';
      error: Error;
      delay?: undefined;
    }
  | {
      status: 'reconnecting';
      error?: undefined;
      delay: number;
    };

export type WeaveStoreHorizontalSyncRedisConfig = {
  host: string;
  port: number;
  keyPrefix: string;
  password?: string;
};

export type WeaveStoreHorizontalSyncConfig = {
  type: 'redis';
  config: WeaveStoreHorizontalSyncRedisConfig;
};

export declare type docElementTypeDescription =
  | 'xml'
  | 'text'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Array<any>
  | object;
export declare type DocTypeDescription = {
  [key: string]: docElementTypeDescription;
};
export declare type MappedTypeDescription<T extends DocTypeDescription> = {
  readonly [P in keyof T]: T[P] extends 'xml'
    ? Y.XmlFragment
    : T[P] extends 'text'
    ? Y.Text
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T[P] extends Array<any>
    ? T[P]
    : T[P] extends object
    ? Partial<T[P]>
    : never;
};
export declare function crdtDoc<T extends DocTypeDescription>(
  doc: Y.Doc,
  typeDescription: T
): MappedTypeDescription<T>;

// Configuration

export type WeaveTransformerAnchorsKeys =
  keyof typeof WEAVE_TRANSFORMER_ANCHORS;
export type WeaveTransformerAnchors =
  (typeof WEAVE_TRANSFORMER_ANCHORS)[WeaveTransformerAnchorsKeys];

export type WeaveNodeTransformerProperties = Konva.TransformerConfig;

export type WeaveNodeConfiguration = {
  transform: Partial<WeaveNodeTransformerProperties>;
};

// Image api

export type ImageCrossOrigin = 'anonymous' | 'use-credentials';

// Measurement

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Util types

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      T[P] extends Function
      ? T[P]
      : DeepPartial<T[P]>
    : T[P];
};
