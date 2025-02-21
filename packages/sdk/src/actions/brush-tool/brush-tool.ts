import { v4 as uuidv4 } from "uuid";
import { WeaveAction } from "@/actions/action";
import { Vector2d } from "konva/lib/types";
import { WeaveBrushToolActionState } from "./types";
import { BRUSH_TOOL_STATE } from "./constants";
import Konva from "konva";
import { WeaveNodesSelectionPlugin } from "@/plugins/nodes-selection/nodes-selection";

export class WeaveBrushToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveBrushToolActionState;
  protected clickPoint: Vector2d | null;
  protected tempStroke: Konva.Line | undefined;
  protected container: Konva.Layer | Konva.Group | undefined;
  protected cancelAction!: () => void;
  init = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = BRUSH_TOOL_STATE.INACTIVE;
    this.clickPoint = null;
    this.container = undefined;
    this.tempStroke = undefined;
  }

  getName(): string {
    return "weaveBrushTool";
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    stage.container().addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        this.cancelAction();
        return;
      }
    });

    stage.on("mousedown touchstart", (e) => {
      if (this.state !== BRUSH_TOOL_STATE.IDLE) {
        return;
      }

      this.handleStartStroke();

      e.evt.preventDefault();
      e.evt.stopPropagation();
    });

    stage.on("mousemove touchmove", (e) => {
      if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
        return;
      }

      this.handleMovement();

      e.evt.preventDefault();
      e.evt.stopPropagation();
    });

    stage.on("mouseup touchend", (e) => {
      if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
        return;
      }

      this.handleEndStroke();

      e.evt.preventDefault();
      e.evt.stopPropagation();
    });

    this.initialized = true;
  }

  private setState(state: WeaveBrushToolActionState) {
    this.state = state;
  }

  private handleStartStroke() {
    const { mousePoint, container, groupId, zIndex } = this.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    this.tempStroke = new Konva.Line({
      x: this.clickPoint.x,
      y: this.clickPoint.y,
      points: [0, 0],
      stroke: "blue",
      strokeWidth: 1,
      opacity: 1,
      groupId,
      zIndex,
      isSelectable: false,
    });
    container.add(this.tempStroke);

    this.setState(BRUSH_TOOL_STATE.DEFINE_STROKE);
  }

  private handleEndStroke() {
    const stage = this.instance.getStage();

    if (this.tempStroke) {
      const origin = { x: Infinity, y: Infinity };
      for (const [index, point] of this.tempStroke.points().entries()) {
        if (index % 2 === 0 && point < origin.x) {
          origin.x = point;
        }
        if (index % 1 === 0 && point < origin.y) {
          origin.y = point;
        }
      }

      const newPoints = [];
      for (const [index, point] of this.tempStroke.points().entries()) {
        if (index % 2 === 0) {
          newPoints.push(point - origin.x);
        }
        if (index % 2 === 1) {
          newPoints.push(point - origin.y);
        }
      }

      const strokeAttrs = this.tempStroke.getAttrs();

      this.instance.addElement({
        id: uuidv4(),
        type: "line",
        x: this.tempStroke.x() + origin.x,
        y: this.tempStroke.y() + origin.y,
        points: newPoints,
        stroke: "#000000FF",
        strokeWidth: 1,
        hitStrokeWidth: 10,
        draggable: true,
        groupId: strokeAttrs.groupId,
        zIndex: strokeAttrs.zIndex,
        isSelectable: true,
      });

      this.tempStroke.destroy();
      this.tempStroke = undefined;
      this.clickPoint = null;

      stage.container().tabIndex = 1;
      stage.container().focus();

      this.setState(BRUSH_TOOL_STATE.IDLE);
    }
  }

  private handleMovement() {
    if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
      return;
    }

    if (this.tempStroke && this.container) {
      const { mousePoint } = this.getMousePointerContainer(this.container);

      this.tempStroke.points([
        ...this.tempStroke.points(),
        mousePoint.x - this.tempStroke.x(),
        mousePoint.y - this.tempStroke.y(),
      ]);
    }
  }

  trigger(cancel: () => void) {
    if (!this.instance) {
      throw new Error("Instance not defined");
    }

    if (!this.initialized) {
      this.setupEvents();
    }

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.hide();
    }

    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    this.cancelAction = cancel;

    this.setState(BRUSH_TOOL_STATE.IDLE);

    stage.container().style.cursor = "crosshair";
  }

  cleanup() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = "default";

    if (this.tempStroke) {
      this.tempStroke.destroy();
    }

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.show();
      selectionPlugin.setSelectedNodes([]);
    }

    this.tempStroke = undefined;
    this.clickPoint = null;
    this.setState(BRUSH_TOOL_STATE.INACTIVE);
  }
}
