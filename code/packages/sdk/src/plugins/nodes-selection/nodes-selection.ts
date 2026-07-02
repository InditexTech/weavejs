// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveSelection,
  type NodeSerializable,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import Konva from 'konva';
import { WeavePlugin } from '@/plugins/plugin';
import {
  WEAVE_NODES_SELECTION_DEFAULT_CONFIG,
  WEAVE_NODES_SELECTION_KEY,
  WEAVE_NODES_SELECTION_LAYER_ID,
} from './constants';
import {
  type WeaveNodesSelectionConfig,
  type WeaveNodesSelectionPluginOnNodesChangeEvent,
  type WeaveNodesSelectionPluginOnGroupContextChangeEvent,
  type WeaveNodesSelectionPluginParams,
} from './types';
import { type WeaveNode } from '@/nodes/node';
import type { WeaveCopyPasteNodesPlugin } from '../copy-paste-nodes/copy-paste-nodes';
import { mergeExceptArrays, intersectArrays } from '@/utils/utils';
import { WEAVE_USERS_SELECTION_KEY } from '../users-selection/constants';
import type { WeaveUsersSelectionPlugin } from '../users-selection/users-selection';
import throttle from 'lodash/throttle';
import type { Stage } from 'konva/lib/Stage';
import { WEAVE_STAGE_DEFAULT_MODE } from '@/nodes/stage/constants';
import type { TransformerConfig } from 'konva/lib/shapes/Transformer';
import { SELECTION_TOOL_ACTION_NAME } from '@/actions/selection-tool/constants';
import { DEFAULT_THROTTLE_MS } from '@/constants';

import { GestureDetector } from './gesture-detector';
import { EdgePanning } from './edge-panning';
import { AreaSelector } from './area-selection';
import { TransformerController } from './transformer-controller';
import type { TransformerCallbacks } from './transformer-controller';
import {
  getContextMenuPlugin,
  getStageGridPlugin,
  getStagePanningPlugin,
  getNodesSelectionFeedbackPlugin,
  getUsersPresencePlugin,
} from './plugin-accessors';
import type { SelectionContext } from './selection-context';
import {
  registerKeyboardHandlers,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handleArmedDrag,
} from './events';

export class WeaveNodesSelectionPlugin
  extends WeavePlugin
  implements SelectionContext
{
  readonly gesture = new GestureDetector();
  private edgePanning!: EdgePanning;
  private areaSelector!: AreaSelector;
  private transformerCtrl!: TransformerController;

  private config!: WeaveNodesSelectionConfig;
  private active!: boolean;
  private _defaultEnabledAnchors!: string[];
  private selecting!: boolean;
  private initialized!: boolean;
  private _isSpaceKeyPressed!: boolean;
  private pointers!: Record<number, PointerEvent>;
  private _handledClickOrTap: boolean = false;
  private dragSelectedNodes: Konva.Node[] = [];
  private _activeGroupContext: string | null = null;
  private _armedDragNode: Konva.Node | null = null;
  private _armedDragPointerId: number | null = null;

  onRender = undefined;

  constructor(params?: WeaveNodesSelectionPluginParams) {
    super();

    this.config = mergeExceptArrays(
      WEAVE_NODES_SELECTION_DEFAULT_CONFIG,
      params?.config ?? {}
    );

    this.initialize();
  }

  initialize(): void {
    this._defaultEnabledAnchors = this.config.selection?.enabledAnchors ?? [
      'top-left',
      'top-center',
      'top-right',
      'middle-right',
      'middle-left',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ];
    this.gesture.reset();
    this._isSpaceKeyPressed = false;
    this.active = false;
    this.selecting = false;
    this.initialized = false;
    this.enabled = false;
    this.pointers = {};
    this.dragSelectedNodes = [];
    this._handledClickOrTap = false;
    this._activeGroupContext = null;
    this._armedDragNode = null;
    this._armedDragPointerId = null;
  }


  getName(): string {
    return WEAVE_NODES_SELECTION_KEY;
  }

  getLayerName(): string {
    return WEAVE_NODES_SELECTION_LAYER_ID;
  }

  getConfiguration(): WeaveNodesSelectionConfig {
    return this.config;
  }

  // ── SelectionContext accessors ──────────────────────────────────────────────

  getWeaveInstance() {
    return this.instance;
  }

  getGesture(): GestureDetector {
    return this.gesture;
  }

  getAreaSelector(): AreaSelector {
    return this.areaSelector;
  }

  getEdgePanning(): EdgePanning {
    return this.edgePanning;
  }

  getTransformerController(): TransformerController {
    return this.transformerCtrl;
  }

  getDefaultEnabledAnchors(): string[] {
    return this._defaultEnabledAnchors;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isActive(): boolean {
    return this.active;
  }

  getSpaceKeyPressedState(): boolean {
    return this._isSpaceKeyPressed;
  }

  setSpaceKeyPressed(val: boolean): void {
    this._isSpaceKeyPressed = val;
  }

  getPointerCount(): number {
    return Object.keys(this.pointers).length;
  }

  registerPointer(id: number, evt: PointerEvent): void {
    this.pointers[id] = evt;
  }

  unregisterPointer(id: number): void {
    delete this.pointers[id];
  }

  wasClickOrTapHandled(): boolean {
    return this._handledClickOrTap;
  }

  setClickOrTapHandled(val: boolean): void {
    this._handledClickOrTap = val;
  }

  setAreaSelecting(val: boolean): void {
    this.selecting = val;
  }

  // ── Single-gesture drag arming ──────────────────────────────────────────────

  armDrag(node: Konva.Node, pointerId: number): void {
    this._armedDragNode = node;
    this._armedDragPointerId = pointerId;
  }

  getArmedDragNode(): Konva.Node | null {
    return this._armedDragNode;
  }

  getArmedDragPointerId(): number | null {
    return this._armedDragPointerId;
  }

  clearArmedDrag(): void {
    this._armedDragNode = null;
    this._armedDragPointerId = null;
  }

  // ────────────────────────────────────────────────────────────────────────────

  initLayer(): void {
    const stage = this.instance.getStage();
    const layer = new Konva.Layer({ id: this.getLayerName() });
    stage.add(layer);
  }

  isPasting(): boolean {
    const copyPastePlugin =
      this.instance.getPlugin<WeaveCopyPasteNodesPlugin>('copyPasteNodes');
    if (!copyPastePlugin) return false;
    return copyPastePlugin.isPasting();
  }

  isAreaSelecting(): boolean {
    return this.selecting;
  }

  isSelecting(): boolean {
    return this.instance.getActiveAction() === SELECTION_TOOL_ACTION_NAME;
  }

  isNodeSelected(ele: Konva.Node): boolean {
    return (
      this.getSelectedNodes().length === 1 &&
      this.getSelectedNodes()[0].getAttrs().id === ele.getAttrs().id
    );
  }

  onInit(): void {
    const stage = this.instance.getStage();
    const selectionLayer = this.getLayer()!;

    stage.container().tabIndex = 1;
    stage.container().focus();

    // AreaSelector — manages the visual selection rectangle
    this.areaSelector = new AreaSelector();
    this.areaSelector.init(
      selectionLayer,
      this.config.selectionArea,
      stage.scaleX()
    );

    // EdgePanning — handles auto-scroll when pointer reaches canvas edge during selection
    this.edgePanning = new EdgePanning(this.config.panningWhenSelection, {
      getStage: () => this.instance.getStage() as unknown as Stage,
      isSelecting: () => this.isAreaSelecting(),
      onTick: (dx, dy) => {
        if (this.areaSelector.selectionStart) {
          this.areaSelector.selectionStart.x += dx;
          this.areaSelector.selectionStart.y += dy;
        }
        this.getStageGridPlugin()?.onRender();
        this.areaSelector.update(
          this.instance.getStage() as unknown as Stage,
          () => this.selectNone()
        );
      },
    });

    // TransformerController — creates transformers and registers all transformer events
    const callbacks: TransformerCallbacks = {
      isSelecting: () => this.isSelecting(),
      setSelectedNodes: (nodes) => this.setSelectedNodes(nodes),
      triggerSelectedNodesEvent: () => this.triggerSelectedNodesEvent(),
      saveDragSelectedNodes: () => this.saveDragSelectedNodes(),
      setNodesOpacityOnDrag: () => this.setNodesOpacityOnDrag(),
      disablePlugin: () => this.disable(),
      enablePlugin: () => this.enable(),
      getContextMenuPlugin: () => this.getContextMenuPlugin(),
      getUsersPresencePlugin: () => this.getUsersPresencePlugin(),
      getStagePanningPlugin: () => this.getStagePanningPlugin(),
      getNodesSelectionFeedbackPlugin: () =>
        this.getNodesSelectionFeedbackPlugin(),
    };
    this.transformerCtrl = new TransformerController(
      this.instance,
      this.config,
      this.gesture,
      callbacks
    );
    this.transformerCtrl.setup(selectionLayer);

    this.initEvents();
    this.initialized = true;

    this.instance.addEventListener(
      'onActiveActionChange',
      (activeAction: string | undefined) => {
        if (
          typeof activeAction !== 'undefined' &&
          activeAction !== SELECTION_TOOL_ACTION_NAME
        ) {
          this.active = false;
          return;
        }
        this.active = true;
      }
    );

    this.instance.addEventListener(
      'onNodeRemoved',
      (node: NodeSerializable) => {
        // If the removed node is the active group context, exit immediately
        if (this._activeGroupContext === node.id) {
          this.exitGroupContext();
        }
        const selectedNodes = this.getSelectedNodes();
        const newSelectedNodes = selectedNodes.filter(
          (actNode) => actNode.getAttrs().id !== node.id
        );
        this.setSelectedNodes(newSelectedNodes);
        stage.container().tabIndex = 1;
        stage.container().focus();
        stage.container().style.cursor = 'default';
      }
    );
  }

  // ── Group context ───────────────────────────────────────────────────────────

  getActiveGroupContext(): string | null {
    return this._activeGroupContext;
  }

  enterGroupContext(groupId: string): void {
    const stage = this.instance.getStage();
    const groupNode = stage.findOne(`#${groupId}`) as Konva.Group | undefined;
    if (!groupNode) return;

    this._activeGroupContext = groupId;

    // Make direct children draggable so they can be moved individually
    groupNode.getChildren().forEach((child) => {
      child.setAttr('draggable', true);
    });

    this.selectNone();

    this.instance.emitEvent<WeaveNodesSelectionPluginOnGroupContextChangeEvent>(
      'onGroupContextChange',
      groupId
    );
  }

  exitGroupContext(): void {
    if (this._activeGroupContext === null) return;

    const stage = this.instance.getStage();
    const groupNode = stage.findOne(`#${this._activeGroupContext}`) as
      | Konva.Group
      | undefined;

    if (groupNode) {
      // Restore children to non-draggable
      groupNode.getChildren().forEach((child) => {
        child.setAttr('draggable', false);
      });
    }

    this._activeGroupContext = null;
    this.selectNone();

    this.instance.emitEvent<WeaveNodesSelectionPluginOnGroupContextChangeEvent>(
      'onGroupContextChange',
      null
    );
  }

  // ── Overlay ─────────────────────────────────────────────────────────────────

  private getLayer(): Konva.Layer | undefined {
    const stage = this.instance.getStage();
    return stage.findOne(`#${this.getLayerName()}`) as Konva.Layer | undefined;
  }

  triggerSelectedNodesEvent(): void {
    const tr = this.transformerCtrl.getTransformer();
    const selectedNodes: WeaveSelection[] = tr.getNodes().map((node) => {
      const nodeType = node.getAttr('nodeType');
      const nodeHandler = this.instance.getNodeHandler<WeaveNode>(nodeType);
      return {
        instance: node as Konva.Shape | Konva.Group,
        node: nodeHandler?.serialize(node as Konva.Shape | Konva.Group),
      };
    });

    const usersSelectionPlugin =
      this.instance.getPlugin<WeaveUsersSelectionPlugin>(
        WEAVE_USERS_SELECTION_KEY
      );

    if (usersSelectionPlugin) {
      requestAnimationFrame(() => {
        usersSelectionPlugin.sendSelectionAwarenessInfo(tr);
      });
    }

    requestAnimationFrame(() => {
      this.instance.emitEvent<WeaveNodesSelectionPluginOnNodesChangeEvent>(
        'onNodesChange',
        selectedNodes
      );
    });
  }

  removeElement(element: WeaveStateElement): void {
    this.instance.removeNode(element);
    this.instance.getHooks().callHook('weave:onNodesRemoved', [element]);
    this.selectNone();
    this.triggerSelectedNodesEvent();
  }

  removeSelectedNodes(): void {
    const selectedNodes = this.getSelectedNodes();
    const mappedSelectedNodes = selectedNodes
      .map((node) => {
        const handler = this.instance.getNodeHandler<WeaveNode>(
          node.getAttrs().nodeType
        );
        return handler?.serialize(node);
      })
      .filter((node) => typeof node !== 'undefined');
    this.instance.removeNodes(mappedSelectedNodes);
    this.instance
      .getHooks()
      .callHook('weave:onNodesRemoved', mappedSelectedNodes);
    this.selectNone();
    this.triggerSelectedNodesEvent();
  }

  private initEvents() {
    this.selecting = false;
    const stage = this.instance.getStage();

    registerKeyboardHandlers(this);

    stage.on('pointerdown', (e) => handlePointerDown(this, e));

    stage.on(
      'pointermove',
      throttle((e) => handlePointerMove(this, e), DEFAULT_THROTTLE_MS)
    );

    // Un-throttled so single-gesture drag initiation stays responsive.
    stage.on('pointermove', (e) => handleArmedDrag(this, e));

    stage.on('pointerup', (e) => handlePointerUp(this, e));

    this.instance.addEventListener('onStateChange', () => {
      requestAnimationFrame(() => {
        this.syncSelection();
      });
    });

    this.instance.addEventListener('onUndoManagerStatusChange', () => {
      requestAnimationFrame(() => {
        this.syncSelection();
      });
    });
  }

  handleMultipleSelectionBehavior(): void {
    const tr = this.transformerCtrl.getTransformer();
    if (tr.nodes().length > 1 && this.config.behaviors?.onMultipleSelection) {
      const selectionBehavior = this.config.behaviors.onMultipleSelection(
        tr.nodes()
      );
      tr.setAttrs(selectionBehavior);
      tr.forceUpdate();
    }
  }

  syncSelection(): void {
    const stageMode = this.instance.getStage().mode();
    if (![WEAVE_STAGE_DEFAULT_MODE].includes(stageMode)) return;

    const tr = this.transformerCtrl.getTransformer();
    const newSelectedNodes = [];
    const actualSelectedNodes = tr.nodes();

    for (const node of actualSelectedNodes) {
      const existNode = this.instance
        .getStage()
        .findOne(`#${node.getAttrs().id}`);
      if (existNode) {
        newSelectedNodes.push(existNode);
      }
    }

    tr.nodes([...newSelectedNodes]);
    if (newSelectedNodes.length > 0) {
      tr.forceUpdate();
    }

    this.triggerSelectedNodesEvent();
  }

  protected getSelectionPlugin(): WeaveNodesSelectionPlugin | undefined {
    return this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
  }

  hideHoverState(): void {
    const selectionPlugin = this.getSelectionPlugin();
    if (!selectionPlugin) return;
    selectionPlugin.getHoverTransformer().nodes([]);
  }

  getTransformer(): Konva.Transformer {
    return this.transformerCtrl.getTransformer();
  }

  getHoverTransformer(): Konva.Transformer {
    return this.transformerCtrl.getHoverTransformer();
  }

  handleBehaviors(): void {
    const tr = this.transformerCtrl.getTransformer();
    const nodes = this.getSelectedNodes();
    const nodesSelected = nodes.length;

    if (
      (nodesSelected > 1 && !this.config.behaviors.multipleSelection.enabled) ||
      (nodesSelected === 1 && !this.config.behaviors.singleSelection.enabled)
    ) {
      tr.enabledAnchors([]);
    }
    if (
      (nodesSelected > 1 && this.config.behaviors.multipleSelection.enabled) ||
      (nodesSelected === 1 && this.config.behaviors.singleSelection.enabled)
    ) {
      tr.enabledAnchors(this._defaultEnabledAnchors);
    }

    let transformerAttrs: TransformerConfig = { ...this.config.selection };

    if (tr && tr.nodes().length > 0) {
      const currentAttrs = tr.getAttrs();
      Object.keys(currentAttrs).forEach((key) => {
        if (['rotationSnaps', 'enabledAnchors'].includes(key)) {
          tr.setAttr(key, []);
        } else {
          tr.setAttr(key, undefined);
        }
      });
    }

    if (nodesSelected === 1) {
      transformerAttrs = mergeExceptArrays(
        transformerAttrs,
        nodes[0].getTransformerProperties()
      );
      transformerAttrs.enabledAnchors = nodes[0]?.allowedAnchors?.() ?? [];
    }
    if (nodesSelected > 1) {
      const anchorsArrays = [];
      for (const node of nodes) {
        anchorsArrays.push(node?.allowedAnchors?.() ?? []);
      }
      transformerAttrs.enabledAnchors = intersectArrays(anchorsArrays);
    }

    if (tr && tr.nodes().length > 0) {
      if (transformerAttrs.enabledAnchors?.length === 0) {
        transformerAttrs.resizeEnabled = false;
      }
      tr.setAttrs(transformerAttrs);
      tr.forceUpdate();
      tr.getLayer()?.batchDraw();
    }
  }

  setSelectedNodes(nodes: Konva.Node[]): void {
    const tr = this.transformerCtrl.getTransformer();
    tr.setNodes(nodes);
    this.handleBehaviors();

    if (nodes.length === 0) {
      this.getNodesSelectionFeedbackPlugin()?.cleanupSelectedHalos();
    }

    const usersSelectionPlugin =
      this.instance.getPlugin<WeaveUsersSelectionPlugin>(
        WEAVE_USERS_SELECTION_KEY
      );

    if (usersSelectionPlugin) {
      requestAnimationFrame(() => {
        usersSelectionPlugin.sendSelectionAwarenessInfo(tr);
      });
    }
  }

  getSelectedNodes() {
    if (!this.transformerCtrl) return [];
    return this.transformerCtrl.getTransformer().nodes() as (
      | Konva.Group
      | Konva.Shape
    )[];
  }

  getSelectedNodesExtended(): WeaveSelection[] {
    const tr = this.transformerCtrl.getTransformer();
    return tr.getNodes().map((node) => {
      const nodeType = node.getAttr('nodeType');
      const nodeHandler = this.instance.getNodeHandler<WeaveNode>(nodeType);
      return {
        instance: node as Konva.Shape | Konva.Group,
        node: nodeHandler?.serialize(node as Konva.Shape | Konva.Group),
      };
    });
  }

  selectAll(): void {
    const mainLayer = this.instance.getMainLayer();
    if (mainLayer) {
      this.transformerCtrl.getTransformer().nodes(mainLayer.getChildren());
    }
  }

  selectNone(): void {
    this.transformerCtrl.getTransformer().nodes([]);
  }

  enable(): void {
    this.getLayer()?.show();
    this.enabled = true;
  }

  disable(): void {
    this.getLayer()?.hide();
    this.enabled = false;
  }

  getNodesSelectionFeedbackPlugin() {
    return getNodesSelectionFeedbackPlugin(this.instance);
  }

  getContextMenuPlugin() {
    return getContextMenuPlugin(this.instance);
  }

  getStageGridPlugin() {
    return getStageGridPlugin(this.instance);
  }

  getStagePanningPlugin() {
    return getStagePanningPlugin(this.instance);
  }

  getUsersPresencePlugin() {
    return getUsersPresencePlugin(this.instance);
  }

  isTransforming(): boolean {
    return this.transformerCtrl.isTransforming();
  }

  isDragging(): boolean {
    return this.transformerCtrl.isDragging();
  }

  getBoundBoxFunc() {
    return this.transformerCtrl.getBoundBoxFunc();
  }

  getSelectorConfig(): TransformerConfig {
    return this.config.selection;
  }

  saveDragSelectedNodes(): void {
    this.dragSelectedNodes = this.transformerCtrl.getTransformer().nodes();
  }

  getDragSelectedNodes(): Konva.Node[] {
    return this.dragSelectedNodes;
  }

  setNodesOpacityOnDrag(): void {
    for (const node of this.dragSelectedNodes) {
      const originalNodeOpacity = node.getAttrs().opacity ?? 1;
      node.setAttr('dragStartOpacity', originalNodeOpacity);
      node.opacity(this.getDragOpacity());
    }
  }

  restoreNodesOpacityOnDrag() {
    for (const node of this.dragSelectedNodes) {
      const dragStartOpacity = node.getAttr('dragStartOpacity') ?? 1;
      node.opacity(dragStartOpacity);
      node.setAttr('dragStartOpacity', undefined);
    }
  }

  getDragOpacity(): number {
    return this.config.style.dragOpacity;
  }
}
