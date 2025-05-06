// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave } from '@/weave';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
  type WeaveNodeBase,
  WEAVE_NODE_LAYER_ID,
  WEAVE_NODE_CUSTOM_EVENTS,
} from '@inditextech/weave-types';
import { type Logger } from 'pino';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import Konva from 'konva';
import { type WeaveNodesSelectionChangeCallback } from '@/plugins/nodes-selection/types';
import { WeaveCopyPasteNodesPlugin } from '@/plugins/copy-paste-nodes/copy-paste-nodes';
// import type { WeaveNodesSnappingPlugin } from '@/plugins/nodes-snapping/nodes-snapping';

export abstract class WeaveNode implements WeaveNodeBase {
  protected instance!: Weave;
  protected nodeType!: string;
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

  getSelectionPlugin(): WeaveNodesSelectionPlugin {
    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    return selectionPlugin;
  }

  isSelecting(): boolean {
    return this.instance.getActiveAction() === 'selectionTool';
  }

  isPasting(): boolean {
    const copyPastePlugin =
      this.instance.getPlugin<WeaveCopyPasteNodesPlugin>('copyPasteNodes');
    return copyPastePlugin.isPasting();
  }

  isNodeSelected(ele: Konva.Node): boolean {
    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    let selected: boolean = false;
    if (
      selectionPlugin.getSelectedNodes().length === 1 &&
      selectionPlugin.getSelectedNodes()[0].getAttrs().id === ele.getAttrs().id
    ) {
      selected = true;
    }

    return selected;
  }

  clearContainerTargets(): void {
    const getContainers = this.instance.getContainerNodes();
    for (const container of getContainers) {
      container.fire(WEAVE_NODE_CUSTOM_EVENTS.onTargetLeave, { bubbles: true });
    }
  }

  checkIfOverContainer(node: Konva.Node): Konva.Node | undefined {
    const nodesIntersected = this.instance.pointIntersectsContainerElement();

    let nodeActualContainer: Konva.Node | undefined =
      node.getParent() as Konva.Node;
    if (nodeActualContainer?.getAttrs().nodeId) {
      nodeActualContainer = this.instance
        .getStage()
        .findOne(`#${nodeActualContainer.getAttrs().nodeId}`);
    }

    let layerToMove = undefined;
    // Move to container
    if (
      !node.getAttrs().containerId &&
      nodesIntersected &&
      nodeActualContainer?.getAttrs().id !== nodesIntersected.getAttrs().id
    ) {
      layerToMove = nodesIntersected;
    }

    return layerToMove;
  }

  moveNodeToContainer(node: Konva.Node): Konva.Node | undefined {
    const nodesIntersected = this.instance.pointIntersectsContainerElement();

    let nodeActualContainer: Konva.Node | undefined =
      node.getParent() as Konva.Node;
    if (nodeActualContainer?.getAttrs().nodeId) {
      nodeActualContainer = this.instance
        .getStage()
        .findOne(`#${nodeActualContainer.getAttrs().nodeId}`);
    }

    let layerToMove = undefined;
    // Move to container
    if (
      !node.getAttrs().containerId &&
      nodesIntersected &&
      nodeActualContainer?.getAttrs().id !== nodesIntersected.getAttrs().id
    ) {
      layerToMove = nodesIntersected;
    }
    // Move to main layer
    if (
      !nodesIntersected &&
      nodeActualContainer?.getAttrs().id !== WEAVE_NODE_LAYER_ID
    ) {
      layerToMove = this.instance.getMainLayer();
    }

    if (layerToMove) {
      const nodePos = node.getAbsolutePosition();
      const nodeRotation = node.getAbsoluteRotation();

      node.moveTo(layerToMove);
      node.setAbsolutePosition(nodePos);
      node.rotation(nodeRotation);
      node.x(node.x() - (layerToMove.getAttrs().containerOffsetX ?? 0));
      node.y(node.y() - (layerToMove.getAttrs().containerOffsetY ?? 0));

      const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
        node.getAttrs().nodeType
      );
      const actualNode = nodeHandler.serialize(node as WeaveElementInstance);

      this.instance.removeNode(actualNode);
      this.instance.addNode(actualNode, layerToMove?.getAttrs().id);
    }

    return layerToMove;
  }

  setupDefaultNodeEvents(node: Konva.Node): void {
    this.previousPointer = null;

    this.instance.addEventListener<WeaveNodesSelectionChangeCallback>(
      'onNodesChange',
      () => {
        if (this.isSelecting() && this.isNodeSelected(node)) {
          node.draggable(true);
          return;
        }
        node.draggable(false);
      }
    );

    node.on('dragmove', (e) => {
      if (this.isSelecting() && this.isNodeSelected(node)) {
        this.clearContainerTargets();

        const layerToMove = this.checkIfOverContainer(e.target);

        if (layerToMove) {
          layerToMove.fire(WEAVE_NODE_CUSTOM_EVENTS.onTargetEnter, {
            bubbles: true,
          });
        }

        this.instance.updateNode(this.serialize(node as WeaveElementInstance));
      }
    });

    node.on('dragend', (e) => {
      if (this.isSelecting() && this.isNodeSelected(node)) {
        this.clearContainerTargets();

        const layerToMove = this.moveNodeToContainer(e.target);

        if (layerToMove) {
          return;
        }

        this.instance.updateNode(this.serialize(node as WeaveElementInstance));
      }
    });

    this.previousPointer = null;

    node.on('mouseenter', (e) => {
      const realNode = this.instance.getInstanceRecursive(node);
      if (
        this.isSelecting() &&
        !this.isNodeSelected(realNode) &&
        !this.isPasting()
      ) {
        const stage = this.instance.getStage();
        this.previousPointer = stage.container().style.cursor;
        stage.container().style.cursor = 'pointer';
        e.cancelBubble = true;
      }
    });

    node.on('mouseleave', (e) => {
      const realNode = this.instance.getInstanceRecursive(node);
      if (
        this.isSelecting() &&
        !this.isNodeSelected(realNode) &&
        !this.isPasting()
      ) {
        const stage = this.instance.getStage();
        stage.container().style.cursor = this.previousPointer ?? 'default';
        this.previousPointer = null;
        e.cancelBubble = true;
      }
    });
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
        id: attrs.id ?? '',
        nodeType: attrs.nodeType,
        children: [],
      },
    };
  }
}
