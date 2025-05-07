// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveSelection,
  type NodeSerializable,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import Konva from 'konva';
import { WeavePlugin } from '@/plugins/plugin';
import {
  WEAVE_NODES_SELECTION_KEY,
  WEAVE_NODES_SELECTION_LAYER_ID,
} from './constants';
import {
  type WeaveNodesSelectionPluginCallbacks,
  type WeaveNodesSelectionPluginConfig,
  type WeaveNodesSelectionPluginParams,
} from './types';
import { WeaveContextMenuPlugin } from '../context-menu/context-menu';
import type { WeaveNode } from '@/nodes/node';
import type { WeaveNodesSnappingPlugin } from '../nodes-snapping/nodes-snapping';

export class WeaveNodesSelectionPlugin extends WeavePlugin {
  private tr!: Konva.Transformer;
  private config!: WeaveNodesSelectionPluginConfig;
  private selectionRectangle!: Konva.Rect;
  private active: boolean;
  private cameFromSelectingMultiple: boolean;
  private selecting: boolean;
  private initialized: boolean;
  private callbacks: WeaveNodesSelectionPluginCallbacks;
  onRender: undefined;

  constructor(params: WeaveNodesSelectionPluginParams) {
    super();

    const { config, callbacks } = params ?? {};

    this.config = {
      transformer: {
        rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315, 360],
        rotationSnapTolerance: 3,
        ignoreStroke: true,
        flipEnabled: false,
        keepRatio: false,
        useSingleNodeRotation: true,
        shouldOverdrawWholeArea: true,
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
        borderStroke: '#1e40afff',
        ...config?.transformer,
      },
    };
    this.callbacks = callbacks ?? {};
    this.active = false;
    this.cameFromSelectingMultiple = false;
    this.selecting = false;
    this.initialized = false;
    this.enabled = false;
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

    tr.on('transform', (e) => {
      const node = e.target;

      const nodesSnappingPlugin =
        this.instance.getPlugin<WeaveNodesSnappingPlugin>('nodesSnapping');

      if (
        nodesSnappingPlugin &&
        this.isSelecting() &&
        this.isNodeSelected(node)
      ) {
        nodesSnappingPlugin.evaluateGuidelines(e);
      }

      if (this.isSelecting() && this.isNodeSelected(node)) {
        const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
          node.getAttrs().nodeType
        );
        this.instance.updateNode(
          nodeHandler.serialize(node as WeaveElementInstance)
        );
        e.cancelBubble = true;
      }
    });

    tr.on('transformend', (e) => {
      const node = e.target;

      const nodesSnappingPlugin =
        this.instance.getPlugin<WeaveNodesSnappingPlugin>('nodesSnapping');

      if (
        nodesSnappingPlugin &&
        this.isSelecting() &&
        this.isNodeSelected(node)
      ) {
        nodesSnappingPlugin.cleanupEvaluateGuidelines();
      }
    });

    tr.on('mouseenter', (e) => {
      const stage = this.instance.getStage();
      stage.container().style.cursor = 'grab';
      e.cancelBubble = true;
    });

    tr.on('mouseleave', (e) => {
      const stage = this.instance.getStage();
      stage.container().style.cursor = 'default';
      e.cancelBubble = true;
    });

    this.tr = tr;
    this.selectionRectangle = selectionRectangle;

    this.tr.on('dblclick dbltap', (evt) => {
      evt.cancelBubble = true;

      if (this.tr.getNodes().length === 1) {
        const node = this.tr.getNodes()[0];
        node.fire('dblclick');
      }
    });

    this.initEvents();

    this.initialized = true;

    this.instance.on('onRender', () => {
      this.triggerSelectedNodesEvent();
    });

    this.instance.on(
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

    this.instance.on('onNodeRemoved', (node: NodeSerializable) => {
      const selectedNodes = this.getSelectedNodes();
      const newSelectedNodes = selectedNodes.filter((actNode) => {
        return actNode.getAttrs().id !== node.id;
      });

      this.tr.nodes(newSelectedNodes);
      this.triggerSelectedNodesEvent();

      stage.container().tabIndex = 1;
      stage.container().focus();
      stage.container().style.cursor = 'default';
    });
  }

  private getLayer() {
    const stage = this.instance.getStage();
    return stage.findOne(`#${this.getLayerName()}`) as Konva.Layer | undefined;
  }

  private triggerSelectedNodesEvent() {
    const selectedNodes: WeaveSelection[] = this.tr.getNodes().map((node) => {
      const nodeType = node.getAttr('nodeType');
      const nodeHandler = this.instance.getNodeHandler<WeaveNode>(nodeType);
      return {
        instance: node as Konva.Shape | Konva.Group,
        node: nodeHandler.serialize(node as Konva.Shape | Konva.Group),
      };
    });

    this.callbacks?.onNodesChange?.(selectedNodes);
    this.instance.emitEvent('onNodesChange', selectedNodes);
  }

  private initEvents() {
    let x1: number, y1: number, x2: number, y2: number;
    this.selecting = false;

    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const selectedNodes = this.getSelectedNodes();
        const mappedSelectedNodes = selectedNodes.map((node) => {
          const handler = this.instance.getNodeHandler<WeaveNode>(
            node.getAttrs().nodeType
          );
          return handler.serialize(node);
        });
        this.instance.removeNodes(mappedSelectedNodes);
        this.tr.nodes([]);
        this.triggerSelectedNodesEvent();
        return;
      }
    });

    stage.on('mousedown touchstart', (e) => {
      if (!this.initialized) {
        return;
      }

      if (!this.active) {
        return;
      }

      if (e.evt.button && e.evt.button !== 0) {
        return;
      }

      const selectedGroup = this.instance.getInstanceRecursive(e.target);

      if (
        !(e.target instanceof Konva.Stage) &&
        !(selectedGroup && selectedGroup.getAttrs().nodeType === 'frame')
      ) {
        return;
      }

      e.evt.preventDefault();

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

      if (!(e.target instanceof Konva.Stage)) {
        this.cameFromSelectingMultiple = true;
      }
    });

    stage.on('mousemove touchmove', (e) => {
      if (!this.initialized) {
        return;
      }

      if (!this.active) {
        return;
      }

      // do nothing if we didn't start selection
      if (!this.selecting) {
        this.cameFromSelectingMultiple = false;
        return;
      }

      e.evt.preventDefault();

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
    });

    stage.on('mouseup touchend', (e) => {
      if (!this.initialized) {
        return;
      }

      if (!this.active) {
        return;
      }

      this.selecting = false;

      if (!this.selectionRectangle.visible()) {
        this.cameFromSelectingMultiple = false;
        return;
      }

      e.evt.preventDefault();

      this.tr.nodes([]);

      this.selectionRectangle.visible(false);
      const shapes = stage.find((node: Konva.Node) => {
        return (
          ['Shape', 'Group'].includes(node.getType()) &&
          typeof node.getAttrs().id !== 'undefined'
        );
      });
      const box = this.selectionRectangle.getClientRect();
      const selected = shapes.filter((shape) => {
        const parent = this.instance.getInstanceRecursive(
          shape.getParent() as Konva.Node
        );
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
      const framesNodes = selected.filter(
        (shape) => shape.getAttrs().nodeType === 'frame'
      );
      const framesNodesIds = selected.map((shape) => shape.getAttrs().id);
      const otherNodes = selected.filter(
        (shape) => shape.getAttrs().nodeType !== 'frame'
      );

      otherNodes.forEach((node) => {
        const parent = this.instance.getInstanceRecursive(
          node.getParent() as Konva.Node
        );
        if (!framesNodesIds.includes(parent?.getAttrs().id)) {
          selectedNodes.add(node);
        }
      });

      framesNodes.forEach((node: Konva.Node) => {
        const frameNode: Konva.Group = node as Konva.Group;
        selectedNodes.add(frameNode);
      });

      this.tr.nodes([...selectedNodes]);
      this.triggerSelectedNodesEvent();

      stage.container().tabIndex = 1;
      stage.container().focus();
    });

    stage.on('click tap', (e) => {
      if (!this.enabled) {
        return;
      }

      const contextMenuPlugin = this.instance.getPlugin('contextMenu') as
        | WeaveContextMenuPlugin
        | undefined;

      if (this.cameFromSelectingMultiple) {
        this.cameFromSelectingMultiple = false;
        return;
      }

      let selectedGroup: Konva.Node | undefined = undefined;
      const mousePos = stage.getPointerPosition();

      if (mousePos) {
        const inter = stage.getIntersection(mousePos);
        if (inter) {
          selectedGroup = this.instance.getInstanceRecursive(inter);
        }
      }

      if (!this.initialized) {
        return;
      }

      if (e.evt.button && e.evt.button !== 0) {
        return;
      }

      // if we are selecting with rect, do nothing
      if (this.selectionRectangle.visible()) {
        return;
      }

      // if click on empty area - remove all selections
      if (e.target instanceof Konva.Stage && !selectedGroup) {
        this.tr.nodes([]);
        this.triggerSelectedNodesEvent();

        // Check if context menu is triggered on this same event
        if (contextMenuPlugin && !contextMenuPlugin.isTapHold()) {
          this.callbacks?.onStageSelection?.();
          this.instance.emitEvent('onStageSelection', undefined);
        }

        return;
      }

      // do we pressed shift or ctrl?
      const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
      const isSelected = this.tr.nodes().indexOf(e.target) >= 0;
      let areNodesSelected = false;

      let nodeToAdd =
        selectedGroup && !(selectedGroup.getAttrs().active ?? false)
          ? selectedGroup
          : e.target;

      // Check if clicked on transformer
      if (nodeToAdd.getParent() instanceof Konva.Transformer) {
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

        // Check if transformer has a frame selected
        if (targetNode && targetNode.getAttrs().nodeType) {
          this.tr.nodes([]);
          this.triggerSelectedNodesEvent();

          nodeToAdd = targetNode;
        }
      }

      if (!nodeToAdd.getAttrs().nodeType) {
        return;
      }

      if (!metaPressed && !isSelected) {
        // if no key pressed and the node is not selected
        // select just one
        this.tr.nodes([nodeToAdd]);
        this.tr.show();
        areNodesSelected = true;
      } else if (metaPressed && isSelected) {
        // if we pressed keys and node was selected
        // we need to remove it from selection:
        const nodes = this.tr.nodes().slice(); // use slice to have new copy of array
        // remove node from array
        nodes.splice(nodes.indexOf(nodeToAdd), 1);
        this.tr.nodes(nodes);
        areNodesSelected = true;
      } else if (metaPressed && !isSelected) {
        // add the node into selection
        const nodes = this.tr.nodes().concat([nodeToAdd]);
        this.tr.nodes(nodes);
        areNodesSelected = true;
      }

      if (areNodesSelected) {
        stage.container().tabIndex = 1;
        stage.container().focus();
        stage.container().style.cursor = 'grab';
      }

      this.triggerSelectedNodesEvent();
    });
  }

  getTransformer(): Konva.Transformer {
    return this.tr;
  }

  setSelectedNodes(nodes: Konva.Node[]): void {
    this.tr.setNodes(nodes);
    this.triggerSelectedNodesEvent();
  }

  getSelectedNodes() {
    return this.tr.nodes() as (Konva.Group | Konva.Shape)[];
  }

  removeSelectedNodes(): void {
    const selectedNodes = this.tr.getNodes();
    for (const node of selectedNodes) {
      node.destroy();
    }
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
