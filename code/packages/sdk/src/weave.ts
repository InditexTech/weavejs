// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Emittery from 'emittery';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
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
  type WeaveUserMutexLock,
  type WeaveNodeMutexLock,
  type WeaveUser,
  type WeaveNodeChangeType,
  WEAVE_NODE_CHANGE_TYPE,
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
import { WeaveExportManager } from './managers/export/export';
import { WeavePluginsManager } from './managers/plugins';
import { WeaveMutexManager } from './managers/mutex/mutex';
import { WeaveNodesSelectionPlugin } from './plugins/nodes-selection/nodes-selection';
import type { StageConfig } from 'konva/lib/Stage';
import type { WeaveStoreOnRoomLoadedEvent } from './stores/types';
import type { DOMElement } from './types';
import { getBoundingBox, mergeExceptArrays } from './utils';
import { WeaveAsyncManager } from './managers/async/async';
import { WeaveHooksManager } from './managers/hooks';
import { WeaveUsersManager } from './managers/users/users';
import {
  DEFAULT_ADD_NODE_OPTIONS,
  DEFAULT_MOVE_NODE_OPTIONS,
  DEFAULT_REMOVE_NODE_OPTIONS,
  DEFAULT_UPDATE_NODE_OPTIONS,
} from './constants';

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
  private readonly usersManager: WeaveUsersManager;
  private readonly mutexManager: WeaveMutexManager;
  private readonly asyncManager: WeaveAsyncManager;
  private readonly hooksManager: WeaveHooksManager;

  constructor(weaveConfig: WeaveConfig, stageConfig: Konva.StageConfig) {
    globalThis._weave_isServerSide = false;
    if (typeof window === 'undefined') {
      globalThis._weave_isServerSide = true;
    }

    this.emitter = new Emittery();

    Konva.showWarnings = false;

    // Setup instance id
    this.id = uuidv4();
    this.initialized = false;

    // Save in memory the configuration provided
    this.config = mergeExceptArrays({}, weaveConfig);
    // Setup the logger
    this.logger = new WeaveLogger(
      this,
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
    this.usersManager = new WeaveUsersManager(this);
    this.mutexManager = new WeaveMutexManager(this);
    this.asyncManager = new WeaveAsyncManager(this);
    this.hooksManager = new WeaveHooksManager(this);

    // Render welcome log to console
    this.setupManager.welcomeLog();
  }

  // INSTANCE MANAGEMENT METHODS
  getRenderer(): WeaveRenderer {
    return this.renderer;
  }

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

    if (!this.isServerSide()) {
      // Setup the instance on the weave global variable
      if (!window.weave) {
        window.weave = this;
      }

      // Initialize global window variables
      window.weaveTextEditing = {};
      window.weaveDragImageURL = undefined;
    }

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

    // Start loading the fonts, this operation can be asynchronous
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

    const nodeHandlers = this.registerManager.getNodesHandlers();
    for (const nodeHandlerKey of Object.keys(nodeHandlers)) {
      const nodeHandler = nodeHandlers[nodeHandlerKey];
      nodeHandler?.onDestroyInstance();
    }

    // destroy the stage from memory
    const stage = this.getStage();
    if (stage) {
      stage.destroy();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Konva = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any)['__ $YJS$ __'] = undefined;

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

  addOnceEventListener<T>(event: string, callback: (payload: T) => void): void {
    this.moduleLogger.debug(`Listening once event [${event}]`);
    this.emitter.once(event).then(callback);
  }

  removeEventListener<T>(event: string, callback: (payload: T) => void): void {
    this.moduleLogger.debug(`Removing listening to event [${event}]`);
    this.emitter.off(event, callback);
  }

  emitUserChangeEvent(
    data: {
      node: WeaveStateElement;
      parentId?: string;
    },
    changeType: WeaveNodeChangeType
  ): void {
    const stage = this.getStage();
    const user = this.getStore().getUser();

    const node = data.node;

    let parent: WeaveStateElement | undefined = undefined;
    let nodeParent: Konva.Node | null | undefined = undefined;
    if (nodeParent === undefined && data?.parentId !== undefined && stage) {
      nodeParent = stage.findOne(`#${data.parentId}`);
    }
    if (nodeParent === undefined && data?.parentId === undefined && stage) {
      const parentNode = stage.findOne(`#${node.key}`);
      if (parentNode) {
        nodeParent = this.getNodeContainer(parentNode);
      }
    }

    if (nodeParent !== undefined) {
      const handler = this.getNodeHandler<WeaveNode>(
        nodeParent?.getAttrs().nodeType
      );
      if (handler) {
        parent = handler.serialize(nodeParent as WeaveElementInstance);
      }
    }

    if (!parent) {
      return;
    }

    this.emitEvent<{
      user: WeaveUser;
      changeType: WeaveNodeChangeType;
      node: WeaveStateElement;
      parent: WeaveStateElement;
    }>('onUserChange', { user, changeType, parent, node });
    this.cleanupTransactionIdToInstance(node);
  }

  getNodeActualProps(node: WeaveStateElement): WeaveElementAttributes {
    const realNode = this.getStage().findOne(`#${node.key}`);
    if (realNode) {
      return realNode.getAttrs();
    }

    return {};
  }

  setTransactionIdToInstance(node: WeaveStateElement): void {
    const realNode = this.getStage().findOne(`#${node.key}`);
    if (realNode) {
      node.props.transactionId = uuidv4();
      realNode.setAttr('transactionId', node.props.transactionId);
    }
  }

  cleanupTransactionIdToInstance(node: WeaveStateElement): void {
    const realNode = this.getStage().findOne(`#${node.key}`);
    if (realNode) {
      realNode.setAttr('transactionId', undefined);
    }
  }

  decorateWithZIndex(node: WeaveStateElement): WeaveStateElement {
    const realNode = this.getStage().findOne(`#${node.key}`);
    if (realNode) {
      const zIndex = realNode.zIndex();
      node.props = { ...node.props, zIndex };
    }
    return node;
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

  getSelectionLayer(): Konva.Layer | undefined {
    return this.stageManager.getSelectionLayer();
  }

  getCommentsLayer(): Konva.Layer | undefined {
    return this.stageManager.getCommentsLayer();
  }

  getGridLayer(): Konva.Layer | undefined {
    return this.stageManager.getGridLayer();
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

  getClosestParentWithWeaveId(el: DOMElement): DOMElement {
    const weaveContainer = this.getStageConfiguration().container;
    let weaveId: string | undefined = undefined;
    if (weaveContainer instanceof HTMLElement) {
      weaveId = weaveContainer.id;
    }
    if (typeof weaveContainer === 'string') {
      weaveId = weaveContainer;
    }
    while (el) {
      if (el.id && el.id === weaveId) return el;
      el = el.parentElement;
    }
    return null;
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

  triggerAction<T, P>(actionName: string, params?: T): P {
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
    options: {
      index?: number;
      emitUserChangeEvent?: boolean;
      overrideUserChangeType?: WeaveNodeChangeType;
    } = DEFAULT_ADD_NODE_OPTIONS
  ): void {
    const { index, emitUserChangeEvent, overrideUserChangeType } =
      mergeExceptArrays(DEFAULT_ADD_NODE_OPTIONS, options);

    this.stateTransactional(() => {
      if (emitUserChangeEvent) {
        this.setTransactionIdToInstance(node);
      }

      this.stateManager.addNode(node, parentId, index);

      if (emitUserChangeEvent) {
        const handleSendEvent = (addedNode: WeaveElementInstance) => {
          if (node.props.transactionId === addedNode.getAttrs().transactionId) {
            const decoratedNode = this.decorateWithZIndex(node);
            this.emitUserChangeEvent(
              { node: decoratedNode, parentId },
              overrideUserChangeType !== undefined
                ? overrideUserChangeType
                : WEAVE_NODE_CHANGE_TYPE.CREATE
            );
            this.removeEventListener('onNodeRenderedAdded', handleSendEvent);
          }
        };

        this.addEventListener('onNodeRenderedAdded', handleSendEvent);
      }
    });
  }

  addNodeNT(
    node: WeaveStateElement,
    parentId = 'mainLayer',
    options: {
      index?: number;
      emitUserChangeEvent?: boolean;
      overrideUserChangeType?: WeaveNodeChangeType;
    } = DEFAULT_ADD_NODE_OPTIONS
  ): void {
    const { index, emitUserChangeEvent, overrideUserChangeType } =
      mergeExceptArrays(DEFAULT_ADD_NODE_OPTIONS, options);

    if (emitUserChangeEvent) {
      this.setTransactionIdToInstance(node);
    }

    this.stateManager.addNode(node, parentId, index);

    if (emitUserChangeEvent) {
      const handleSendEvent = (addedNode: WeaveElementInstance) => {
        if (node.props.transactionId === addedNode.getAttrs().transactionId) {
          const decoratedNode = this.decorateWithZIndex(node);
          this.emitUserChangeEvent(
            { node: decoratedNode, parentId },
            overrideUserChangeType !== undefined
              ? overrideUserChangeType
              : WEAVE_NODE_CHANGE_TYPE.CREATE
          );
          this.removeEventListener('onNodeRenderedAdded', handleSendEvent);
        }
      };

      this.addEventListener('onNodeRenderedAdded', handleSendEvent);
    }
  }

  updateNode(
    node: WeaveStateElement,
    options: { emitUserChangeEvent?: boolean } = DEFAULT_UPDATE_NODE_OPTIONS
  ): void {
    const { emitUserChangeEvent } = mergeExceptArrays(
      DEFAULT_UPDATE_NODE_OPTIONS,
      options
    );

    this.stateTransactional(() => {
      if (emitUserChangeEvent) {
        this.setTransactionIdToInstance(node);
      }

      this.stateManager.updateNode(node);

      if (emitUserChangeEvent) {
        const handleSendEvent = (updatedNode: WeaveElementInstance) => {
          if (
            node.props.transactionId === updatedNode.getAttrs().transactionId
          ) {
            const decoratedNode = this.decorateWithZIndex(node);
            this.emitUserChangeEvent(
              { node: decoratedNode },
              WEAVE_NODE_CHANGE_TYPE.UPDATE
            );
            this.removeEventListener('onNodeRenderedUpdated', handleSendEvent);
          }
        };

        this.addEventListener('onNodeRenderedUpdated', handleSendEvent);
      }
    });
  }

  updateNodeNT(
    node: WeaveStateElement,
    options: { emitUserChangeEvent?: boolean } = DEFAULT_UPDATE_NODE_OPTIONS
  ): void {
    const { emitUserChangeEvent } = mergeExceptArrays(
      DEFAULT_UPDATE_NODE_OPTIONS,
      options
    );

    if (emitUserChangeEvent) {
      this.setTransactionIdToInstance(node);
    }

    this.stateManager.updateNode(node);

    if (emitUserChangeEvent) {
      const handleSendEvent = (updatedNode: WeaveElementInstance) => {
        if (node.props.transactionId === updatedNode.getAttrs().transactionId) {
          const decoratedNode = this.decorateWithZIndex(node);
          this.emitUserChangeEvent(
            { node: decoratedNode },
            WEAVE_NODE_CHANGE_TYPE.UPDATE
          );
          this.removeEventListener('onNodeRenderedUpdated', handleSendEvent);
        }
      };

      this.addEventListener('onNodeRenderedUpdated', handleSendEvent);
    }
  }

  updateNodes(
    nodes: WeaveStateElement[],
    options: { emitUserChangeEvent?: boolean } = DEFAULT_UPDATE_NODE_OPTIONS
  ): void {
    const { emitUserChangeEvent } = mergeExceptArrays(
      DEFAULT_UPDATE_NODE_OPTIONS,
      options
    );
    this.stateTransactional(() => {
      const transactionsIds: Record<string, string> = {};
      if (emitUserChangeEvent) {
        for (const node of nodes) {
          this.setTransactionIdToInstance(node);
          transactionsIds[node.key] = node.props.transactionId;
        }
      }

      this.stateManager.updateNodes(nodes);

      if (emitUserChangeEvent) {
        const handleSendEvent = (updatedNode: WeaveElementInstance) => {
          for (const node of nodes) {
            if (
              transactionsIds[node.key] === updatedNode.getAttrs().transactionId
            ) {
              const decoratedNode = this.decorateWithZIndex(node);
              this.emitUserChangeEvent(
                {
                  node: decoratedNode,
                },
                WEAVE_NODE_CHANGE_TYPE.UPDATE
              );
              delete transactionsIds[node.key];
              if (Object.keys(transactionsIds).length === 0) {
                this.removeEventListener(
                  'onNodeRenderedUpdated',
                  handleSendEvent
                );
              }
              break;
            }
          }
        };

        this.addEventListener('onNodeRenderedUpdated', handleSendEvent);
      }
    });
  }

  updateNodesNT(
    nodes: WeaveStateElement[],
    options: { emitUserChangeEvent?: boolean } = DEFAULT_UPDATE_NODE_OPTIONS
  ): void {
    const { emitUserChangeEvent } = mergeExceptArrays(
      DEFAULT_UPDATE_NODE_OPTIONS,
      options
    );

    const transactionsIds: Record<string, string> = {};
    if (emitUserChangeEvent) {
      for (const node of nodes) {
        this.setTransactionIdToInstance(node);
        transactionsIds[node.key] = node.props.transactionId;
      }
    }

    this.stateManager.updateNodes(nodes);

    if (emitUserChangeEvent) {
      const handleSendEvent = (updatedNode: WeaveElementInstance) => {
        for (const node of nodes) {
          if (
            transactionsIds[node.key] === updatedNode.getAttrs().transactionId
          ) {
            const decoratedNode = this.decorateWithZIndex(node);
            this.emitUserChangeEvent(
              {
                node: decoratedNode,
              },
              WEAVE_NODE_CHANGE_TYPE.UPDATE
            );
            delete transactionsIds[node.key];
            if (Object.keys(transactionsIds).length === 0) {
              this.removeEventListener(
                'onNodeRenderedUpdated',
                handleSendEvent
              );
            }
            break;
          }
        }
      };

      this.addEventListener('onNodeRenderedUpdated', handleSendEvent);
    }
  }

  removeNode(
    node: WeaveStateElement,
    options: { emitUserChangeEvent?: boolean } = DEFAULT_REMOVE_NODE_OPTIONS
  ): void {
    const { emitUserChangeEvent } = mergeExceptArrays(
      DEFAULT_REMOVE_NODE_OPTIONS,
      options
    );

    this.stateTransactional(() => {
      let parentId: string | undefined = undefined;
      let decoratedNode: WeaveStateElement | undefined = undefined;

      if (emitUserChangeEvent) {
        this.setTransactionIdToInstance(node);
        decoratedNode = this.decorateWithZIndex(node);
        parentId = this.getContainerByNodeId(node.key);
      }

      this.stateManager.removeNode(node);

      if (decoratedNode && emitUserChangeEvent) {
        const handleSendEvent = (removedNode: WeaveElementInstance) => {
          if (
            node.props.transactionId === removedNode.getAttrs().transactionId
          ) {
            this.emitUserChangeEvent(
              { node: decoratedNode, parentId },
              WEAVE_NODE_CHANGE_TYPE.DELETE
            );
            this.removeEventListener('onNodeRenderedRemoved', handleSendEvent);
          }
        };

        this.addEventListener('onNodeRenderedRemoved', handleSendEvent);
      }

      this.runPhaseHooks<{
        node: Konva.Node;
      }>('onRemoveNode', (hook) => {
        const nodeInstance = this.getStage().findOne(`#${node.key}`);
        if (nodeInstance) {
          hook({
            node: nodeInstance,
          });
        }
      });

      const selectionPlugin =
        this.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
      if (selectionPlugin) {
        selectionPlugin.setSelectedNodes([]);
      }
    });
  }

  removeNodeNT(
    node: WeaveStateElement,
    options: { emitUserChangeEvent?: boolean } = DEFAULT_REMOVE_NODE_OPTIONS
  ): void {
    const { emitUserChangeEvent } = mergeExceptArrays(
      DEFAULT_REMOVE_NODE_OPTIONS,
      options
    );

    let parentId: string | undefined = undefined;
    let decoratedNode: WeaveStateElement | undefined = undefined;

    if (emitUserChangeEvent) {
      this.setTransactionIdToInstance(node);
      decoratedNode = this.decorateWithZIndex(node);
      parentId = this.getContainerByNodeId(node.key);
    }

    this.stateManager.removeNode(node);

    if (decoratedNode && emitUserChangeEvent) {
      const handleSendEvent = (removedNode: WeaveElementInstance) => {
        if (node.props.transactionId === removedNode.getAttrs().transactionId) {
          this.emitUserChangeEvent(
            { node: decoratedNode, parentId },
            WEAVE_NODE_CHANGE_TYPE.DELETE
          );
          this.removeEventListener('onNodeRenderedRemoved', handleSendEvent);
        }
      };

      this.addEventListener('onNodeRenderedRemoved', handleSendEvent);
    }

    this.runPhaseHooks<{
      node: Konva.Node;
    }>('onRemoveNode', (hook) => {
      const nodeInstance = this.getStage().findOne(`#${node.key}`);
      if (nodeInstance) {
        hook({
          node: nodeInstance,
        });
      }
    });

    const selectionPlugin =
      this.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      selectionPlugin.setSelectedNodes([]);
    }
  }

  removeNodes(
    nodes: WeaveStateElement[],
    options: { emitUserChangeEvent?: boolean } = DEFAULT_REMOVE_NODE_OPTIONS
  ): void {
    this.stateTransactional(() => {
      for (const node of nodes) {
        this.removeNodeNT(node, options);
      }

      const selectionPlugin =
        this.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
      if (selectionPlugin) {
        selectionPlugin.setSelectedNodes([]);
      }
    });
  }

  removeNodesNT(
    nodes: WeaveStateElement[],
    options: { emitUserChangeEvent?: boolean } = DEFAULT_REMOVE_NODE_OPTIONS
  ): void {
    for (const node of nodes) {
      this.removeNodeNT(node, options);
    }

    const selectionPlugin =
      this.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      selectionPlugin.setSelectedNodes([]);
    }
  }

  zMoveNode(
    node: WeaveStateElement,
    position: WeavePosition,
    options: { emitUserChangeEvent?: boolean } = DEFAULT_MOVE_NODE_OPTIONS
  ): void {
    const { emitUserChangeEvent } = mergeExceptArrays(
      DEFAULT_MOVE_NODE_OPTIONS,
      options
    );

    this.stateTransactional(() => {
      if (emitUserChangeEvent) {
        this.setTransactionIdToInstance(node);
      }

      this.updateNodeNT(node, { emitUserChangeEvent: false });
      this.stateManager.zMoveNode(node, position);

      if (emitUserChangeEvent) {
        const handleSendEvent = (movedNode: WeaveElementInstance) => {
          if (node.props.transactionId === movedNode.getAttrs().transactionId) {
            const decoratedNode = this.decorateWithZIndex(node);
            this.emitUserChangeEvent(
              { node: decoratedNode },
              WEAVE_NODE_CHANGE_TYPE.UPDATE
            );
            this.removeEventListener('onNodeRenderedUpdated', handleSendEvent);
          }
        };

        this.addEventListener('onNodeRenderedUpdated', handleSendEvent);
      }
    });
  }

  zMoveNodeNT(
    node: WeaveStateElement,
    position: WeavePosition,
    options: { emitUserChangeEvent?: boolean } = DEFAULT_MOVE_NODE_OPTIONS
  ): void {
    const { emitUserChangeEvent } = mergeExceptArrays(
      DEFAULT_MOVE_NODE_OPTIONS,
      options
    );

    if (emitUserChangeEvent) {
      this.setTransactionIdToInstance(node);
    }

    this.updateNodeNT(node, { emitUserChangeEvent: false });
    this.stateManager.zMoveNode(node, position);

    if (emitUserChangeEvent) {
      const handleSendEvent = (movedNode: WeaveElementInstance) => {
        if (node.props.transactionId === movedNode.getAttrs().transactionId) {
          const decoratedNode = this.decorateWithZIndex(node);
          this.emitUserChangeEvent(
            { node: decoratedNode },
            WEAVE_NODE_CHANGE_TYPE.UPDATE
          );
          this.removeEventListener('onNodeRenderedUpdated', handleSendEvent);
        }
      };

      this.addEventListener('onNodeRenderedUpdated', handleSendEvent);
    }
  }

  getElementsTree(): WeaveStateElement[] {
    return this.stateManager.getElementsTree();
  }

  isEmpty(): boolean {
    return this.getElementsTree().length === 0;
  }

  getContainerByNodeId(nodeId: string): string | undefined {
    let parentId: string | undefined = undefined;
    const nodeParent = this.getStage().findOne(`#${nodeId}`);
    if (nodeParent) {
      const parent = this.getNodeContainer(nodeParent);
      if (parent) {
        parentId = parent.getAttrs().id;
      }
    }

    return parentId;
  }

  getNodeContainerId(node: WeaveElementInstance | Konva.Node): string {
    const stage = this.getStage();
    let nodeContainer = node.getParent()?.getAttrs().id ?? '';

    if (typeof node?.getParent()?.getAttrs().nodeId !== 'undefined') {
      const realContainer = stage.findOne(
        `#${node.getParent()?.getAttrs().nodeId}`
      );
      if (realContainer) {
        nodeContainer = realContainer.getAttrs().id ?? '';
      }
    }

    return nodeContainer;
  }

  getNodeContainer(node: WeaveElementInstance | Konva.Node): Konva.Node | null {
    const stage = this.getStage();
    let nodeContainer: Konva.Node | null = node?.getParent();

    if (typeof node?.getParent()?.getAttrs().nodeId !== 'undefined') {
      const realContainer = stage.findOne(
        `#${node.getParent()?.getAttrs().nodeId}`
      );
      if (realContainer) {
        nodeContainer = realContainer;
      }
    }

    return nodeContainer;
  }

  getBoundingBox(
    nodes: Konva.Node[],
    config?:
      | {
          skipTransform?: boolean;
          skipShadow?: boolean;
          skipStroke?: boolean;
          relativeTo?: Konva.Container;
        }
      | undefined
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    return getBoundingBox(nodes, config);
  }

  stateTransactional(callback: () => void): void {
    this.stateManager.stateTransactional(callback);
  }

  // ZINDEX MANAGEMENT METHODS PROXIES

  moveUp(node: WeaveElementInstance): void {
    this.zIndexManager.moveUp(node);
  }

  moveDown(node: WeaveElementInstance): void {
    this.zIndexManager.moveDown(node);
  }

  sendToBack(nodes: WeaveElementInstance | WeaveElementInstance[]): void {
    this.zIndexManager.sendToBack(nodes);
  }

  bringToFront(nodes: WeaveElementInstance | WeaveElementInstance[]): void {
    this.zIndexManager.bringToFront(nodes);
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

  pointIntersectsElement(point?: Konva.Vector2d): Konva.Node | null {
    return this.targetingManager.pointIntersectsElement(point);
  }

  nodeIntersectsContainerElement(
    node: Konva.Node | Konva.Transformer,
    actualLayer?: Konva.Layer | Konva.Group
  ): Konva.Node | undefined {
    return this.targetingManager.nodeIntersectsContainerElement(
      node,
      actualLayer
    );
  }

  getMousePointer(point?: Konva.Vector2d): WeaveMousePointInfo {
    return this.targetingManager.getMousePointer(point);
  }

  getMousePointerRelativeToContainer(
    container: Konva.Node | Konva.Layer
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

  getCloningManager(): WeaveCloningManager {
    return this.cloningManager;
  }

  nodesToGroupSerialized(instancesToClone: Konva.Node[]): WeaveSerializedGroup {
    return this.cloningManager.nodesToGroupSerialized(instancesToClone);
  }

  // cloneNodes(
  //   instancesToClone: Konva.Node[],
  //   targetContainer: Konva.Layer | Konva.Group | undefined,
  //   onPoint: Konva.Vector2d
  // ): void {
  //   this.cloningManager.cloneNodes(instancesToClone, targetContainer, onPoint);
  // }

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
    return await this.exportManager.exportNodesAsImage(
      nodes,
      boundingNodes,
      options
    );
  }

  public async exportNodesServerSide(
    nodes: string[],
    boundingNodes: (nodes: Konva.Node[]) => Konva.Node[],
    options: WeaveExportNodesOptions
  ): Promise<{
    composites: { input: Buffer; left: number; top: number }[];
    width: number;
    height: number;
  }> {
    return await this.exportManager.exportNodesServerSide(
      nodes,
      boundingNodes,
      options
    );
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

  // ASYNC ELEMENTS METHODS

  public asyncElementsLoaded(): boolean {
    return this.asyncManager.asyncElementsLoaded();
  }

  public loadAsyncElement(nodeId: string, type: string): void {
    this.asyncManager.loadAsyncElement(nodeId, type);
  }

  public resolveAsyncElement(nodeId: string, type: string): void {
    this.asyncManager.resolveAsyncElement(nodeId, type);
  }

  public isServerSide(): boolean {
    return globalThis._weave_isServerSide === true;
  }

  // HOOKS MANAGEMENT METHODS

  registerHook<T>(hookName: string, hook: (params: T) => void): void {
    this.hooksManager.registerHook<T>(hookName, hook);
  }

  runPhaseHooks<T>(
    phaseName: string,
    execution: (hook: (params: T) => void) => void
  ): void {
    this.hooksManager.runPhaseHooks<T>(phaseName, execution);
  }

  getHook<T>(hookName: string): T | undefined {
    return this.hooksManager.getHook<T>(hookName);
  }

  unregisterHook(hookName: string): void {
    this.hooksManager.unregisterHook(hookName);
  }

  // MUTEX MANAGEMENT METHODS

  async acquireMutexLock(
    { nodeIds, operation }: { nodeIds: string[]; operation: string },
    action: () => void | Promise<void>
  ): Promise<void> {
    return await this.mutexManager.acquireMutexLock(
      { nodeIds, operation },
      action
    );
  }

  setMutexLock<T>({
    nodeIds,
    operation,
    metadata,
  }: {
    nodeIds: string[];
    operation: string;
    metadata?: T;
  }): boolean {
    return this.mutexManager.setMutexLock<T>({
      nodeIds,
      operation,
      metadata,
    });
  }

  releaseMutexLock(): void {
    this.mutexManager.releaseMutexLock();
  }

  getLockDetails<T>(lockId: string): WeaveUserMutexLock<T> | undefined {
    return this.mutexManager.getUserMutexLock<T>(lockId);
  }

  getNodeMutexLock<T>(nodeId: string): WeaveNodeMutexLock<T> | undefined {
    return this.mutexManager.getNodeMutexLock<T>(nodeId);
  }

  // USERS MANAGEMENT METHODS
  getUsers(): WeaveUser[] {
    return this.usersManager.getUsers();
  }
}
