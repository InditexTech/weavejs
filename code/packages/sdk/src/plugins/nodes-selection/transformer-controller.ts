// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { Stage } from 'konva/lib/Stage';
import type { KonvaEventObject } from 'konva/lib/Node';
import throttle from 'lodash/throttle';
import {
  type WeaveStateElement,
  WEAVE_NODE_CUSTOM_EVENTS,
} from '@inditextech/weave-types';
import type { Weave } from '@/weave';
import type { WeaveNode } from '@/nodes/node';
import type { WeaveElementInstance } from '@inditextech/weave-types';
import type { WeaveNodeChangedContainerEvent } from '@/nodes/types';
import {
  clearContainerTargets,
  containerOverCursor,
  hasFrames,
  moveNodeToContainerNT,
} from '@/utils/utils';
import { DEFAULT_THROTTLE_MS } from '@/constants';
import type { WeaveNodesSelectionConfig } from './types';
import type { GestureDetector } from './gesture-detector';
import type { WeaveContextMenuPlugin } from '../context-menu/context-menu';
import type { WeaveStagePanningPlugin } from '../stage-panning/stage-panning';
import type { WeaveUsersPresencePlugin } from '../users-presence/users-presence';
import type { WeaveNodesMultiSelectionFeedbackPlugin } from '../nodes-multi-selection-feedback/nodes-multi-selection-feedback';

export interface TransformerCallbacks {
  isSelecting(): boolean;
  setSelectedNodes(nodes: Konva.Node[]): void;
  triggerSelectedNodesEvent(): void;
  saveDragSelectedNodes(): void;
  setNodesOpacityOnDrag(): void;
  /** Called when the plugin layer should be temporarily hidden (during hover hit-test). */
  disablePlugin(): void;
  /** Called to restore plugin layer after a temporary hide. */
  enablePlugin(): void;
  getContextMenuPlugin(): WeaveContextMenuPlugin | undefined;
  getUsersPresencePlugin(): WeaveUsersPresencePlugin | undefined;
  getStagePanningPlugin(): WeaveStagePanningPlugin | undefined;
  getNodesSelectionFeedbackPlugin():
    | WeaveNodesMultiSelectionFeedbackPlugin
    | undefined;
}

/**
 * Creates and owns both Konva.Transformer instances (selection + hover) and
 * registers all transformer-level event handlers. Business-logic callbacks are
 * injected to keep this class decoupled from WeaveNodesSelectionPlugin internals.
 */
export class TransformerController {
  private readonly instance: Weave;
  private readonly config: WeaveNodesSelectionConfig;
  private readonly gesture: GestureDetector;
  private readonly callbacks: TransformerCallbacks;

  private tr!: Konva.Transformer;
  private trHover!: Konva.Transformer;

  private dragInProcess = false;
  private transformInProcess = false;
  private didMove = false;

  private initialPos: Konva.Vector2d | null = null;
  private originalNodes: Record<string, Konva.Node | null | undefined> = {};
  private originalContainers: Record<string, Konva.Node | null | undefined> =
    {};
  private currentDragSelectedNodes: Konva.Node[] = [];

  /** Mirrors the previous transformer node list for undo/redo handling. */
  private prevSelectedNodes: Konva.Node[] = [];

  constructor(
    instance: Weave,
    config: WeaveNodesSelectionConfig,
    gesture: GestureDetector,
    callbacks: TransformerCallbacks
  ) {
    this.instance = instance;
    this.config = config;
    this.gesture = gesture;
    this.callbacks = callbacks;
  }

  /** Create transformers, add to layer, and register all events. Must be called once during onInit. */
  setup(layer: Konva.Layer): void {
    this.tr = new Konva.Transformer({
      id: 'selectionTransformer',
      ...this.config.selection,
      listening: true,
      shouldOverdrawWholeArea: true,
    });
    layer.add(this.tr);

    this.trHover = new Konva.Transformer({
      id: 'hoverTransformer',
      ...this.config.hover,
      ignoreStroke: true,
      rotateEnabled: false,
      resizeEnabled: false,
      enabledAnchors: [],
      listening: false,
    });
    layer.add(this.trHover);

    this.registerStagePointerMove();
    this.registerTransformerEvents();
    this.registerInstanceEvents();
  }

  getTransformer(): Konva.Transformer {
    return this.tr;
  }

  getHoverTransformer(): Konva.Transformer {
    return this.trHover;
  }

  isDragging(): boolean {
    return this.dragInProcess;
  }

  isTransforming(): boolean {
    return this.transformInProcess;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getStage(): Konva.Stage {
    return this.instance.getStage() as unknown as Konva.Stage;
  }

  // ---------------------------------------------------------------------------
  // Stage-level pointermove (manages transformer listening for container nodes)
  // ---------------------------------------------------------------------------

  private registerStagePointerMove(): void {
    const stage = this.getStage();

    const handlePointerMoveInit = () => {
      if (this.dragInProcess) return;

      if (
        this.tr.nodes().length === 1 &&
        this.tr.nodes()[0].getAttrs().isContainerPrincipal
      ) {
        const pos = stage.getPointerPosition();
        if (!pos) return;

        const shapeUnder = stage.getIntersection(pos);

        if (!shapeUnder) {
          this.tr.setAttrs({ listening: true });
          this.tr.forceUpdate();
        }
        if (
          shapeUnder &&
          this.tr.getChildren().includes(shapeUnder) &&
          shapeUnder.name() === 'back'
        ) {
          this.tr.setAttrs({ listening: false });
          this.tr.forceUpdate();
        }
        if (
          shapeUnder &&
          (this.tr.nodes()[0] as Konva.Group).getChildren().includes(shapeUnder)
        ) {
          this.tr.setAttrs({ listening: false });
          this.tr.forceUpdate();
        }
        if (
          shapeUnder &&
          !this.tr.getChildren().includes(shapeUnder) &&
          (this.tr.nodes()[0] as Konva.Group).getChildren().includes(shapeUnder)
        ) {
          this.tr.setAttrs({ listening: true });
          this.tr.forceUpdate();
        }
      }
    };

    (
      stage as unknown as Stage & {
        on: (event: string, handler: () => void) => void;
      }
    ).on('pointermove', throttle(handlePointerMoveInit, DEFAULT_THROTTLE_MS));
  }

  // ---------------------------------------------------------------------------
  // Transformer events
  // ---------------------------------------------------------------------------

  private registerTransformerEvents(): void {
    const stage = this.getStage();
    let nodeHovered: Konva.Node | undefined = undefined;

    // transform ----------------------------------------------------------------

    this.tr.on('transformstart', (e) => {
      this.transformInProcess = true;
      this.callbacks.triggerSelectedNodesEvent();

      const selectedNodes = this.tr.nodes();
      for (const node of selectedNodes) {
        node.handleMouseout(e);
      }

      if (selectedNodes.length > 1) {
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

    const handleTransform = (
      e: KonvaEventObject<PointerEvent, Konva.Transformer>
    ) => {
      const moved = this.gesture.checkMoved(e.evt.clientX, e.evt.clientY);
      if (moved) {
        this.callbacks.getContextMenuPlugin()?.cancelLongPressTimer();
      }

      this.callbacks.triggerSelectedNodesEvent();

      const selectedNodes = this.tr.nodes();
      this.instance.getHooks().callHook('weave:onTransformerTransform', {
        e,
        nodes: selectedNodes,
      });

      const usersPresence = this.callbacks.getUsersPresencePlugin();
      if (usersPresence) {
        for (const node of this.tr.nodes()) {
          let parentId: string = node.getParent()?.id() ?? '';
          const parent = node.getParent();
          if (parent?.getAttrs().nodeId) {
            parentId = parent.getAttrs().nodeId;
          }
          usersPresence.setPresence(
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
        usersPresence.forceSendPresence();
      }
    };

    this.tr.on('transform', throttle(handleTransform, DEFAULT_THROTTLE_MS));

    this.tr.on('transformend', (e) => {
      this.transformInProcess = false;

      const selectedNodes = this.tr.nodes();
      if (selectedNodes.length > 1) {
        this.instance.releaseMutexLock();
      }

      for (const node of selectedNodes) {
        node.handleDeselectNode();
        node.handleSelectNode();
      }

      this.tr.forceUpdate();
      this.callbacks.triggerSelectedNodesEvent();

      this.instance.getHooks().callHook('weave:onTransformerTransformEnd', {
        e,
        nodes: selectedNodes,
      });
    });

    // hover --------------------------------------------------------------------

    this.tr.on('mousemove', (e) => {
      if (this.dragInProcess) return;

      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      this.callbacks.disablePlugin();
      const shape = stage.getIntersection(pointerPos);
      this.callbacks.enablePlugin();

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

    this.tr.on('mouseover', () => {
      const nodesSelected = this.tr.nodes();
      if (nodesSelected.length > 1) {
        stage.container().style.cursor = 'grab';
      }
    });

    this.tr.on('mouseout', (e) => {
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
      { signal: this.instance.getEventsController().signal }
    );

    // drag ---------------------------------------------------------------------

    this.tr.on('dragstart', (e) => {
      this.dragInProcess = true;
      if (!e?.evt) return;

      const isWheelMousePressed = e.evt?.button === 1;

      const mainLayer = this.instance.getMainLayer();
      if (!mainLayer) return;

      this.initialPos = { x: e.target.x(), y: e.target.y() };
      this.didMove = false;

      this.callbacks.saveDragSelectedNodes();
      this.callbacks.setNodesOpacityOnDrag();

      this.currentDragSelectedNodes = this.tr.nodes();

      if (isWheelMousePressed) {
        e.cancelBubble = true;
        e.target.stopDrag();
        return;
      }

      for (const node of this.currentDragSelectedNodes) {
        const originalNode = node.clone();
        let originalContainer: Konva.Node | null | undefined = node.getParent();
        if (originalContainer?.getAttrs().nodeId) {
          originalContainer = stage.findOne(
            `#${originalContainer.getAttrs().nodeId}`
          );
        }
        this.originalNodes[node.getAttrs().id ?? ''] = originalNode;
        this.originalContainers[node.getAttrs().id ?? ''] = originalContainer;
      }

      e.cancelBubble = true;

      this.instance.getHooks().callHook('weave:onTransformerDragStart', {
        e,
        nodes: this.currentDragSelectedNodes,
      });

      this.tr.forceUpdate();

      if (this.currentDragSelectedNodes.length > 1) {
        this.instance.setMutexLock({
          nodeIds: this.currentDragSelectedNodes.map((node) => node.id()),
          operation: 'nodes-drag',
        });
      }
    });

    const handleDragMove = (
      e: KonvaEventObject<DragEvent, Konva.Transformer>
    ) => {
      const actualPos = { x: e.target.x(), y: e.target.y() };
      const isWheelMousePressed = e.evt?.button === 1;

      e.cancelBubble = true;

      this.instance.getHooks().callHook('weave:onTransformerDragMove', {
        e,
        nodes: this.currentDragSelectedNodes,
      });

      if (this.initialPos) {
        const moved = this.gesture.checkMovedDrag(this.initialPos, actualPos);
        if (moved) {
          this.callbacks.getContextMenuPlugin()?.cancelLongPressTimer();
        }
      }

      if (isWheelMousePressed) {
        e.cancelBubble = true;
        e.target.stopDrag();
        return;
      }

      this.didMove = true;

      let selectionContainsFrames = false;
      for (let i = 0; i < this.currentDragSelectedNodes.length; i++) {
        const node = this.currentDragSelectedNodes[i];
        selectionContainsFrames = selectionContainsFrames || hasFrames(node);
        node.updatePosition(node.getAbsolutePosition());
      }

      if (this.currentDragSelectedNodes.length === 1) {
        this.originalNodes = {};
        this.originalContainers = {};
      }

      if (
        this.callbacks.isSelecting() &&
        this.currentDragSelectedNodes.length > 1
      ) {
        clearContainerTargets(this.instance);
        const layerToMove = containerOverCursor(
          this.instance,
          this.currentDragSelectedNodes
        );

        const usersPresence = this.callbacks.getUsersPresencePlugin();
        if (usersPresence && this.dragInProcess) {
          for (const node of this.currentDragSelectedNodes) {
            let parentId: string = node.getParent()?.id() ?? '';
            const parent = node.getParent();
            if (parent?.getAttrs().nodeId) {
              parentId = parent.getAttrs().nodeId;
            }
            usersPresence.setPresence(
              node.id(),
              parentId,
              { x: node.x(), y: node.y() },
              false
            );
          }
          usersPresence.forceSendPresence();
        }

        if (layerToMove && !selectionContainsFrames) {
          layerToMove.fire(WEAVE_NODE_CUSTOM_EVENTS.onTargetEnter, {
            bubbles: true,
          });
        }
      }

      this.tr.forceUpdate();
    };

    this.tr.on('dragmove', handleDragMove);

    this.tr.on('dragend', (e) => {
      this.dragInProcess = false;

      const mainLayer = this.instance.getMainLayer();
      if (!mainLayer) return;

      this.instance.getSelectionLayer()?.hitGraphEnabled(true);
      this.instance.getMainLayer()?.hitGraphEnabled(true);

      if (!this.didMove) return;

      if (this.currentDragSelectedNodes.length > 1) {
        this.instance.releaseMutexLock();
      }

      e.cancelBubble = true;

      this.instance.getHooks().callHook('weave:onTransformerDragEnd', {
        e,
        nodes: this.currentDragSelectedNodes,
      });

      this.instance.getCloningManager().cleanupClones();
      this.callbacks.getStagePanningPlugin()?.cleanupEdgeMoveIntervals();

      let selectionContainsFrames = false;
      for (let i = 0; i < this.currentDragSelectedNodes.length; i++) {
        const node = this.currentDragSelectedNodes[i];
        selectionContainsFrames = selectionContainsFrames || hasFrames(node);
        node.updatePosition(node.getAbsolutePosition());
      }

      if (
        this.callbacks.isSelecting() &&
        this.currentDragSelectedNodes.length > 1
      ) {
        const toSelect: string[] = [];
        const toUpdate: WeaveStateElement[] = [];

        this.instance.stateTransactional(() => {
          const actualCursor = stage.container().style.cursor;
          stage.container().style.cursor = 'wait';

          clearContainerTargets(this.instance);
          const layerToMove = containerOverCursor(
            this.instance,
            this.currentDragSelectedNodes
          );

          const nodeUpdate = (node: Konva.Node) => {
            const isLockedToContainer = node.getAttrs().lockToContainer;
            let moved = false;

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
                  this.originalNodes[node.getAttrs().id ?? ''],
                  this.originalContainers[node.getAttrs().id ?? '']
                );

                if (moved) {
                  this.instance.emitEvent<WeaveNodeChangedContainerEvent>(
                    'onNodeChangedContainer',
                    {
                      originalNode:
                        this.originalNodes[node.getAttrs().id ?? ''] ?? null,
                      originalContainer:
                        this.originalContainers[node.getAttrs().id ?? ''] ??
                        null,
                      newNode: node,
                      newContainer: containerToMove,
                    }
                  );
                }

                toSelect.push(node.getAttrs().id ?? '');
                delete this.originalNodes[node.getAttrs().id ?? ''];
                delete this.originalContainers[node.getAttrs().id ?? ''];
              } else {
                toSelect.push(
                  node.getAttrs().nodeId
                    ? node.getAttrs().nodeId ?? ''
                    : node.getAttrs().id ?? ''
                );
              }

              if (containerToMove) {
                containerToMove.fire(WEAVE_NODE_CUSTOM_EVENTS.onTargetLeave, {
                  bubbles: true,
                });
              }

              if (!nodeHandler) return;

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
              if (!nodeHandler) return;
              toUpdate.push(
                nodeHandler.serialize(node as WeaveElementInstance)
              );
            }
          };

          for (let i = 0; i < this.currentDragSelectedNodes.length; i++) {
            nodeUpdate(this.currentDragSelectedNodes[i]);
          }

          if (toUpdate.length > 0) {
            this.instance.updateNodesNT(toUpdate);
          }

          this.instance.runPhaseHooks<{ nodes: Konva.Node[] }>(
            'onMoveNodesToContainer',
            (hook) => {
              hook({ nodes: this.currentDragSelectedNodes });
            }
          );

          stage.container().style.cursor = actualCursor;
        });

        for (const node of this.currentDragSelectedNodes) {
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

        this.callbacks.setSelectedNodes(finalSelectedNodes);
        this.tr.forceUpdate();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Weave instance events
  // ---------------------------------------------------------------------------

  private registerInstanceEvents(): void {
    this.instance.addEventListener('onNodesChange', () => {
      const currentSelectedNodes = this.tr.nodes();

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

      this.prevSelectedNodes = this.tr.nodes();
    });

    this.instance.addEventListener('onUndoChange', () => {
      this.handleUndoRedoSelectionChange();
    });

    this.instance.addEventListener('onRedoChange', () => {
      this.handleUndoRedoSelectionChange();
    });
  }

  private handleUndoRedoSelectionChange(): void {
    const selectionLayer = this.instance.getSelectionLayer();
    const selectionFeedbackPlugin =
      this.callbacks.getNodesSelectionFeedbackPlugin();

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
}
