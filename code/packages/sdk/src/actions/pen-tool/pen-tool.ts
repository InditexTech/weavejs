import { v4 as uuidv4 } from "uuid";
import { WeaveAction } from "@/actions/action";
import { Vector2d } from "konva/lib/types";
import { WeavePenToolActionState } from "./types";
import { PEN_TOOL_STATE } from "./constants";
import Konva from "konva";
import { WeaveNodesSelectionPlugin } from "@/plugins/nodes-selection/nodes-selection";

export class WeavePenToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeavePenToolActionState;
  protected lineId: string | null;
  protected container: Konva.Layer | Konva.Group | undefined;
  protected clickPoint: Vector2d | null;
  protected tempMainLine: Konva.Line | undefined;
  protected tempLine: Konva.Line | undefined;
  protected tempPoint: Konva.Circle | undefined;
  protected tempNextPoint: Konva.Circle | undefined;
  protected cancelAction!: () => void;
  init: undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = PEN_TOOL_STATE.IDLE;
    this.lineId = null;
    this.container = undefined;
    this.clickPoint = null;
    this.tempMainLine = undefined;
    this.tempLine = undefined;
    this.tempPoint = undefined;
    this.tempNextPoint = undefined;
  }

  getName(): string {
    return "weavePenTool";
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

      if (this.state === PEN_TOOL_STATE.IDLE) {
        return;
      }

      if (this.state === PEN_TOOL_STATE.ADDING) {
        this.handleAdding();
        return;
      }

      if (this.state === PEN_TOOL_STATE.DEFINING_SIZE) {
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

  private setState(state: WeavePenToolActionState) {
    this.state = state;
  }

  private addLine() {
    const stage = this.instance.getStage();

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.hide();
    }

    stage.container().style.cursor = "crosshair";

    this.lineId = uuidv4();
    this.tempMainLine = undefined;
    this.tempLine = undefined;
    this.tempPoint = undefined;
    this.tempNextPoint = undefined;
    this.clickPoint = null;
    this.setState(PEN_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container, groupId } = this.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    this.tempMainLine = new Konva.Line({
      x: this.clickPoint.x,
      y: this.clickPoint.y,
      points: [0, 0],
      stroke: "blue",
      strokeWidth: 1,
      opacity: 1,
      groupId,
      isSelectable: false,
    });
    container?.add(this.tempMainLine);

    this.tempPoint = new Konva.Circle({
      x: this.clickPoint.x,
      y: this.clickPoint.y,
      radius: 5,
      stroke: "black",
      strokeWidth: 1,
      fill: "rgba(0,0,0,0.25)",
      groupId,
      isSelectable: false,
    });
    container?.add(this.tempPoint);

    this.tempLine = new Konva.Line({
      x: this.clickPoint.x,
      y: this.clickPoint.y,
      points: [0, 0],
      stroke: "black",
      strokeWidth: 1,
      opacity: 0.5,
      groupId,
      isSelectable: false,
    });
    container?.add(this.tempLine);

    this.tempNextPoint = new Konva.Circle({
      x: this.clickPoint.x,
      y: this.clickPoint.y,
      radius: 5,
      stroke: "black",
      strokeWidth: 1,
      fill: "rgba(0,0,0,0.25)",
      groupId,
      isSelectable: false,
    });
    container?.add(this.tempNextPoint);

    this.setState(PEN_TOOL_STATE.DEFINING_SIZE);
  }

  private handleSettingSize() {
    if (this.lineId && this.container && this.tempMainLine && this.tempPoint && this.tempNextPoint && this.tempLine) {
      const { mousePoint } = this.getMousePointerContainer(this.container);

      const newPoints = [...this.tempMainLine.points()];
      newPoints.push(mousePoint.x - this.tempMainLine.x());
      newPoints.push(mousePoint.y - this.tempMainLine.y());
      this.tempMainLine.setAttrs({
        points: newPoints,
      });
      this.tempMainLine.draw();

      this.tempPoint.setAttrs({
        x: mousePoint.x,
        y: mousePoint.y,
      });

      this.tempNextPoint.setAttrs({
        x: mousePoint.x,
        y: mousePoint.y,
      });

      this.tempLine.setAttrs({
        x: mousePoint.x,
        y: mousePoint.y,
        points: [0, 0],
      });
    }

    this.setState(PEN_TOOL_STATE.DEFINING_SIZE);
  }

  private handleMovement() {
    if (this.state !== PEN_TOOL_STATE.DEFINING_SIZE) {
      return;
    }

    if (this.lineId && this.container && this.tempLine && this.tempNextPoint) {
      const { mousePoint } = this.getMousePointerContainer(this.container);

      this.tempLine.setAttrs({
        points: [
          this.tempLine.points()[0],
          this.tempLine.points()[1],
          mousePoint.x - this.tempLine.x(),
          mousePoint.y - this.tempLine.y(),
        ],
      });
      this.tempNextPoint.setAttrs({
        x: mousePoint.x,
        y: mousePoint.y,
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

    this.addLine();
  }

  cleanup() {
    const stage = this.instance.getStage();

    this.tempLine?.destroy();
    this.tempPoint?.destroy();
    this.tempNextPoint?.destroy();

    if (this.lineId && this.tempMainLine && this.tempMainLine.points().length >= 4) {
      const origin = { x: Infinity, y: Infinity };
      for (const [index, point] of this.tempMainLine.points().entries()) {
        if (index % 2 === 0 && point < origin.x) {
          origin.x = point;
        }
        if (index % 1 === 0 && point < origin.y) {
          origin.y = point;
        }
      }

      const newPoints = [];
      for (const [index, point] of this.tempMainLine.points().entries()) {
        if (index % 2 === 0) {
          newPoints.push(point - origin.x);
        }
        if (index % 2 === 1) {
          newPoints.push(point - origin.y);
        }
      }

      const lineAttrs = this.tempMainLine.getAttrs();
      const lineX = this.tempMainLine.x();
      const lineY = this.tempMainLine.y();

      this.tempMainLine.destroy();

      const nodeHandler = this.instance.getNodeHandler("line");

      const node = nodeHandler.createNode(this.lineId, {
        x: lineX + origin.x,
        y: lineY + origin.y,
        points: newPoints,
        stroke: "#000000FF",
        strokeWidth: 1,
        hitStrokeWidth: 10,
        draggable: true,
        groupId: lineAttrs.groupId,
        zIndex: this.container?.getChildren().length ?? 0,
        isSelectable: true,
      });

      this.instance.addNode(node);

      const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
      if (selectionPlugin) {
        const tr = selectionPlugin.getTransformer();
        tr.show();
        const node = stage.findOne(`#${this.lineId}`);
        node && selectionPlugin.setSelectedNodes([node]);
      }
    }

    stage.container().style.cursor = "default";

    this.initialCursor = null;
    this.tempMainLine = undefined;
    this.tempPoint = undefined;
    this.tempNextPoint = undefined;
    this.tempLine = undefined;
    this.lineId = null;
    this.container = undefined;
    this.clickPoint = null;
    this.setState(PEN_TOOL_STATE.IDLE);
  }
}
