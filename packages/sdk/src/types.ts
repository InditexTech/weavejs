import Konva from "konva";
import { STATE_ACTIONS } from "./constants";
import { WeaveNode } from "./nodes/node";
import { WeaveAction } from "./actions/action";
import { WeavePlugin } from "./plugins/plugin";
import { WeaveStore } from "./stores/store";

export type WeaveUser = {
  name: string;
  email: string;
};

export type WeaveConfig = {
  store: WeaveStore;
  nodes?: WeaveNode[];
  actions?: WeaveAction[];
  plugins?: WeavePlugin[];
  callbacks?: {
    onActiveActionChange?: (actionName: string | undefined) => void;
    onNodeAdded?: (node: NodeSerializable) => void;
    onNodeUpdated?: (node: NodeSerializable) => void;
    onNodeRemoved?: (node: NodeSerializable) => void;
  };
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

export type WeaveStoreState = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weave: Record<string, any>;
};

export type WeaveState = {
  weave: {
    groups: Record<string, GroupSerializable>;
    nodes: Record<string, NodeSerializable>;
  };
};

export type WeaveSelection = {
  konvaNode: Konva.Node;
  node: NodeSerializable;
};

// AWARENESS
export type WeaveAwarenessChange<K extends string, T> = {
  [key in K]: T;
};
