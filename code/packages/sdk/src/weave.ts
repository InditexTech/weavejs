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
  type WeaveExportNodeOptions,
  type WeaveStatus,
  type WeaveElementAttributes,
  WEAVE_INSTANCE_STATUS,
  type WeaveMousePointInfo,
  type WeaveMousePointInfoSimple,
  type WeaveSerializedGroup,
  type WeaveFont,
  type WeaveNodeFound,
} from '@inditextech/weave-types';
import { WeaveStore } from './stores/store';
import { WeaveNode } from './nodes/node';
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

export class Weave extends Emittery {
  private id: string;
  private config: WeaveConfig;
  private logger: WeaveLogger;
  private moduleLogger: Logger;
  private reconciler: WeaveReconciler;
  private stateSerializer: WeaveStateSerializer;
  private renderer: WeaveRenderer;

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
    super();

    Konva.showWarnings = false;

    // Setup instance id
    this.id = uuidv4();

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

    // Render welcome log to console
    this.setupManager.welcomeLog();
  }

  // INSTANCE MANAGEMENT METHODS
  setupRenderer(): void {
    // Initialize the renderer
    this.renderer.init();

    // Perform the first render of the instance
    this.renderer.render(() => {
      // Setup the plugins and actions that needed the first render to work
      this.setupManager.setupPlugins();
      this.setupManager.setupActions();

      this.moduleLogger.info('Instance started');

      this.status = WEAVE_INSTANCE_STATUS.RUNNING;
      this.getConfiguration().callbacks?.onInstanceStatus?.(this.status);
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

  async start(): Promise<void> {
    this.moduleLogger.info('Start instance');

    this.status = WEAVE_INSTANCE_STATUS.STARTING;
    this.getConfiguration().callbacks?.onInstanceStatus?.(this.status);
    this.emitEvent('onInstanceStatus', this.status);

    // Register all the nodes, plugins and actions that come from the configuration
    this.registerManager.registerNodesHandlers();
    this.registerManager.registerPlugins();
    this.registerManager.registerActionsHandlers();

    // Register the store
    this.storeManager.registerStore(this.config.store as WeaveStore);

    this.status = WEAVE_INSTANCE_STATUS.LOADING_FONTS;
    this.getConfiguration().callbacks?.onInstanceStatus?.(this.status);
    this.emitEvent('onInstanceStatus', this.status);

    // Start loading the fonts, this operation is asynchronous
    await this.fontsManager.loadFonts();
    this.setupManager.setupLog();

    // Setup stage
    this.stageManager.initStage();

    // Setup and connect to the store
    const store = this.storeManager.getStore();
    store.setup();
    store.connect();
  }

  // destroy() {
  //   this.moduleLogger.info(`Destroying the instance`);

  //   // clear listeners
  //   this.clearListeners();

  //   this.status = WEAVE_INSTANCE_STATUS.IDLE;
  //   this.getConfiguration().callbacks?.onInstanceStatus?.(this.status);
  //   this.emitEvent('onInstanceStatus', this.status);

  //   // disconnect from the store
  //   const store = this.storeManager.getStore();
  //   store.disconnect();

  //   // destroy the stage from memory
  //   const stage = this.getStage();
  //   if (stage) {
  //     stage.destroy();
  //   }

  //   this.moduleLogger.info(`Instance destroyed`);
  // }

  getId(): string {
    return this.id;
  }

  // CONFIGURATION

  getConfiguration(): WeaveConfig {
    return this.config;
  }

  // EVENTS METHODS

  emitEvent<T>(event: string, payload: T): void {
    this.moduleLogger.debug({ payload }, `Emitted event [${event}]`);
    this.emit(event, payload);
  }

  addEventListener<T>(event: string, callback: (payload: T) => void): void {
    this.moduleLogger.debug(`Listening event [${event}]`);
    this.on(event, callback);
  }

  removeEventListener<T>(event: string, callback: (payload: T) => void): void {
    this.moduleLogger.debug(`Removing listening to event [${event}]`);
    this.off(event, callback);
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

  getPlugin<T>(pluginName: string) {
    return this.registerManager.getPlugin(pluginName) as T;
  }

  getNodesHandlers(): Record<string, WeaveNode> {
    return this.registerManager.getNodesHandlers();
  }

  getNodeHandler<T>(nodeType: string) {
    return this.registerManager.getNodeHandler(nodeType) as T;
  }

  getActionsHandlers(): Record<string, WeaveAction> {
    return this.registerManager.getActionsHandlers();
  }

  getActionHandler<T>(actionName: string) {
    return this.registerManager.getActionHandler(actionName) as T;
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

  triggerAction<T>(actionName: string, params?: T): unknown {
    return this.actionsManager.triggerAction<T>(actionName, params);
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
      this.config.callbacks?.onRender?.();
      this.emitEvent('onRender', {});
    });
  }

  render(): void {
    this.renderer.render(() => {
      this.config.callbacks?.onRender?.();
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

  pointIntersectsContainerElement(point?: Vector2d): Konva.Node | undefined {
    return this.targetingManager.pointIntersectsContainerElement(point);
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
        const nodeInstance = stage.findOne(
          `#${nodeId}`
        ) as WeaveElementInstance;
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

  public async exportStage(
    options: WeaveExportNodeOptions
  ): Promise<HTMLImageElement> {
    return await this.exportManager.exportStage(options);
  }

  public async exportNode(
    node: WeaveElementInstance,
    options: WeaveExportNodeOptions
  ): Promise<HTMLImageElement> {
    return await this.exportManager.exportNode(node, options);
  }
}
