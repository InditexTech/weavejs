import { v4 as uuidv4 } from "uuid";
import { WeaveAction } from "@/actions/action";
import { Vector2d } from "konva/lib/types";
import { WeaveRectangleToolActionState } from "./types";
import { RECTANGLE_TOOL_STATE } from "./constants";
import { WeaveNodesSelectionPlugin } from "@/plugins/nodes-selection/nodes-selection";
import Konva from "konva";

export class WeaveRectangleToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveRectangleToolActionState;
  protected rectId: string | null;
  protected clickPoint: Vector2d | null;
  protected container!: Konva.Group | Konva.Layer | undefined;
  protected rectangle!: Konva.Rect | undefined;
  protected cancelAction!: () => void;
  init = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = RECTANGLE_TOOL_STATE.IDLE;
    this.rectId = null;
    this.container = undefined;
    this.clickPoint = null;
  }

  getName(): string {
    return "rectangleTool";
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.cancelAction();
        return;
      }
      if (e.key === "Escape") {
        this.cancelAction();
        return;
      }
    });

    stage.on("click tap", (e) => {
      e.evt.preventDefault();

      if (this.state === RECTANGLE_TOOL_STATE.IDLE) {
        return;
      }

      if (this.state === RECTANGLE_TOOL_STATE.ADDING) {
        this.handleAdding();
        return;
      }

      if (this.state === RECTANGLE_TOOL_STATE.DEFINING_SIZE) {
        this.handleSettingSize();
        return;
      }
    });

    stage.on("mousemove", (e) => {
      e.evt.preventDefault();

      this.handleMovement();
    });

    this.initialized = true;
  }

  private setState(state: WeaveRectangleToolActionState) {
    this.state = state;
  }

  private addRectangle() {
    const stage = this.instance.getStage();

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("nodesSelection");
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.hide();
    }

    stage.container().style.cursor = "crosshair";
    stage.container().focus();

    this.rectId = null;
    this.clickPoint = null;
    this.setState(RECTANGLE_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container } = this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    this.rectId = uuidv4();

    this.rectangle = new Konva.Rect({
      id: this.rectId,
      x: this.clickPoint?.x ?? 0,
      y: this.clickPoint?.y ?? 0,
      width: 0,
      height: 0,
      opacity: 1,
      fill: "#FF0000FF",
      stroke: "#000000FF",
      strokeWidth: 1,
      draggable: true,
    });

    this.instance.getMainLayer()?.add(this.rectangle);

    this.setState(RECTANGLE_TOOL_STATE.DEFINING_SIZE);
  }

  private handleSettingSize() {
    if (this.rectId && this.clickPoint && this.container && this.rectangle) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(this.container);

      const deltaX = mousePoint.x - this.clickPoint?.x;
      const deltaY = mousePoint.y - this.clickPoint?.y;

      const nodeHandler = this.instance.getNodeHandler("rectangle");

      const node = nodeHandler.createNode(this.rectId, {
        x: deltaX < 0 ? this.clickPoint.x + deltaX : this.clickPoint.x,
        y: deltaY < 0 ? this.clickPoint.y + deltaY : this.clickPoint.y,
        width: Math.abs(deltaX),
        height: Math.abs(deltaY),
        opacity: 1,
        fill: "#FF0000FF",
        stroke: "#000000FF",
        strokeWidth: 1,
        draggable: true,
      });

      this.instance.addNode(node, this.container?.getAttrs().id);

      this.rectangle?.destroy();
    }

    this.setState(RECTANGLE_TOOL_STATE.ADDED);

    this.cancelAction?.();
  }

  private handleMovement() {
    if (this.state !== RECTANGLE_TOOL_STATE.DEFINING_SIZE) {
      return;
    }

    if (this.rectId && this.container && this.clickPoint && this.rectangle) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(this.container);

      const deltaX = mousePoint.x - this.clickPoint?.x;
      const deltaY = mousePoint.y - this.clickPoint?.y;

      this.rectangle.setAttrs({
        width: deltaX,
        height: deltaY,
      });
    }
  }

  trigger(cancelAction: () => void) {
    if (!this.instance) {
      throw new Error("Instance not defined");
    }

    if (!this.initialized) {
      this.setupEvents();
    }
    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    this.cancelAction = cancelAction;

    this.addRectangle();
  }

  cleanup() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = "default";

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("nodesSelection");
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.show();
      const node = stage.findOne(`#${this.rectId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
    }

    this.rectId = null;
    this.container = undefined;
    this.rectangle = undefined;
    this.clickPoint = null;
    this.setState(RECTANGLE_TOOL_STATE.IDLE);
  }
}
