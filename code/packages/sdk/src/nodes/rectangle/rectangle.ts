import Konva from "konva";
import { WeaveElementAttributes, WeaveElementInstance } from "@/types";
import { WeaveNode } from "../node";

export const WEAVE_LAYER_RECTANGLE = "rectangle";

export class WeaveRectangleNode extends WeaveNode {
  protected nodeType = WEAVE_LAYER_RECTANGLE;

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

    const rect = new Konva.Rect({
      ...props,
    });

    rect.on("dragmove", () => {
      this.instance.updateNode(this.toNode(rect));
    });

    rect.on("dragend", () => {
      this.instance.updateNode(this.toNode(rect));
    });

    rect.on("mouseenter", () => {
      stage.container().style.cursor = "pointer";
    });

    rect.on("mouseleave", () => {
      stage.container().style.cursor = "default";
    });

    return rect;
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
