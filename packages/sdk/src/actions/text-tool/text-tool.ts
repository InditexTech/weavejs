import { v4 as uuidv4 } from "uuid";
import { WeaveAction } from "@/actions/action";
import { Vector2d } from "konva/lib/types";
import { WeaveTextToolActionState } from "./types";
import { TEXT_TOOL_STATE } from "./constants";
import Konva from "konva";
import { WeaveNodesSelectionPlugin } from "@/plugins/nodes-selection/nodes-selection";

export class WeaveTextToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveTextToolActionState;
  protected textId: string | null;
  protected container: Konva.Layer | Konva.Group | undefined;
  protected clickPoint: Vector2d | null;
  protected cancelAction!: () => void;
  init: undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = TEXT_TOOL_STATE.IDLE;
    this.textId = null;
    this.container = undefined;
    this.clickPoint = null;
  }

  getName(): string {
    return "weaveTextTool";
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.on("click tap", (e) => {
      e.evt.preventDefault();

      if (this.state === TEXT_TOOL_STATE.IDLE) {
        return;
      }

      if (this.state === TEXT_TOOL_STATE.ADDING) {
        this.handleAdding();
        return;
      }
    });

    stage.on("mousemove", (e) => {
      e.evt.preventDefault();
    });

    this.initialized = true;
  }

  private setState(state: WeaveTextToolActionState) {
    this.state = state;
  }

  private addText() {
    const stage = this.instance.getStage();

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.hide();
    }

    stage.container().style.cursor = "crosshair";

    this.clickPoint = null;
    this.setState(TEXT_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const stage = this.instance.getStage();

    const { mousePoint, container, groupId, zIndex } = this.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    this.textId = uuidv4();
    this.instance.addElement({
      id: this.textId,
      type: "text",
      x: this.clickPoint.x,
      y: this.clickPoint.y,
      text: "Prueba",
      width: 300,
      fontSize: 20,
      fontFamily: "NotoSansMono, monospace",
      fill: "#000000FF",
      strokeEnabled: false,
      stroke: "#000000FF",
      strokeWidth: 1,
      align: "left",
      verticalAlign: "top",
      opacity: 1,
      draggable: true,
      isSelectable: false,
      groupId,
      zIndex,
    });

    const textNode = stage.findOne(`#${this.textId}`) as Konva.Text | undefined;

    if (textNode) {
      textNode.getAttr("triggerEditMode")(textNode);
      this.setState(TEXT_TOOL_STATE.FINISHED);
      this.cancelAction();
      return;
    }
  }

  trigger(cancelAction: () => void) {
    if (!this.instance) {
      throw new Error("Instance not defined");
    }

    if (!this.initialized) {
      this.setupEvents();
    }

    this.cancelAction = cancelAction;

    this.addText();
  }

  cleanup() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = "default";

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.show();
    }

    this.initialCursor = null;
    this.textId = null;
    this.container = undefined;
    this.clickPoint = null;
    this.setState(TEXT_TOOL_STATE.IDLE);
  }
}
