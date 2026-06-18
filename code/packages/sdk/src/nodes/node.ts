// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { Weave } from '@/weave';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
  type WeaveNodeBase,
  WEAVE_NODE_CUSTOM_EVENTS,
  type WeaveNodeConfiguration,
  type WeaveUser,
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
  moveNodeToContainerNT,
} from '@/utils/utils';
import throttle from 'lodash/throttle';
import type { KonvaEventObject } from 'konva/lib/Node';
import { WEAVE_STAGE_DEFAULT_MODE } from './stage/constants';
import { MOVE_TOOL_ACTION_NAME } from '@/actions/move-tool/constants';
import { SELECTION_TOOL_ACTION_NAME } from '@/actions/selection-tool/constants';
import type { WeaveNodesMultiSelectionFeedbackPlugin } from '@/plugins/nodes-multi-selection-feedback/nodes-multi-selection-feedback';
import { WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY } from '@/plugins/nodes-multi-selection-feedback/constants';
import type { WeaveNodeChangedContainerEvent } from './types';
import type { WeaveUsersPresencePlugin } from '@/plugins/users-presence/users-presence';
import { WEAVE_USERS_PRESENCE_PLUGIN_KEY } from '@/plugins/users-presence/constants';
import { DEFAULT_THROTTLE_MS } from '@/constants';

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
  Konva.Node.prototype.updatePosition = function () {};
  Konva.Node.prototype.triggerCrop = function () {};
  Konva.Node.prototype.closeCrop = function () {};
  Konva.Node.prototype.resetCrop = function () {};
  Konva.Node.prototype.dblClick = function () {};
  Konva.Node.prototype.allowedAnchors = function () {
    return [];
  };
  Konva.Node.prototype.isSelectable = function () {
    return true;
  };
  Konva.Node.prototype.handleMouseover = function () {};
  Konva.Node.prototype.handleMouseout = function () {};
  Konva.Node.prototype.handleSelectNode = function () {};
  Konva.Node.prototype.handleDeselectNode = function () {};
  Konva.Node.prototype.defineMousePointer = function () {
    return 'default';
  };
  Konva.Node.prototype.canBeHovered = function () {
    return false;
  };
  Konva.Node.prototype.canDrag = function () {
    return false;
  };
  Konva.Node.prototype.canMoveToContainer = function () {
    return false;
  };
  Konva.Node.prototype.getNodeAnchors = function () {
    return [];
  };
  Konva.Node.prototype.lockMutex = function () {};
  Konva.Node.prototype.releaseMutex = function () {};
  Konva.Node.prototype.getNodeMinSize = function () {
    return { width: 0, height: 0 };
  };
};

export abstract class WeaveNode implements WeaveNodeBase {
  protected instance!: Weave;
  protected nodeType!: string;
  protected didMove!: boolean;
  protected logger!: Logger;
  protected previousPointer!: string | null;

  async register(instance: Weave): Promise<WeaveNode> {
    this.instance = instance;
    this.logger = this.instance.getChildLogger(this.getNodeType());
    await this.onRegister();
    this.instance
      .getChildLogger(`node-${this.getNodeType()}`)
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
    node.updatePosition = function () {};
    node.resetCrop = function () {};
    node.handleMouseover = function () {};
    node.handleMouseout = function () {};
    node.handleSelectNode = function () {};
    node.handleDeselectNode = function () {};
    node.defineMousePointer = () => {
      const selectedNodes = this.getSelectionPlugin()?.getSelectedNodes() ?? [];

      if (
        this.isSelecting() &&
        (selectedNodes as Konva.Node[]).includes(node)
      ) {
        return 'grab';
      }

      return 'pointer';
    };
    node.canBeHovered = function () {
      return true;
    };
    node.canDrag = function () {
      return true;
    };
    node.canMoveToContainer = function () {
      return true;
    };
    const actInstance = this.instance;
    node.getNodeAnchors = function () {
      const stage = actInstance.getStage();
      let nodeParent: Konva.Container | null | undefined = this.getParent();
      if (nodeParent?.getAttrs().nodeId) {
        nodeParent = stage.findOne(
          `#${nodeParent.getAttrs().nodeId}`
        ) as Konva.Container;
      }

      if (!nodeParent) {
        return [];
      }

      let isInContainer = false;
      if (nodeParent !== actInstance.getMainLayer()) {
        isInContainer = true;
      }

      const localBox = this.getClientRect({
        // relativeTo: stage,
        skipTransform: true,
      });

      const transform = this.getAbsoluteTransform();

      // Compute the four absolute corners of the box
      const corners = [
        { x: localBox.x, y: localBox.y },
        { x: localBox.x + localBox.width, y: localBox.y },
        { x: localBox.x + localBox.width, y: localBox.y + localBox.height },
        { x: localBox.x, y: localBox.y + localBox.height },
      ].map((p) => transform.point(p));

      const anchors = [];

      const topMid = {
        x: (corners[0].x + corners[1].x) / 2,
        y: (corners[0].y + corners[1].y) / 2,
      };
      const rightMid = {
        x: (corners[1].x + corners[2].x) / 2,
        y: (corners[1].y + corners[2].y) / 2,
      };
      const bottomMid = {
        x: (corners[2].x + corners[3].x) / 2,
        y: (corners[2].y + corners[3].y) / 2,
      };
      const leftMid = {
        x: (corners[3].x + corners[0].x) / 2,
        y: (corners[3].y + corners[0].y) / 2,
      };

      if (isInContainer && nodeParent) {
        const containerAbsPos = nodeParent.position();
        topMid.x += containerAbsPos.x * stage.scaleX() || 0;
        topMid.y += containerAbsPos.y * stage.scaleX() || 0;
        rightMid.x += containerAbsPos.x * stage.scaleX() || 0;
        rightMid.y += containerAbsPos.y * stage.scaleX() || 0;
        bottomMid.x += containerAbsPos.x * stage.scaleX() || 0;
        bottomMid.y += containerAbsPos.y * stage.scaleX() || 0;
        leftMid.x += containerAbsPos.x * stage.scaleX() || 0;
        leftMid.y += containerAbsPos.y * stage.scaleX() || 0;
      }

      anchors.push(
        { name: 'top', point: topMid },
        { name: 'right', point: rightMid },
        { name: 'bottom', point: bottomMid },
        { name: 'left', point: leftMid }
      );

      return anchors;
    };
    node.lockMutex = function (user: WeaveUser) {
      const actUser = actInstance.getStore().getUser();
      this.setAttrs({ mutexLocked: true, mutexUserId: user.id });

      const selectionPlugin =
        actInstance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
      if (selectionPlugin && actUser.id !== user.id) {
        const selectedNodes = selectionPlugin.getSelectedNodes();
        const filteredNodes = selectedNodes.filter(
          (n) => n.getAttrs().id !== this.getAttrs().id
        );
        selectionPlugin.setSelectedNodes(filteredNodes);
      }
    };
    node.releaseMutex = function () {
      this.setAttrs({ mutexLocked: false, mutexUserId: undefined });
    };

    const isLocked = node.getAttrs().locked ?? false;
    if (isLocked) {
      node.listening(false);
    } else {
      node.listening(true);
    }
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

  scaleReset(node: Konva.Node, scaleCustom?: { x: number; y: number }): void {
    const scale = scaleCustom ?? node.scale();

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
      this.getSelectionPlugin()?.isDragging() ||
      this.getSelectionPlugin()?.isTransforming()
    ) {
      this.hideHoverState();
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

    // Don't show hover border on the active group or any of its ancestors
    // while in group-edit context (e.g. group inside a frame — suppress frame hover too)
    if (this.isHoverSuppressedByGroupContext(node, selectionPlugin)) {
      this.hideHoverState();
      return;
    }

    if (node?.canBeHovered?.()) {
      selectionPlugin.getHoverTransformer().nodes([node]);
    } else {
      selectionPlugin.getHoverTransformer().nodes([]);
    }

    selectionPlugin.getHoverTransformer().moveToTop();
  }

  private isHoverSuppressedByGroupContext(
    node: Konva.Node,
    selectionPlugin: WeaveNodesSelectionPlugin
  ): boolean {
    const activeGroupId = selectionPlugin.getActiveGroupContext();
    if (activeGroupId === null) return false;
    const activeGroupNode = this.instance
      .getStage()
      .findOne(`#${activeGroupId}`);
    if (!activeGroupNode) return false;
    const hoveredId = node.getAttrs().id ?? '';
    let current: Konva.Node | null = activeGroupNode;
    while (current) {
      if ((current.getAttrs().id ?? '') === hoveredId) return true;
      current = current.getParent();
    }
    return false;
  }

  protected hideHoverState(): void {
    const selectionPlugin = this.getSelectionPlugin();

    if (!selectionPlugin) {
      return;
    }

    selectionPlugin.getHoverTransformer().nodes([]);
  }

  setupDefaultNodeEvents(
    node: Konva.Node,
    options: { performScaleReset: boolean } = { performScaleReset: true }
  ): void {
    const { performScaleReset } = mergeExceptArrays(
      {
        performScaleReset: true,
      },
      options
    );

    const handleNodesChange = () => {
      if (
        !this.isLocked(node as WeaveElementInstance) &&
        this.isSelecting() &&
        this.isNodeSelected(node)
      ) {
        node.draggable(true);
        return;
      }

      node.draggable(false);
    };

    const isLocked = node.getAttrs().locked ?? false;

    if (isLocked) {
      this.instance.removeEventListener<WeaveNodesSelectionPluginOnNodesChangeEvent>(
        'onNodesChange',
        handleNodesChange
      );

      node.off('transformstart');
      node.off('transform');
      node.off('transformend');
      node.off('dragstart');
      node.off('dragmove');
      node.off('dragend');
      node.off('pointerover');
      node.off('pointerleave');
    } else {
      this.instance.addEventListener<WeaveNodesSelectionPluginOnNodesChangeEvent>(
        'onNodesChange',
        handleNodesChange
      );

      node.off('transformstart');
      node.on('transformstart', (e) => {
        if (e.target.getAttrs().strokeScaleEnabled !== false) {
          e.target.setAttr('strokeScaleEnabled', false);
          e.target.setAttr('_revertStrokeScaleEnabled', true);
        }

        this.getNodesSelectionFeedbackPlugin()?.hideSelectionHalo(node);

        this.instance.emitEvent('onTransform', e.target);

        if (this.getSelectionPlugin()?.getSelectedNodes().length === 1) {
          this.instance.setMutexLock({
            nodeIds: [e.target.id()],
            operation: 'node-transform',
          });
        }
      });

      const handleTransform = (e: KonvaEventObject<Event, Konva.Node>) => {
        const node = e.target;

        const nodesSelectionPlugin =
          this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

        if (
          nodesSelectionPlugin &&
          this.isSelecting() &&
          this.isNodeSelected(node)
        ) {
          nodesSelectionPlugin.getTransformer().forceUpdate();
        }

        let parentId: string = node.getParent()?.id() ?? '';
        const parent = node.getParent();
        if (parent?.getAttrs().nodeId) {
          parentId = parent.getAttrs().nodeId;
        }

        this.getUsersPresencePlugin()?.setPresence(node.id(), parentId, {
          x: node.x(),
          y: node.y(),
          width: node.width(),
          height: node.height(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          rotation: node.rotation(),
          strokeScaleEnabled: false,
        });
      };

      node.off('transform');
      node.on('transform', throttle(handleTransform, DEFAULT_THROTTLE_MS));

      node.off('transformend');
      node.on('transformend', (e) => {
        const node = e.target;

        if (this.getSelectionPlugin()?.getSelectedNodes().length === 1) {
          this.instance.releaseMutexLock();
        }

        if (e.target.getAttrs()._revertStrokeScaleEnabled === true) {
          e.target.setAttr('strokeScaleEnabled', true);
        }
        e.target.setAttr('_revertStrokeScaleEnabled', undefined);

        this.instance.emitEvent('onTransform', null);

        if (performScaleReset) {
          this.scaleReset(node);
        }

        if (this.getSelectionPlugin()?.getSelectedNodes().length === 1) {
          this.getNodesSelectionFeedbackPlugin()?.showSelectionHalo(node);
          this.getNodesSelectionFeedbackPlugin()?.updateSelectionHalo(node);
        }

        const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
          node.getAttrs().nodeType
        );
        if (nodeHandler) {
          const shouldUpdateOnTransform =
            node.getAttrs().shouldUpdateOnTransform ?? true;

          if (shouldUpdateOnTransform) {
            const serializedNode = nodeHandler.serialize(node);
            this.instance.updateNode(serializedNode);
          }
        }

        const nodesSelectionPlugin =
          this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

        if (nodesSelectionPlugin) {
          nodesSelectionPlugin.getTransformer().forceUpdate();
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

      let originalNode: Konva.Node | null | undefined = undefined;
      let originalContainer: Konva.Node | null | undefined = undefined;
      let startPosition: Konva.Vector2d | null = null;
      let lockedAxis: 'x' | 'y' | null = null;
      let isShiftPressed: boolean = false;

      node.off('dragstart');
      node.on('dragstart', (e) => {
        const nodeTarget = e.target;

        if (!e.evt) return;

        let isWheelMousePressed = false;
        if (e.evt?.button === 1) {
          isWheelMousePressed = true;
        }

        this.getNodesSelectionFeedbackPlugin()?.hideSelectionHalo(nodeTarget);

        const canMove =
          typeof nodeTarget?.canDrag === 'function'
            ? nodeTarget.canDrag()
            : false;

        if (!canMove) {
          nodeTarget.stopDrag();
          return;
        }

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

        if (isWheelMousePressed) {
          e.cancelBubble = true;
          nodeTarget.stopDrag();
        }

        const realNodeTarget: Konva.Node = this.getRealSelectedNode(nodeTarget);

        if (realNodeTarget.getAttrs().isCloned) {
          return;
        }

        lockedAxis = null;

        if (e.evt.shiftKey && !startPosition) {
          startPosition = realNodeTarget.absolutePosition();
        }

        if (e.evt.shiftKey) {
          isShiftPressed = true;
        } else {
          lockedAxis = null;
          startPosition = null;
          isShiftPressed = false;
        }

        originalNode = realNodeTarget.clone();
        originalContainer = realNodeTarget.getParent();
        if (originalContainer?.getAttrs().nodeId) {
          originalContainer = stage.findOne(
            `#${originalContainer.getAttrs().nodeId}`
          );
        }

        realNodeTarget.fire('nodeDragStart', { node: realNodeTarget });

        if (e.evt?.altKey) {
          nodeTarget.setAttrs({ isCloneOrigin: true });
          nodeTarget.setAttrs({ isCloned: false });
          nodeTarget.stopDrag(e.evt);

          e.cancelBubble = true;

          const clone = this.instance
            .getCloningManager()
            .cloneNode(realNodeTarget);

          if (clone && !this.instance.getCloningManager().isClone(clone)) {
            clone.setAttrs({
              isCloneOrigin: false,
              isCloned: true,
            });
            this.instance.getCloningManager().addClone(clone);
          }

          stage.setPointersPositions(e.evt);

          const nodesSelectionPlugin = this.getNodesSelectionPlugin();
          nodesSelectionPlugin?.setSelectedNodes([]);

          requestAnimationFrame(() => {
            nodesSelectionPlugin?.setSelectedNodes(
              this.instance.getCloningManager().getClones()
            );
            if (clone?.getStage()) {
              clone.startDrag(e.evt);
            }
          });
        }

        if (this.getNodesSelectionPlugin()?.getSelectedNodes().length === 1) {
          this.instance.setMutexLock({
            nodeIds: [e.target.id()],
            operation: 'node-drag',
          });
        }
      });

      const handleDragMove = (e: KonvaEventObject<DragEvent, Konva.Node>) => {
        const nodeTarget = e.target;

        let isWheelMousePressed = false;
        if (e.evt?.button === 1) {
          isWheelMousePressed = true;
        }

        e.cancelBubble = true;

        if (e.evt?.buttons === 0) {
          nodeTarget.stopDrag();
          return;
        }

        this.didMove = true;

        const isErasing = this.instance.getActiveAction() === 'eraseTool';

        if (isErasing) {
          nodeTarget.stopDrag();
          return;
        }

        if (isWheelMousePressed) {
          e.cancelBubble = true;
          nodeTarget.stopDrag();
          return;
        }

        const realNodeTarget: Konva.Node = this.getRealSelectedNode(nodeTarget);

        if (e.evt.shiftKey && !startPosition) {
          startPosition = realNodeTarget.absolutePosition();
        }

        if (e.evt.shiftKey) {
          isShiftPressed = true;
        } else {
          lockedAxis = null;
          startPosition = null;
          isShiftPressed = false;
        }

        if (
          this.isSelecting() &&
          this.getSelectionPlugin()?.getSelectedNodes().length === 1
        ) {
          clearContainerTargets(this.instance);

          let parentId: string = realNodeTarget.getParent()?.id() ?? '';
          const parent = realNodeTarget.getParent();
          if (parent?.getAttrs().nodeId) {
            parentId = parent.getAttrs().nodeId;
          }

          this.getUsersPresencePlugin()?.setPresence(
            realNodeTarget.id(),
            parentId,
            {
              x: realNodeTarget.x(),
              y: realNodeTarget.y(),
            }
          );

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

      node.off('dragmove');
      node.on('dragmove', throttle(handleDragMove, DEFAULT_THROTTLE_MS));

      node.dragBoundFunc((pos) => {
        if (!startPosition) return pos;

        // Only constrain when shift is pressed
        if (!isShiftPressed) return pos;

        const dx = pos.x - startPosition.x;
        const dy = pos.y - startPosition.y;

        if (!lockedAxis) {
          const axisLockThreshold =
            this.instance.getConfiguration().behaviors.axisLockThreshold;
          if (
            Math.abs(dx) < axisLockThreshold &&
            Math.abs(dy) < axisLockThreshold
          ) {
            return pos; // free movement until threshold passed
          }

          lockedAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        }

        if (lockedAxis === 'x') {
          return {
            x: pos.x,
            y: startPosition.y,
          };
        } else {
          return {
            x: startPosition.x,
            y: pos.y,
          };
        }
      });

      node.off('dragend');
      node.on('dragend', (e) => {
        const nodeTarget = e.target;

        startPosition = null;
        lockedAxis = null;
        isShiftPressed = false;

        // if (this.getSelectionPlugin()?.getDragSelectedNodes().length === 1) {
        this.getSelectionPlugin()?.restoreNodesOpacityOnDrag();
        // }

        if (this.getSelectionPlugin()?.getSelectedNodes().length === 1) {
          this.instance.releaseMutexLock();
          this.getNodesSelectionFeedbackPlugin()?.showSelectionHalo(nodeTarget);
          this.getNodesSelectionFeedbackPlugin()?.updateSelectionHalo(
            nodeTarget
          );
        }

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

        // While in group-edit context, keep the node inside its parent group.
        // Skip the container-move logic entirely and fall through to updateNodeNT.
        const isInGroupContext =
          (this.getSelectionPlugin()?.getActiveGroupContext() ?? null) !== null;

        const shouldUpdateMove =
          this.isSelecting() &&
          this.getSelectionPlugin()?.getSelectedNodes().length === 1 &&
          (realNodeTarget.getAttrs().lockToContainer === undefined ||
            !realNodeTarget.getAttrs().lockToContainer);

        if (isInGroupContext && shouldUpdateMove) {
          if (realNodeTarget.getAttrs().isCloned) {
            this.instance.getCloningManager().removeClone(realNodeTarget);
          }

          this.instance.updateNodeNT(
            this.serialize(realNodeTarget as WeaveElementInstance)
          );
        }

        if (!isInGroupContext && shouldUpdateMove) {
          this.instance.stateTransactional(() => {
            clearContainerTargets(this.instance);

            const layerToMove = containerOverCursor(this.instance, [
              realNodeTarget,
            ]);

            let containerToMove: Konva.Layer | Konva.Group | undefined =
              this.instance.getMainLayer();

            if (layerToMove) {
              containerToMove = layerToMove;
            }

            let moved = false;
            if (containerToMove && !hasFrames(node)) {
              moved = moveNodeToContainerNT(
                this.instance,
                realNodeTarget,
                containerToMove,
                originalNode,
                originalContainer
              );

              if (moved) {
                this.instance.emitEvent<WeaveNodeChangedContainerEvent>(
                  'onNodeChangedContainer',
                  {
                    originalNode,
                    newNode: realNodeTarget,
                    originalContainer,
                    newContainer: containerToMove,
                  }
                );

                this.instance.runPhaseHooks<{
                  nodes: Konva.Node[];
                }>('onMoveNodesToContainer', (hook) => {
                  hook({
                    nodes: [realNodeTarget],
                  });
                });

                const selectionPlugin = this.getSelectionPlugin();

                if (selectionPlugin) {
                  selectionPlugin.setSelectedNodes([realNodeTarget]);
                  selectionPlugin.getTransformer().forceUpdate();
                }
              }
            }

            if (realNodeTarget.getAttrs().isCloned) {
              this.instance.getCloningManager().removeClone(realNodeTarget);
            }

            if (containerToMove) {
              containerToMove.fire(WEAVE_NODE_CUSTOM_EVENTS.onTargetLeave, {
                bubbles: true,
              });
            }

            if (!moved) {
              this.instance.updateNodeNT(
                this.serialize(realNodeTarget as WeaveElementInstance)
              );
            }
          });
        }

        originalNode = undefined;
        originalContainer = undefined;

        nodeTarget.setAttrs({ isCloned: undefined });
        nodeTarget.setAttrs({ isCloneOrigin: undefined });
        realNodeTarget.setAttrs({ isCloned: undefined });
        realNodeTarget.setAttrs({ isCloneOrigin: undefined });
        originalPosition = realNodeTarget.getAbsolutePosition();
      });

      if (!node.getAttrs().overridesMouseControl) {
        node.handleMouseover = (e) => {
          this.handleMouseOver(e, node);
        };

        node.handleMouseout = (e) => {
          this.handleMouseout(e, node);
        };
      }

      node.on('xChange yChange', () => {
        const nodeSelectionPlugin = this.getSelectionPlugin();

        if (!nodeSelectionPlugin) return;

        if (
          nodeSelectionPlugin.isDragging() ||
          nodeSelectionPlugin.isTransforming()
        )
          return;

        const selectedNodes = nodeSelectionPlugin.getSelectedNodes() ?? [];

        let selected = false;
        for (const selectedNode of selectedNodes) {
          if (selectedNode.getAttrs().id === node.getAttrs().id) {
            selected = true;
            break;
          }
        }

        if (selected) {
          node.handleDeselectNode();
          node.handleSelectNode();
        }
      });

      node.handleSelectNode = () => {
        const transformer = this.getNodesSelectionPlugin()?.getTransformer();

        if (!transformer) {
          return;
        }

        if (transformer.nodes().length > 1) {
          this.getNodesSelectionFeedbackPlugin()?.createSelectionHalo(node);
        }
      };

      node.handleDeselectNode = () => {
        this.getNodesSelectionFeedbackPlugin()?.destroySelectionHalo(node);
      };

      node.on('pointerover', (e) => {
        const realNodeTarget: Konva.Node = this.getRealSelectedNode(e.target);
        realNodeTarget?.handleMouseover?.(e);

        const doCancelBubble = this.handleMouseOver(e, e.target);
        if (doCancelBubble) {
          e.cancelBubble = true;
        }
      });

      node.on('pointerleave', (e) => {
        const realNodeTarget: Konva.Node = this.getRealSelectedNode(e.target);
        realNodeTarget?.handleMouseout?.(e);

        this.handleMouseout(e, e.target);
      });
    }
  }

  handleMouseOver(e: KonvaEventObject<MouseEvent>, node: Konva.Node): boolean {
    const stage = this.instance.getStage();

    const isCtrlOrMetaPressed = e.evt.ctrlKey || e.evt.metaKey;

    if (isCtrlOrMetaPressed) {
      return false;
    }

    const user = this.instance.getStore().getUser();
    const activeAction = this.instance.getActiveAction();

    const isNodeSelectionEnabled = this.getSelectionPlugin()?.isEnabled();

    const activeGroupCtx =
      this.getSelectionPlugin()?.getActiveGroupContext() ?? undefined;
    let realNode: Konva.Node;
    if (activeGroupCtx) {
      // Build the full ancestor ID set: active group + all ancestor groups up to
      // the root. Passing this as stopAtGroupId makes getInstanceRecursive stop at
      // the direct child of whichever ancestor group directly contains the hovered
      // node — not just the active group itself.
      const stage = this.instance.getStage();
      const stopIds: string[] = [];
      let cur: Konva.Node | null =
        (stage.findOne(`#${activeGroupCtx}`) as Konva.Node | null) ?? null;
      while (cur) {
        const id = cur.getAttrs().id;
        if (id) stopIds.push(id);
        cur = cur.getParent();
      }
      realNode = this.instance.getInstanceRecursive(node, [], stopIds);
    } else {
      realNode = this.instance.getInstanceRecursive(node);
    }

    const canBeTargeted = realNode.getAttrs().canBeTargeted !== false;
    const isLocked = realNode.getAttrs().locked ?? false;
    const isMutexLocked =
      realNode.getAttrs().mutexLocked &&
      realNode.getAttrs().mutexUserId !== user.id;

    if ([MOVE_TOOL_ACTION_NAME].includes(activeAction ?? '')) {
      return false;
    }

    let showHover = false;
    let cancelBubble = false;

    // Node is locked or is mutex locked by another user
    if (
      isNodeSelectionEnabled &&
      this.isSelecting() &&
      !this.isNodeSelected(realNode) &&
      !this.isPasting() &&
      realNode.hasName('node') &&
      (isLocked || isMutexLocked)
    ) {
      stage.container().style.cursor = 'default';
      cancelBubble = true;
    }

    // Node is not locked and not selected
    if (
      isNodeSelectionEnabled &&
      this.isSelecting() &&
      !this.isNodeSelected(realNode) &&
      !this.isPasting() &&
      canBeTargeted &&
      realNode.hasName('node') &&
      !(isLocked || isMutexLocked) &&
      stage.mode() === WEAVE_STAGE_DEFAULT_MODE
    ) {
      showHover = true;
      stage.container().style.cursor =
        (typeof realNode?.defineMousePointer === 'function'
          ? realNode.defineMousePointer()
          : null) ?? 'pointer';
      cancelBubble = true;
    }

    // Node is not locked and selected
    if (
      isNodeSelectionEnabled &&
      this.isSelecting() &&
      this.isNodeSelected(realNode) &&
      !this.isPasting() &&
      realNode.hasName('node') &&
      canBeTargeted &&
      !(isLocked || isMutexLocked) &&
      stage.mode() === WEAVE_STAGE_DEFAULT_MODE
    ) {
      showHover = true;
      stage.container().style.cursor =
        (typeof realNode?.defineMousePointer === 'function'
          ? realNode.defineMousePointer()
          : null) ?? 'grab';
      cancelBubble = true;
    }

    if (!canBeTargeted) {
      cancelBubble = true;
    }

    // We're on pasting mode
    if (this.isPasting()) {
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

  handleMouseout(e: KonvaEventObject<MouseEvent>, node: Konva.Node) {
    const isCtrlOrMetaPressed = e.evt?.ctrlKey || e.evt?.metaKey;

    if (isCtrlOrMetaPressed) {
      return false;
    }

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

  async onRegister(): Promise<void> {
    return;
  }

  abstract initialize?(): void;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAdd(nodeInstance: WeaveElementInstance): void {}

  abstract onRender(props: WeaveElementAttributes): WeaveElementInstance;

  abstract onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void;

  onDestroy(nodeInstance: WeaveElementInstance): void {
    nodeInstance.destroy();
  }

  onDestroyInstance() {
    // Do nothing by default
  }

  serialize(instance: WeaveElementInstance): WeaveStateElement {
    const attrs = instance.getAttrs();

    const cleanedAttrs = { ...attrs };
    delete cleanedAttrs.isSelected;
    delete cleanedAttrs.mutexLocked;
    delete cleanedAttrs.mutexUserId;
    delete cleanedAttrs.draggable;
    delete cleanedAttrs.overridesMouseControl;
    delete cleanedAttrs.dragBoundFunc;

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

    const isListening = instance.listening();
    instance.setAttrs({
      locked: true,
      listening: false,
      previousListening: isListening,
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

    const previousListening = realInstance.getAttrs().previousListening ?? true;
    realInstance.setAttrs({
      locked: false,
      listening: previousListening,
      previousListening: undefined,
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  realOffset(instance: WeaveStateElement): Konva.Vector2d {
    return {
      x: 0,
      y: 0,
    };
  }

  private getRealSelectedNode(nodeTarget: Konva.Node) {
    return this.instance.getRealSelectedNode(nodeTarget);
  }

  getNodesSelectionFeedbackPlugin() {
    const selectionFeedbackPlugin =
      this.instance.getPlugin<WeaveNodesMultiSelectionFeedbackPlugin>(
        WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY
      );
    return selectionFeedbackPlugin;
  }

  getUsersPresencePlugin() {
    const usersPresencePlugin =
      this.instance.getPlugin<WeaveUsersPresencePlugin>(
        WEAVE_USERS_PRESENCE_PLUGIN_KEY
      );
    return usersPresencePlugin;
  }

  getIsAsync(): boolean {
    return false;
  }

  static defaultState(nodeId: string): WeaveStateElement {
    return {
      key: nodeId,
      type: 'unknown',
      props: {
        id: nodeId,
        nodeType: 'unknown',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        zIndex: 1,
        children: [],
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getSchema(): z.ZodObject<any> {
    const baseNodeSchema = z.object({
      key: z
        .string()
        .describe(
          'Unique identifier (uuid) for the node, generate one it if not provided'
        ),
      type: z.string().describe('Type of the node, must be always provided'),
      props: z.object({
        id: z
          .string()
          .describe(
            'Unique identifier (uuid) for the node instance, is the same as key'
          ),
        nodeType: z
          .string()
          .describe('Type of the node, must be always provided'),
        x: z
          .number()
          .describe('X position of the node, relative to the parent container'),
        y: z
          .number()
          .describe('Y position of the node, relative to the parent container'),
        scaleX: z.number().describe('Scale factor on the X axis, default is 1'),
        scaleY: z.number().describe('Scale factor on the Y axis, default is 1'),
        rotation: z
          .number()
          .optional()
          .describe('Rotation of the node in degrees, default is 0'),
        skewX: z
          .number()
          .optional()
          .describe('Skew on the X axis in degrees, default is 0'),
        skewY: z
          .number()
          .optional()
          .describe('Skew on the Y axis in degrees, default is 0'),

        opacity: z
          .number()
          .describe('Opacity of the node, between 0 and 1, default is 1'),

        children: z
          .array(z.any())
          .length(0)
          .describe('Children nodes, always be an empty array for leaf nodes'),
      }),
    });

    return baseNodeSchema;
  }
}
