import Konva from "konva";
import { WeaveElementAttributes, WeaveElementInstance, WeaveStateElement } from "@/types";
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
    const group = new Konva.Group({
      ...props,
    });

    group.on("transform", () => {
      this.instance.updateNode(this.toNode(group));
    });

    group.on("dragmove", () => {
      this.instance.updateNode(this.toNode(group));
    });

    group.on("dragend", () => {
      this.instance.updateNode(this.toNode(group));
    });

    group.on("mouseenter", () => {
      const stage = this.instance.getStage();
      stage.container().style.cursor = "pointer";
    });

    group.on("mouseleave", () => {
      const stage = this.instance.getStage();
      stage.container().style.cursor = "default";
    });

    return group;
  }

  updateInstance(nodeInstance: WeaveElementInstance, nextProps: WeaveElementAttributes) {
    nodeInstance.setAttrs({
      ...nextProps,
    });
  }

  removeInstance(nodeInstance: WeaveElementInstance) {
    nodeInstance.destroy();
  }

  toNode(instance: WeaveElementInstance) {
    const attrs = instance.getAttrs();

    const childrenMapped: WeaveStateElement[] = [];
    const children: WeaveElementInstance[] = [...(instance as Konva.Group).getChildren()];
    for (const node of children) {
      const handler = this.instance.getNodeHandler(node.getAttr("nodeType"));
      childrenMapped.push(handler.toNode(node));
    }

    return {
      key: attrs.id ?? "",
      type: attrs.nodeType,
      props: {
        ...attrs,
        id: attrs.id ?? "",
        nodeType: attrs.nodeType,
        children: childrenMapped,
      },
    };
  }
}
