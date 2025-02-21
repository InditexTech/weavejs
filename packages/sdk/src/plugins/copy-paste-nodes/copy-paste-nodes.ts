import { WeavePlugin } from "@/plugins/plugin";
import Konva from "konva";
import { NodeSerializable } from "@/types";
import { WeaveCopyPasteNodesPluginState, WeaveCopyPasteNodesPluginCallbacks } from "./types";
import { COPY_PASTE_NODES_PLUGIN_STATE } from "./constants";
import { WeaveNodesSelectionPlugin } from "../nodes-selection/nodes-selection";
import { WeaveNodesSelectionChangeCallback } from "../nodes-selection/types";
import { Vector2d } from "konva/lib/types";
import { WEAVE_NODE_LAYER_ID } from "../nodes-layer/constants";

export class WeaveCopyPasteNodesPlugin extends WeavePlugin {
  protected selectedElements: (Konva.Group | Konva.Shape)[];
  protected state: WeaveCopyPasteNodesPluginState;
  private callbacks: WeaveCopyPasteNodesPluginCallbacks | undefined;
  getLayerName: undefined;
  initLayer: undefined;
  render: undefined;

  constructor(callbacks?: WeaveCopyPasteNodesPluginCallbacks) {
    super();

    this.callbacks = callbacks;
    this.state = COPY_PASTE_NODES_PLUGIN_STATE.IDLE;
    this.selectedElements = [];
  }

  registersLayers() {
    return false;
  }

  getName() {
    return "weaveCopyPasteNodes";
  }

  init() {
    this.initEvents();
  }

  private initEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.cancel();
        return;
      }

      if (e.key === "c" && (e.metaKey || e.ctrlKey)) {
        this.performCopy();
        return;
      }
      if (e.key === "v" && (e.metaKey || e.ctrlKey)) {
        this.performPaste();
        return;
      }
    });

    stage.on("click tap", (e) => {
      e.evt.preventDefault();

      if (this.state === COPY_PASTE_NODES_PLUGIN_STATE.IDLE) {
        return;
      }

      if (this.state === COPY_PASTE_NODES_PLUGIN_STATE.PASTING) {
        this.handlePaste();
        return;
      }
    });

    this.instance.listenEvent<WeaveNodesSelectionChangeCallback>("onNodesChange", () => {
      this.callbacks?.onCanCopyChange?.(this.canCopy());
      this.callbacks?.onCanPasteChange?.(this.canPaste(), this.mapToPasteNodes());
    });
  }

  private mapToPasteNodes() {
    return this.selectedElements.map((node) => ({ konvaNode: node, node: node.getAttrs() as NodeSerializable }));
  }

  private setState(state: WeaveCopyPasteNodesPluginState) {
    this.state = state;
  }

  private getNodesLayer() {
    const stage = this.instance.getStage();
    return stage.findOne(`#${WEAVE_NODE_LAYER_ID}`) as Konva.Layer;
  }

  private getMousePointer(point?: Vector2d) {
    const stage = this.instance.getStage();

    let relativeMousePointer = point ? point : (stage.getPointerPosition() ?? { x: 0, y: 0 });
    let container: Konva.Layer | Konva.Group = this.getNodesLayer();
    let groupId = undefined;
    let zIndex = this.getNodesLayer().getChildren().length;

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

  private handlePaste() {
    const { mousePoint, container, groupId, zIndex } = this.getMousePointer();

    this.instance.cloneNodes(this.selectedElements, container, groupId, zIndex, mousePoint);

    this.selectedElements = [];

    this.cancel();
  }

  private performCopy() {
    this.callbacks?.onCanCopyChange?.(this.canCopy());
    this.callbacks?.onCanPasteChange?.(this.canPaste(), this.mapToPasteNodes());

    const stage = this.instance.getStage();

    stage.container().style.cursor = "default";
    stage.container().focus();

    this.setState(COPY_PASTE_NODES_PLUGIN_STATE.IDLE);

    const nodesSelectionPlugin = this.getNodesSelectionPlugin();
    const selectedNodes = nodesSelectionPlugin.getSelectedNodes();
    if (selectedNodes.length === 0) {
      return;
    }

    this.selectedElements = selectedNodes;

    this.callbacks?.onCanCopyChange?.(this.canCopy());
    this.callbacks?.onCanPasteChange?.(this.canPaste(), this.mapToPasteNodes());
  }

  private performPaste() {
    this.callbacks?.onCanCopyChange?.(this.canCopy());
    this.callbacks?.onCanPasteChange?.(this.canPaste(), this.mapToPasteNodes());

    const stage = this.instance.getStage();

    if (this.selectedElements.length === 0) {
      return;
    }

    stage.container().style.cursor = "crosshair";
    stage.container().focus();

    this.setState(COPY_PASTE_NODES_PLUGIN_STATE.PASTING);
  }

  copy() {
    this.performCopy();
  }

  paste() {
    this.performPaste();
  }

  getSelectedNodes() {
    return this.mapToPasteNodes();
  }

  canCopy() {
    const nodesSelectionPlugin = this.getNodesSelectionPlugin();
    const selectedNodes = nodesSelectionPlugin.getSelectedNodes();
    return this.state === COPY_PASTE_NODES_PLUGIN_STATE.IDLE && selectedNodes.length > 0;
  }

  canPaste() {
    return this.selectedElements.length > 0;
  }

  private cancel() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = "default";
    stage.container().focus();

    this.selectedElements = [];
    this.setState(COPY_PASTE_NODES_PLUGIN_STATE.IDLE);

    this.callbacks?.onCanCopyChange?.(this.canCopy());
    this.callbacks?.onCanPasteChange?.(this.canPaste(), this.mapToPasteNodes());
  }

  private getNodesSelectionPlugin() {
    const nodesSelectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (!nodesSelectionPlugin) {
      throw new Error("Nodes selection plugin not found");
    }
    return nodesSelectionPlugin;
  }
}
