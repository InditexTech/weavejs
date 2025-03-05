import Konva from "konva";
import { STATE_ACTIONS, WEAVE_EXPORT_FORMATS, WEAVE_INSTANCE_STATUS, WEAVE_NODE_POSITION } from "./constants";
import { WeaveNode } from "./nodes/node";
import { WeaveAction } from "./actions/action";
import { WeavePlugin } from "./plugins/plugin";
import { WeaveStore } from "./stores/store";

export type WeaveUser = {
  name: string;
  email: string;
};

export type WeaveFont = {
  id: string;
  name: string;
};

export type WeaveUndoRedoChange = {
  canRedo: boolean;
  canUndo: boolean;
  redoStackLength: number;
  undoStackLength: number;
};

export type WeaveCallbacks = {
  onRender?: () => void;
  onInstanceStatus?: (status: WeaveStatus) => void;
  onActiveActionChange?: (actionName: string | undefined) => void;
  onStateChange?: (state: WeaveState) => void;
  onUndoManagerStatusChange?: (undoManagerStatus: WeaveUndoRedoChange) => void;
};

export type WeaveStatusKeys = keyof typeof WEAVE_INSTANCE_STATUS;
export type WeaveStatus = (typeof WEAVE_INSTANCE_STATUS)[WeaveStatusKeys];

export type WeaveConfig = {
  store: WeaveStore;
  nodes?: WeaveNode[];
  actions?: WeaveAction[];
  plugins?: WeavePlugin[];
  fonts?: WeaveFont[];
  callbacks?: WeaveCallbacks;
  logger?: WeaveLoggerConfig;
};

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
  type: "group";
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
        key: "stage";
        type: "stage";
        props: {
          [key: string]: unknown;
          id: "stage";
          children: WeaveStateElement[];
        };
      }
    | Record<string, WeaveStateElement>;
};

export type WeaveSelection = {
  instance: Konva.Shape | Konva.Group;
  node: WeaveStateElement;
};

// AWARENESS
export type WeaveAwarenessChange<K extends string, T> = {
  [key in K]: T;
};

// RECONCILER

export type WeaveElementInstance = Konva.Layer | Konva.Group | Konva.Shape;

// LOGGER

export type WeaveLoggerConfig = {
  disabled?: boolean;
  level?: "debug" | "info" | "warn" | "error";
};

// ZINDEX

export type WeavePositionKeys = keyof typeof WEAVE_NODE_POSITION;
export type WeavePosition = (typeof WEAVE_NODE_POSITION)[WeavePositionKeys];

// EXPORT

export type WeaveExportNodeOptions = {
  format?: typeof WEAVE_EXPORT_FORMATS.PNG;
  padding?: number;
  pixelRatio?: number;
  backgroundColor?: string;
  quality?: number;
};

export type WeaveExportFormatKeys = keyof typeof WEAVE_EXPORT_FORMATS;
export type WeaveExportFormat = (typeof WEAVE_EXPORT_FORMATS)[WeaveExportFormatKeys];
