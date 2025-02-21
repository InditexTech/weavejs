import { orderBy } from "lodash";
import Emittery from "emittery";
import Konva from "konva";
import { v4 as uuidv4 } from "uuid";
import { WeaveConfig, NodeSerializable } from "@/types";
import { WeaveStore } from "./stores/store";
import { WeaveNode } from "./nodes/node";
import { WeaveAction } from "./actions/action";
import { WeavePlugin } from "./plugins/plugin";
import { WEAVE_NODE_LAYER_ID } from "./plugins/nodes-layer/constants";
import { GroupSerializable } from "./types";
import { Vector2d } from "konva/lib/types";
import { WeaveNodesManager } from "./nodes";
import { WeaveGroupsManager } from "./groups";

export class Weave extends Emittery {
  private config: WeaveConfig;
  private stage!: Konva.Stage;
  private stageConfig: Konva.StageConfig;
  private store!: WeaveStore;
  private nodes: Record<string, WeaveNode> = {};
  private actions: Record<string, WeaveAction> = {};
  private activeAction: string | undefined = undefined;
  private plugins: Record<string, WeavePlugin> = {};
  private nodesManager: WeaveNodesManager;
  private groupsManager: WeaveGroupsManager;

  constructor(weaveConfig: WeaveConfig, stageConfig: Konva.StageConfig) {
    super();
    this.config = weaveConfig;

    if (this.config.nodes) {
      for (const node of this.config.nodes) {
        this.registerNode(node);
      }
    }

    if (this.config.plugins) {
      for (const plugin of this.config.plugins) {
        this.registerPlugin(plugin);
      }
    }

    if (this.config.actions) {
      for (const action of this.config.actions) {
        this.registerAction(action);
      }
    }

    this.groupsManager = new WeaveGroupsManager(this);
    this.nodesManager = new WeaveNodesManager(this);

    this.stageConfig = stageConfig;

    window.weave = this;
  }

  load() {
    this.stage = this.initStage(this.stageConfig);
    this.initLayers();

    this.config.store.register(this);
    this.store = this.config.store.register(this);
    this.store.connect();

    this.initPlugins();
    this.initActions();
    this.renderPlugins();
  }

  private initPlugins() {
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

  private initStage(stageConfig: Konva.StageConfig): Konva.Stage {
    const stage = new Konva.Stage(stageConfig);

    stage.container().style.cursor = "default";

    return stage;
  }

  private initLayers() {
    for (const pluginId of Object.keys(this.plugins)) {
      const pluginInstance = this.plugins[pluginId];
      pluginInstance.initLayer?.();
    }
  }

  private initActions() {
    for (const actionId of Object.keys(this.actions)) {
      const actionInstance = this.actions[actionId];
      actionInstance.init?.();
    }
  }

  emitEvent<T>(event: string, payload: T) {
    this.emit(event, payload);
  }

  listenEvent<T>(event: string, callback: (payload: T) => void) {
    this.on(event, callback);
  }

  addElement(ele: NodeSerializable | GroupSerializable) {
    if (ele.type === "group") {
      this.groupsManager.add(ele as GroupSerializable);
    }
    if (ele.type !== "group") {
      this.nodesManager.add(ele as NodeSerializable);
    }
  }

  updateElement(ele: NodeSerializable | GroupSerializable) {
    if (ele.type === "group") {
      this.groupsManager.update(ele as GroupSerializable);
    }
    if (ele.type !== "group") {
      this.nodesManager.update(ele as NodeSerializable);
    }
  }

  removeElement(ele: NodeSerializable | GroupSerializable) {
    if (ele.type === "group") {
      this.groupsManager.remove(ele as GroupSerializable);
    }
    if (ele.type !== "group") {
      this.nodesManager.remove(ele as NodeSerializable);
    }
  }

  getPlugins() {
    return this.plugins;
  }

  getNodes() {
    return this.nodes;
  }

  getActions() {
    return this.actions;
  }

  getStore<T extends WeaveStore>() {
    return this.store as T;
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

  registerNode(node: WeaveNode) {
    const nodeName = node.getType();
    if (this.nodes[nodeName]) {
      throw new Error(`Node with type ${nodeName} already exists`);
    }

    node.register(this);
    this.nodes[nodeName] = node;
  }

  registerPlugin(plugin: WeavePlugin) {
    const pluginName = plugin.getName();
    if (this.plugins[pluginName]) {
      throw new Error(`Plugin with name ${pluginName} already exists`);
    }

    plugin.register(this);
    this.plugins[pluginName] = plugin;
  }

  registerAction(action: WeaveAction) {
    const actionName = action.getName();
    if (this.actions[actionName]) {
      throw new Error(`Action with name ${actionName} already exists`);
    }

    action.register(this);
    this.actions[actionName] = action;
  }

  getPlugin<T extends WeavePlugin>(pluginName: string) {
    if (!this.plugins[pluginName]) {
      throw new Error(`Plugin ${pluginName} not found`);
    }
    return this.plugins[pluginName] as T;
  }

  getAction<T extends WeaveAction>(actionName: string) {
    if (!this.actions[actionName]) {
      throw new Error(`Action ${actionName} not found`);
    }
    return this.actions[actionName] as T;
  }

  getNodeHandler<T extends WeaveNode>(nodeName: string) {
    if (!this.nodes[nodeName]) {
      throw new Error(`Node ${nodeName} not found`);
    }
    return this.nodes[nodeName] as T;
  }

  getActiveAction() {
    return this.activeAction;
  }

  moveUp(node: NodeSerializable) {
    const stage = this.getStage();

    const konvaNode = stage.findOne(`#${node.id}`) as Konva.Group | Konva.Shape | undefined;
    if (konvaNode) {
      konvaNode.moveUp();
      this.updateNodeZIndex(konvaNode);
    }
  }

  moveDown(node: NodeSerializable) {
    const stage = this.getStage();

    const konvaNode = stage.findOne(`#${node.id}`) as Konva.Group | Konva.Shape | undefined;
    if (konvaNode) {
      konvaNode.moveDown();
      this.updateNodeZIndex(konvaNode);
    }
  }

  sendToBack(node: NodeSerializable) {
    const stage = this.getStage();

    const konvaNode = stage.findOne(`#${node.id}`) as Konva.Group | Konva.Shape | undefined;
    if (konvaNode) {
      konvaNode.moveToBottom();
      this.updateNodeZIndex(konvaNode);
    }
  }

  bringToFront(node: NodeSerializable) {
    const stage = this.getStage();

    const konvaNode = stage.findOne(`#${node.id}`) as Konva.Group | Konva.Shape | undefined;
    if (konvaNode) {
      konvaNode.moveToTop();
      this.updateNodeZIndex(konvaNode);
    }
  }

  getConfiguration() {
    return this.config;
  }

  getRegisteredNodes() {
    return this.nodes;
  }

  getNodesManager() {
    return this.nodesManager;
  }

  getGroupsManager() {
    return this.groupsManager;
  }

  cancelAction(actionName: string) {
    if (!this.actions[actionName]) {
      throw new Error(`Action ${actionName} not found`);
    }

    this.activeAction = undefined;
    this.actions[actionName].cleanup?.();

    this.config.callbacks?.onActiveActionChange?.(this.activeAction);
    this.emit("onActiveActionChange", this.activeAction);
  }

  triggerAction<T>(actionName: string, params?: T) {
    if (!this.actions[actionName]) {
      throw new Error(`Action ${actionName} not found`);
    }

    if (typeof this.activeAction !== "undefined") {
      this.cancelAction(this.activeAction);
    }

    this.activeAction = actionName;
    this.actions[actionName].trigger(this.cancelActionCallback(actionName), params);
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

  private mapToState(container: Konva.Group | Konva.Layer, nodes: (Konva.Group | Konva.Shape)[], level = 0) {
    const stage = this.getStage();
    const nodesLayer = this.getNodesLayer();

    const groupId = container instanceof Konva.Layer ? undefined : container.getAttrs().id;

    const clonedNodes = [];

    let containerElementsAmount = 0;
    let parent = stage.findOne(`#${groupId}`) as Konva.Layer | Konva.Group | undefined;
    if (!parent) {
      parent = nodesLayer;
      containerElementsAmount = (parent?.getChildren() ?? []).length - 1;
    }

    for (const [index, node] of nodes.entries()) {
      const nodeAttrs = node.getAttrs();

      if (nodeAttrs.type === "group") {
        const newGroupId = uuidv4();

        const nodePos = node.getAbsolutePosition();
        const nodeRotation = node.getAbsoluteRotation();

        node.moveTo(container);
        node.setAbsolutePosition(nodePos);
        node.rotation(nodeRotation);

        this.addElement({
          ...({ ...node.getAttrs() } as GroupSerializable),
          nodes: [],
          id: newGroupId,
          groupId,
          zIndex: containerElementsAmount + index,
        });

        const element = stage.findOne(`#${newGroupId}`) as Konva.Group | undefined;

        if (element) {
          const groupNodes = this.mapToState(element, [...(node as Konva.Group).getChildren()], level + 1);

          const groupAttrs = { ...element.getAttrs() } as GroupSerializable;
          node.destroy();

          this.updateElement({
            ...groupAttrs,
            nodes: groupNodes,
          });

          clonedNodes.push(newGroupId);
        }
      }

      if (nodeAttrs.type !== "group") {
        const nodeId = uuidv4();

        const nodePos = node.getAbsolutePosition();
        const nodeRotation = node.getAbsoluteRotation();

        node.moveTo(container);
        node.setAbsolutePosition(nodePos);
        node.rotation(nodeRotation);

        const nodeAttrs = { ...node.getAttrs() } as NodeSerializable;
        node.destroy();

        this.addElement({
          ...nodeAttrs,
          id: nodeId,
          groupId,
          zIndex: containerElementsAmount + index,
        });

        clonedNodes.push(nodeId);
      }
    }

    return clonedNodes;
  }

  cloneNodes(
    nodes: (Konva.Group | Konva.Shape)[],
    container: Konva.Group | Konva.Layer,
    containerGroupId: string | undefined,
    zIndex: number,
    onPoint: Vector2d,
  ) {
    if (nodes.length === 0) {
      return;
    }

    const { allInSame } = this.allKonvaNodesInSameParent(nodes);

    if (!allInSame) {
      return;
    }

    const groupId = uuidv4();
    const newGroup = new Konva.Group({
      id: groupId,
      groupId: containerGroupId,
    });

    container.add(newGroup);
    newGroup.zIndex(zIndex);

    const nodesWithZIndex = nodes.map((node) => ({ node, zIndex: node.zIndex() })).filter((node) => node.zIndex !== -1);

    const sortedNodesByZIndex = orderBy(nodesWithZIndex, ["zIndex"], ["asc"]).map((node) => node.node);

    for (const [index, node] of sortedNodesByZIndex.entries()) {
      const nodeAttrs = node.getAttrs();

      if (nodeAttrs.type === "group") {
        const clonedNode: Konva.Group = node.clone({
          id: uuidv4(),
          type: "group",
          groupId,
        });

        const nodePos = clonedNode.getAbsolutePosition();
        const nodeRotation = clonedNode.getAbsoluteRotation();

        clonedNode.moveTo(newGroup);
        clonedNode.zIndex(index);
        clonedNode.setAbsolutePosition(nodePos);
        clonedNode.rotation(nodeRotation);

        continue;
      }

      const clonedNode = node.clone({
        id: uuidv4(),
        groupId,
      });

      const nodePos = clonedNode.getAbsolutePosition();
      const nodeRotation = clonedNode.getAbsoluteRotation();

      clonedNode.moveTo(newGroup);
      clonedNode.zIndex(index);
      clonedNode.setAbsolutePosition(nodePos);
      clonedNode.rotation(nodeRotation);
    }

    const actualPos = newGroup.getClientRect({ relativeTo: container });

    newGroup.x(onPoint.x - actualPos.x);
    newGroup.y(onPoint.y - actualPos.y);

    this.mapToState(container, [...newGroup.getChildren()]);

    newGroup.destroy();
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

  protected getNodesLayer() {
    const stage = this.getStage();
    const layer = stage.findOne(`#${WEAVE_NODE_LAYER_ID}`) as Konva.Layer;
    return layer;
  }

  private updateNodeZIndex(node: Konva.Group | Konva.Shape) {
    const nodeParent = node.getParent();

    for (const [index, child] of (nodeParent?.getChildren() ?? []).entries()) {
      const childAttrs = child.getAttrs();
      if (childAttrs.type === "group") {
        this.updateElement({
          ...(childAttrs as GroupSerializable),
          zIndex: index,
        });
      }
      if (childAttrs.type !== "group") {
        this.updateElement({
          ...(childAttrs as NodeSerializable),
          zIndex: index,
        });
      }
    }
  }
}
