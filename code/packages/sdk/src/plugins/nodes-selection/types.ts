import { WeaveSelection } from "@/types";

export type WeaveNodesSelectionChangeCallback = (nodes: WeaveSelection[]) => void;

export type WeaveNodesSelectionPluginCallbacks = {
  onNodesChange: WeaveNodesSelectionChangeCallback;
};
