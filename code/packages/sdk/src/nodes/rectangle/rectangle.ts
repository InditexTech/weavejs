import Konva from "konva";
import { WeaveElementAttributes, WeaveElementInstance } from "@/types";
import { WeaveNode } from "../node";

export const WEAVE_RECTANGLE_NODE_TYPE = "rectangle";

export class WeaveRectangleNode extends WeaveNode {
  protected nodeType = WEAVE_RECTANGLE_NODE_TYPE;

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
    const rect = new Konva.Rect({
      ...props,
    });

    rect.on("transform", () => {
      this.instance.updateNode(this.toNode(rect));
    });

    rect.on("dragmove", (e) => {
      this.instance.updateNode(this.toNode(rect));
      e.cancelBubble = true;
    });

    rect.on("dragend", (e) => {
      this.instance.updateNode(this.toNode(rect));
      e.cancelBubble = true;
    });

    rect.on("mouseenter", (e) => {
      if (!this.instance.getActiveAction()) {
        const stage = this.instance.getStage();
        stage.container().style.cursor = "pointer";
        e.cancelBubble = true;
      }
    });

    rect.on("mouseleave", (e) => {
      if (!this.instance.getActiveAction()) {
        const stage = this.instance.getStage();
        stage.container().style.cursor = "default";
        e.cancelBubble = true;
      }
    });

    return rect;
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
