import { Weave } from "@/weave";
import { GroupSerializable, NodeSerializable } from "@/types";
import Konva from "konva";
import { Vector2d } from "konva/lib/types";

export type WeaveStageContextMenuPluginOptions = {
  xOffset?: number;
  yOffset?: number;
};

export type WeaveNodeSelectionStructure = { konvaNode: Konva.Node; node: GroupSerializable | NodeSerializable };

export type WeaveOnNodeMenuCallback = (
  instance: Weave,
  selection: WeaveNodeSelectionStructure[],
  point: Vector2d,
) => void;

export type WeaveStageContextMenuPluginCallbacks = {
  onNodeMenu: WeaveOnNodeMenuCallback;
};
