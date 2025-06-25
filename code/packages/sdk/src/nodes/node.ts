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
  WEAVE_DEFAULT_TRANSFORM_PROPERTIES,
} from '@inditextech/weave-types';
import { type Logger } from 'pino';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import Konva from 'konva';
import { WeaveCopyPasteNodesPlugin } from '@/plugins/copy-paste-nodes/copy-paste-nodes';
import type { WeaveNodesSelectionPluginOnNodesChangeEvent } from '@/plugins/nodes-selection/types';
import {
  checkIfOverContainer,
  clearContainerTargets,
  moveNodeToContainer,
} from '@/utils';
import type { WeaveNodesSnappingPlugin } from '@/plugins/nodes-snapping/nodes-snapping';
import { throttle } from 'lodash';
import type { KonvaEventObject } from 'konva/lib/Node';

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
      WEAVE_DEFAULT_TRANSFORM_PROPERTIES,
      ...transform,
    };
  };
  Konva.Node.prototype.getRealClientRect = function (config) {
    return this.getClientRect(config);
  };
  Konva.Node.prototype.movedToContainer = function () {};
  Konva.Node.prototype.updatePosition = function () {};
  Konva.Node.prototype.triggerCrop = function () {};
  Konva.Node.prototype.closeCrop = function () {};
  Konva.Node.prototype.resetCrop = function () {};
};

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

    if (!selectionPlugin) {
      throw new Error('WeaveNodesSelectionPlugin plugin not found');
    }

    return selectionPlugin;
  }

  isSelecting(): boolean {
    return this.instance.getActiveAction() === 'selectionTool';
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
    node.getTransformerProperties = () => {
      return WEAVE_DEFAULT_TRANSFORM_PROPERTIES;
    };
    node.movedToContainer = () => {};
    node.updatePosition = () => {};
    node.resetCrop = () => {};
  }

  isNodeSelected(ele: Konva.Node): boolean {
    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    let selected: boolean = false;
    if (
      selectionPlugin &&
      selectionPlugin.getSelectedNodes().length === 1 &&
      selectionPlugin.getSelectedNodes()[0].getAttrs().id === ele.getAttrs().id
    ) {
      selected = true;
    }

    return selected;
  }

  protected scaleReset(node: Konva.Node): void {
    node.width(Math.max(5, node.width() * node.scaleX()));
    node.height(Math.max(5, node.height() * node.scaleY()));
    // reset scale to 1
    node.scaleX(1);
    node.scaleY(1);
  }

  setupDefaultNodeEvents(node: Konva.Node): void {
    this.previousPointer = null;

    this.instance.addEventListener<WeaveNodesSelectionPluginOnNodesChangeEvent>(
      'onNodesChange',
      () => {
        if (this.isSelecting() && this.isNodeSelected(node)) {
          node.draggable(true);
          return;
        }
        node.draggable(false);
      }
    );

    let transforming = false;

    node.on('transformstart', () => {
      transforming = true;
    });

    const handleTransform = (e: KonvaEventObject<Event, Konva.Node>) => {
      const node = e.target;

      const nodesSelectionPlugin =
        this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

      const nodesSnappingPlugin =
        this.instance.getPlugin<WeaveNodesSnappingPlugin>('nodesSnapping');

      if (
        nodesSelectionPlugin &&
        this.isSelecting() &&
        this.isNodeSelected(node)
      ) {
        nodesSelectionPlugin.getTransformer().forceUpdate();
      }

      if (
        nodesSnappingPlugin &&
        transforming &&
        this.isSelecting() &&
        this.isNodeSelected(node)
      ) {
        nodesSnappingPlugin.evaluateGuidelines(e);
      }

      if (this.isSelecting() && this.isNodeSelected(node)) {
        this.scaleReset(node);

        const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
          node.getAttrs().nodeType
        );
        if (nodeHandler) {
          this.instance.updateNode(
            nodeHandler.serialize(node as WeaveElementInstance)
          );
        }
      }
    };

    node.on('transform', throttle(handleTransform, 100));

    node.on('transformend', (e) => {
      const node = e.target;

      transforming = false;

      const nodesSelectionPlugin =
        this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

      const nodesSnappingPlugin =
        this.instance.getPlugin<WeaveNodesSnappingPlugin>('nodesSnapping');

      if (nodesSnappingPlugin) {
        nodesSnappingPlugin.cleanupEvaluateGuidelines();
      }

      if (nodesSelectionPlugin) {
        nodesSelectionPlugin.getTransformer().forceUpdate();
      }

      const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
        node.getAttrs().nodeType
      );
      if (nodeHandler) {
        this.instance.updateNode(
          nodeHandler.serialize(node as WeaveElementInstance)
        );
      }
    });

    node.on('dragstart', (e) => {
      const stage = this.instance.getStage();
      if (stage.isMouseWheelPressed()) {
        e.cancelBubble = true;
        node.stopDrag();
        return;
      }
    });

    const handleDragMove = (e: KonvaEventObject<DragEvent, Konva.Node>) => {
      const stage = this.instance.getStage();
      if (stage.isMouseWheelPressed()) {
        e.cancelBubble = true;
        node.stopDrag();
        return;
      }

      if (this.isSelecting() && this.isNodeSelected(node)) {
        clearContainerTargets(this.instance);

        const layerToMove = checkIfOverContainer(this.instance, e.target);

        if (layerToMove) {
          layerToMove.fire(WEAVE_NODE_CUSTOM_EVENTS.onTargetEnter, {
            bubbles: true,
          });
        }

        const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
          node.getAttrs().nodeType
        );
        if (nodeHandler) {
          this.instance.updateNode(
            nodeHandler.serialize(node as WeaveElementInstance)
          );
        }
      }
    };

    node.on('dragmove', throttle(handleDragMove, 100));

    node.on('dragend', (e) => {
      if (this.isSelecting() && this.isNodeSelected(node)) {
        clearContainerTargets(this.instance);

        const nodesSnappingPlugin =
          this.instance.getPlugin<WeaveNodesSnappingPlugin>('nodesSnapping');

        if (nodesSnappingPlugin) {
          nodesSnappingPlugin.cleanupEvaluateGuidelines();
        }

        const containerToMove = moveNodeToContainer(this.instance, e.target);

        if (containerToMove) {
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
        return;
      }
      if (this.isPasting()) {
        const stage = this.instance.getStage();
        this.previousPointer = stage.container().style.cursor;
        stage.container().style.cursor = 'crosshair';
        e.cancelBubble = true;
        return;
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
        return;
      }
      if (this.isPasting()) {
        const stage = this.instance.getStage();
        this.previousPointer = stage.container().style.cursor;
        stage.container().style.cursor = 'crosshair';
        e.cancelBubble = true;
        return;
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
