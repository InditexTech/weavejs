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
} from './events';

export class WeaveNodesSelectionPlugin extends WeavePlugin implements SelectionContext {
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
  private transformInProcess: boolean = false;
  private serializedSelectedNodes: WeaveSelection[] = [];

  onRender: undefined;

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
    this.dragInProcess = false;
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
      ignoreStroke: true,
      rotateEnabled: false,
      resizeEnabled: false,
      enabledAnchors: [],
      listening: false,
    });
    selectionLayer?.add(trHover);

    const handlePointerMoveInit = () => {
      if (this.dragInProcess) {
        return;
      }

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
    };

    stage.on(
      'pointermove',
      throttle(handlePointerMoveInit, DEFAULT_THROTTLE_MS)
    );

    tr.on('transformstart', (e) => {
      this.transformInProcess = true;

      this.triggerSelectedNodesEvent();

      const selectedNodes = tr.nodes();

      for (const node of selectedNodes) {
        node.handleMouseout(e);
      }

      if (this.getSelectedNodes().length > 1) {
        this.instance.setMutexLock({
          nodeIds: selectedNodes.map((node) => node.id()),
          operation: 'nodes-transform',
        });
      }

      this.instance.getHooks().callHook('weave:onTransformerTransformStart', {
        e,
        nodes: selectedNodes,
      });
    });

    let nodeHovered: Konva.Node | undefined = undefined;

    tr.on('mousemove', (e) => {
      if (this.dragInProcess) {
        return;
      }

      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      this.disable();
      const shape = stage.getIntersection(pointerPos);
      this.enable();

      if (shape) {
        const targetNode = this.instance.getInstanceRecursive(shape);
        if (targetNode && targetNode !== nodeHovered) {
          this.instance.getStage().handleMouseover(e);
          nodeHovered?.handleMouseout?.(e);
          targetNode?.handleMouseover?.(e);
          nodeHovered = targetNode as Konva.Node | undefined;
        }
        targetNode?.handleMouseover?.(e);
      } else {
        nodeHovered?.handleMouseout?.(e);
      }
    });

    tr.on('mouseover', () => {
      const nodesSelected = tr.nodes();

      if (nodesSelected.length > 1) {
        stage.container().style.cursor = 'grab';
      }
    });

    tr.on('mouseout', (e) => {
      this.instance.getStage().handleMouseover?.(e);
      nodeHovered = undefined;
    });

    window.addEventListener(
      'mouseout',
      (e) => {
        if (nodeHovered) {
          nodeHovered.handleMouseout?.(e);
          nodeHovered = undefined;
        }
        this.instance.getStage().handleMouseover?.(e);
      },
      { signal: this.instance.getEventsController()?.signal }
    );

    const handleTransform = (e: KonvaEventObject<PointerEvent>) => {
      const moved = this.checkMoved(e);
      if (moved) {
        this.getContextMenuPlugin()?.cancelLongPressTimer();
      }

      this.triggerSelectedNodesEvent();

      this.instance.getHooks().callHook('weave:onTransformerTransform', {
        e,
        nodes: selectedNodes,
      });

      if (this.getUsersPresencePlugin()) {
        for (const node of tr.nodes()) {
          let parentId: string = node.getParent()?.id() ?? '';
          const parent = node.getParent();
          if (parent?.getAttrs().nodeId) {
            parentId = parent.getAttrs().nodeId;
          }

          this.getUsersPresencePlugin()?.setPresence(
            node.id(),
            parentId,
            {
              x: node.x(),
              y: node.y(),
              width: node.width(),
              height: node.height(),
              scaleX: node.scaleX(),
              scaleY: node.scaleY(),
              rotation: node.rotation(),
              strokeScaleEnabled: false,
            },
            false
          );
        }
        this.getUsersPresencePlugin()?.forceSendPresence();
      }
    };

    tr.on('transform', throttle(handleTransform, DEFAULT_THROTTLE_MS));

    tr.on('transformend', (e) => {
      this.transformInProcess = false;

      if (this.getSelectedNodes().length > 1) {
        this.instance.releaseMutexLock();
      }

      const selectedNodes = tr.nodes();

      for (const node of selectedNodes) {
        node.handleDeselectNode();
        node.handleSelectNode();
      }

      tr.forceUpdate();

      this.triggerSelectedNodesEvent();

      this.instance.getHooks().callHook('weave:onTransformerTransformEnd', {
        e,
        nodes: selectedNodes,
      });
    });

    let initialPos: Konva.Vector2d | null = null;
    let originalNodes: Record<string, Konva.Node | null | undefined> = {};
    let originalContainers: Record<string, Konva.Node | null | undefined> = {};
    let selectedNodes: Konva.Node[] = [];

    tr.on('dragstart', (e) => {
      this.dragInProcess = true;

      if (!e?.evt) return;

      let isWheelMousePressed = false;
      if (e.evt?.button === 1) {
        isWheelMousePressed = true;
      }

      const mainLayer = this.instance.getMainLayer();

      if (!mainLayer) {
        return;
      }

      initialPos = { x: e.target.x(), y: e.target.y() };

      this.didMove = false;

      const stage = this.instance.getStage();

      this.saveDragSelectedNodes();
      this.setNodesOpacityOnDrag();

      selectedNodes = tr.nodes();

      if (isWheelMousePressed) {
        e.cancelBubble = true;
        e.target.stopDrag();
        return;
      }

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

      this.instance
        .getHooks()
        .callHook('weave:onTransformerDragStart', { e, nodes: selectedNodes });

      tr.forceUpdate();

      if (selectedNodes.length > 1) {
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

      let isWheelMousePressed = false;
      if (e.evt?.button === 1) {
        isWheelMousePressed = true;
      }

      e.cancelBubble = true;

      this.instance
        .getHooks()
        .callHook('weave:onTransformerDragMove', { e, nodes: selectedNodes });

      if (initialPos) {
        const moved = this.checkMovedDrag(initialPos, actualPos);
        if (moved) {
          this.getContextMenuPlugin()?.cancelLongPressTimer();
        }
      }

      if (isWheelMousePressed) {
        e.cancelBubble = true;
        e.target.stopDrag();
        return;
      }

      this.didMove = true;

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

        if (this.getUsersPresencePlugin() && this.dragInProcess) {
          for (const node of selectedNodes) {
            let parentId: string = node.getParent()?.id() ?? '';
            const parent = node.getParent();
            if (parent?.getAttrs().nodeId) {
              parentId = parent.getAttrs().nodeId;
            }

            this.getUsersPresencePlugin()?.setPresence(
              node.id(),
              parentId,
              {
                x: node.x(),
                y: node.y(),
              },
              false
            );
          }
          this.getUsersPresencePlugin()?.forceSendPresence();
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
      this.dragInProcess = false;

      const mainLayer = this.instance.getMainLayer();

      if (!mainLayer) {
        return;
      }

      this.instance.getSelectionLayer()?.hitGraphEnabled(true);
      this.instance.getMainLayer()?.hitGraphEnabled(true);

      if (!this.didMove) {
        return;
      }

      if (selectedNodes.length > 1) {
        this.instance.releaseMutexLock();
      }

      e.cancelBubble = true;

      this.instance
        .getHooks()
        .callHook('weave:onTransformerDragEnd', { e, nodes: selectedNodes });

      this.instance.getCloningManager().cleanupClones();

      this.getStagePanningPlugin()?.cleanupEdgeMoveIntervals();

      let selectionContainsFrames = false;
      for (let i = 0; i < selectedNodes.length; i++) {
        const node = selectedNodes[i];
        selectionContainsFrames = selectionContainsFrames || hasFrames(node);
        node.updatePosition(node.getAbsolutePosition());
      }

      if (this.isSelecting() && selectedNodes.length > 1) {
        const toSelect: string[] = [];
        const toUpdate: WeaveStateElement[] = [];

        this.instance.stateTransactional(() => {
          const actualCursor = stage.container().style.cursor;
          stage.container().style.cursor = 'wait';

          clearContainerTargets(this.instance);

          const layerToMove = containerOverCursor(this.instance, selectedNodes);

          const nodeUpdate = (node: Konva.Node) => {
            const isLockedToContainer = node.getAttrs().lockToContainer;

            let moved = false;

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

              if (containerToMove && !selectionContainsFrames) {
                moved = moveNodeToContainerNT(
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

                toSelect.push(node.getAttrs().id ?? '');

                delete originalNodes[node.getAttrs().id ?? ''];
                delete originalContainers[node.getAttrs().id ?? ''];
              } else {
                if (node.getAttrs().nodeId) {
                  toSelect.push(node.getAttrs().nodeId ?? '');
                } else {
                  toSelect.push(node.getAttrs().id ?? '');
                }
              }

              if (containerToMove) {
                containerToMove.fire(WEAVE_NODE_CUSTOM_EVENTS.onTargetLeave, {
                  bubbles: true,
                });
              }

              if (!nodeHandler) {
                return;
              }

              if (!moved) {
                toUpdate.push(
                  nodeHandler.serialize(node as WeaveElementInstance)
                );
              }
            }

            if (isLockedToContainer) {
              clearContainerTargets(this.instance);

              const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
                node.getAttrs().nodeType
              );

              if (!nodeHandler) {
                return;
              }

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
        });

        for (const node of selectedNodes) {
          node.setAttrs({ isCloned: undefined });
        }

        const finalSelectedNodes: Konva.Node[] = [];
        for (const nodeId of toSelect) {
          const actNode = this.instance.getStage().findOne(`#${nodeId}`);

          if (actNode) {
            finalSelectedNodes.push(actNode);
            actNode.handleDeselectNode();
            actNode.handleSelectNode();
          }
        }

        this.setSelectedNodes(finalSelectedNodes);
        tr.forceUpdate();
      }
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
        currentSelectedNodes[0]?.handleDeselectNode?.();
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
    this.serializeSelectedNodes();
    this.triggerSelectionAwarenessEvent();
    this.triggerOnNodesChangeEvent();
  }

  serializeSelectedNodes() {
    const selectedNodes: WeaveSelection[] = this.tr.getNodes().map((node) => {
      const nodeType = node.getAttr('nodeType');
      const nodeHandler = this.instance.getNodeHandler<WeaveNode>(nodeType);
      return {
        instance: node as Konva.Shape | Konva.Group,
        node: nodeHandler?.serialize(node as Konva.Shape | Konva.Group),
      };
    });
    this.serializedSelectedNodes = selectedNodes;
  }

  triggerSelectionAwarenessEvent(): void {
    const usersSelectionPlugin =
      this.instance.getPlugin<WeaveUsersSelectionPlugin>(
        WEAVE_USERS_SELECTION_KEY
      );

    if (usersSelectionPlugin) {
      requestAnimationFrame(() => {
        usersSelectionPlugin.sendSelectionAwarenessInfo(this.tr);
      });
    }
  }

  triggerOnNodesChangeEvent(): void {
    requestAnimationFrame(() => {
      this.instance.emitEvent<WeaveNodesSelectionPluginOnNodesChangeEvent>(
        'onNodesChange',
        this.serializedSelectedNodes
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

  private updateSelectionRect() {
    const stage = this.instance.getStage();

    this.x2 = stage.getRelativePointerPosition()?.x ?? 0;
    this.y2 = stage.getRelativePointerPosition()?.y ?? 0;

    this.selectNone();

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
    this.taps = this.taps + 1;

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

  private checkMoved(e: KonvaEventObject<PointerEvent | DragEvent>): boolean {
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
    if (!this.previousTap) {
      return;
    }

    const now = performance.now();

    const dx = e.evt.clientX - this.previousTap.x;
    const dy = e.evt.clientY - this.previousTap.y;
    const dist = Math.hypot(dx, dy);

    const DOUBLE_TAP_DISTANCE = 10; // px
    const DOUBLE_TAP_TIME = 300; // ms

    if (this.tapTimeoutId) {
      clearTimeout(this.tapTimeoutId);
    }

    this.tapTimeoutId = setTimeout(() => {
      this.taps = 0;
    }, DOUBLE_TAP_TIME + 5);

    if (
      this.taps > 1 &&
      now - this.previousTap.time < DOUBLE_TAP_TIME &&
      dist < DOUBLE_TAP_DISTANCE
    ) {
      this.taps = 0;
      this.tapStart = null;
      this.isDoubleTap = true;
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

    stage.container().addEventListener(
      'keydown',
      (e) => {
        if (e.code === 'Space') {
          this.isSpaceKeyPressed = true;
        }
        if (e.code === 'Backspace' || e.code === 'Delete') {
          Promise.resolve().then(() => {
            this.removeSelectedNodes();
          });
          return;
        }
      },
      { signal: this.instance.getEventsController()?.signal }
    );

    stage.container().addEventListener(
      'keyup',
      (e) => {
        if (e.code === 'Space') {
          this.isSpaceKeyPressed = false;
        }
      },
      { signal: this.instance.getEventsController()?.signal }
    );

    stage.on('pointerdown', (e: KonvaEventObject<PointerEvent, Stage>) => {
      this.setTapStart(e);

      if (e.target.getClassName().includes('custom-snap-guide')) {
        return;
      }

      this.handledClickOrTap = false;

      this.pointers[e.evt.pointerId] = e.evt;

      if (
        e.evt.pointerType === 'touch' &&
        Object.keys(this.pointers).length > 1
      ) {
        return;
      }

      if (e.evt.pointerType === 'mouse' && e.evt?.button !== 0) {
        return;
      }

      if (e.evt.pointerType === 'pen' && e.evt?.pressure <= 0.05) {
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
      const canBeTargeted = e.target.getAttrs().canBeTargeted !== false;
      const isContainerEmptyArea =
        e.target.getAttrs().isContainerPrincipal !== undefined &&
        !e.target.getAttrs().isContainerPrincipal;

      if (isTransformer) {
        return;
      }

      if (!isStage && !isContainerEmptyArea && canBeTargeted) {
        this.selecting = false;
        this.stopPanLoop();
        this.hideSelectorArea();
        this.handleClickOrTap(e);
        return;
      }

      if (isStage || isContainerEmptyArea) {
        this.setSelectedNodes([]);
        this.serializeSelectedNodes();
        this.triggerOnNodesChangeEvent();
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

      const isCtrlOrMetaPressed = e.evt.ctrlKey || e.evt.metaKey;
      if (isCtrlOrMetaPressed) {
        const nodesSelected = this.tr.nodes();
        for (const node of nodesSelected) {
          node.fire('onSelectionCleared', { bubbles: true });
        }
      }

      this.selectNone();

      this.instance.emitEvent<WeaveNodesSelectionPluginOnSelectionStateEvent>(
        'onSelectionState',
        true
      );

      this.panLoopId = requestAnimationFrame(() => this.panLoop());
    });

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
    this.areaSelector.init(selectionLayer, this.config.selectionArea, stage.scaleX());

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
      getNodesSelectionFeedbackPlugin: () => this.getNodesSelectionFeedbackPlugin(),
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

  private getLayer() {
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
      this.instance.getPlugin<WeaveUsersSelectionPlugin>(WEAVE_USERS_SELECTION_KEY);

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
    this.instance.getHooks().callHook('weave:onNodesRemoved', mappedSelectedNodes);
    this.selectNone();
    this.triggerSelectedNodesEvent();
  }

  private initEvents() {
    this.selecting = false;
    const stage = this.instance.getStage();

    registerKeyboardHandlers(this);

    stage.on('pointerdown', (e) => handlePointerDown(this, e));

    stage.on('pointermove', throttle((e) => handlePointerMove(this, e), DEFAULT_THROTTLE_MS));

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
      const selectionBehavior = this.config.behaviors.onMultipleSelection(tr.nodes());
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
      this.instance.getPlugin<WeaveUsersSelectionPlugin>(WEAVE_USERS_SELECTION_KEY);

    if (usersSelectionPlugin) {
      requestAnimationFrame(() => {
        usersSelectionPlugin.sendSelectionAwarenessInfo(tr);
      });
    }
  }

  getSelectedNodes() {
    if (!this.transformerCtrl) return [];
    return this.transformerCtrl.getTransformer().nodes() as (Konva.Group | Konva.Shape)[];
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
