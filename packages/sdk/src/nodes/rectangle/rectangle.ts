import { isEqual } from "lodash";
import Konva from "konva";
import { WeaveNode } from "@/nodes/node";
import { NodeSerializable } from "@/types";
import { RectangleSerializable } from "./types";
import { resetScale } from "@/utils";
import { Vector2d } from "konva/lib/types";

export class WeaveRectangleNode extends WeaveNode {
  getType(): string {
    return "rectangle";
  }

  addState(params: NodeSerializable) {
    const rectParams = params as RectangleSerializable;
    const { id } = rectParams;

    const state = this.instance.getStore().getState();

    if (state.weave.nodes?.[id]) {
      return;
    }

    if (!state.weave.nodes) {
      state.weave.nodes = {};
    }
    state.weave.nodes[id] = rectParams;
  }

  updateState(params: NodeSerializable) {
    const rectParams = params as RectangleSerializable;
    const { id } = rectParams;

    const state = this.instance.getStore().getState();

    if (!state.weave.nodes?.[id]) {
      return;
    }

    if (!isEqual(state.weave.nodes[id], rectParams)) {
      state.weave.nodes[id] = {
        ...JSON.parse(JSON.stringify(state.weave.nodes[id])),
        ...rectParams,
      };
    }
  }

  removeState(id: string) {
    const state = this.instance.getStore().getState();

    if (!state.weave.nodes?.[id]) {
      return;
    }

    delete state.weave.nodes[id];
  }

  addRuntime(params: NodeSerializable) {
    const rectParams = params as RectangleSerializable;
    const { id, draggable } = rectParams;

    const stage = this.instance.getStage();

    const rect = stage.findOne(`#${id}`) as Konva.Rect | undefined;
    if (rect) {
      return;
    }

    const newRectParams: RectangleSerializable = {
      ...rectParams,
    };
    delete newRectParams.zIndex;

    const newRect = new Konva.Rect(newRectParams);

    newRect.on("transform", () => {
      resetScale(newRect);
      this.updateState(newRect.getAttrs() as NodeSerializable);
    });

    newRect.on("mouseenter", (e) => {
      e.evt.preventDefault();

      const activeAction = this.instance.getActiveAction();
      if (typeof activeAction !== "undefined") {
        return;
      }

      if (newRect.getAttrs().isSelectable) {
        stage.container().style.cursor = "pointer";
      }
    });

    newRect.on("mouseleave", (e) => {
      e.evt.preventDefault();

      const activeAction = this.instance.getActiveAction();
      if (typeof activeAction !== "undefined") {
        return;
      }

      if (newRect.getAttrs().isSelectable) {
        stage.container().style.cursor = "default";
      }
    });

    if (draggable) {
      newRect.on("dragmove", () => {
        this.updateState(newRect.getAttrs() as NodeSerializable);
      });
      newRect.on("dragend", () => {
        this.updateState(newRect.getAttrs() as NodeSerializable);
      });
    }

    this.addToCanvas(newRect, rectParams);

    newRect.setZIndex(rectParams.zIndex);
  }

  updateRuntime(params: NodeSerializable) {
    const rectParams = params as RectangleSerializable;
    const { id } = rectParams;

    const stage = this.instance.getStage();

    const node = stage.findOne(`#${id}`) as Konva.Rect | undefined;
    if (!node) {
      return;
    }

    node.setAttrs(rectParams);

    this.addToCanvas(node, rectParams);
  }

  removeRuntime(id: string): void {
    const stage = this.instance.getStage();

    const node = stage.findOne(`#${id}`) as Konva.Rect | undefined;
    if (!node) {
      return;
    }

    node.destroy();
  }

  getOrigin(params: NodeSerializable): Vector2d {
    const rectParams = params as RectangleSerializable;

    return { x: rectParams.x ?? 0, y: rectParams.y ?? 0 };
  }
}
