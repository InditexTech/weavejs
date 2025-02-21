import { Weave } from "@/weave";
import { WEAVE_NODE_LAYER_ID } from "@/plugins/nodes-layer/constants";
import { GroupSerializable, NodeSerializable } from "@/types";
import Konva from "konva";

export abstract class WeaveNode {
  protected instance!: Weave;

  register(instance: Weave) {
    this.instance = instance;
  }

  protected getNodesLayer() {
    const stage = this.instance.getStage();
    const layer = stage.findOne(`#${WEAVE_NODE_LAYER_ID}`) as Konva.Layer;
    return layer;
  }

  protected addToCanvas(konvaNode: Konva.Group | Konva.Shape, params: NodeSerializable) {
    const stage = this.instance.getStage();
    const state = this.instance.getStore().getState();

    const nodesLayer = this.getNodesLayer();

    let addedToGroup = false;
    if (params.groupId) {
      let group = stage.findOne(`#${params.groupId}`) as Konva.Group | undefined;
      if (!group) {
        let element: NodeSerializable | GroupSerializable | undefined = state.weave.groups?.[params.groupId];
        if (!element) {
          for (const nodeId of Object.keys(state.weave.nodes ?? {})) {
            const actualNode = state.weave.nodes?.[nodeId];
            if (actualNode?.containerId === params.groupId) {
              element = actualNode;
              break;
            }
          }
        }

        if (element) {
          if (element.type === "group") {
            this.instance.getGroupsManager().addRuntime(element as GroupSerializable);
          }
          if (element.type !== "group") {
            this.instance.getNodesManager().addRuntime(element as NodeSerializable);
          }
        }
      }
      group = stage.findOne(`#${params.groupId}`) as Konva.Group | undefined;
      if (group) {
        if (group.getAttrs().containerId) {
          const nodePos = konvaNode.getAbsolutePosition();
          const nodeRotation = konvaNode.getAbsoluteRotation();

          konvaNode.moveTo(group);
          konvaNode.setAbsolutePosition(nodePos);
          konvaNode.rotation(nodeRotation);
        } else {
          group.add(konvaNode);
          addedToGroup = true;
        }
      }
    }
    if (!addedToGroup) {
      nodesLayer.add(konvaNode);
    }
  }

  abstract getType(): string;

  abstract addState(params: NodeSerializable): void;

  abstract updateState(params: NodeSerializable): void;

  abstract removeState(id: string): void;

  abstract addRuntime(params: NodeSerializable): void;

  abstract updateRuntime(params: NodeSerializable): void;

  abstract removeRuntime(id: string, params?: NodeSerializable): void;
}
