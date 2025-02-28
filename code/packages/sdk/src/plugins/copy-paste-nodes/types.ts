import Konva from "konva";
import { COPY_PASTE_NODES_PLUGIN_STATE } from "./constants";
import { NodeSerializable } from "@/types";

export type WeaveCopyPasteNodesPluginStateKeys = keyof typeof COPY_PASTE_NODES_PLUGIN_STATE;
export type WeaveCopyPasteNodesPluginState = (typeof COPY_PASTE_NODES_PLUGIN_STATE)[WeaveCopyPasteNodesPluginStateKeys];

export type WeaveCopyPasteNodesCanCopyChangeCallback = (canCopy: boolean) => void;
export type WeaveCopyPasteNodesCanPasteChangeCallback = (canPaste: boolean, nodes: WeaveToPasteNode[]) => void;

export type WeaveCopyPasteNodesPluginCallbacks = {
  onCanCopyChange?: WeaveCopyPasteNodesCanCopyChangeCallback;
  onCanPasteChange?: WeaveCopyPasteNodesCanPasteChangeCallback;
};

export type WeaveToPasteNode = {
  konvaNode: Konva.Node;
  node: NodeSerializable;
};
