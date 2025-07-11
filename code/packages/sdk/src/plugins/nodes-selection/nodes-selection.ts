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
  type WeaveNodesSelectionPluginOnStageSelectionEvent,
  type WeaveNodesSelectionPluginParams,
} from './types';
import { WeaveContextMenuPlugin } from '../context-menu/context-menu';
import type { WeaveNode } from '@/nodes/node';
import type { WeaveCopyPasteNodesPlugin } from '../copy-paste-nodes/copy-paste-nodes';
import {
  checkIfOverContainer,
  clearContainerTargets,
  moveNodeToContainer,
} from '@/utils';
import { WEAVE_USERS_SELECTION_KEY } from '../users-selection/constants';
import type { WeaveUsersSelectionPlugin } from '../users-selection/users-selection';
import type { KonvaEventObject } from 'konva/lib/Node';
import { throttle } from 'lodash';
import type { Stage } from 'konva/lib/Stage';

export class WeaveNodesSelectionPlugin extends WeavePlugin {
  private tr!: Konva.Transformer;
  private config!: WeaveNodesSelectionConfig;
  private selectionRectangle!: Konva.Rect;
  private active: boolean;
  private cameFromSelectingMultiple: boolean;
  private defaultEnabledAnchors: string[];
  private selectionTriggered: boolean;
  private selecting: boolean;
  private didMove: boolean;
  private dragging: boolean;
  private initialized: boolean;
  private pointers: Record<string, PointerEvent>;
  onRender: undefined;

  constructor(params?: WeaveNodesSelectionPluginParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transformer: {
        rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315, 360],
        rotationSnapTolerance: 3,
        ignoreStroke: true,
        flipEnabled: false,
        keepRatio: false,
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
        borderStroke: '#0074ffcc',
        ...config?.transformer,
      },
      transformations: {
        singleSelection: { enabled: true },
        multipleSelection: { enabled: false },
        ...config?.transformations,
      },
    };
    this.defaultEnabledAnchors = this.config.transformer?.enabledAnchors ?? [
      'top-left',
      'top-center',
      'top-right',
      'middle-right',
      'middle-left',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ];
    this.active = false;
    this.cameFromSelectingMultiple = false;
    this.didMove = false;
    this.selectionTriggered = false;
    this.selecting = false;
    this.dragging = false;
    this.initialized = false;
    this.enabled = false;
    this.pointers = {};
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
      fill: 'rgba(147, 197, 253, 0.25)',
      stroke: '#1e40afff',
      strokeWidth: 1 * stage.scaleX(),
      dash: [12 * stage.scaleX(), 4 * stage.scaleX()],
      visible: false,
      // disable events to not interrupt with events
      listening: false,
    });
    selectionLayer?.add(selectionRectangle);

    const tr = new Konva.Transformer({
      id: 'selectionTransformer',
      ...this.config.transformer,
    });
    selectionLayer?.add(tr);

    tr.on('transformstart', () => {
      this.triggerSelectedNodesEvent();
    });

    const handleTransform = () => {
      this.triggerSelectedNodesEvent();
    };

    tr.on('transform', throttle(handleTransform, 50));

    tr.on('transformend', () => {
      this.triggerSelectedNodesEvent();
    });

    tr.on('dragstart', (e) => {
      this.dragging = true;
      this.didMove = false;

      const stage = this.instance.getStage();

      if (stage.isMouseWheelPressed()) {
        e.cancelBubble = true;
        e.target.stopDrag();
        return;
      }

      const selectedNodes = tr.nodes();
      for (let i = 0; i < selectedNodes.length; i++) {
        const node = selectedNodes[i];
        node.updatePosition(node.getAbsolutePosition());
      }

      tr.forceUpdate();

      e.cancelBubble = true;
    });

    const handleDragMove = (
      e: KonvaEventObject<DragEvent, Konva.Transformer>
    ) => {
      const stage = this.instance.getStage();

      if (stage.isMouseWheelPressed()) {
        e.cancelBubble = true;
        e.target.stopDrag();
        return;
      }

      this.didMove = true;

      e.cancelBubble = true;

      const selectedNodes = tr.nodes();
      let hasFrames = false;
      for (let i = 0; i < selectedNodes.length; i++) {
        const node = selectedNodes[i];
        if (node.getAttrs().nodeType === 'frame') {
          hasFrames = hasFrames || true;
        }
        node.updatePosition(node.getAbsolutePosition());
      }

      if (this.isSelecting() && selectedNodes.length > 1) {
        clearContainerTargets(this.instance);

        const layerToMove = checkIfOverContainer(this.instance, e.target);

        if (layerToMove && !hasFrames) {
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

      this.dragging = false;

      e.cancelBubble = true;

      const selectedNodes = tr.nodes();
      let hasFrames = false;
      for (let i = 0; i < selectedNodes.length; i++) {
        const node = selectedNodes[i];
        if (node.getAttrs().nodeType === 'frame') {
          hasFrames = hasFrames || true;
        }
        node.updatePosition(node.getAbsolutePosition());
      }

      if (this.isSelecting() && tr.nodes().length > 1) {
        const actualCursor = stage.container().style.cursor;
        stage.container().style.cursor = 'wait';

        clearContainerTargets(this.instance);

        const toSelect: string[] = [];
        const toUpdate: WeaveStateElement[] = [];

        const nodeUpdatePromise = (node: Konva.Node) => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              moveNodeToContainer(this.instance, node, selectedNodes);

              const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
                node.getAttrs().nodeType
              );

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
    this.selectionRectangle = selectionRectangle;

    this.tr.on('pointerdblclick', (e) => {
      e.cancelBubble = true;

      if (this.tr.getNodes().length === 1) {
        const node = this.tr.getNodes()[0];
        node.fire('pointerdblclick');
      }
    });

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
      this.pointers[e.evt.pointerId] = e.evt;

      if (!this.initialized) {
        return;
      }

      if (!this.active) {
        return;
      }

      if (e.evt.pointerType === 'mouse' && e.evt.button !== 0) {
        return;
      }

      if (e.evt.pointerType === 'pen' && e.evt.pressure <= 0.05) {
        return;
      }

      if (
        e.evt.pointerType === 'touch' &&
        Object.keys(this.pointers).length > 1
      ) {
        return;
      }

      const selectedGroup = this.instance.getInstanceRecursive(e.target);

      if (
        !(e.target instanceof Konva.Stage) &&
        !(selectedGroup && selectedGroup.getAttrs().nodeType === 'frame')
      ) {
        return;
      }

      const intStage = this.instance.getStage();

      x1 = intStage.getRelativePointerPosition()?.x ?? 0;
      y1 = intStage.getRelativePointerPosition()?.y ?? 0;
      x2 = intStage.getRelativePointerPosition()?.x ?? 0;
      y2 = intStage.getRelativePointerPosition()?.y ?? 0;

      this.selectionRectangle.strokeWidth(1 / stage.scaleX());
      this.selectionRectangle.dash([12 / stage.scaleX(), 4 / stage.scaleX()]);
      this.selectionRectangle.width(0);
      this.selectionRectangle.height(0);
      this.selecting = true;

      this.instance.emitEvent<WeaveNodesSelectionPluginOnSelectionStateEvent>(
        'onSelectionState',
        true
      );
    });

    const handleMouseMove = (
      e: KonvaEventObject<PointerEvent, Konva.Stage>
    ) => {
      if (this.selectionTriggered) {
        this.selectionTriggered = false;
        this.selectionRectangle.setAttrs({
          visible: false,
        });
        return;
      }

      if (!this.initialized) {
        return;
      }

      if (!this.active) {
        return;
      }

      if (e.evt.pointerType === 'pen' && e.evt.pressure <= 0.05) {
        return;
      }

      if (
        e.evt.pointerType === 'touch' &&
        Object.keys(this.pointers).length > 1
      ) {
        return;
      }

      const contextMenuPlugin = this.instance.getPlugin('contextMenu') as
        | WeaveContextMenuPlugin
        | undefined;

      if (contextMenuPlugin && contextMenuPlugin.isContextMenuVisible()) {
        this.selecting = false;
        return;
      }

      // do nothing if we didn't start selection
      if (!this.selecting) {
        this.cameFromSelectingMultiple = false;
        return;
      }

      const intStage = this.instance.getStage();

      x2 = intStage.getRelativePointerPosition()?.x ?? 0;
      y2 = intStage.getRelativePointerPosition()?.y ?? 0;

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
      delete this.pointers[e.evt.pointerId];

      if (this.selectionTriggered) {
        this.selectionTriggered = false;
        this.selectionRectangle.setAttrs({
          visible: false,
        });
        return;
      }

      if (!this.initialized) {
        return;
      }

      if (!this.active) {
        return;
      }

      if (!this.selecting) {
        return;
      }

      if (e.evt.pointerType === 'pen' && e.evt.pressure > 0) {
        return;
      }

      if (
        e.evt.pointerType === 'touch' &&
        Object.keys(this.pointers).length + 1 > 1
      ) {
        return;
      }

      const contextMenuPlugin = this.instance.getPlugin('contextMenu') as
        | WeaveContextMenuPlugin
        | undefined;

      if (contextMenuPlugin && contextMenuPlugin.isContextMenuVisible()) {
        this.selecting = false;
        return;
      }

      this.selecting = false;

      this.instance.emitEvent<WeaveNodesSelectionPluginOnSelectionStateEvent>(
        'onSelectionState',
        false
      );

      if (!this.selectionRectangle.visible()) {
        this.cameFromSelectingMultiple = false;
        return;
      }

      this.selectionRectangle.visible(false);
      const shapes = stage.find((node: Konva.Node) => {
        return (
          ['Shape', 'Group'].includes(node.getType()) &&
          typeof node.getAttrs().id !== 'undefined'
        );
      });
      const box = this.selectionRectangle.getClientRect();
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
      const framesNodes = selected.filter((shape) => {
        return (
          shape instanceof Konva.Rect && shape.getAttrs().nodeType === 'frame'
        );
      });

      let framesNodesIds = framesNodes
        .map((shape) => {
          if (
            shape.getAttrs().nodeType === 'frame' &&
            shape.getAttrs().nodeId
          ) {
            return stage.findOne(`#${shape.getAttrs().nodeId}`) as Konva.Group;
          }
          return shape;
        })
        .filter((shape) => {
          return shape.getAttrs().nodeType === 'frame';
        })
        .map((shape) => {
          return shape.getAttrs().id;
        });
      const uniqueFramesNodesIds = new Set(framesNodesIds);
      framesNodesIds = Array.from(uniqueFramesNodesIds);

      const otherNodes = selected.filter(
        (shape) => shape.getAttrs().nodeType !== 'frame'
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
          !framesNodesIds.includes(parent?.getAttrs().id) &&
          // parent.getAttrs().nodeType !== 'frame' &&
          !node.getAttrs().locked
        ) {
          selectedNodes.add(node);
        }
      });

      framesNodes.forEach((node: Konva.Node) => {
        const frameNode: Konva.Group = node as Konva.Group;
        if (!frameNode.getAttrs().locked) {
          selectedNodes.add(frameNode);
        }
      });

      this.selecting = false;
      this.tr.nodes([...selectedNodes]);
      this.triggerSelectedNodesEvent();

      stage.container().tabIndex = 1;
      stage.container().focus();
    });

    stage.on('pointerclick', (e) => {
      e.cancelBubble = true;
      this.selectionTriggered = false;

      if (!this.enabled) {
        return;
      }

      if (this.instance.getActiveAction() !== 'selectionTool') {
        return;
      }

      if (this.dragging) {
        return;
      }

      const contextMenuPlugin = this.instance.getPlugin('contextMenu') as
        | WeaveContextMenuPlugin
        | undefined;

      if (contextMenuPlugin && contextMenuPlugin.isContextMenuVisible()) {
        this.selecting = false;
        return;
      }

      if (this.cameFromSelectingMultiple) {
        this.cameFromSelectingMultiple = false;
        return;
      }

      let selectedGroup: Konva.Node | undefined = undefined;
      const mousePos = stage.getPointerPosition();

      if (mousePos) {
        const allInter = stage.getAllIntersections(mousePos);
        if (allInter && allInter.length === 1) {
          selectedGroup = this.instance.getInstanceRecursive(allInter[0]);
        }
      }

      if (!this.initialized) {
        return;
      }

      if (e.evt.pointerType === 'mouse' && e.evt.button && e.evt.button !== 0) {
        return;
      }

      // if click on empty area - remove all selections
      if (e.target instanceof Konva.Stage && !selectedGroup) {
        e.evt.preventDefault();
        this.tr.nodes([]);
        this.triggerSelectedNodesEvent();

        // Check if context menu is triggered on this same event
        if (contextMenuPlugin && !contextMenuPlugin.isTapHold()) {
          this.instance.emitEvent<WeaveNodesSelectionPluginOnStageSelectionEvent>(
            'onStageSelection'
          );
        }

        return false;
      }

      let areNodesSelected = false;

      let nodeTargeted =
        selectedGroup && !(selectedGroup.getAttrs().active ?? false)
          ? selectedGroup
          : e.target;

      // Check if clicked on transformer
      if (nodeTargeted.getParent() instanceof Konva.Transformer) {
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

      let nodesSelected = 0;

      // do we pressed shift or ctrl?
      const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
      const nodeSelectedIndex = this.tr.nodes().findIndex((node) => {
        return node.getAttrs().id === nodeTargeted.getAttrs().id;
      });
      const isSelected = nodeSelectedIndex !== -1;

      if (nodeTargeted.getAttrs().locked) {
        return;
      }

      if (!metaPressed) {
        // if no key pressed and the node is not selected
        // select just one
        this.tr.nodes([nodeTargeted]);

        nodesSelected = this.tr.nodes().length;

        this.tr.show();
        areNodesSelected = true;
      } else if (metaPressed && isSelected) {
        // if we pressed keys and node was selected
        // we need to remove it from selection:
        const nodes = this.tr.nodes().slice(); // use slice to have new copy of array
        // remove node from array
        nodes.splice(nodes.indexOf(nodeTargeted), 1);
        this.tr.nodes(nodes);

        nodesSelected = this.tr.nodes().length;

        areNodesSelected = true;
      } else if (metaPressed && !isSelected) {
        // add the node into selection
        const nodes = this.tr.nodes().concat([nodeTargeted]);
        this.tr.nodes(nodes);

        nodesSelected = this.tr.nodes().length;

        areNodesSelected = true;
      }

      if (
        (nodesSelected > 1 &&
          !this.config.transformations.multipleSelection.enabled) ||
        (nodesSelected === 1 &&
          !this.config.transformations.singleSelection.enabled)
      ) {
        this.tr.enabledAnchors([]);
      }
      if (
        (nodesSelected > 1 &&
          this.config.transformations.multipleSelection.enabled) ||
        (nodesSelected === 1 &&
          this.config.transformations.singleSelection.enabled)
      ) {
        this.tr.enabledAnchors(this.defaultEnabledAnchors);
      }
      if (nodesSelected === 1) {
        this.tr.setAttrs({
          ...nodeTargeted.getTransformerProperties(),
        });
        this.tr.forceUpdate();
      }

      if (areNodesSelected) {
        stage.container().tabIndex = 1;
        stage.container().focus();
        stage.container().style.cursor = 'grab';
      }

      this.selectionTriggered = true;

      this.triggerSelectedNodesEvent();
    });
  }

  getTransformer(): Konva.Transformer {
    return this.tr;
  }

  setSelectedNodes(nodes: Konva.Node[]): void {
    this.tr.setNodes(nodes);

    const nodesSelected = nodes.length;

    if (
      (nodesSelected > 1 &&
        !this.config.transformations.multipleSelection.enabled) ||
      (nodesSelected === 1 &&
        !this.config.transformations.singleSelection.enabled)
    ) {
      this.tr.enabledAnchors([]);
    }
    if (
      (nodesSelected > 1 &&
        this.config.transformations.multipleSelection.enabled) ||
      (nodesSelected === 1 &&
        this.config.transformations.singleSelection.enabled)
    ) {
      this.tr.enabledAnchors(this.defaultEnabledAnchors);
    }
    if (nodesSelected === 1) {
      this.tr.setAttrs({
        ...nodes[0].getTransformerProperties(),
      });
      this.tr.forceUpdate();
    }

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
}
