// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave } from '@/weave';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
  type WeaveNodeBase,
  WEAVE_NODE_CUSTOM_EVENTS,
  type WeaveNodeConfiguration,
} from '@inditextech/weave-types';
import { type Logger } from 'pino';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import Konva from 'konva';
import { WeaveCopyPasteNodesPlugin } from '@/plugins/copy-paste-nodes/copy-paste-nodes';
import type { WeaveNodesSelectionPluginOnNodesChangeEvent } from '@/plugins/nodes-selection/types';
import {
  clearContainerTargets,
  containerOverCursor,
  hasFrames,
  mergeExceptArrays,
  moveNodeToContainer,
} from '@/utils';
import type { WeaveNodesEdgeSnappingPlugin } from '@/plugins/nodes-edge-snapping/nodes-edge-snapping';
import { throttle } from 'lodash';
import type { KonvaEventObject } from 'konva/lib/Node';
import { WEAVE_STAGE_DEFAULT_MODE } from './stage/constants';
import { MOVE_TOOL_ACTION_NAME } from '@/actions/move-tool/constants';
import { SELECTION_TOOL_ACTION_NAME } from '@/actions/selection-tool/constants';
import { WEAVE_NODES_EDGE_SNAPPING_PLUGIN_KEY } from '@/plugins/nodes-edge-snapping/constants';
import { WEAVE_NODES_DISTANCE_SNAPPING_PLUGIN_KEY } from '@/plugins/nodes-distance-snapping/constants';
import type { WeaveNodesDistanceSnappingPlugin } from '@/plugins/nodes-distance-snapping/nodes-distance-snapping';
import type { WeaveNodesMultiSelectionFeedbackPlugin } from '@/plugins/nodes-multi-selection-feedback/nodes-multi-selection-feedback';
import { WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY } from '@/plugins/nodes-multi-selection-feedback/constants';

export const augmentKonvaStageClass = (): void => {
  Konva.Stage.prototype.isMouseWheelPressed = function () {
    return false;
  };
};

export const augmentKonvaNodeClass = (
  config?: WeaveNodeConfiguration
): void => {
  const { transform } = config ?? {};

  Konva.Node.prototype.getTransformerProperties = function () {
    return {
      ...transform,
    };
  };
  Konva.Node.prototype.getExportClientRect = function (config) {
    return this.getClientRect(config);
  };
  Konva.Node.prototype.getRealClientRect = function (config) {
    return this.getClientRect(config);
  };
  Konva.Node.prototype.movedToContainer = function () {};
  Konva.Node.prototype.updatePosition = function () {};
  Konva.Node.prototype.triggerCrop = function () {};
  Konva.Node.prototype.closeCrop = function () {};
  Konva.Node.prototype.resetCrop = function () {};
  Konva.Node.prototype.dblClick = function () {};
};

export abstract class WeaveNode implements WeaveNodeBase {
  protected instance!: Weave;
  protected nodeType!: string;
  protected didMove!: boolean;
  private logger!: Logger;
  protected previousPointer!: string | null;

  register(instance: Weave): WeaveNode {
    this.instance = instance;
    this.logger = this.instance.getChildLogger(this.getNodeType());
    this.instance
      .getChildLogger('node')
      .debug(`Node with type [${this.getNodeType()}] registered`);

    return this;
  }

  getNodeType(): string {
    return this.nodeType;
  }

  getLogger(): Logger {
    return this.logger;
  }

  getSelectionPlugin(): WeaveNodesSelectionPlugin | undefined {
    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    return selectionPlugin;
  }

  isSelecting(): boolean {
    return this.instance.getActiveAction() === SELECTION_TOOL_ACTION_NAME;
  }

  isPasting(): boolean {
    const copyPastePlugin =
      this.instance.getPlugin<WeaveCopyPasteNodesPlugin>('copyPasteNodes');

    if (copyPastePlugin) {
      return copyPastePlugin.isPasting();
    }

    return false;
  }

  setupDefaultNodeAugmentation(node: Konva.Node): void {
    const defaultTransformerProperties = this.defaultGetTransformerProperties();

    node.getTransformerProperties = function () {
      return defaultTransformerProperties;
    };
    node.allowedAnchors = function () {
      return [
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'middle-left',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ];
    };
    node.movedToContainer = function () {};
    node.updatePosition = function () {};
    node.resetCrop = function () {};
    node.handleMouseover = function () {};
    node.handleMouseout = function () {};
    node.handleSelectNode = function () {};
    node.handleDeselectNode = function () {};
    node.canMoveToContainer = function () {
      return true;
    };
  }

  isNodeSelected(ele: Konva.Node): boolean {
    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (
      selectionPlugin
        ?.getSelectedNodes()
        .map((node) => node.getAttrs().id)
        .includes(ele.getAttrs().id)
    ) {
      return true;
    }

    return false;
  }

  scaleReset(node: Konva.Node): void {
    const scale = node.scale();

    node.width(Math.max(5, node.width() * scale.x));
    node.height(Math.max(5, node.height() * scale.y));

    // reset scale to 1
    node.scale({ x: 1, y: 1 });
  }

  protected setHoverState(node: Konva.Node): void {
    const selectionPlugin = this.getSelectionPlugin();

    if (!selectionPlugin) {
      return;
    }

    if (
      (selectionPlugin.getSelectedNodes().length === 1 &&
        node === selectionPlugin.getSelectedNodes()[0]) ||
      selectionPlugin.isAreaSelecting()
    ) {
      this.hideHoverState();
      return;
    }

    selectionPlugin.getHoverTransformer().nodes([node]);
    selectionPlugin.getHoverTransformer().moveToTop();
  }

  protected hideHoverState(): void {
    const selectionPlugin = this.getSelectionPlugin();

    if (!selectionPlugin) {
      return;
    }

    selectionPlugin.getHoverTransformer().nodes([]);
  }

  setupDefaultNodeEvents(node: Konva.Node): void {
    this.instance.addEventListener<WeaveNodesSelectionPluginOnNodesChangeEvent>(
      'onNodesChange',
      () => {
        if (
          !this.isLocked(node as WeaveElementInstance) &&
          this.isSelecting() &&
          this.isNodeSelected(node)
        ) {
          node.draggable(true);
          return;
        }
        node.draggable(false);
      }
    );

    const isLocked = node.getAttrs().locked ?? false;

    if (isLocked) {
      node.off('transformstart');
      node.off('transform');
      node.off('transformend');
      node.off('dragstart');
      node.off('dragmove');
      node.off('dragend');
      node.off('pointerenter');
      node.off('pointerleave');
    } else {
      let transforming = false;

      node.on('transformstart', (e) => {
        transforming = true;

        this.getNodesSelectionFeedbackPlugin()?.hideSelectionHalo(node);

        this.instance.emitEvent('onTransform', e.target);
      });

      const handleTransform = (e: KonvaEventObject<Event, Konva.Node>) => {
        const node = e.target;

        const nodesSelectionPlugin =
          this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

        const nodesEdgeSnappingPlugin = this.getNodesEdgeSnappingPlugin();

        if (
          nodesSelectionPlugin &&
          this.isSelecting() &&
          this.isNodeSelected(node)
        ) {
          nodesSelectionPlugin.getTransformer().forceUpdate();
        }

        if (
          nodesEdgeSnappingPlugin &&
          transforming &&
          this.isSelecting() &&
          this.isNodeSelected(node)
        ) {
          nodesEdgeSnappingPlugin.evaluateGuidelines(e);
        }
      };

      node.on('transform', throttle(handleTransform, 100));

      node.on('transformend', (e) => {
        const node = e.target;

        this.instance.emitEvent('onTransform', null);

        transforming = false;

        const nodesSelectionPlugin =
          this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

        const nodesSnappingPlugin = this.getNodesEdgeSnappingPlugin();

        if (nodesSnappingPlugin) {
          nodesSnappingPlugin.cleanupGuidelines();
        }

        if (nodesSelectionPlugin) {
          nodesSelectionPlugin.getTransformer().forceUpdate();
        }

        this.scaleReset(node);

        this.getNodesSelectionFeedbackPlugin()?.hideSelectionHalo(node);

        const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
          node.getAttrs().nodeType
        );
        if (nodeHandler) {
          this.instance.updateNode(
            nodeHandler.serialize(node as WeaveElementInstance)
          );
        }

        this.getNodesSelectionPlugin()?.getHoverTransformer().forceUpdate();
      });

      const stage = this.instance.getStage();

      let originalPosition: Konva.Vector2d | null = null;

      this.instance.addEventListener('onSelectionState', (state) => {
        const nodesSelectionPlugin = this.getSelectionPlugin();
        const selectedNodes = nodesSelectionPlugin?.getSelectedNodes() ?? [];

        if (
          !state &&
          selectedNodes?.some((n) => n.getAttrs().id === node.getAttrs().id)
        ) {
          originalPosition = node.getAbsolutePosition();
        }
      });

      node.on('mousedown', (e) => {
        const nodeTarget = e.target;
        originalPosition = nodeTarget.getAbsolutePosition();
      });

      let originalOpacity: number | undefined = undefined;
      const DRAG_OPACITY: number = 0.75;

      node.on('dragstart', (e) => {
        const nodeTarget = e.target;

        this.getNodesSelectionFeedbackPlugin()?.hideSelectionHalo(nodeTarget);

        this.didMove = false;

        if (e.evt?.buttons === 0) {
          nodeTarget.stopDrag();
          return;
        }

        const isErasing = this.instance.getActiveAction() === 'eraseTool';

        if (isErasing) {
          nodeTarget.stopDrag();
          return;
        }

        this.instance.emitEvent('onDrag', nodeTarget);

        if (stage.isMouseWheelPressed()) {
          e.cancelBubble = true;
          nodeTarget.stopDrag();
        }

        const realNodeTarget: Konva.Node = this.getRealSelectedNode(nodeTarget);

        if (realNodeTarget.getAttrs().isCloned) {
          return;
        }

        originalOpacity = realNodeTarget.opacity();
        realNodeTarget.opacity(DRAG_OPACITY);

        if (e.evt?.altKey) {
          nodeTarget.setAttrs({ isCloneOrigin: true });
          nodeTarget.setAttrs({ isCloned: false });
          nodeTarget.stopDrag(e.evt);

          e.cancelBubble = true;

          const clone = this.instance
            .getCloningManager()
            .cloneNode(realNodeTarget);

          if (clone && !this.instance.getCloningManager().isClone(clone)) {
            clone.setAttrs({ isCloneOrigin: false });
            clone.setAttrs({ isCloned: true });
            this.instance.getCloningManager().addClone(clone);
          }

          stage.setPointersPositions(e.evt);

          const nodesSelectionPlugin = this.getNodesSelectionPlugin();
          nodesSelectionPlugin?.setSelectedNodes([]);

          requestAnimationFrame(() => {
            nodesSelectionPlugin?.setSelectedNodes(
              this.instance.getCloningManager().getClones()
            );
            clone?.startDrag(e.evt);
          });
        }
      });

      const handleDragMove = (e: KonvaEventObject<DragEvent, Konva.Node>) => {
        const nodeTarget = e.target;

        e.cancelBubble = true;

        if (e.evt?.buttons === 0) {
          nodeTarget.stopDrag();
          return;
        }

        this.didMove = true;

        const stage = this.instance.getStage();

        const isErasing = this.instance.getActiveAction() === 'eraseTool';

        if (isErasing) {
          nodeTarget.stopDrag();
          return;
        }

        if (stage.isMouseWheelPressed()) {
          e.cancelBubble = true;
          nodeTarget.stopDrag();
          return;
        }

        const realNodeTarget: Konva.Node = this.getRealSelectedNode(nodeTarget);

        if (
          this.isSelecting() &&
          this.getSelectionPlugin()?.getSelectedNodes().length === 1
        ) {
          clearContainerTargets(this.instance);

          const layerToMove = containerOverCursor(this.instance, [
            realNodeTarget,
          ]);

          if (
            layerToMove &&
            !hasFrames(realNodeTarget) &&
            realNodeTarget.isDragging() &&
            !realNodeTarget.getAttrs().lockToContainer
          ) {
            layerToMove.fire(WEAVE_NODE_CUSTOM_EVENTS.onTargetEnter, {
              node: realNodeTarget,
            });
          }
        }
      };

      node.on('dragmove', throttle(handleDragMove, 100));

      node.on('dragend', (e) => {
        const nodeTarget = e.target;

        this.getNodesSelectionFeedbackPlugin()?.hideSelectionHalo(nodeTarget);

        e.cancelBubble = true;

        if (nodeTarget.getAttrs().isCloneOrigin && originalPosition) {
          nodeTarget.setAbsolutePosition(originalPosition);
          nodeTarget.setAttrs({ isCloneOrigin: undefined });
          nodeTarget.setAttrs({ isCloned: undefined });
          originalPosition = null;
          return;
        }

        if (!this.didMove) {
          return;
        }

        const isErasing = this.instance.getActiveAction() === 'eraseTool';

        if (isErasing) {
          nodeTarget.stopDrag();
          return;
        }

        this.instance.emitEvent('onDrag', null);

        const realNodeTarget: Konva.Node = this.getRealSelectedNode(nodeTarget);

        realNodeTarget.setAttrs({ opacity: originalOpacity });
        originalOpacity = undefined;

        if (
          this.isSelecting() &&
          this.getSelectionPlugin()?.getSelectedNodes().length === 1 &&
          (realNodeTarget.getAttrs().lockToContainer === undefined ||
            !realNodeTarget.getAttrs().lockToContainer)
        ) {
          clearContainerTargets(this.instance);

          const nodesEdgeSnappingPlugin = this.getNodesEdgeSnappingPlugin();

          const nodesDistanceSnappingPlugin =
            this.getNodesDistanceSnappingPlugin();

          if (nodesEdgeSnappingPlugin) {
            nodesEdgeSnappingPlugin.cleanupGuidelines();
          }

          if (nodesDistanceSnappingPlugin) {
            nodesDistanceSnappingPlugin.cleanupGuidelines();
          }

          const layerToMove = containerOverCursor(this.instance, [
            realNodeTarget,
          ]);

          let containerToMove: Konva.Layer | Konva.Node | undefined =
            this.instance.getMainLayer();

          if (layerToMove) {
            containerToMove = layerToMove;
          }

          let moved = false;
          if (containerToMove && !hasFrames(node)) {
            moved = moveNodeToContainer(
              this.instance,
              realNodeTarget,
              containerToMove
            );
          }

          if (realNodeTarget.getAttrs().isCloned) {
            this.instance.getCloningManager().removeClone(realNodeTarget);
          }

          if (containerToMove) {
            containerToMove.fire(WEAVE_NODE_CUSTOM_EVENTS.onTargetLeave, {
              node: realNodeTarget,
            });
          }

          if (!moved) {
            this.instance.updateNode(
              this.serialize(realNodeTarget as WeaveElementInstance)
            );
          }
        }

        if (
          this.isSelecting() &&
          this.getSelectionPlugin()?.getSelectedNodes().length === 1 &&
          realNodeTarget.getAttrs().lockToContainer
        ) {
          clearContainerTargets(this.instance);

          const nodesEdgeSnappingPlugin = this.getNodesEdgeSnappingPlugin();

          const nodesDistanceSnappingPlugin =
            this.getNodesDistanceSnappingPlugin();

          if (nodesEdgeSnappingPlugin) {
            nodesEdgeSnappingPlugin.cleanupGuidelines();
          }

          if (nodesDistanceSnappingPlugin) {
            nodesDistanceSnappingPlugin.cleanupGuidelines();
          }

          this.instance.updateNode(
            this.serialize(realNodeTarget as WeaveElementInstance)
          );
        }

        nodeTarget.setAttrs({ isCloned: undefined });
        nodeTarget.setAttrs({ isCloneOrigin: undefined });
        realNodeTarget.setAttrs({ isCloned: undefined });
        realNodeTarget.setAttrs({ isCloneOrigin: undefined });
        originalPosition = realNodeTarget.getAbsolutePosition();
      });

      node.handleMouseover = () => {
        this.handleMouseOver(node);
      };

      node.handleMouseout = () => {
        this.handleMouseout(node);
      };

      node.handleSelectNode = () => {
        this.getNodesSelectionFeedbackPlugin()?.createSelectionHalo(node);
      };

      node.handleDeselectNode = () => {
        this.getNodesSelectionFeedbackPlugin()?.destroySelectionHalo(node);
      };

      node.on('pointerover', (e) => {
        const doCancelBubble = this.handleMouseOver(e.target);
        if (doCancelBubble) {
          e.cancelBubble = true;
        }
      });
    }
  }

  handleMouseOver(node: Konva.Node): boolean {
    const stage = this.instance.getStage();
    const activeAction = this.instance.getActiveAction();

    const isNodeSelectionEnabled = this.getSelectionPlugin()?.isEnabled();

    const realNode = this.instance.getInstanceRecursive(node);

    const isTargetable = node.getAttrs().isTargetable !== false;
    const isLocked = node.getAttrs().locked ?? false;

    if ([MOVE_TOOL_ACTION_NAME].includes(activeAction ?? '')) {
      return false;
    }

    let showHover = false;
    let cancelBubble = false;

    // Node is locked
    if (
      isNodeSelectionEnabled &&
      this.isSelecting() &&
      !this.isNodeSelected(realNode) &&
      !this.isPasting() &&
      isLocked
    ) {
      const stage = this.instance.getStage();
      stage.container().style.cursor = 'default';
      cancelBubble = true;
    }

    // Node is not locked and not selected
    if (
      isNodeSelectionEnabled &&
      this.isSelecting() &&
      !this.isNodeSelected(realNode) &&
      !this.isPasting() &&
      isTargetable &&
      !isLocked &&
      stage.mode() === WEAVE_STAGE_DEFAULT_MODE
    ) {
      const stage = this.instance.getStage();
      showHover = true;
      stage.container().style.cursor = 'pointer';
      cancelBubble = true;
    }

    // Node is not locked and selected
    if (
      isNodeSelectionEnabled &&
      this.isSelecting() &&
      this.isNodeSelected(realNode) &&
      !this.isPasting() &&
      isTargetable &&
      !isLocked &&
      stage.mode() === WEAVE_STAGE_DEFAULT_MODE
    ) {
      const stage = this.instance.getStage();
      showHover = true;
      stage.container().style.cursor = 'grab';
      cancelBubble = true;
    }

    if (!isTargetable) {
      cancelBubble = true;
    }

    // We're on pasting mode
    if (this.isPasting()) {
      const stage = this.instance.getStage();
      stage.container().style.cursor = 'crosshair';
      cancelBubble = true;
    }

    if (showHover) {
      this.setHoverState(realNode);
    } else {
      this.hideHoverState();
    }

    return cancelBubble;
  }

  handleMouseout(node: Konva.Node) {
    const realNode = this.instance.getInstanceRecursive(node);

    if (realNode) {
      this.hideHoverState();
    }
  }

  create(key: string, props: WeaveElementAttributes): WeaveStateElement {
    return {
      key,
      type: this.nodeType,
      props: {
        ...props,
        id: key,
        nodeType: this.nodeType,
        children: [],
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAdd(nodeInstance: WeaveElementInstance): void {}

  abstract onRender(props: WeaveElementAttributes): WeaveElementInstance;

  abstract onUpdate(
    instance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void;

  onDestroy(nodeInstance: WeaveElementInstance): void {
    nodeInstance.destroy();
  }

  serialize(instance: WeaveElementInstance): WeaveStateElement {
    const attrs = instance.getAttrs();

    const cleanedAttrs = { ...attrs };
    delete cleanedAttrs.draggable;

    return {
      key: attrs.id ?? '',
      type: attrs.nodeType,
      props: {
        ...cleanedAttrs,
        isCloned: undefined,
        isCloneOrigin: undefined,
        id: attrs.id ?? '',
        nodeType: attrs.nodeType,
        children: [],
      },
    };
  }

  show(instance: Konva.Node): void {
    if (instance.getAttrs().nodeType !== this.getNodeType()) {
      return;
    }

    instance.setAttrs({
      visible: true,
    });

    this.instance.updateNode(this.serialize(instance as WeaveElementInstance));

    this.setupDefaultNodeEvents(instance);

    const stage = this.instance.getStage();
    stage.container().style.cursor = 'default';
  }

  hide(instance: Konva.Node): void {
    if (instance.getAttrs().nodeType !== this.getNodeType()) {
      return;
    }

    instance.setAttrs({
      visible: false,
    });

    const selectionPlugin = this.getSelectionPlugin();
    if (selectionPlugin) {
      const ids = [instance.getAttrs().id];

      if (instance.getAttrs().nodeType === 'frame') {
        ids.push(`${instance.getAttrs().id}-selector-area`);
      }

      const selectedNodes = selectionPlugin.getSelectedNodes();
      const newSelectedNodes = selectedNodes.filter(
        (node) => !ids.includes(node.getAttrs().id)
      );
      selectionPlugin.setSelectedNodes(newSelectedNodes);
      selectionPlugin.getTransformer().forceUpdate();
    }

    this.instance.updateNode(this.serialize(instance as WeaveElementInstance));

    this.setupDefaultNodeEvents(instance);

    const stage = this.instance.getStage();
    stage.container().style.cursor = 'default';
  }

  isVisible(instance: Konva.Node): boolean {
    if (typeof instance.getAttrs().visible === 'undefined') {
      return true;
    }
    return instance.getAttrs().visible ?? false;
  }

  lock(instance: Konva.Node): void {
    if (instance.getAttrs().nodeType !== this.getNodeType()) {
      return;
    }

    instance.setAttrs({
      locked: true,
    });

    this.instance.updateNode(this.serialize(instance as WeaveElementInstance));

    const selectionPlugin = this.getSelectionPlugin();
    if (selectionPlugin) {
      const selectedNodes = selectionPlugin.getSelectedNodes();
      const newSelectedNodes = selectedNodes.filter(
        (node) => node.getAttrs().id !== instance.getAttrs().id
      );
      selectionPlugin.setSelectedNodes(newSelectedNodes);
      selectionPlugin.getTransformer().forceUpdate();
    }

    this.setupDefaultNodeEvents(instance);

    const stage = this.instance.getStage();
    stage.container().style.cursor = 'default';
  }

  unlock(instance: Konva.Node): void {
    if (instance.getAttrs().nodeType !== this.getNodeType()) {
      return;
    }

    let realInstance = instance;
    if (instance.getAttrs().nodeId) {
      realInstance = this.instance
        .getStage()
        .findOne(`#${instance.getAttrs().nodeId}`) as Konva.Node;
    }

    if (!realInstance) {
      return;
    }

    realInstance.setAttrs({
      locked: false,
    });

    this.instance.updateNode(
      this.serialize(realInstance as WeaveElementInstance)
    );

    this.setupDefaultNodeEvents(realInstance);

    const stage = this.instance.getStage();
    stage.container().style.cursor = 'default';
  }

  isLocked(instance: Konva.Node): boolean {
    let realInstance = instance;
    if (instance.getAttrs().nodeId === false) {
      realInstance = this.instance.getInstanceRecursive(instance);
    }

    return realInstance.getAttrs().locked ?? false;
  }

  protected defaultGetTransformerProperties(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodeTransformConfig?: any
  ) {
    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    let transformProperties = {};
    if (selectionPlugin) {
      transformProperties = {
        ...transformProperties,
        ...selectionPlugin.getSelectorConfig(),
      };
    }

    return mergeExceptArrays(transformProperties, nodeTransformConfig ?? {});
  }

  protected getNodesSelectionPlugin() {
    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    return nodesSelectionPlugin;
  }

  protected getNodesEdgeSnappingPlugin() {
    const snappingPlugin =
      this.instance.getPlugin<WeaveNodesEdgeSnappingPlugin>(
        WEAVE_NODES_EDGE_SNAPPING_PLUGIN_KEY
      );
    return snappingPlugin;
  }

  protected getNodesDistanceSnappingPlugin() {
    const snappingPlugin =
      this.instance.getPlugin<WeaveNodesDistanceSnappingPlugin>(
        WEAVE_NODES_DISTANCE_SNAPPING_PLUGIN_KEY
      );
    return snappingPlugin;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  realOffset(instance: WeaveStateElement): Konva.Vector2d {
    return {
      x: 0,
      y: 0,
    };
  }

  private getRealSelectedNode(nodeTarget: Konva.Node) {
    const stage = this.instance.getStage();

    let realNodeTarget: Konva.Node = nodeTarget;

    if (nodeTarget.getParent() instanceof Konva.Transformer) {
      const mousePos = stage.getPointerPosition();
      const intersections = stage.getAllIntersections(mousePos);
      const nodesIntersected = intersections.filter(
        (ele) => ele.getAttrs().nodeType
      );

      if (nodesIntersected.length > 0) {
        realNodeTarget = this.instance.getInstanceRecursive(
          nodesIntersected[nodesIntersected.length - 1]
        );
      }
    }

    return realNodeTarget;
  }

  getNodesSelectionFeedbackPlugin() {
    const selectionFeedbackPlugin =
      this.instance.getPlugin<WeaveNodesMultiSelectionFeedbackPlugin>(
        WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY
      );
    return selectionFeedbackPlugin;
  }
}
