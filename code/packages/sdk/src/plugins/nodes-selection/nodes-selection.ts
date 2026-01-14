// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveSelection,
  type NodeSerializable,
  WEAVE_NODE_CUSTOM_EVENTS,
  type WeaveElementInstance,
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
  type WeaveNodesSelectionPluginOnSelectionStateEvent,
  type WeaveNodesSelectionPluginParams,
} from './types';
import { WeaveContextMenuPlugin } from '../context-menu/context-menu';
import { type WeaveNode } from '@/nodes/node';
import type { WeaveCopyPasteNodesPlugin } from '../copy-paste-nodes/copy-paste-nodes';
import {
  clearContainerTargets,
  containerOverCursor,
  getTargetedNode,
  hasFrames,
  intersectArrays,
  mergeExceptArrays,
  moveNodeToContainer,
} from '@/utils';
import { WEAVE_USERS_SELECTION_KEY } from '../users-selection/constants';
import type { WeaveUsersSelectionPlugin } from '../users-selection/users-selection';
import type { KonvaEventObject } from 'konva/lib/Node';
import throttle from 'lodash/throttle';
import type { Stage } from 'konva/lib/Stage';
import { WEAVE_STAGE_DEFAULT_MODE } from '@/nodes/stage/constants';
import type { TransformerConfig } from 'konva/lib/shapes/Transformer';
import { SELECTION_TOOL_ACTION_NAME } from '@/actions/selection-tool/constants';
import { WEAVE_NODES_EDGE_SNAPPING_PLUGIN_KEY } from '../nodes-edge-snapping/constants';
import { WEAVE_CONTEXT_MENU_PLUGIN_KEY } from '../context-menu/constants';
import type { WeaveNodesEdgeSnappingPlugin } from '../nodes-edge-snapping/nodes-edge-snapping';
import type { WeaveNodesDistanceSnappingPlugin } from '../nodes-distance-snapping/nodes-distance-snapping';
import { WEAVE_NODES_DISTANCE_SNAPPING_PLUGIN_KEY } from '../nodes-distance-snapping/constants';
import { WEAVE_STAGE_GRID_PLUGIN_KEY } from '../stage-grid/constants';
import type { WeaveStageGridPlugin } from '../stage-grid/stage-grid';
import type { WeaveStagePanningPlugin } from '../stage-panning/stage-panning';
import { WEAVE_STAGE_PANNING_KEY } from '../stage-panning/constants';
import type { WeaveNodesMultiSelectionFeedbackPlugin } from '../nodes-multi-selection-feedback/nodes-multi-selection-feedback';
import { WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY } from '../nodes-multi-selection-feedback/constants';
import type { WeaveNodeChangedContainerEvent } from '@/nodes/types';
import type { WeaveUsersPresencePlugin } from '../users-presence/users-presence';
import { WEAVE_USERS_PRESENCE_PLUGIN_KEY } from '../users-presence/constants';

export class WeaveNodesSelectionPlugin extends WeavePlugin {
  private tr!: Konva.Transformer;
  private trHover!: Konva.Transformer;
  private config!: WeaveNodesSelectionConfig;
  private selectionRectangle!: Konva.Rect;
  private active: boolean;
  private defaultEnabledAnchors: string[];
  private selecting: boolean;
  private didMove: boolean;
  private initialized: boolean;
  private isSpaceKeyPressed: boolean;
  protected taps: number;
  protected isDoubleTap: boolean;
  protected tapStart: { x: number; y: number; time: number } | null;
  protected lastTapTime: number;
  private x1!: number;
  private y1!: number;
  private x2!: number;
  private y2!: number;
  private selectionStart: { x: number; y: number } | null = null;
  private panSpeed = { x: 0, y: 0 };
  private readonly panDirection = { x: 0, y: 0 };
  private pointers: Record<string, PointerEvent>;
  private panLoopId: number | null = null;
  private prevSelectedNodes: Konva.Node[] = [];
  private handledClickOrTap: boolean = false;

  onRender: undefined;

  constructor(params?: WeaveNodesSelectionPluginParams) {
    super();

    this.config = mergeExceptArrays(
      WEAVE_NODES_SELECTION_DEFAULT_CONFIG,
      params?.config ?? {}
    );

    this.defaultEnabledAnchors = this.config.selection?.enabledAnchors ?? [
      'top-left',
      'top-center',
      'top-right',
      'middle-right',
      'middle-left',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ];
    this.taps = 0;
    this.isSpaceKeyPressed = false;
    this.isDoubleTap = false;
    this.tapStart = { x: 0, y: 0, time: 0 };
    this.lastTapTime = 0;
    this.active = false;
    this.didMove = false;
    this.selecting = false;
    this.initialized = false;
    this.enabled = false;
    this.pointers = {};
    this.panLoopId = null;
  }

  getName(): string {
    return WEAVE_NODES_SELECTION_KEY;
  }

  getLayerName(): string {
    return WEAVE_NODES_SELECTION_LAYER_ID;
  }

  initLayer(): void {
    const stage = this.instance.getStage();

    const layer = new Konva.Layer({ id: this.getLayerName() });
    stage.add(layer);
  }

  isPasting(): boolean {
    const copyPastePlugin =
      this.instance.getPlugin<WeaveCopyPasteNodesPlugin>('copyPasteNodes');

    if (!copyPastePlugin) {
      return false;
    }

    return copyPastePlugin.isPasting();
  }

  isAreaSelecting(): boolean {
    return this.selecting;
  }

  isSelecting(): boolean {
    return this.instance.getActiveAction() === SELECTION_TOOL_ACTION_NAME;
  }

  isNodeSelected(ele: Konva.Node): boolean {
    let selected: boolean = false;
    if (
      this.getSelectedNodes().length === 1 &&
      this.getSelectedNodes()[0].getAttrs().id === ele.getAttrs().id
    ) {
      selected = true;
    }

    return selected;
  }

  onInit(): void {
    const stage = this.instance.getStage();
    const selectionLayer = this.getLayer();

    stage.container().tabIndex = 1;
    stage.container().focus();

    const selectionRectangle = new Konva.Rect({
      ...this.config.selectionArea,
      ...((this.config.selectionArea.strokeWidth as number) && {
        strokeWidth:
          (this.config.selectionArea.strokeWidth as number) / stage.scaleX(),
      }),
      ...(this.config.selectionArea.dash && {
        dash: this.config.selectionArea.dash.map((d) => d / stage.scaleX()),
      }),
      visible: false,
      listening: false,
    });
    selectionLayer?.add(selectionRectangle);

    const tr = new Konva.Transformer({
      id: 'selectionTransformer',
      ...this.config.selection,
      listening: true,
      shouldOverdrawWholeArea: true,
    });
    selectionLayer?.add(tr);

    const trHover = new Konva.Transformer({
      id: 'hoverTransformer',
      ...this.config.hover,
      rotateEnabled: false,
      resizeEnabled: false,
      enabledAnchors: [],
      listening: false,
    });
    selectionLayer?.add(trHover);

    stage.on('pointermove', () => {
      if (
        tr.nodes().length === 1 &&
        tr.nodes()[0].getAttrs().isContainerPrincipal
      ) {
        const pos = stage.getPointerPosition();

        if (!pos) {
          return;
        }

        const shapeUnder = stage.getIntersection(pos);

        if (!shapeUnder) {
          tr.setAttrs({
            listening: true,
          });
          tr.forceUpdate();
        }
        if (
          shapeUnder &&
          tr.getChildren().includes(shapeUnder) &&
          shapeUnder.name() === 'back'
        ) {
          tr.setAttrs({
            listening: false,
          });
          tr.forceUpdate();
        }
        if (
          shapeUnder &&
          (tr.nodes()[0] as Konva.Group).getChildren().includes(shapeUnder)
        ) {
          tr.setAttrs({
            listening: false,
          });
          tr.forceUpdate();
        }
        if (
          shapeUnder &&
          !tr.getChildren().includes(shapeUnder) &&
          (tr.nodes()[0] as Konva.Group).getChildren().includes(shapeUnder)
        ) {
          tr.setAttrs({
            listening: true,
          });
          tr.forceUpdate();
        }
      }
    });

    tr.on('transformstart', () => {
      this.triggerSelectedNodesEvent();

      const selectedNodes = tr.nodes();

      for (const node of selectedNodes) {
        if (node.getAttrs().strokeScaleEnabled !== false) {
          node.setAttr('strokeScaleEnabled', false);
          node.setAttr('_revertStrokeScaleEnabled', true);
        }
      }

      if (this.getSelectedNodes().length > 1) {
        this.instance.setMutexLock({
          nodeIds: selectedNodes.map((node) => node.id()),
          operation: 'nodes-transform',
        });
      }
    });

    let nodeHovered: Konva.Node | undefined = undefined;

    tr.on('mousemove', () => {
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      this.disable();
      const shape = stage.getIntersection(pointerPos);
      this.enable();

      if (shape) {
        const targetNode = this.instance.getInstanceRecursive(shape);
        if (targetNode && targetNode !== nodeHovered) {
          this.instance.getStage().handleMouseover();
          nodeHovered?.handleMouseout();
          targetNode?.handleMouseover();
          nodeHovered = targetNode as Konva.Node | undefined;
        }
        targetNode?.handleMouseover();
      } else {
        nodeHovered?.handleMouseout();
      }
    });

    tr.on('mouseover', () => {
      stage.container().style.cursor = 'grab';
    });

    tr.on('mouseout', () => {
      this.instance.getStage().handleMouseover();
      nodeHovered = undefined;
    });

    window.addEventListener('mouseout', () => {
      if (nodeHovered) {
        nodeHovered.handleMouseout();
        nodeHovered = undefined;
      }
      this.instance.getStage().handleMouseover();
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTransform = (e: any) => {
      const moved = this.checkMoved(e);
      if (moved) {
        this.getContextMenuPlugin()?.cancelLongPressTimer();
      }

      this.triggerSelectedNodesEvent();

      if (this.getUsersPresencePlugin()) {
        for (const node of tr.nodes()) {
          this.getUsersPresencePlugin()?.setPresence(node.id(), {
            x: node.x(),
            y: node.y(),
            width: node.width(),
            height: node.height(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation(),
            strokeScaleEnabled: false,
          });
        }
      }
    };

    tr.on('transform', throttle(handleTransform, 50));

    tr.on('transformend', () => {
      if (this.getSelectedNodes().length > 1) {
        this.instance.releaseMutexLock();
      }

      const selectedNodes = tr.nodes();

      for (const node of selectedNodes) {
        if (node.getAttrs()._revertStrokeScaleEnabled === true) {
          node.setAttr('strokeScaleEnabled', true);
        }
        node.setAttr('_revertStrokeScaleEnabled', undefined);

        if (this.getUsersPresencePlugin()) {
          this.getUsersPresencePlugin()?.removePresence(node.id());
        }
      }

      this.triggerSelectedNodesEvent();
    });

    let initialPos: Konva.Vector2d | null = null;
    let originalNodes: Record<string, Konva.Node | null | undefined> = {};
    let originalContainers: Record<string, Konva.Node | null | undefined> = {};

    tr.on('dragstart', (e) => {
      initialPos = { x: e.target.x(), y: e.target.y() };

      this.didMove = false;

      const stage = this.instance.getStage();

      if (stage.isMouseWheelPressed()) {
        e.cancelBubble = true;
        e.target.stopDrag();
        return;
      }

      const nodes = tr.nodes();
      if (nodes.length > 1) {
        for (const node of nodes) {
          const originalNodeOpacity = node.getAttrs().opacity ?? 1;
          node.setAttr('dragStartOpacity', originalNodeOpacity);
          node.opacity(this.getDragOpacity());
        }
      }

      const selectedNodes = tr.nodes();
      for (const node of selectedNodes) {
        const originalNode = node.clone();
        let originalContainer: Konva.Node | null | undefined = node.getParent();
        if (originalContainer?.getAttrs().nodeId) {
          originalContainer = stage.findOne(
            `#${originalContainer.getAttrs().nodeId}`
          );
        }
        originalNodes[node.getAttrs().id ?? ''] = originalNode;
        originalContainers[node.getAttrs().id ?? ''] = originalContainer;
      }

      e.cancelBubble = true;

      tr.forceUpdate();

      if (this.getSelectedNodes().length > 1) {
        this.instance.setMutexLock({
          nodeIds: selectedNodes.map((node) => node.id()),
          operation: 'nodes-drag',
        });
      }
    });

    const handleDragMove = (
      e: KonvaEventObject<DragEvent, Konva.Transformer>
    ) => {
      const actualPos = { x: e.target.x(), y: e.target.y() };

      e.cancelBubble = true;

      if (initialPos) {
        const moved = this.checkMovedDrag(initialPos, actualPos);
        if (moved) {
          this.getContextMenuPlugin()?.cancelLongPressTimer();
        }
      }

      const stage = this.instance.getStage();

      if (stage.isMouseWheelPressed()) {
        e.cancelBubble = true;
        e.target.stopDrag();
        return;
      }

      this.didMove = true;

      const selectedNodes = tr.nodes();
      let selectionContainsFrames = false;
      for (let i = 0; i < selectedNodes.length; i++) {
        const node = selectedNodes[i];
        selectionContainsFrames = selectionContainsFrames || hasFrames(node);
        node.updatePosition(node.getAbsolutePosition());
      }

      if (selectedNodes.length === 1) {
        originalNodes = {};
        originalContainers = {};
      }

      if (this.isSelecting() && selectedNodes.length > 1) {
        clearContainerTargets(this.instance);

        const layerToMove = containerOverCursor(this.instance, selectedNodes);

        if (this.getUsersPresencePlugin()) {
          for (const node of selectedNodes) {
            this.getUsersPresencePlugin()?.setPresence(node.id(), {
              x: node.x(),
              y: node.y(),
            });
          }
        }

        if (layerToMove && !selectionContainsFrames) {
          layerToMove.fire(WEAVE_NODE_CUSTOM_EVENTS.onTargetEnter, {
            bubbles: true,
          });
        }
      }

      tr.forceUpdate();
    };

    tr.on('dragmove', handleDragMove);

    tr.on('dragend', (e) => {
      if (!this.didMove) {
        return;
      }

      if (this.getSelectedNodes().length > 1) {
        this.instance.releaseMutexLock();
      }

      e.cancelBubble = true;

      if (tr.nodes().length > 1) {
        const nodes = tr.nodes();
        for (const node of nodes) {
          this.getNodesSelectionFeedbackPlugin()?.showSelectionHalo(node);
          this.getNodesSelectionFeedbackPlugin()?.updateSelectionHalo(node);

          this.getUsersPresencePlugin()?.removePresence(node.id());
        }
      }

      this.instance.getCloningManager().cleanupClones();

      this.getStagePanningPlugin()?.cleanupEdgeMoveIntervals();

      const selectedNodes = tr.nodes();
      let selectionContainsFrames = false;
      for (let i = 0; i < selectedNodes.length; i++) {
        const node = selectedNodes[i];
        selectionContainsFrames = selectionContainsFrames || hasFrames(node);
        node.updatePosition(node.getAbsolutePosition());
      }

      const nodes = tr.nodes();
      if (nodes.length > 1) {
        for (const node of nodes) {
          const dragStartOpacity = node.getAttr('dragStartOpacity') ?? 1;
          node.opacity(dragStartOpacity);
          node.setAttr('dragStartOpacity', undefined);
        }
      }

      if (this.isSelecting() && tr.nodes().length > 1) {
        this.instance.stateTransactional(() => {
          const actualCursor = stage.container().style.cursor;
          stage.container().style.cursor = 'wait';

          clearContainerTargets(this.instance);

          const toSelect: string[] = [];
          const toUpdate: WeaveStateElement[] = [];

          const layerToMove = containerOverCursor(this.instance, selectedNodes);

          const nodeUpdate = (node: Konva.Node) => {
            const isLockedToContainer = node.getAttrs().lockToContainer;
            // not locked
            if (!isLockedToContainer) {
              clearContainerTargets(this.instance);

              const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
                node.getAttrs().nodeType
              );

              let containerToMove: Konva.Layer | Konva.Group | undefined =
                this.instance.getMainLayer();

              if (layerToMove) {
                containerToMove = layerToMove;
              }

              let moved = false;
              if (containerToMove && !selectionContainsFrames) {
                moved = moveNodeToContainer(
                  this.instance,
                  node,
                  containerToMove,
                  originalNodes[node.getAttrs().id ?? ''],
                  originalContainers[node.getAttrs().id ?? '']
                );

                if (moved) {
                  this.instance.emitEvent<WeaveNodeChangedContainerEvent>(
                    'onNodeChangedContainer',
                    {
                      originalNode:
                        originalNodes[node.getAttrs().id ?? ''] ?? null,
                      originalContainer:
                        originalContainers[node.getAttrs().id ?? ''] ?? null,
                      newNode: node,
                      newContainer: containerToMove,
                    }
                  );
                }

                delete originalNodes[node.getAttrs().id ?? ''];
                delete originalContainers[node.getAttrs().id ?? ''];
              }

              if (containerToMove) {
                containerToMove.fire(WEAVE_NODE_CUSTOM_EVENTS.onTargetLeave, {
                  bubbles: true,
                });
              }

              if (!nodeHandler) {
                return;
              }

              toSelect.push(node.getAttrs().id ?? '');

              if (!moved) {
                toUpdate.push(
                  nodeHandler.serialize(node as WeaveElementInstance)
                );
              }
            }

            if (isLockedToContainer) {
              clearContainerTargets(this.instance);

              toSelect.push(node.getAttrs().id ?? '');

              const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
                node.getAttrs().nodeType
              );

              if (nodeHandler) {
                this.instance.updateNode(
                  nodeHandler.serialize(node as WeaveElementInstance)
                );
              }

              if (!nodeHandler) {
                return;
              }

              toSelect.push(node.getAttrs().id ?? '');

              toUpdate.push(
                nodeHandler.serialize(node as WeaveElementInstance)
              );
            }
          };

          for (let i = 0; i < selectedNodes.length; i++) {
            nodeUpdate(selectedNodes[i]);
          }

          if (toUpdate.length > 0) {
            this.instance.updateNodesNT(toUpdate);
          }

          this.instance.runPhaseHooks<{
            nodes: Konva.Node[];
          }>('onMoveNodesToContainer', (hook) => {
            hook({
              nodes: selectedNodes,
            });
          });

          stage.container().style.cursor = actualCursor;

          const finalSelectedNodes: Konva.Node[] = [];
          toSelect.forEach((nodeId) => {
            const actNode = this.instance.getStage().findOne(`#${nodeId}`);

            if (actNode) {
              finalSelectedNodes.push(actNode);
            }
          });
          tr.nodes(finalSelectedNodes);
          tr.forceUpdate();
        });
      }

      for (const node of selectedNodes) {
        node.setAttrs({ isCloned: undefined });
      }

      tr.forceUpdate();
    });

    this.instance.addEventListener('onNodesChange', () => {
      const currentSelectedNodes = tr.nodes();

      const unselectedNodes = this.prevSelectedNodes.filter(
        (node) =>
          !currentSelectedNodes
            .map((node1) => node1!.getAttrs().id)
            .includes(node.getAttrs().id)
      );

      if (currentSelectedNodes.length > 1) {
        for (const node of currentSelectedNodes) {
          node.handleSelectNode();
        }
      }

      if (currentSelectedNodes.length === 1) {
        currentSelectedNodes[0].handleDeselectNode();
      }

      for (const node of unselectedNodes) {
        node.handleDeselectNode();
      }

      this.prevSelectedNodes = tr.nodes();
    });

    this.instance.addEventListener('onUndoChange', () => {
      this.handleUndoRedoSelectionChange();
    });

    this.instance.addEventListener('onRedoChange', () => {
      this.handleUndoRedoSelectionChange();
    });

    this.tr = tr;
    this.trHover = trHover;
    this.selectionRectangle = selectionRectangle;

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

    this.instance.addEventListener('onStateChange', () => {
      this.triggerSelectedNodesEvent();
    });

    this.instance.addEventListener(
      'onNodeRemoved',
      (node: NodeSerializable) => {
        const selectedNodes = this.getSelectedNodes();
        const newSelectedNodes = selectedNodes.filter((actNode) => {
          return actNode.getAttrs().id !== node.id;
        });

        this.setSelectedNodes(newSelectedNodes);

        stage.container().tabIndex = 1;
        stage.container().focus();
        stage.container().style.cursor = 'default';
      }
    );
  }

  private handleUndoRedoSelectionChange(): void {
    const selectionLayer = this.instance.getSelectionLayer();
    const selectionFeedbackPlugin = this.getNodesSelectionFeedbackPlugin();

    if (selectionLayer && selectionFeedbackPlugin) {
      selectionLayer.find(`.selection-halo`).forEach((node) => node.destroy());
      selectionFeedbackPlugin.cleanupSelectedHalos();

      const currentSelectedNodes = this.tr.nodes();
      if (currentSelectedNodes.length > 1) {
        for (const node of currentSelectedNodes) {
          node.handleSelectNode();
        }
      }

      if (currentSelectedNodes.length === 1) {
        currentSelectedNodes[0].handleDeselectNode();
      }

      this.prevSelectedNodes = currentSelectedNodes;
    }
  }

  private getLayer() {
    const stage = this.instance.getStage();
    return stage.findOne(`#${this.getLayerName()}`) as Konva.Layer | undefined;
  }

  triggerSelectedNodesEvent(): void {
    const selectedNodes: WeaveSelection[] = this.tr.getNodes().map((node) => {
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
      usersSelectionPlugin.sendSelectionAwarenessInfo(this.tr);
    }

    this.instance.emitEvent<WeaveNodesSelectionPluginOnNodesChangeEvent>(
      'onNodesChange',
      selectedNodes
    );
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
    this.tr.nodes([]);
    this.triggerSelectedNodesEvent();
  }

  private updateSelectionRect() {
    const stage = this.instance.getStage();

    this.x2 = stage.getRelativePointerPosition()?.x ?? 0;
    this.y2 = stage.getRelativePointerPosition()?.y ?? 0;

    this.getTransformer().nodes([]);

    this.selectionRectangle.setAttrs({
      visible: true,
      x: Math.min(this.x1, this.x2),
      y: Math.min(this.y1, this.y2),
      width: Math.abs(this.x2 - this.x1),
      height: Math.abs(this.y2 - this.y1),
    });
  }

  private getSpeedFromEdge(distanceFromEdge: number): number {
    const stage = this.instance.getStage();

    const scaledDistance = distanceFromEdge / stage.scaleX();

    if (scaledDistance < this.config.panningWhenSelection.edgeThreshold) {
      const factor =
        1 - scaledDistance / this.config.panningWhenSelection.edgeThreshold; // 0..1
      return (
        this.config.panningWhenSelection.minScrollSpeed +
        (this.config.panningWhenSelection.maxScrollSpeed -
          this.config.panningWhenSelection.minScrollSpeed) *
          factor
      );
    }

    return 0;
  }

  private updatePanDirection() {
    const stage = this.instance.getStage();
    const pos = stage.getPointerPosition();
    const viewWidth = stage.width();
    const viewHeight = stage.height();

    if (!pos) return;

    const distLeft = pos.x;
    const distRight = viewWidth - pos.x;
    const distTop = pos.y;
    const distBottom = viewHeight - pos.y;

    this.panDirection.x = 0;
    this.panDirection.y = 0;
    this.panSpeed = { x: 0, y: 0 };

    if (distLeft < this.config.panningWhenSelection.edgeThreshold) {
      this.panDirection.x = 1;
      this.panSpeed.x = this.getSpeedFromEdge(distLeft);
    } else if (distRight < this.config.panningWhenSelection.edgeThreshold) {
      this.panDirection.x = -1;
      this.panSpeed.x = this.getSpeedFromEdge(distRight);
    }

    if (distTop < this.config.panningWhenSelection.edgeThreshold) {
      this.panDirection.y = 1;
      this.panSpeed.y = this.getSpeedFromEdge(distTop);
    } else if (distBottom < this.config.panningWhenSelection.edgeThreshold) {
      this.panDirection.y = -1;
      this.panSpeed.y = this.getSpeedFromEdge(distBottom);
    }
  }

  private stopPanLoop() {
    if (this.panLoopId) {
      cancelAnimationFrame(this.panLoopId);
      this.panLoopId = null;
    }
  }

  private panLoop() {
    const stage = this.instance.getStage();

    if (
      this.isAreaSelecting() &&
      (this.panDirection.x !== 0 || this.panDirection.y !== 0)
    ) {
      const scale = stage.scaleX(); // assuming uniform scaling
      const stepX = (this.panSpeed.x || 0) / scale;
      const stepY = (this.panSpeed.y || 0) / scale;

      stage.x(stage.x() + this.panDirection.x * stepX);
      stage.y(stage.y() + this.panDirection.y * stepY);

      if (this.selectionStart) {
        this.selectionStart.x += this.panDirection.x * stepX;
        this.selectionStart.y += this.panDirection.y * stepY;
      }

      this.getStageGridPlugin()?.onRender();
      this.updateSelectionRect();
    }

    if (this.isAreaSelecting()) {
      this.panLoopId = requestAnimationFrame(() => this.panLoop());
    }
  }

  private setTapStart(
    e: KonvaEventObject<PointerEvent | DragEvent, Stage | Konva.Transformer>
  ): void {
    this.tapStart = {
      x: e.evt.clientX,
      y: e.evt.clientY,
      time: performance.now(),
    };
  }

  private checkMovedDrag(
    init: Konva.Vector2d,
    actual: Konva.Vector2d
  ): boolean {
    if (!this.tapStart) {
      return false;
    }

    const dx = actual.x - init.x;
    const dy = actual.y - init.y;
    const dist = Math.hypot(dx, dy);

    const MOVED_DISTANCE = 5; // px

    if (dist <= MOVED_DISTANCE) {
      return false;
    }

    return true;
  }

  private checkMoved(
    e: KonvaEventObject<PointerEvent | DragEvent, Stage | Konva.Transformer>
  ): boolean {
    if (!this.tapStart) {
      return false;
    }

    const dx = e.evt.clientX - this.tapStart.x;
    const dy = e.evt.clientY - this.tapStart.y;
    const dist = Math.hypot(dx, dy);

    const MOVED_DISTANCE = 5; // px

    if (dist <= MOVED_DISTANCE) {
      return false;
    }

    return true;
  }

  private checkDoubleTap(e: KonvaEventObject<PointerEvent, Stage>): void {
    if (!this.tapStart) {
      return;
    }

    const now = performance.now();
    const dx = e.evt.clientX - this.tapStart.x;
    const dy = e.evt.clientY - this.tapStart.y;
    const dist = Math.hypot(dx, dy);

    const DOUBLE_TAP_DISTANCE = 10; // px
    const DOUBLE_TAP_TIME = 300; // ms

    this.isDoubleTap = false;

    if (
      this.taps >= 1 &&
      now - this.lastTapTime < DOUBLE_TAP_TIME &&
      dist < DOUBLE_TAP_DISTANCE
    ) {
      this.taps = 0;
      this.lastTapTime = 0;
      this.tapStart = { x: 0, y: 0, time: 0 };
      this.isDoubleTap = true;
    } else {
      this.setTapStart(e);
      this.taps = this.taps + 1;
      this.lastTapTime = now;
      this.isDoubleTap = false;
    }
  }

  private hideSelectorArea() {
    this.selectionRectangle.setAttrs({
      width: 0,
      height: 0,
      visible: false,
    });
  }

  private initEvents() {
    this.selecting = false;

    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        this.isSpaceKeyPressed = true;
      }
      if (
        (e.code === 'Backspace' || e.code === 'Delete') &&
        Object.keys(window.weaveTextEditing).length === 0
      ) {
        Promise.resolve().then(() => {
          this.removeSelectedNodes();
        });
        return;
      }
    });

    stage.container().addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpaceKeyPressed = false;
      }
    });

    stage.on('pointerdown', (e: KonvaEventObject<PointerEvent, Stage>) => {
      this.setTapStart(e);

      this.handledClickOrTap = false;

      this.pointers[e.evt.pointerId] = e.evt;

      if (
        e.evt.pointerType === 'touch' &&
        Object.keys(this.pointers).length > 1
      ) {
        return;
      }

      if (e.evt.pointerType === 'mouse' && e.evt.button !== 0) {
        return;
      }

      if (e.evt.pointerType === 'pen' && e.evt.pressure <= 0.05) {
        return;
      }

      if (!this.initialized) {
        return;
      }

      if (!this.active) {
        return;
      }

      if (stage.mode() !== WEAVE_STAGE_DEFAULT_MODE) {
        return;
      }

      const selectedGroup = getTargetedNode(this.instance);

      if (selectedGroup?.getParent() instanceof Konva.Transformer) {
        this.selecting = false;
        this.stopPanLoop();
        this.hideSelectorArea();
        return;
      }

      const isStage = e.target instanceof Konva.Stage;
      const isTransformer = e.target?.getParent() instanceof Konva.Transformer;
      const isTargetable = e.target.getAttrs().isTargetable !== false;
      const isContainerEmptyArea =
        typeof e.target.getAttrs().isContainerPrincipal !== 'undefined' &&
        !e.target.getAttrs().isContainerPrincipal;

      if (isTransformer) {
        return;
      }

      if (!isStage && !isContainerEmptyArea && isTargetable) {
        this.selecting = false;
        this.stopPanLoop();
        this.hideSelectorArea();
        this.handleClickOrTap(e);
        return;
      }

      this.panDirection.x = 0;
      this.panDirection.y = 0;
      this.panSpeed = { x: 0, y: 0 };

      const intStage = this.instance.getStage();

      this.x1 = intStage.getRelativePointerPosition()?.x ?? 0;
      this.y1 = intStage.getRelativePointerPosition()?.y ?? 0;
      this.x2 = intStage.getRelativePointerPosition()?.x ?? 0;
      this.y2 = intStage.getRelativePointerPosition()?.y ?? 0;

      this.selectionStart = {
        x: this.x1,
        y: this.y1,
      };

      this.selectionRectangle.strokeWidth(
        (this.config.selectionArea.strokeWidth as number) / stage.scaleX()
      );
      this.selectionRectangle.dash(
        this.config.selectionArea.dash?.map((d) => d / stage.scaleX()) ?? []
      );
      this.selectionRectangle.width(0);
      this.selectionRectangle.height(0);
      this.selecting = true;
      this.tr.nodes([]);

      this.instance.emitEvent<WeaveNodesSelectionPluginOnSelectionStateEvent>(
        'onSelectionState',
        true
      );

      this.panLoopId = requestAnimationFrame(() => this.panLoop());
    });

    const handleMouseMove = (
      e: KonvaEventObject<PointerEvent, Konva.Stage>
    ) => {
      const moved = this.checkMoved(e);

      if (e.evt.buttons === 0) {
        return;
      }

      if (
        e.evt.pointerType === 'touch' &&
        Object.keys(this.pointers).length > 1
      ) {
        return;
      }

      if (!this.initialized) {
        return;
      }

      if (!this.active) {
        return;
      }

      const contextMenuPlugin = this.getContextMenuPlugin();
      if (moved) {
        contextMenuPlugin?.cancelLongPressTimer();
      } else {
        this.hideSelectorArea();
      }

      if (contextMenuPlugin?.isContextMenuVisible()) {
        this.stopPanLoop();
      }

      if (this.isSpaceKeyPressed) {
        return;
      }

      // do nothing if we didn't start selection
      if (!this.selecting) {
        return;
      }

      this.updateSelectionRect();
      this.updatePanDirection();
    };

    stage.on('pointermove', handleMouseMove);
    this.panLoop();

    stage.on('pointerup', (e) => {
      const store = this.instance.getStore();
      const actUser = store.getUser();

      this.tr.setAttrs({
        listening: true,
      });

      this.selecting = false;
      this.stopPanLoop();

      const moved = this.checkMoved(e);
      this.checkDoubleTap(e);
      delete this.pointers[e.evt.pointerId];

      if (stage.mode() === WEAVE_STAGE_DEFAULT_MODE) {
        this.getNodesEdgeSnappingPlugin()?.cleanupGuidelines();
        this.getNodesDistanceSnappingPlugin()?.cleanupGuidelines();
      }

      const contextMenuPlugin = this.getContextMenuPlugin();

      if (!this.initialized) {
        this.hideSelectorArea();
        return;
      }

      if (!this.active) {
        this.hideSelectorArea();
        return;
      }

      this.instance.emitEvent<WeaveNodesSelectionPluginOnSelectionStateEvent>(
        'onSelectionState',
        false
      );

      if (this.isDoubleTap) {
        this.taps = 0;
        this.lastTapTime = 0;
        this.tapStart = { x: 0, y: 0, time: 0 };
        this.hideSelectorArea();
        this.handleClickOrTap(e);
        return;
      }

      const isStage = e.target instanceof Konva.Stage;
      const isContainerEmptyArea =
        typeof e.target.getAttrs().isContainerPrincipal !== 'undefined' &&
        !e.target.getAttrs().isContainerPrincipal;
      if ((isStage || isContainerEmptyArea) && !moved) {
        this.selecting = false;
        this.stopPanLoop();
        this.hideSelectorArea();
        this.getSelectionPlugin()?.setSelectedNodes([]);
        return;
      }

      if (
        e.evt.pointerType === 'touch' &&
        Object.keys(this.pointers).length + 1 > 1
      ) {
        this.hideSelectorArea();
        return;
      }

      if (contextMenuPlugin?.isContextMenuVisible()) {
        this.stopPanLoop();
      }

      const selectedGroup = getTargetedNode(this.instance);

      if (
        !moved &&
        selectedGroup?.getParent() instanceof Konva.Transformer &&
        !this.handledClickOrTap
      ) {
        this.selecting = false;
        this.stopPanLoop();
        this.hideSelectorArea();
        this.handleClickOrTap(e);
        return;
      }

      if (!this.selectionRectangle.visible()) {
        this.hideSelectorArea();
        return;
      }

      const shapes = stage.find((node: Konva.Node) => {
        return (
          ['Shape', 'Group'].includes(node.getType()) &&
          typeof node.getAttrs().id !== 'undefined'
        );
      });
      const box = this.selectionRectangle.getClientRect();
      this.selectionRectangle.visible(false);
      const selected = shapes.filter((shape) => {
        // Check if mutex lock exists and if exist don't let it select the shape
        const shapeMutex = this.instance.getNodeMutexLock(shape.id());
        if (shapeMutex && shapeMutex.user.id !== actUser.id) {
          return false;
        }

        let parent = this.instance.getInstanceRecursive(
          shape.getParent() as Konva.Node
        );

        if (parent.getAttrs().nodeId) {
          parent = this.instance
            .getStage()
            .findOne(`#${parent.getAttrs().nodeId}`) as Konva.Node;
        }

        if (
          shape.getAttrs().nodeType &&
          shape.getAttrs().nodeType === 'frame'
        ) {
          const frameBox = shape.getClientRect();
          const isContained =
            frameBox.x >= box.x &&
            frameBox.y >= box.y &&
            frameBox.x + frameBox.width <= box.x + box.width &&
            frameBox.y + frameBox.height <= box.y + box.height;
          return isContained;
        }
        if (
          shape.getAttrs().nodeType &&
          shape?.getAttrs().nodeType === 'group' &&
          ['layer', 'frame'].includes(parent?.getAttrs().nodeType)
        ) {
          return (
            shape.getAttrs().nodeType &&
            Konva.Util.haveIntersection(box, shape.getClientRect())
          );
        }
        if (
          shape.getAttrs().nodeType &&
          shape.getAttrs().nodeType !== 'group' &&
          ['layer', 'frame'].includes(parent?.getAttrs().nodeType)
        ) {
          return (
            shape.getAttrs().nodeType &&
            Konva.Util.haveIntersection(box, shape.getClientRect())
          );
        }
        return false;
      });

      const selectedNodes = new Set<Konva.Node>();
      const containerNodes = selected.filter((node) => {
        return (
          typeof node.getAttrs().isContainerPrincipal !== 'undefined' &&
          node.getAttrs().isContainerPrincipal
        );
      });

      let containerNodesIds = containerNodes.map((node) => {
        return node.getAttrs().id;
      });
      const uniqueContainerNodesIds = new Set(containerNodesIds);
      containerNodesIds = Array.from(uniqueContainerNodesIds);

      const otherNodes = selected.filter(
        (shape) =>
          typeof shape.getAttrs().isContainerPrincipal === 'undefined' ||
          (typeof shape.getAttrs().isContainerPrincipal !== 'undefined' &&
            !shape.getAttrs().isContainerPrincipal)
      );

      otherNodes.forEach((node) => {
        let parent = this.instance.getInstanceRecursive(
          node.getParent() as Konva.Node
        );

        if (parent?.getAttrs().nodeId) {
          parent = this.instance
            .getStage()
            .findOne(`#${parent.getAttrs().nodeId}`) as Konva.Node;
        }

        if (
          parent &&
          !containerNodesIds.includes(parent?.getAttrs().id) &&
          !node.getAttrs().locked
        ) {
          selectedNodes.add(node);
        }
      });

      containerNodes.forEach((node: Konva.Node) => {
        const frameNode: Konva.Group = node as Konva.Group;
        if (!frameNode.getAttrs().locked) {
          selectedNodes.add(node);
        }
      });

      this.selecting = false;
      this.stopPanLoop();

      this.tr.nodes([...selectedNodes]);

      this.handleBehaviors();
      this.handleMultipleSelectionBehavior();

      if (this.tr.nodes().length > 0) {
        stage.container().tabIndex = 1;
        stage.container().focus();
      }

      this.triggerSelectedNodesEvent();
    });

    this.instance.addEventListener('onStateChange', () => {
      this.syncSelection();
    });

    this.instance.addEventListener('onUndoManagerStatusChange', () => {
      this.syncSelection();
    });
  }

  private handleMultipleSelectionBehavior() {
    if (
      this.tr.nodes().length > 1 &&
      this.config.behaviors?.onMultipleSelection
    ) {
      const selectionBehavior = this.config.behaviors?.onMultipleSelection?.(
        this.tr.nodes()
      );
      this.tr.setAttrs(selectionBehavior);
    }
  }

  protected syncSelection(): void {
    const newSelectedNodes = [];

    const actualSelectedNodes = this.tr.nodes();
    for (const node of actualSelectedNodes) {
      const existNode = this.instance
        .getStage()
        .findOne(`#${node.getAttrs().id}`);
      if (existNode) {
        newSelectedNodes.push(existNode);
      }
    }

    this.tr.nodes([...newSelectedNodes]);
    this.tr.forceUpdate();

    this.triggerSelectedNodesEvent();
  }

  protected getSelectionPlugin(): WeaveNodesSelectionPlugin | undefined {
    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    return selectionPlugin;
  }

  protected hideHoverState(): void {
    const selectionPlugin = this.getSelectionPlugin();

    if (!selectionPlugin) {
      return;
    }

    selectionPlugin.getHoverTransformer().nodes([]);
  }

  handleClickOrTap(e: KonvaEventObject<PointerEvent, Stage>): void {
    const stage = this.instance.getStage();

    this.handledClickOrTap = true;

    e.cancelBubble = true;

    if (!this.enabled) {
      return;
    }

    if (this.instance.getActiveAction() !== SELECTION_TOOL_ACTION_NAME) {
      return;
    }

    const contextMenuPlugin = this.getContextMenuPlugin();

    if (contextMenuPlugin?.isContextMenuVisible()) {
      this.stopPanLoop();
    }

    this.hideHoverState();

    const selectedGroup = getTargetedNode(this.instance);

    if (!this.initialized) {
      return;
    }

    if (e.evt.pointerType === 'mouse' && e.evt.button && e.evt.button !== 0) {
      return;
    }

    let areNodesSelected = false;

    let nodeTargeted =
      selectedGroup && !(selectedGroup.getAttrs().active ?? false)
        ? selectedGroup
        : e.target;

    // Check if clicked on transformer
    if (nodeTargeted.getParent() instanceof Konva.Transformer) {
      const mousePos = stage.getPointerPosition();
      const intersections = stage.getAllIntersections(mousePos);
      const nodesIntersected = intersections.filter(
        (ele) => ele.getAttrs().nodeType
      );

      let targetNode = null;
      if (nodesIntersected.length > 0) {
        targetNode = this.instance.getInstanceRecursive(
          nodesIntersected[nodesIntersected.length - 1]
        );
      }

      if (targetNode && targetNode.getAttrs().nodeType) {
        nodeTargeted = targetNode;
      }
    }

    if (!nodeTargeted.getAttrs().nodeType) {
      return;
    }

    // do we pressed shift or ctrl?
    const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
    const nodeSelectedIndex = this.tr.nodes().findIndex((node) => {
      return node.getAttrs().id === nodeTargeted.getAttrs().id;
    });
    const isSelected = nodeSelectedIndex !== -1;

    const user = this.instance.getStore().getUser();
    const isLocked = nodeTargeted.getAttrs().locked ?? false;
    const isMutexLocked =
      nodeTargeted.getAttrs().mutexLocked &&
      nodeTargeted.getAttrs().mutexUserId !== user.id;

    if (isLocked || isMutexLocked) {
      return;
    }

    if (nodeTargeted.getAttrs().nodeId) {
      const realNode = stage.findOne(`#${nodeTargeted.getAttrs().nodeId}`);

      if (realNode) {
        nodeTargeted = realNode;
      }
    }

    if (
      typeof nodeTargeted.getAttrs().isContainerPrincipal !== 'undefined' &&
      !nodeTargeted.getAttrs().isContainerPrincipal
    ) {
      return;
    }

    if (this.isDoubleTap && !metaPressed) {
      this.isDoubleTap = false;
      nodeTargeted.dblClick();
      return;
    }

    if (!metaPressed) {
      // if no key pressed and the node is not selected
      // select just one
      this.tr.nodes([nodeTargeted]);
      this.tr.show();
      areNodesSelected = true;
    }
    if (metaPressed && isSelected) {
      // if we pressed keys and node was selected
      // we need to remove it from selection:
      const nodes = this.tr.nodes().slice(); // use slice to have new copy of array
      // remove node from array
      nodes.splice(nodes.indexOf(nodeTargeted), 1);
      this.tr.nodes(nodes);
      areNodesSelected = true;
    }
    if (metaPressed && !isSelected) {
      // add the node into selection
      const nodes = this.tr.nodes().concat([nodeTargeted]);
      this.tr.nodes(nodes);
      areNodesSelected = true;
    }

    this.handleBehaviors();
    this.handleMultipleSelectionBehavior();

    if (areNodesSelected) {
      stage.container().tabIndex = 1;
      stage.container().focus();
      stage.container().style.cursor = 'grab';
    }

    this.triggerSelectedNodesEvent();
  }

  getTransformer(): Konva.Transformer {
    return this.tr;
  }

  getHoverTransformer(): Konva.Transformer {
    return this.trHover;
  }

  handleBehaviors(): void {
    const nodes = this.getSelectedNodes();
    const nodesSelected = nodes.length;

    if (
      (nodesSelected > 1 && !this.config.behaviors.multipleSelection.enabled) ||
      (nodesSelected === 1 && !this.config.behaviors.singleSelection.enabled)
    ) {
      this.tr.enabledAnchors([]);
    }
    if (
      (nodesSelected > 1 && this.config.behaviors.multipleSelection.enabled) ||
      (nodesSelected === 1 && this.config.behaviors.singleSelection.enabled)
    ) {
      this.tr.enabledAnchors(this.defaultEnabledAnchors);
    }

    let transformerAttrs: TransformerConfig = { ...this.config.selection };

    if (this.tr && this.tr.nodes().length > 0) {
      const currentAttrs = this.tr.getAttrs();
      Object.keys(currentAttrs).forEach((key) => {
        if (['rotationSnaps', 'enabledAnchors'].includes(key)) {
          this.tr.setAttr(key, []);
        } else {
          this.tr.setAttr(key, undefined);
        }
      });
    }

    if (nodesSelected === 1) {
      transformerAttrs = mergeExceptArrays(
        transformerAttrs,
        nodes[0].getTransformerProperties()
      );
      transformerAttrs.enabledAnchors = nodes[0].allowedAnchors();
    }
    if (nodesSelected > 1) {
      const anchorsArrays = [];
      for (const node of nodes) {
        anchorsArrays.push(node.allowedAnchors());
      }

      transformerAttrs.enabledAnchors = intersectArrays(anchorsArrays);
    }

    if (this.tr && this.tr.nodes().length > 0) {
      this.tr.setAttrs(transformerAttrs);
      this.tr.forceUpdate();
    }
  }

  setSelectedNodes(nodes: Konva.Node[]): void {
    this.tr.setNodes(nodes);

    this.handleBehaviors();

    this.triggerSelectedNodesEvent();
  }

  getSelectedNodes() {
    if (!this.tr) {
      return [];
    }

    return this.tr.nodes() as (Konva.Group | Konva.Shape)[];
  }

  getSelectedNodesExtended(): WeaveSelection[] {
    const selectedNodes: WeaveSelection[] = this.tr.getNodes().map((node) => {
      const nodeType = node.getAttr('nodeType');
      const nodeHandler = this.instance.getNodeHandler<WeaveNode>(nodeType);
      return {
        instance: node as Konva.Shape | Konva.Group,
        node: nodeHandler?.serialize(node as Konva.Shape | Konva.Group),
      };
    });

    return selectedNodes;
  }

  selectAll(): void {
    const mainLayer = this.instance.getMainLayer();
    if (mainLayer) {
      const nodes = mainLayer.getChildren();
      this.tr.nodes(nodes);
    }
  }

  selectNone(): void {
    this.tr.nodes([]);
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
    const selectionFeedbackPlugin =
      this.instance.getPlugin<WeaveNodesMultiSelectionFeedbackPlugin>(
        WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY
      );
    return selectionFeedbackPlugin;
  }

  getContextMenuPlugin() {
    const contextMenuPlugin = this.instance.getPlugin<WeaveContextMenuPlugin>(
      WEAVE_CONTEXT_MENU_PLUGIN_KEY
    );
    return contextMenuPlugin;
  }

  getStageGridPlugin() {
    const gridPlugin = this.instance.getPlugin<WeaveStageGridPlugin>(
      WEAVE_STAGE_GRID_PLUGIN_KEY
    );
    return gridPlugin;
  }

  getNodesEdgeSnappingPlugin() {
    const snappingPlugin =
      this.instance.getPlugin<WeaveNodesEdgeSnappingPlugin>(
        WEAVE_NODES_EDGE_SNAPPING_PLUGIN_KEY
      );
    return snappingPlugin;
  }

  getNodesDistanceSnappingPlugin() {
    const snappingPlugin =
      this.instance.getPlugin<WeaveNodesDistanceSnappingPlugin>(
        WEAVE_NODES_DISTANCE_SNAPPING_PLUGIN_KEY
      );
    return snappingPlugin;
  }

  getStagePanningPlugin() {
    const stagePanning = this.instance.getPlugin<WeaveStagePanningPlugin>(
      WEAVE_STAGE_PANNING_KEY
    );
    return stagePanning;
  }

  getUsersPresencePlugin() {
    const usersPresencePlugin =
      this.instance.getPlugin<WeaveUsersPresencePlugin>(
        WEAVE_USERS_PRESENCE_PLUGIN_KEY
      );
    return usersPresencePlugin;
  }

  getSelectorConfig(): TransformerConfig {
    return this.config.selection;
  }

  getDragOpacity(): number {
    return this.config.style.dragOpacity;
  }
}
