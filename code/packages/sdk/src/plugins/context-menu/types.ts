import { Weave } from "@/weave";
import { WeaveSelection } from "@/types";
import { Vector2d } from "konva/lib/types";

export type WeaveStageContextMenuPluginOptions = {
  xOffset?: number;
  yOffset?: number;
};

export type WeaveOnNodeMenuCallback = (instance: Weave, selection: WeaveSelection[], point: Vector2d) => void;

export type WeaveStageContextMenuPluginCallbacks = {
  onNodeMenu: WeaveOnNodeMenuCallback;
};
