import Konva from "konva";
import { WeaveElementAttributes, WeaveElementInstance } from "@/types";
import { WeaveNode } from "../node";

export const WEAVE_GROUP_NODE_TYPE = "group";

export class WeaveGroupNode extends WeaveNode {
  protected nodeType = WEAVE_GROUP_NODE_TYPE;

  createNode(key: string, props: WeaveElementAttributes) {
    return {
      key,
      type: this.nodeType,
      props: {
        ...props,
        id: key,
        nodeType: this.nodeType,
        children: [],
      },
    };
  }

  createInstance(props: WeaveElementAttributes) {
    const stage = this.instance.getStage();

    const group = new Konva.Group({
      ...props,
    });

    group.on("dragmove", () => {
      this.instance.updateNode(this.toNode(group));
    });

    group.on("dragend", () => {
      this.instance.updateNode(this.toNode(group));
    });

    group.on("mouseenter", () => {
      stage.container().style.cursor = "pointer";
    });

    group.on("mouseleave", () => {
      stage.container().style.cursor = "default";
    });

    return group;
  }

  updateInstance(nodeInstance: WeaveElementInstance, nextProps: WeaveElementAttributes) {
    const nodeInstanceZIndex = nodeInstance.zIndex();
    nodeInstance.setAttrs({
      ...nextProps,
      zIndex: nodeInstanceZIndex,
    });
  }

  removeInstance(nodeInstance: WeaveElementInstance) {
    nodeInstance.destroy();
  }

  toNode(instance: WeaveElementInstance) {
    const attrs = instance.getAttrs();

    return {
      key: attrs.id ?? "",
      type: attrs.nodeType,
      props: {
        ...attrs,
        id: attrs.id ?? "",
        nodeType: attrs.nodeType,
        children: [],
      },
    };
  }
}
