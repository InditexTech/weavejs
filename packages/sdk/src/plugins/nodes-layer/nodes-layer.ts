import Konva from "konva";
import { WeavePlugin } from "@/plugins/plugin";
import { WEAVE_NODE_LAYER_ID } from "./constants";
import { WeaveNodesSelectionPlugin } from "../nodes-selection/nodes-selection";

export class WeaveNodesLayerPlugin extends WeavePlugin {
  init: undefined;
  render: undefined;

  registersLayers() {
    return true;
  }

  getName() {
    return "weaveNodesLayer";
  }

  getLayerName() {
    return WEAVE_NODE_LAYER_ID;
  }

  initLayer() {
    const stage = this.instance.getStage();

    const layer = new Konva.Layer({ id: WEAVE_NODE_LAYER_ID });

    stage.container().addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
        if (selectionPlugin) {
          selectionPlugin.setSelectedNodes([]);
        }
        return;
      }
    });

    stage.add(layer);
  }
}
