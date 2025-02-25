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
  protected groupId: string | undefined;
  protected clickPoint: Vector2d | null;
  protected container!: Konva.Group | Konva.Layer | undefined;
  protected cancelAction!: () => void;
  init = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = RECTANGLE_TOOL_STATE.IDLE;
    this.rectId = null;
    this.container = undefined;
    this.groupId = undefined;
    this.clickPoint = null;
  }

  getName(): string {
    return "weaveRectangleTool";
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

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
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
    const { mousePoint, container, groupId, zIndex } = this.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    this.rectId = uuidv4();

    const nodeHandler = this.instance.getNodeHandler("rectangle");

    const node = nodeHandler.createNode(this.rectId, {
      groupId,
      x: this.clickPoint.x,
      y: this.clickPoint.y,
      width: 0,
      height: 0,
      opacity: 1,
      fill: "#FF0000FF",
      stroke: "#000000FF",
      strokeWidth: 1,
      isSelectable: false,
      draggable: true,
      zIndex,
    });

    this.instance.addNode(node);

    this.setState(RECTANGLE_TOOL_STATE.DEFINING_SIZE);
  }

  private handleSettingSize() {
    if (this.rectId && this.clickPoint && this.container) {
      const { mousePoint } = this.getMousePointerContainer(this.container);

      const deltaX = mousePoint.x - this.clickPoint?.x;
      const deltaY = mousePoint.y - this.clickPoint?.y;

      this.instance.updateNode({
        key: this.rectId,
        type: "rectangle",
        props: {
          children: [],
          x: deltaX < 0 ? this.clickPoint.x + deltaX : this.clickPoint.x,
          y: deltaY < 0 ? this.clickPoint.y + deltaY : this.clickPoint.y,
          width: Math.abs(deltaX),
          height: Math.abs(deltaY),
          isSelectable: true,
        },
      });
    }

    this.setState(RECTANGLE_TOOL_STATE.ADDED);

    this.cancelAction?.();
  }

  private handleMovement() {
    if (this.state !== RECTANGLE_TOOL_STATE.DEFINING_SIZE) {
      return;
    }

    if (this.rectId && this.container && this.clickPoint) {
      const { mousePoint } = this.getMousePointerContainer(this.container);

      const deltaX = mousePoint.x - this.clickPoint?.x;
      const deltaY = mousePoint.y - this.clickPoint?.y;

      this.instance.updateNode({
        key: this.rectId,
        type: "rectangle",
        props: {
          width: deltaX,
          height: deltaY,
          children: [],
        },
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

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.show();
      const node = stage.findOne(`#${this.rectId}`);
      node && selectionPlugin.setSelectedNodes([node]);
    }

    this.rectId = null;
    this.container = undefined;
    this.clickPoint = null;
    this.setState(RECTANGLE_TOOL_STATE.IDLE);
  }
}
