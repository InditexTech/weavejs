import { v4 as uuidv4 } from "uuid";
import { WeaveAction } from "@/actions/action";
import { Vector2d } from "konva/lib/types";
import { WeaveImageToolActionTriggerParams, WeaveImageToolActionCallbacks, WeaveImageToolActionState } from "./types";
import { IMAGE_TOOL_STATE } from "./constants";
import { WeaveNodesSelectionPlugin } from "@/plugins/nodes-selection/nodes-selection";
import Konva from "konva";

export class WeaveImageToolAction extends WeaveAction {
  private callbacks: WeaveImageToolActionCallbacks;
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveImageToolActionState;
  protected imageId: string | null;
  protected container: Konva.Layer | Konva.Group | undefined;
  protected imageURL: string | null;
  protected preloadImgs: Record<string, HTMLImageElement>;
  protected area: Konva.Rect | undefined;
  protected clickPoint: Vector2d | null;
  protected cancelAction!: () => void;

  constructor(callbacks: WeaveImageToolActionCallbacks) {
    super();

    this.callbacks = callbacks;
    this.initialized = false;
    this.state = IMAGE_TOOL_STATE.IDLE;
    this.imageId = null;
    this.container = undefined;
    this.imageURL = null;
    this.area = undefined;
    this.preloadImgs = {};
    this.clickPoint = null;
  }

  getName(): string {
    return "weaveImageTool";
  }

  getPreloadedImage(imageId: string): HTMLImageElement | undefined {
    return this.preloadImgs?.[imageId];
  }

  init() {
    this.instance.listenEvent("onStageDrop", () => {
      if (window.weaveDragImageURL) {
        this.instance.triggerAction("weaveImageTool", {
          imageURL: window.weaveDragImageURL,
        });
      }
    });
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.cancelAction();
      }
      e.preventDefault();
    });

    stage.on("click tap", (e) => {
      e.evt.preventDefault();

      if (this.state === IMAGE_TOOL_STATE.IDLE) {
        return;
      }

      if (this.state === IMAGE_TOOL_STATE.UPLOADING) {
        return;
      }

      if (this.state === IMAGE_TOOL_STATE.ADDING) {
        this.handleAdding();
        return;
      }
    });

    stage.on("mousemove", (e) => {
      e.evt.preventDefault();

      if (this.state === IMAGE_TOOL_STATE.ADDING && this.area) {
        const mousePos = stage.getRelativePointerPosition();
        this.area.x(mousePos?.x ?? 0);
        this.area.y(mousePos?.y ?? 0);
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveImageToolActionState) {
    this.state = state;
  }

  private loadImage(imageURL: string) {
    this.imageId = uuidv4();
    this.imageURL = imageURL;

    this.preloadImgs[this.imageId] = new Image();
    this.preloadImgs[this.imageId].onload = () => {
      this.callbacks?.onImageLoadEnd?.();
      this.addImageNode();
    };
    this.preloadImgs[this.imageId].onerror = () => {
      this.callbacks?.onImageLoadEnd?.(new Error("Error loading image"));
      this.cancelAction();
    };

    this.preloadImgs[this.imageId].src = imageURL;

    this.callbacks?.onImageLoadStart?.();
  }

  private addImageNode() {
    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.hide();
    }

    const stage = this.instance.getStage();
    const nodesLayer = this.getNodesLayer();

    stage.container().style.cursor = "crosshair";
    stage.container().focus();

    if (this.imageId) {
      const mousePos = stage.getRelativePointerPosition();
      this.area = new Konva.Rect({
        x: mousePos?.x ?? 0,
        y: mousePos?.y ?? 0,
        width: this.preloadImgs[this.imageId].width,
        height: this.preloadImgs[this.imageId].height,
        fill: "#CCCCCCCC",
        stroke: "#000000FF",
        strokeWidth: 1,
        isSelectable: false,
      });

      nodesLayer.add(this.area);
    }

    this.clickPoint = null;
    this.setState(IMAGE_TOOL_STATE.ADDING);
  }

  private addImage() {
    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.hide();
    }

    this.callbacks?.onUploadImage(this.loadImage.bind(this));

    this.setState(IMAGE_TOOL_STATE.UPLOADING);
  }

  private handleAdding() {
    if (this.imageId && this.imageURL && this.preloadImgs[this.imageId]) {
      const { mousePoint, container, groupId, zIndex } = this.getMousePointer();

      this.clickPoint = mousePoint;
      this.container = container;

      this.instance.addElement({
        id: this.imageId,
        type: "image",
        x: this.clickPoint.x,
        y: this.clickPoint.y,
        width: this.preloadImgs[this.imageId].width,
        height: this.preloadImgs[this.imageId].height,
        opacity: 1,
        imageURL: this.imageURL,
        stroke: "#000000FF",
        strokeWidth: 0,
        draggable: true,
        imageInfo: {
          width: this.preloadImgs[this.imageId].width,
          height: this.preloadImgs[this.imageId].height,
        },
        groupId,
        zIndex,
        isSelectable: true,
      });

      this.setState(IMAGE_TOOL_STATE.FINISHED);
    }

    this.cancelAction();
  }

  trigger(cancelAction: () => void, params?: WeaveImageToolActionTriggerParams) {
    if (!this.instance) {
      throw new Error("Instance not defined");
    }

    if (!this.initialized) {
      this.setupEvents();
    }

    this.cancelAction = cancelAction;

    if (params?.imageURL) {
      this.loadImage(params.imageURL);
      return;
    }

    this.addImage();
  }

  cleanup() {
    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.show();
    }

    const stage = this.instance.getStage();

    stage.container().style.cursor = "default";

    this.initialCursor = null;
    this.imageId = null;
    this.container = undefined;
    this.imageURL = null;
    this.clickPoint = null;
    if (this.area) {
      this.area.destroy();
      this.area = undefined;
    }
    this.setState(IMAGE_TOOL_STATE.IDLE);
  }
}
