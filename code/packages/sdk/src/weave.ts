import { isEmpty } from "lodash";
// import { isEmpty, orderBy } from "lodash";
import Emittery from "emittery";
import Konva from "konva";
// import { v4 as uuidv4 } from "uuid";
import { WeaveConfig, NodeSerializable, WeaveStateElement, WeaveState } from "@/types";
import { WeaveStore } from "./stores/store";
import { WeaveNode } from "./nodes/node";
import { WeaveAction } from "./actions/action";
import { WeavePlugin } from "./plugins/plugin";
// import { WEAVE_NODE_LAYER_ID } from "./plugins/nodes-layer/constants";
import { GroupSerializable } from "./types";
// import { Vector2d } from "konva/lib/types";
import { WeaveReconciler } from "./reconciler/reconciler";
import { WeaveStateSerializer } from "./state-serializer/state-serializer";
import { WeaveRenderer } from "./renderer/renderer";
import { WEAVE_NODE_LAYER_ID } from "./constants";

export class Weave extends Emittery {
  private config: WeaveConfig;
  private stage!: Konva.Stage;
  private stageConfig: Konva.StageConfig;
  private store!: WeaveStore;
  private nodesHandlers: Record<string, WeaveNode> = {};
  private actionsHandlers: Record<string, WeaveAction> = {};
  private activeAction: string | undefined = undefined;
  private plugins: Record<string, WeavePlugin> = {};
  private reconciler: WeaveReconciler;
  private stateSerializer: WeaveStateSerializer;
  private renderer: WeaveRenderer;

  constructor(weaveConfig: WeaveConfig, stageConfig: Konva.StageConfig) {
    super();
    this.config = weaveConfig;

    if (this.config.nodes) {
      for (const node of this.config.nodes) {
        this.registerNodeHandler(node);
      }
    }

    if (this.config.plugins) {
      for (const plugin of this.config.plugins) {
        this.registerPlugin(plugin);
      }
    }

    if (this.config.actions) {
      for (const action of this.config.actions) {
        this.registerActionHandler(action);
      }
    }

    this.stateSerializer = new WeaveStateSerializer();
    this.reconciler = new WeaveReconciler(this, { debug: false });
    this.renderer = new WeaveRenderer(this, this.reconciler, this.stateSerializer);

    this.stageConfig = stageConfig;

    window.weave = this;
  }

  setup() {
    this.config.store.register(this);
    this.store = this.config.store.register(this);
    this.store.connect();
  }

  start() {
    this.renderer.init();
    this.renderer.render(() => {
      this.setupPlugins();
      this.setupActions();
      // this.config?.callbacks?.isStarted?.();
    });
  }

  private setupPlugins() {
    for (const plugin of Object.keys(this.plugins)) {
      const pluginInstance = this.plugins[plugin];
      pluginInstance.init?.();
    }
  }

  protected renderPlugins() {
    for (const pluginId of Object.keys(this.plugins)) {
      const pluginInstance = this.plugins[pluginId];
      pluginInstance.render?.();
    }
  }

  // private initStage(stageConfig: Konva.StageConfig): Konva.Stage {
  //   const stage = new Konva.Stage(stageConfig);

  //   stage.container().style.cursor = "default";

  //   return stage;
  // }

  // private initLayers() {
  //   for (const pluginId of Object.keys(this.plugins)) {
  //     const pluginInstance = this.plugins[pluginId];
  //     pluginInstance.initLayer?.();
  //   }
  // }

  private setupActions() {
    for (const actionId of Object.keys(this.actionsHandlers)) {
      const actionInstance = this.actionsHandlers[actionId];
      actionInstance.init?.();
    }
  }

  emitEvent<T>(event: string, payload: T) {
    this.emit(event, payload);
  }

  listenEvent<T>(event: string, callback: (payload: T) => void) {
    this.on(event, callback);
  }

  getPlugins() {
    return this.plugins;
  }

  getNodesHandlers() {
    return this.nodesHandlers;
  }

  getActionsHandlers() {
    return this.actionsHandlers;
  }

  getStore<T extends WeaveStore>() {
    return this.store as T;
  }

  setStage(stage: Konva.Stage) {
    this.stage = stage;
  }

  getStage() {
    return this.stage;
  }

  destroy() {
    this.stage.destroy();
  }

  registerStore(store: WeaveStore) {
    store.register(this);
  }

  registerNodeHandler(node: WeaveNode) {
    const nodeType = node.getNodeType();
    if (this.nodesHandlers[nodeType]) {
      throw new Error(`Node with type ${nodeType} already exists`);
    }

    node.register(this);
    this.nodesHandlers[nodeType] = node;
  }

  registerPlugin(plugin: WeavePlugin) {
    const pluginName = plugin.getName();
    if (this.plugins[pluginName]) {
      throw new Error(`Plugin with name ${pluginName} already exists`);
    }

    plugin.register(this);
    this.plugins[pluginName] = plugin;
  }

  registerActionHandler(action: WeaveAction) {
    const actionName = action.getName();
    if (this.actionsHandlers[actionName]) {
      throw new Error(`Action with name ${actionName} already exists`);
    }

    action.register(this);
    this.actionsHandlers[actionName] = action;
  }

  getPlugin<T extends WeavePlugin>(pluginName: string) {
    if (!this.plugins[pluginName]) {
      throw new Error(`Plugin ${pluginName} not found`);
    }
    return this.plugins[pluginName] as T;
  }

  getActionHandler<T extends WeaveAction>(actionName: string) {
    if (!this.actionsHandlers[actionName]) {
      throw new Error(`Action ${actionName} not found`);
    }
    return this.actionsHandlers[actionName] as T;
  }

  getActiveAction() {
    return this.activeAction;
  }

  getMainLayer() {
    const stage = this.getStage();
    return stage.findOne(`#${WEAVE_NODE_LAYER_ID}`) as Konva.Layer | undefined;
  }

  // moveUp(node: NodeSerializable) {
  //   const stage = this.getStage();

  //   const konvaNode = stage.findOne(`#${node.id}`) as Konva.Group | Konva.Shape | undefined;
  //   if (konvaNode) {
  //     konvaNode.moveUp();
  //     this.updateNodeZIndex(konvaNode);
  //   }
  // }

  // moveDown(node: NodeSerializable) {
  //   const stage = this.getStage();

  //   const konvaNode = stage.findOne(`#${node.id}`) as Konva.Group | Konva.Shape | undefined;
  //   if (konvaNode) {
  //     konvaNode.moveDown();
  //     this.updateNodeZIndex(konvaNode);
  //   }
  // }

  // sendToBack(node: NodeSerializable) {
  //   const stage = this.getStage();

  //   const konvaNode = stage.findOne(`#${node.id}`) as Konva.Group | Konva.Shape | undefined;
  //   if (konvaNode) {
  //     konvaNode.moveToBottom();
  //     this.updateNodeZIndex(konvaNode);
  //   }
  // }

  // bringToFront(node: NodeSerializable) {
  //   const stage = this.getStage();

  //   const konvaNode = stage.findOne(`#${node.id}`) as Konva.Group | Konva.Shape | undefined;
  //   if (konvaNode) {
  //     konvaNode.moveToTop();
  //     this.updateNodeZIndex(konvaNode);
  //   }
  // }

  getStageConfiguration() {
    return this.stageConfig;
  }

  getConfiguration() {
    return this.config;
  }

  cancelAction(actionName: string) {
    if (!this.actionsHandlers[actionName]) {
      throw new Error(`Action ${actionName} not found`);
    }

    this.activeAction = undefined;
    this.actionsHandlers[actionName].cleanup?.();

    this.config.callbacks?.onActiveActionChange?.(this.activeAction);
    this.emit("onActiveActionChange", this.activeAction);
  }

  triggerAction<T>(actionName: string, params?: T) {
    if (!this.actionsHandlers[actionName]) {
      throw new Error(`Action ${actionName} not found`);
    }

    if (typeof this.activeAction !== "undefined") {
      this.cancelAction(this.activeAction);
    }

    this.activeAction = actionName;
    this.actionsHandlers[actionName].trigger(this.cancelActionCallback(actionName), params);
    this.config.callbacks?.onActiveActionChange?.(this.activeAction);
    this.emit("onActiveActionChange", this.activeAction);
  }

  getNodeRecursive(node: Konva.Node): Konva.Node {
    const stage = this.getStage();
    const attributes = node.getAttrs();

    if (attributes.isSelectable) {
      return node;
    }

    const groupId = attributes.groupId;
    const parent = stage.findOne(`#${groupId}`) as Konva.Node | undefined;
    if (parent && typeof parent.getAttrs().groupId !== "undefined") {
      return this.getNodeRecursive(parent);
    }

    if (parent && typeof parent.getAttrs().groupId === "undefined") {
      return parent;
    }

    return node;
  }

  protected cancelActionCallback(actionName: string) {
    return () => {
      this.cancelAction(actionName);
    };
  }

  allKonvaNodesInSameParent(nodes: (Konva.Group | Konva.Shape)[]) {
    if (nodes.length === 0) {
      return { allInSame: false, parentId: undefined };
    }

    let allInSame = true;
    const nodeAttrs = nodes[0].getAttrs();
    const parentId = nodeAttrs.groupId;
    for (const node of nodes) {
      const nodeAttrs = node.getAttrs();
      if (nodeAttrs.groupId !== parentId) {
        allInSame = false;
        break;
      }
    }

    return { allInSame, parentId };
  }

  allNodesInSameParent(nodes: (GroupSerializable | NodeSerializable)[]) {
    if (nodes.length === 0) {
      return { allInSame: false, parentId: undefined };
    }

    let allInSame = true;
    const parentId = nodes[0].groupId;
    for (const node of nodes) {
      if (node.groupId !== parentId) {
        allInSame = false;
        break;
      }
    }

    return { allInSame, parentId };
  }

  // NEW

  getNodeHandler(nodeType: string) {
    if (!this.nodesHandlers[nodeType]) {
      throw new Error(`A node handler for kind [${nodeType}] is not registered.`);
    }

    return this.nodesHandlers[nodeType];
  }

  update(newState: WeaveState) {
    this.getStore().setState(newState);
    this.renderer.render();
  }

  render() {
    this.renderer.render();
    // this.renderer.render(() => {
    //   this.config.callbacks?.onRender?.();
    // });
  }

  findNodeById(tree: WeaveStateElement, key: string, parent: WeaveStateElement | null = null, index = -1) {
    let found: { node: WeaveStateElement | null; parent: WeaveStateElement | null; index: number } = {
      node: null,
      parent,
      index,
    };

    if (tree.key === key) {
      return { node: tree, parent, index };
    }

    if (Array.isArray(tree.props.children) && tree.props.children.length > 0) {
      tree.props.children.some((child, index) => {
        found = this.findNodeById(child, key, tree, index);
        return found.node;
      });
    }

    return found;
  }

  getNode(nodeKey: string) {
    const state = this.getStore().getState().weave;

    if (isEmpty(state)) {
      return { node: null, parent: null, index: -1 };
    }

    return this.findNodeById(state as WeaveStateElement, nodeKey);
  }

  addNode(node: WeaveStateElement, parentId = "mainLayer", doRender = true) {
    const state = this.getStore().getState();

    if (isEmpty(state.weave)) {
      return;
    }

    const { node: nodeState } = this.findNodeById(state.weave as WeaveStateElement, node.key);
    if (nodeState) {
      console.warn(`Node with key [${node.key}] already exists`);
      return;
    }

    const { node: parent } = this.findNodeById(state.weave as WeaveStateElement, parentId);
    if (!parent) {
      console.warn(`Container with key [${parentId}] doesn't exists`);
      return;
    }

    if (!parent.props.children) {
      parent.props.children = [];
    }

    parent.props.children.push(node);

    doRender && this.render();
  }

  updateNode(node: WeaveStateElement, doRender = true) {
    const state = this.getStore().getState();

    if (isEmpty(state.weave)) {
      return;
    }

    const { node: nodeState } = this.findNodeById(state.weave as WeaveStateElement, node.key);
    if (!nodeState) {
      console.warn(`Node with key [${node.key}] doesn't exists`);
      return;
    }

    const nodeNew = JSON.parse(JSON.stringify({ ...nodeState.props, ...node.props }));

    nodeState.props = {
      ...nodeNew,
    };

    doRender && this.render();
  }

  removeNode(node: WeaveStateElement, doRender = true) {
    const state = this.getStore().getState();

    if (isEmpty(state.weave)) {
      return;
    }

    const { node: nodeState, parent: parentState } = this.findNodeById(state.weave as WeaveStateElement, node.key);

    if (!nodeState) {
      console.warn(`Element with key [${node.key}] doesn't exists`);
      return;
    }

    if (parentState) {
      if (!parentState.props.children) {
        parentState.props.children = [];
      }

      const elementIndex = parentState.props.children.findIndex((actNode) => actNode.key === node.key);
      if (elementIndex !== -1) {
        parentState.props.children.splice(elementIndex, 1);
      }
    }

    doRender && this.render();
  }

  removeNodes(nodes: WeaveStateElement[], doRender = true) {
    for (const node of nodes) {
      this.removeNode(node, false);
    }

    doRender && this.render();
  }
}
