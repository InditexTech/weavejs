import { WeavePlugin } from "@/plugins/plugin";
import {
  WeaveNodeSelectionStructure,
  WeaveStageContextMenuPluginCallbacks,
  WeaveStageContextMenuPluginOptions,
} from "./types";
import { GroupSerializable, NodeSerializable } from "@/types";
import { Vector2d } from "konva/lib/types";
import { WeaveNodesSelectionPlugin } from "../nodes-selection/nodes-selection";

export class WeaveStageContextMenuPlugin extends WeavePlugin {
  private config: WeaveStageContextMenuPluginOptions;
  private callbacks: WeaveStageContextMenuPluginCallbacks;
  getLayerName = undefined;
  initLayer = undefined;
  render: undefined;

  constructor(options: WeaveStageContextMenuPluginOptions, callbacks: WeaveStageContextMenuPluginCallbacks) {
    super();

    this.config = options;
    this.callbacks = callbacks;
  }

  registersLayers() {
    return false;
  }

  getName() {
    return "weaveStageContextMenu";
  }

  init() {
    this.initEvents();
  }

  private initEvents() {
    const stage = this.instance.getStage();
    const state = this.instance.getStore().getState();

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");

    stage.on("contextmenu", (e) => {
      e.evt.preventDefault();

      let clickOnTransformer = false;
      if (selectionPlugin) {
        const transformer = selectionPlugin.getTransformer();
        const box = transformer.getClientRect();
        const mousePos = stage.getPointerPosition();
        if (
          mousePos &&
          mousePos.x >= box.x &&
          mousePos.x <= box.x + box.width &&
          mousePos.y >= box.y &&
          mousePos.y <= box.y + box.height
        ) {
          clickOnTransformer = true;
        }
      }

      if (e.target === stage && !clickOnTransformer) {
        return;
      }

      let nodes: WeaveNodeSelectionStructure[] = [];

      if (clickOnTransformer) {
        const transformer = selectionPlugin.getTransformer();

        nodes = transformer
          .getNodes()
          .map((node) => {
            const sNode = node.getAttrs() as NodeSerializable;

            if (sNode.type === "group" && state.weave.groups?.[sNode.id]) {
              return {
                konvaNode: node,
                node: JSON.parse(JSON.stringify(state.weave.groups?.[sNode.id])) as GroupSerializable,
              };
            }

            if (sNode.type !== "group" && state.weave.nodes?.[sNode.id]) {
              return {
                konvaNode: node,
                node: JSON.parse(JSON.stringify(state.weave.nodes?.[sNode.id])) as NodeSerializable,
              };
            }

            return undefined;
          })
          .filter((node) => node !== undefined);
      }

      if (nodes.length > 0) {
        const containerRect = stage.container().getBoundingClientRect();
        const pointerPos = stage.getPointerPosition();

        if (containerRect && pointerPos) {
          const point: Vector2d = {
            x: containerRect.left + pointerPos.x + (this.config.xOffset ?? 4),
            y: containerRect.top + pointerPos.y + (this.config.yOffset ?? 4),
          };

          this.callbacks.onNodeMenu?.(this.instance, nodes, point);
        }
      }
    });
  }
}
