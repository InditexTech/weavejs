// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Emittery from 'emittery';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { type Vector2d } from 'konva/lib/types';
import pino, { type Logger } from 'pino';
import {
  type WeaveConfig,
  type WeaveStateElement,
  type WeaveState,
  type WeaveElementInstance,
  type WeavePosition,
  type WeaveExportNodesOptions,
  type WeaveStatus,
  type WeaveElementAttributes,
  WEAVE_INSTANCE_STATUS,
  type WeaveMousePointInfo,
  type WeaveMousePointInfoSimple,
  type WeaveSerializedGroup,
  type WeaveFont,
  type WeaveNodeFound,
  type WeaveNodeConfiguration,
  type WeaveStoreConnectionStatus,
  WEAVE_STORE_CONNECTION_STATUS,
} from '@inditextech/weave-types';
import { WeaveStore } from './stores/store';
import {
  augmentKonvaNodeClass,
  augmentKonvaStageClass,
  WeaveNode,
} from './nodes/node';
import { WeaveAction } from './actions/action';
import { WeavePlugin } from './plugins/plugin';
import { WeaveReconciler } from './reconciler/reconciler';
import { WeaveStateSerializer } from './state-serializer/state-serializer';
import { WeaveRenderer } from './renderer/renderer';
import { WeaveGroupsManager } from './managers/groups';
import { WeaveLogger } from './logger/logger';
import { WeaveTargetingManager } from './managers/targeting';
import { WeaveCloningManager } from './managers/cloning';
import { WeaveFontsManager } from './managers/fonts';
import { WeaveZIndexManager } from './managers/zindex';
import { WeaveStateManager } from './managers/state';
import { WeaveRegisterManager } from './managers/register';
import { WeaveSetupManager } from './managers/setup';
import { WeaveStageManager } from './managers/stage';
import { WeaveActionsManager } from './managers/actions';
import { WeaveStoreManager } from './managers/store';
import { WeaveExportManager } from './managers/export';
import { WeavePluginsManager } from './managers/plugins';
import { WeaveNodesSelectionPlugin } from './plugins/nodes-selection/nodes-selection';
import type { StageConfig } from 'konva/lib/Stage';
import type { WeaveStoreOnRoomLoadedEvent } from './stores/types';

export class Weave {
  private id: string;
  private emitter: Emittery;
  private config: WeaveConfig;
  private logger: WeaveLogger;
  private moduleLogger: Logger;
  private reconciler: WeaveReconciler;
  private stateSerializer: WeaveStateSerializer;
  private renderer: WeaveRenderer;
  private initialized: boolean = false;

  private status: WeaveStatus = WEAVE_INSTANCE_STATUS.IDLE;
  private setupManager: WeaveSetupManager;
  private registerManager: WeaveRegisterManager;
  private stateManager: WeaveStateManager;
  private storeManager: WeaveStoreManager;
  private stageManager: WeaveStageManager;
  private groupsManager: WeaveGroupsManager;
  private targetingManager: WeaveTargetingManager;
  private cloningManager: WeaveCloningManager;
  private fontsManager: WeaveFontsManager;
  private zIndexManager: WeaveZIndexManager;
  private pluginsManager: WeavePluginsManager;
  private actionsManager: WeaveActionsManager;
  private exportManager: WeaveExportManager;

  constructor(weaveConfig: WeaveConfig, stageConfig: Konva.StageConfig) {
    this.emitter = new Emittery();

    Konva.showWarnings = false;

    // Setup instance id
    this.id = uuidv4();
    this.initialized = false;

    // Save in memory the configuration provided
    this.config = weaveConfig;
    // Setup the logger
    this.logger = new WeaveLogger(
      this.config?.logger ?? {
        disabled: false,
        level: 'error',
      }
    );
    // Setup a child logger for this module
    this.moduleLogger = this.logger.getChildLogger('main');

    // Instantiate the state serializer
    this.stateSerializer = new WeaveStateSerializer();
    // Instantiate the reconciler
    this.reconciler = new WeaveReconciler(this);
    // Instantiate the renderer
    this.renderer = new WeaveRenderer(
      this,
      this.reconciler,
      this.stateSerializer
    );

    // Instantiate the managers
    this.setupManager = new WeaveSetupManager(this);
    this.registerManager = new WeaveRegisterManager(this);
    this.storeManager = new WeaveStoreManager(this);
    this.stateManager = new WeaveStateManager(this);
    this.stageManager = new WeaveStageManager(this, stageConfig);
    this.groupsManager = new WeaveGroupsManager(this);
    this.targetingManager = new WeaveTargetingManager(this);
    this.cloningManager = new WeaveCloningManager(this);
    this.fontsManager = new WeaveFontsManager(this);
    this.zIndexManager = new WeaveZIndexManager(this);
    this.exportManager = new WeaveExportManager(this);
    this.actionsManager = new WeaveActionsManager(this);
    this.pluginsManager = new WeavePluginsManager(this);

    // Setup the instance on the weave global variable
    if (!window.weave) {
      window.weave = this;
    }

    // Initialize global window variables
    window.weaveTextEditing = {};
    window.weaveDragImageURL = undefined;

    // Render welcome log to console
    this.setupManager.welcomeLog();
  }

  // INSTANCE MANAGEMENT METHODS
  setupRenderer(): void {
    // Initialize the renderer
    this.renderer.init();

    // Perform the first render of the instance
    this.renderer.render(() => {
      this.removeEventListener(
        'onStoreConnectionStatusChange',
        this.handleStoreConnectionStatusChange.bind(this)
      );

      // Setup the plugins and actions that needed the first render to work
      this.setupManager.setupPlugins();
      this.setupManager.setupActions();

      this.moduleLogger.info('Instance started');

      this.initialized = true;

      this.status = WEAVE_INSTANCE_STATUS.RUNNING;
      this.emitEvent('onInstanceStatus', this.status);
    });
  }

  setStatus(status: WeaveStatus): void {
    this.status = status;
  }

  getStatus(): WeaveStatus {
    return this.status;
  }

  setStore(store: WeaveStore): void {
    this.storeManager.registerStore(store);
  }

  private handleStoreConnectionStatusChange(
    status: WeaveStoreConnectionStatus
  ): void {
    if (!this.initialized && status === WEAVE_STORE_CONNECTION_STATUS.ERROR) {
      this.status = WEAVE_INSTANCE_STATUS.CONNECTING_ERROR;
      this.emitEvent('onInstanceStatus', this.status);
    }
    if (
      status === WEAVE_STORE_CONNECTION_STATUS.CONNECTED &&
      !this.initialized
    ) {
      this.status = WEAVE_INSTANCE_STATUS.LOADING_ROOM;
      this.emitEvent('onInstanceStatus', this.status);
    }
  }

  async start(): Promise<void> {
    this.moduleLogger.info('Start instance');

    this.emitEvent<WeaveStoreOnRoomLoadedEvent>('onRoomLoaded', false);

    this.status = WEAVE_INSTANCE_STATUS.STARTING;
    this.emitEvent('onInstanceStatus', this.status);

    // Register all the nodes, plugins and actions that come from the configuration
    this.registerManager.registerNodesHandlers();
    // Augment the Konva classes
    this.augmentKonvaStageClass();
    this.augmentKonvaNodeClass();
    this.registerManager.registerPlugins();
    this.registerManager.registerActionsHandlers();

    // Register the store
    this.storeManager.registerStore(this.config.store as WeaveStore);

    this.status = WEAVE_INSTANCE_STATUS.LOADING_FONTS;
    this.emitEvent('onInstanceStatus', this.status);

    // Start loading the fonts, this operation is asynchronous
    await this.fontsManager.loadFonts();
    this.setupManager.setupLog();

    // Setup stage
    this.stageManager.initStage();

    this.status = WEAVE_INSTANCE_STATUS.CONNECTING_TO_ROOM;
    this.emitEvent('onInstanceStatus', this.status);
    // Setup and connect to the store
    const store = this.storeManager.getStore();

    this.addEventListener(
      'onStoreConnectionStatusChange',
      this.handleStoreConnectionStatusChange.bind(this)
    );

    store.setup();
    store.connect();
  }

  destroy(): void {
    this.moduleLogger.info(`Destroying the instance`);

    // clear listeners
    this.emitter.clearListeners();

    this.status = WEAVE_INSTANCE_STATUS.IDLE;
    this.emitEvent('onInstanceStatus', this.status);

    // disconnect from the store
    const store = this.storeManager.getStore();
    store.disconnect();

    // destroy the stage from memory
    const stage = this.getStage();
    if (stage) {
      stage.destroy();
    }

    this.moduleLogger.info(`Instance destroyed`);
  }

  getId(): string {
    return this.id;
  }

  // CONFIGURATION

  getConfiguration(): WeaveConfig {
    return this.config;
  }

  augmentKonvaStageClass(): void {
    augmentKonvaStageClass();
  }

  augmentKonvaNodeClass(config?: WeaveNodeConfiguration): void {
    augmentKonvaNodeClass(config);
  }

  // EVENTS METHODS

  emitEvent<T>(event: string, payload?: T): void {
    this.moduleLogger.debug({ payload }, `Emitted event [${event}]`);
    this.emitter.emit(event, payload);
  }

  addEventListener<T>(event: string, callback: (payload: T) => void): void {
    this.moduleLogger.debug(`Listening event [${event}]`);
    this.emitter.on(event, callback);
  }

  removeEventListener<T>(event: string, callback: (payload: T) => void): void {
    this.moduleLogger.debug(`Removing listening to event [${event}]`);
    this.emitter.off(event, callback);
  }

  // LOGGING MANAGEMENT METHODS PROXIES

  getLogger(): WeaveLogger {
    return this.logger;
  }

  getMainLogger(): Logger {
    return this.moduleLogger;
  }

  getChildLogger(name: string): pino.Logger<never, boolean> {
    return this.logger.getChildLogger(name);
  }

  // STAGE MANAGEMENT METHODS PROXIES

  getStageManager(): WeaveStageManager {
    return this.stageManager;
  }

  getStage(): Konva.Stage {
    return this.stageManager.getStage();
  }

  getMainLayer(): Konva.Layer | undefined {
    return this.stageManager.getMainLayer();
  }

  getUtilityLayer(): Konva.Layer | undefined {
    return this.stageManager.getUtilityLayer();
  }

  setStage(stage: Konva.Stage): void {
    this.stageManager.setStage(stage);
  }

  getStageConfiguration(): StageConfig {
    return this.stageManager.getConfiguration();
  }

  getInstanceRecursive(
    instance: Konva.Node,
    filterInstanceType: string[] = []
  ): Konva.Node {
    return this.stageManager.getInstanceRecursive(instance, filterInstanceType);
  }

  getContainerNodes(): WeaveElementInstance[] {
    return this.stageManager.getContainerNodes();
  }

  // REGISTERS MANAGEMENT METHODS PROXIES

  getRegisterManager(): WeaveRegisterManager {
    return this.registerManager;
  }

  getPlugins(): Record<string, WeavePlugin> {
    return this.registerManager.getPlugins();
  }

  getPlugin<T>(pluginName: string): T | undefined {
    return this.registerManager.getPlugin(pluginName) as T;
  }

  getNodesHandlers(): Record<string, WeaveNode> {
    return this.registerManager.getNodesHandlers();
  }

  getNodeHandler<T>(nodeType: string): T | undefined {
    return this.registerManager.getNodeHandler(nodeType);
  }

  getActionsHandlers(): Record<string, WeaveAction> {
    return this.registerManager.getActionsHandlers();
  }

  getActionHandler<T>(actionName: string): T | undefined {
    return this.registerManager.getActionHandler(actionName);
  }

  getStore<T extends WeaveStore>() {
    return this.storeManager.getStore() as T;
  }

  registerPlugin(plugin: WeavePlugin): void {
    this.registerManager.registerPlugin(plugin);
  }

  registerNodeHandler(node: WeaveNode): void {
    this.registerManager.registerNodeHandler(node);
  }

  registerActionHandler(action: WeaveAction): void {
    this.registerManager.registerActionHandler(action);
  }

  registerStore(store: WeaveStore): void {
    this.storeManager.registerStore(store);
  }

  // PLUGINS MANAGEMENT METHODS PROXIES
  public isPluginEnabled(pluginName: string): boolean {
    return this.pluginsManager.isEnabled(pluginName);
  }

  public enablePlugin(pluginName: string): void {
    this.pluginsManager.enable(pluginName);
  }

  public disablePlugin(pluginName: string): void {
    this.pluginsManager.disable(pluginName);
  }

  // ACTIONS MANAGEMENT METHODS PROXIES

  getActiveAction(): string | undefined {
    return this.actionsManager.getActiveAction();
  }

  triggerAction<T, P>(actionName: string, params?: T): P | void {
    return this.actionsManager.triggerAction<T, P>(actionName, params);
  }

  getPropsAction(actionName: string): WeaveElementAttributes {
    return this.actionsManager.getPropsAction(actionName);
  }

  updatePropsAction(actionName: string, params: WeaveElementAttributes): void {
    this.actionsManager.updatePropsAction(actionName, params);
  }

  cancelAction(actionName: string): void {
    this.actionsManager.cancelAction(actionName);
  }

  // STATE MANAGEMENT METHODS PROXIES

  update(newState: WeaveState): void {
    this.getStore().setState(newState);
    this.renderer.render(() => {
      this.emitEvent('onRender', {});
    });
  }

  render(): void {
    this.renderer.render(() => {
      this.emitEvent('onRender', {});
    });
  }

  findNodeById(
    tree: WeaveStateElement,
    key: string,
    parent: WeaveStateElement | null = null,
    index = -1
  ): WeaveNodeFound {
    return this.stateManager.findNodeById(tree, key, parent, index);
  }

  findNodesByType(
    tree: WeaveStateElement,
    nodeType: string
  ): WeaveStateElement[] {
    return this.stateManager.findNodesByType(tree, nodeType);
  }

  getNode(nodeKey: string): {
    node: WeaveStateElement | null;
    parent: WeaveStateElement | null;
    index: number;
  } {
    return this.stateManager.getNode(nodeKey);
  }

  addNode(
    node: WeaveStateElement,
    parentId = 'mainLayer',
    index: number | undefined = undefined,
    doRender = true
  ): void {
    this.stateManager.addNode(node, parentId, index, doRender);
  }

  updateNode(node: WeaveStateElement, doRender = true): void {
    this.stateManager.updateNode(node, doRender);
  }

  updateNodes(nodes: WeaveStateElement[], doRender = true): void {
    for (const node of nodes) {
      this.updateNode(node, false);
    }

    const selectionPlugin =
      this.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      selectionPlugin.setSelectedNodes([]);
    }

    if (doRender) {
      this.render();
    }
  }

  removeNode(node: WeaveStateElement, doRender = true): void {
    this.stateManager.removeNode(node, doRender);

    const selectionPlugin =
      this.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      selectionPlugin.setSelectedNodes([]);
    }
  }

  removeNodes(nodes: WeaveStateElement[], doRender = true): void {
    for (const node of nodes) {
      this.removeNode(node, false);
    }

    const selectionPlugin =
      this.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      selectionPlugin.setSelectedNodes([]);
    }

    if (doRender) {
      this.render();
    }
  }

  moveNode(
    node: WeaveStateElement,
    position: WeavePosition,
    doRender = true
  ): void {
    this.stateManager.moveNode(node, position, doRender);
  }

  getElementsTree(): WeaveStateElement[] {
    return this.stateManager.getElementsTree();
  }

  isEmpty(): boolean {
    return this.getElementsTree().length === 0;
  }

  // ZINDEX MANAGEMENT METHODS PROXIES

  moveUp(node: WeaveElementInstance): void {
    this.zIndexManager.moveUp(node);
  }

  moveDown(node: WeaveElementInstance): void {
    this.zIndexManager.moveDown(node);
  }

  sendToBack(node: WeaveElementInstance): void {
    this.zIndexManager.sendToBack(node);
  }

  bringToFront(node: WeaveElementInstance): void {
    this.zIndexManager.bringToFront(node);
  }

  // GROUP MANAGEMENT METHODS PROXIES

  group(nodes: WeaveStateElement[]): void {
    this.groupsManager.group(nodes);
  }

  unGroup(group: WeaveStateElement): void {
    this.groupsManager.unGroup(group);
  }

  // TARGETING MANAGEMENT METHODS PROXIES

  resolveNode(node: Konva.Node): WeaveElementInstance | undefined {
    const resolvedNode = this.targetingManager.resolveNode(node);
    if (resolvedNode) {
      return resolvedNode as WeaveElementInstance;
    }
    return undefined;
  }

  pointIntersectsElement(point?: Vector2d): Konva.Node | null {
    return this.targetingManager.pointIntersectsElement(point);
  }

  pointIntersectsContainerElement(
    actualLayer?: Konva.Layer | Konva.Group,
    point?: Vector2d
  ): Konva.Node | undefined {
    return this.targetingManager.pointIntersectsContainerElement(
      actualLayer,
      point
    );
  }

  getMousePointer(point?: Vector2d): WeaveMousePointInfo {
    return this.targetingManager.getMousePointer(point);
  }

  getMousePointerRelativeToContainer(
    container: Konva.Group | Konva.Layer
  ): WeaveMousePointInfoSimple {
    return this.targetingManager.getMousePointerRelativeToContainer(container);
  }

  selectNodesByKey(nodesIds: string[]): void {
    const selectionPlugin =
      this.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const stage = this.getStage();
      const instanceNodes: WeaveElementInstance[] = nodesIds.map((nodeId) => {
        let nodeInstance = stage.findOne(`#${nodeId}`) as WeaveElementInstance;

        if (nodeInstance && nodeInstance.getAttrs().nodeType === 'frame') {
          nodeInstance = stage.findOne(
            `#${nodeId}-selector-area`
          ) as WeaveElementInstance;
        }

        return nodeInstance;
      });

      selectionPlugin.setSelectedNodes(instanceNodes);
    }
  }

  // CLONING MANAGEMENT METHODS PROXIES

  nodesToGroupSerialized(instancesToClone: Konva.Node[]): WeaveSerializedGroup {
    return this.cloningManager.nodesToGroupSerialized(instancesToClone);
  }

  cloneNodes(
    instancesToClone: Konva.Node[],
    targetContainer: Konva.Layer | Konva.Group | undefined,
    onPoint: Vector2d
  ): void {
    this.cloningManager.cloneNodes(instancesToClone, targetContainer, onPoint);
  }

  // FONTS MANAGEMENT METHODS PROXIES

  getFonts(): WeaveFont[] {
    return this.fontsManager.getFonts();
  }

  // EXPORT MANAGEMENT METHODS PROXIES

  public imageToBase64(img: HTMLImageElement, mimeType: string): string {
    return this.exportManager.imageToBase64(img, mimeType);
  }

  public async exportNodes(
    nodes: WeaveElementInstance[],
    boundingNodes: (nodes: Konva.Node[]) => Konva.Node[],
    options: WeaveExportNodesOptions
  ): Promise<HTMLImageElement> {
    return await this.exportManager.exportNodes(nodes, boundingNodes, options);
  }

  // LOCK / UNLOCK METHODS

  public allNodesLocked(nodes: Konva.Node[]): boolean {
    let allNodesLocked = true;

    for (const node of nodes) {
      const nodeHandler = this.getNodeHandler<WeaveNode>(
        node.getAttrs().nodeType
      );

      if (!nodeHandler) {
        continue;
      }

      allNodesLocked = allNodesLocked && nodeHandler.isLocked(node);
    }

    return allNodesLocked;
  }

  public allNodesUnlocked(nodes: Konva.Node[]): boolean {
    let allNodesUnlocked = true;

    for (const node of nodes) {
      const nodeHandler = this.getNodeHandler<WeaveNode>(
        node.getAttrs().nodeType
      );

      if (!nodeHandler) {
        continue;
      }

      allNodesUnlocked = allNodesUnlocked && !nodeHandler.isLocked(node);
    }

    return allNodesUnlocked;
  }

  public lockNode(node: Konva.Node): void {
    const nodeHandler = this.getNodeHandler<WeaveNode>(
      node.getAttrs().nodeType
    );

    if (!nodeHandler) {
      return;
    }

    nodeHandler.lock(node);
  }

  public lockNodes(nodes: Konva.Node[]): void {
    for (const node of nodes) {
      const nodeHandler = this.getNodeHandler<WeaveNode>(
        node.getAttrs().nodeType
      );

      if (!nodeHandler) {
        continue;
      }

      nodeHandler.lock(node);
    }
  }

  public unlockNode(node: Konva.Node): void {
    const nodeHandler = this.getNodeHandler<WeaveNode>(
      node.getAttrs().nodeType
    );

    if (!nodeHandler) {
      return;
    }

    nodeHandler.unlock(node);
  }

  public unlockNodes(nodes: Konva.Node[]): void {
    for (const node of nodes) {
      const nodeHandler = this.getNodeHandler<WeaveNode>(
        node.getAttrs().nodeType
      );

      if (!nodeHandler) {
        continue;
      }

      nodeHandler.unlock(node);
    }
  }

  // SHOW / HIDE METHODS

  public allNodesVisible(nodes: Konva.Node[]): boolean {
    let allNodesVisible = true;

    for (const node of nodes) {
      const nodeHandler = this.getNodeHandler<WeaveNode>(
        node.getAttrs().nodeType
      );

      if (!nodeHandler) {
        continue;
      }

      allNodesVisible = allNodesVisible && nodeHandler.isVisible(node);
    }

    return allNodesVisible;
  }

  public allNodesHidden(nodes: Konva.Node[]): boolean {
    let allNodesHidden = true;

    for (const node of nodes) {
      const nodeHandler = this.getNodeHandler<WeaveNode>(
        node.getAttrs().nodeType
      );

      if (!nodeHandler) {
        continue;
      }

      allNodesHidden = allNodesHidden && !nodeHandler.isVisible(node);
    }

    return allNodesHidden;
  }

  public hideNode(node: Konva.Node): void {
    const nodeHandler = this.getNodeHandler<WeaveNode>(
      node.getAttrs().nodeType
    );

    if (!nodeHandler) {
      return;
    }

    nodeHandler.hide(node);
  }

  public hideNodes(nodes: Konva.Node[]): void {
    for (const node of nodes) {
      const nodeHandler = this.getNodeHandler<WeaveNode>(
        node.getAttrs().nodeType
      );

      if (!nodeHandler) {
        continue;
      }

      nodeHandler.hide(node);
    }
  }

  public showNode(node: Konva.Node): void {
    const nodeHandler = this.getNodeHandler<WeaveNode>(
      node.getAttrs().nodeType
    );

    if (!nodeHandler) {
      return;
    }

    nodeHandler.show(node);
  }

  public showNodes(nodes: Konva.Node[]): void {
    for (const node of nodes) {
      const nodeHandler = this.getNodeHandler<WeaveNode>(
        node.getAttrs().nodeType
      );

      if (!nodeHandler) {
        continue;
      }

      nodeHandler.show(node);
    }
  }
}
