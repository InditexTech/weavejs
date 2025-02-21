import { isEqual } from "lodash";
import Konva from "konva";
import { WeaveNode } from "@/nodes/node";
import { NodeSerializable } from "@/types";
import { LineSerializable } from "./types";

export class WeaveLineNode extends WeaveNode {
  getType(): string {
    return "line";
  }

  addState(params: NodeSerializable) {
    const lineParams = params as LineSerializable;
    const { id } = lineParams;

    const state = this.instance.getStore().getState();
    if (state.weave.nodes?.[id]) {
      return;
    }

    if (!state.weave.nodes) {
      state.weave.nodes = {};
    }

    state.weave.nodes[id] = lineParams;
  }

  updateState(params: NodeSerializable) {
    const lineParams = params as LineSerializable;
    const { id } = lineParams;

    const state = this.instance.getStore().getState();

    if (!state.weave.nodes?.[id]) {
      return;
    }

    if (!isEqual(state.weave.nodes[id], lineParams)) {
      state.weave.nodes[id] = {
        ...JSON.parse(JSON.stringify(state.weave.nodes[id])),
        ...lineParams,
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
    const lineParams = params as LineSerializable;
    const { id, draggable } = lineParams;

    const stage = this.instance.getStage();

    const line = stage.findOne(`#${id}`) as Konva.Line | undefined;
    if (line) {
      return;
    }

    const newLineParams: LineSerializable = {
      ...lineParams,
    };
    delete newLineParams.zIndex;

    const newLine = new Konva.Line(newLineParams);

    newLine.on("transform", () => {
      this.updateState(newLine.getAttrs() as NodeSerializable);
    });

    newLine.on("mouseenter", (e) => {
      e.evt.preventDefault();

      const activeAction = this.instance.getActiveAction();
      if (typeof activeAction !== "undefined") {
        return;
      }

      if (newLine.getAttrs().isSelectable) {
        stage.container().style.cursor = "pointer";
      }
    });

    newLine.on("mouseleave", (e) => {
      e.evt.preventDefault();

      const activeAction = this.instance.getActiveAction();
      if (typeof activeAction !== "undefined") {
        return;
      }

      if (newLine.getAttrs().isSelectable) {
        stage.container().style.cursor = "default";
      }
    });

    if (draggable) {
      newLine.on("dragmove", () => {
        this.updateState(newLine.getAttrs() as NodeSerializable);
      });
      newLine.on("dragend", () => {
        this.updateState(newLine.getAttrs() as NodeSerializable);
      });
    }

    this.addToCanvas(newLine, lineParams);

    newLine.setZIndex(lineParams.zIndex);
  }

  updateRuntime(params: NodeSerializable) {
    const lineParams = params as LineSerializable;
    const { id } = lineParams;

    const stage = this.instance.getStage();

    const node = stage.findOne(`#${id}`) as Konva.Line | undefined;
    if (!node) {
      return;
    }

    node.setAttrs(lineParams);

    this.addToCanvas(node, lineParams);
  }

  removeRuntime(id: string): void {
    const stage = this.instance.getStage();

    const node = stage.findOne(`#${id}`) as Konva.Line | undefined;
    if (!node) {
      return;
    }

    node.destroy();
  }
}
