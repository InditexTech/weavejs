import { WEAVE_NODE_LAYER_ID } from "@/constants";
import { Weave } from "@/weave";
import Konva from "konva";
import { Vector2d } from "konva/lib/types";

export abstract class WeaveAction {
  protected instance!: Weave;

  getName(): string {
    return "weaveAction";
  }

  register(instance: Weave) {
    this.instance = instance;
  }

  protected getMousePointer(point?: Vector2d) {
    const stage = this.instance.getStage();
    const mainLayer = this.instance.getMainLayer();

    let relativeMousePointer = point ? point : (stage.getPointerPosition() ?? { x: 0, y: 0 });
    let container: Konva.Layer | Konva.Group | undefined = mainLayer;
    let groupId = undefined;
    let zIndex = mainLayer?.getChildren().length ?? 0;

    const eleGroup = stage.getIntersection(relativeMousePointer);
    if (eleGroup) {
      const realNode = this.instance.getNodeRecursive(eleGroup);
      const targetAttrs = realNode.getAttrs();
      if (targetAttrs.container) {
        groupId = targetAttrs.containerId;
      }
    }

    if (groupId) {
      const group = stage.findOne(`#${groupId}`) as Konva.Group | undefined;
      if (group && group?.getRelativePointerPosition()) {
        container = group;
        relativeMousePointer = group?.getRelativePointerPosition() ?? relativeMousePointer;
        zIndex = group.getChildren().length;
      }
    }

    if (!groupId) {
      relativeMousePointer = stage.getRelativePointerPosition() ?? { x: 0, y: 0 };
    }

    return { mousePoint: relativeMousePointer, container, groupId, zIndex: Math.max(0, zIndex) };
  }

  protected getMousePointerContainer(container: Konva.Group | Konva.Layer) {
    const containerAttrs = container.getAttrs();
    const relativeMousePointer = container.getRelativePointerPosition() ?? { x: 0, y: 0 };
    const groupId = containerAttrs.id === WEAVE_NODE_LAYER_ID ? undefined : containerAttrs.id;
    const zIndex = container.getChildren().length;

    return { mousePoint: relativeMousePointer, container, groupId, zIndex };
  }

  abstract init?(): void;

  abstract trigger(cancelAction: () => void, params?: unknown): void;

  abstract cleanup?(): void;
}
