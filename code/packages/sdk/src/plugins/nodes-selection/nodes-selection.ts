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
import type { WeaveNode } from '@/nodes/node';
import type { WeaveCopyPasteNodesPlugin } from '../copy-paste-nodes/copy-paste-nodes';
import {
  clearContainerTargets,
  containerOverCursor,
  getTargetedNode,
  hasFrames,
  intersectArrays,
  moveNodeToContainer,
} from '@/utils';
import { WEAVE_USERS_SELECTION_KEY } from '../users-selection/constants';
import type { WeaveUsersSelectionPlugin } from '../users-selection/users-selection';
import type { KonvaEventObject } from 'konva/lib/Node';
import { throttle } from 'lodash';
import type { Stage } from 'konva/lib/Stage';
import type { Vector2d } from 'konva/lib/types';
import { WEAVE_STAGE_DEFAULT_MODE } from '@/nodes/stage/constants';
import type { WeaveNodesSnappingPlugin } from '../nodes-snapping/nodes-snapping';
import type { TransformerConfig } from 'konva/lib/shapes/Transformer';

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
  private readonly selectionOriginalConfig!: TransformerConfig;
  protected taps: number;
  protected isDoubleTap: boolean;
  protected tapStart: { x: number; y: number; time: number } | null;
  protected lastTapTime: number;
  private pointers: Record<string, PointerEvent>;
  onRender: undefined;

  constructor(params?: WeaveNodesSelectionPluginParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      selection: {
        rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315, 360],
        rotationSnapTolerance: 3,
        ignoreStroke: true,
        flipEnabled: false,
        keepRatio: true,
        useSingleNodeRotation: true,
        shouldOverdrawWholeArea: true,
        enabledAnchors: [
          'top-left',
          'top-center',
          'top-right',
          'middle-right',
          'middle-left',
          'bottom-left',
          'bottom-center',
          'bottom-right',
        ],
        anchorStyleFunc: (anchor) => {
          anchor.stroke('#27272aff');
          anchor.cornerRadius(12);
          if (anchor.hasName('top-center') || anchor.hasName('bottom-center')) {
            anchor.height(8);
            anchor.offsetY(4);
            anchor.width(32);
            anchor.offsetX(16);
          }
          if (anchor.hasName('middle-left') || anchor.hasName('middle-right')) {
            anchor.height(32);
            anchor.offsetY(16);
            anchor.width(8);
            anchor.offsetX(4);
          }
        },
        borderStroke: '#1a1aff',
        borderStrokeWidth: 2,
        ...config?.selection,
      },
      hover: {
        borderStrokeWidth: 2,
        ...config?.hover,
      },
      selectionArea: {
        fill: '#1a1aff11',
        stroke: '#1a1aff',
        strokeWidth: 1,
        dash: [12, 4],
        ...config?.selectionArea,
      },
      behaviors: {
        singleSelection: { enabled: true },
        multipleSelection: { enabled: false },
        ...config?.behaviors,
      },
    };
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
    this.isDoubleTap = false;
    this.tapStart = { x: 0, y: 0, time: 0 };
    this.lastTapTime = 0;
    this.active = false;
    this.didMove = false;
    this.selecting = false;
    this.initialized = false;
    this.enabled = false;
    this.pointers = {};
    this.selectionOriginalConfig = { ...this.config.selection };
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
    return this.instance.getActiveAction() === 'selectionTool';
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
      ...this.selectionOriginalConfig,
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

    tr.on('transformstart', () => {
      this.triggerSelectedNodesEvent();
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTransform = (e: any) => {
      const moved = this.checkMoved(e);
      if (moved) {
        this.getContextMenuPlugin()?.cancelLongPressTimer();
      }

      this.triggerSelectedNodesEvent();
    };

    tr.on('transform', throttle(handleTransform, 50));

    tr.on('transformend', () => {
      this.triggerSelectedNodesEvent();
    });

    let initialPos: Vector2d | null = null;

    tr.on('dragstart', (e) => {
      initialPos = { x: e.target.x(), y: e.target.y() };

      this.didMove = false;

      const stage = this.instance.getStage();

      if (stage.isMouseWheelPressed()) {
        e.cancelBubble = true;
        e.target.stopDrag();
        return;
      }

      e.cancelBubble = true;

      const selectedNodes = tr.nodes();
      for (let i = 0; i < selectedNodes.length; i++) {
        const node = selectedNodes[i];
        node.updatePosition(node.getAbsolutePosition());
      }

      tr.forceUpdate();
    });

    const handleDragMove = (
      e: KonvaEventObject<DragEvent, Konva.Transformer>
    ) => {
      const actualPos = { x: e.target.x(), y: e.target.y() };

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

      e.cancelBubble = true;

      const selectedNodes = tr.nodes();
      let selectionContainsFrames = false;
      for (let i = 0; i < selectedNodes.length; i++) {
        const node = selectedNodes[i];
        selectionContainsFrames = selectionContainsFrames || hasFrames(node);
        node.updatePosition(node.getAbsolutePosition());
      }

      if (this.isSelecting() && selectedNodes.length > 1) {
        clearContainerTargets(this.instance);

        const layerToMove = containerOverCursor(this.instance);

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

      e.cancelBubble = true;

      const selectedNodes = tr.nodes();
      let selectionContainsFrames = false;
      for (let i = 0; i < selectedNodes.length; i++) {
        const node = selectedNodes[i];
        selectionContainsFrames = selectionContainsFrames || hasFrames(node);
        node.updatePosition(node.getAbsolutePosition());
      }

      if (this.isSelecting() && tr.nodes().length > 1) {
        const actualCursor = stage.container().style.cursor;
        stage.container().style.cursor = 'wait';

        clearContainerTargets(this.instance);

        const toSelect: string[] = [];
        const toUpdate: WeaveStateElement[] = [];

        const layerToMove = containerOverCursor(this.instance);

        const nodeUpdatePromise = (node: Konva.Node) => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              clearContainerTargets(this.instance);

              const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
                node.getAttrs().nodeType
              );

              if (nodeHandler) {
                this.instance.updateNode(
                  nodeHandler.serialize(node as WeaveElementInstance)
                );
              }

              let containerToMove: Konva.Layer | Konva.Node | undefined =
                this.instance.getMainLayer();

              if (layerToMove) {
                containerToMove = layerToMove;
                containerToMove.fire(WEAVE_NODE_CUSTOM_EVENTS.onTargetLeave, {
                  bubbles: true,
                });
              }

              if (containerToMove && !selectionContainsFrames) {
                moveNodeToContainer(this.instance, node, containerToMove);
              }

              if (!nodeHandler) {
                return resolve();
              }

              toSelect.push(node.getAttrs().id ?? '');
              toUpdate.push(
                nodeHandler.serialize(node as WeaveElementInstance)
              );

              resolve();
            }, 0);
          });
        };

        const promises = [];
        for (let i = 0; i < selectedNodes.length; i++) {
          const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
            selectedNodes[i].getAttrs().nodeType
          );

          if (nodeHandler) {
            this.instance.updateNode(
              nodeHandler.serialize(selectedNodes[i] as WeaveElementInstance)
            );
          }

          promises.push(nodeUpdatePromise(selectedNodes[i]));
        }

        Promise.allSettled(promises).then((results) => {
          if (results.length > 0) {
            this.instance.updateNodes(toUpdate);
          }

          stage.container().style.cursor = actualCursor;
        });

        setTimeout(() => {
          const finalSelectedNodes: Konva.Node[] = [];
          toSelect.forEach((nodeId) => {
            const actNode = this.instance.getStage().findOne(`#${nodeId}`);
            if (actNode) {
              finalSelectedNodes.push(actNode);
            }
          });
          tr.nodes(finalSelectedNodes);
          tr.forceUpdate();
        }, 0);
      }

      tr.forceUpdate();
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
          activeAction !== 'selectionTool'
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

        this.tr.nodes(newSelectedNodes);
        this.triggerSelectedNodesEvent();

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

  private setTapStart(
    e: KonvaEventObject<PointerEvent | DragEvent, Stage | Konva.Transformer>
  ): void {
    this.tapStart = {
      x: e.evt.clientX,
      y: e.evt.clientY,
      time: performance.now(),
    };
  }

  private checkMovedDrag(init: Vector2d, actual: Vector2d): boolean {
    if (!this.tapStart) {
      return false;
    }

    const dx = actual.x - init.x;
    const dy = actual.y - init.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

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
    const dist = Math.sqrt(dx * dx + dy * dy);

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
    const dist = Math.sqrt(dx * dx + dy * dy);

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
    let x1: number, y1: number, x2: number, y2: number;
    this.selecting = false;

    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (
        (e.key === 'Backspace' || e.key === 'Delete') &&
        Object.keys(window.weaveTextEditing).length === 0
      ) {
        this.removeSelectedNodes();
        return;
      }
    });

    stage.on('pointerdown', (e: KonvaEventObject<PointerEvent, Stage>) => {
      this.setTapStart(e);

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
        this.hideSelectorArea();
        this.handleClickOrTap(e);
        return;
      }

      const intStage = this.instance.getStage();

      x1 = intStage.getRelativePointerPosition()?.x ?? 0;
      y1 = intStage.getRelativePointerPosition()?.y ?? 0;
      x2 = intStage.getRelativePointerPosition()?.x ?? 0;
      y2 = intStage.getRelativePointerPosition()?.y ?? 0;

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

      if (contextMenuPlugin && contextMenuPlugin.isContextMenuVisible()) {
        this.selecting = false;
        return;
      }

      // do nothing if we didn't start selection
      if (!this.selecting) {
        return;
      }

      const intStage = this.instance.getStage();

      x2 = intStage.getRelativePointerPosition()?.x ?? 0;
      y2 = intStage.getRelativePointerPosition()?.y ?? 0;

      this.getTransformer().nodes([]);

      this.selectionRectangle.setAttrs({
        visible: true,
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      });
    };

    stage.on('pointermove', handleMouseMove);

    stage.on('pointerup', (e) => {
      const moved = this.checkMoved(e);
      this.checkDoubleTap(e);
      delete this.pointers[e.evt.pointerId];

      if (stage.mode() === WEAVE_STAGE_DEFAULT_MODE) {
        this.getSnappingPlugin()?.cleanupEvaluateGuidelines();
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

      this.selecting = false;
      this.instance.emitEvent<WeaveNodesSelectionPluginOnSelectionStateEvent>(
        'onSelectionState',
        false
      );

      if (this.isDoubleTap) {
        this.taps = 0;
        this.lastTapTime = 0;
        this.tapStart = { x: 0, y: 0, time: 0 };
        this.isDoubleTap = true;
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

      if (contextMenuPlugin && contextMenuPlugin.isContextMenuVisible()) {
        this.selecting = false;
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
          // parent.getAttrs().nodeType !== 'frame' &&
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
      this.tr.nodes([...selectedNodes]);

      this.handleBehaviors();

      this.triggerSelectedNodesEvent();

      stage.container().tabIndex = 1;
      stage.container().focus();
    });

    this.instance.addEventListener('onStateChange', () => {
      this.syncSelection();
    });

    this.instance.addEventListener('onUndoManagerStatusChange', () => {
      this.syncSelection();
    });
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

    e.cancelBubble = true;

    if (!this.enabled) {
      return;
    }

    if (this.instance.getActiveAction() !== 'selectionTool') {
      return;
    }

    const contextMenuPlugin = this.getContextMenuPlugin();

    if (contextMenuPlugin?.isContextMenuVisible()) {
      this.selecting = false;
      return;
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

    if (nodeTargeted.getAttrs().locked) {
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

    const anchorsArrays = [];
    for (const node of nodes) {
      anchorsArrays.push(node.allowedAnchors());
    }

    let transformerAttrs: TransformerConfig = {};
    if (nodesSelected === 1) {
      transformerAttrs = {
        ...this.selectionOriginalConfig,
        enabledAnchors: nodes[0].allowedAnchors(),
      };
    } else if (nodesSelected > 1) {
      transformerAttrs = {
        ...this.selectionOriginalConfig,
        enabledAnchors: intersectArrays(anchorsArrays),
      };
    }

    if (this.tr) {
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

  getContextMenuPlugin() {
    const contextMenuPlugin =
      this.instance.getPlugin<WeaveContextMenuPlugin>('contextMenu');
    return contextMenuPlugin;
  }

  getSnappingPlugin() {
    const snappingPlugin =
      this.instance.getPlugin<WeaveNodesSnappingPlugin>('nodesSnapping');
    return snappingPlugin;
  }

  getSelectorConfig(): TransformerConfig {
    return this.selectionOriginalConfig;
  }
}
