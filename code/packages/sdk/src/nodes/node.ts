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
import { WEAVE_STAGE_MODE } from './stage/constants';

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

  protected scaleReset(node: Konva.Node): void {
    node.width(Math.max(5, node.width() * node.scaleX()));
    node.height(Math.max(5, node.height() * node.scaleY()));
    // reset scale to 1
    node.scaleX(1);
    node.scaleY(1);
  }

  protected setHoverState(node: Konva.Node): void {
    const selectionPlugin = this.getSelectionPlugin();

    if (!selectionPlugin) {
      return;
    }

    if (selectionPlugin.isAreaSelecting()) {
      this.hideHoverState();
      return;
    }

    selectionPlugin.getHoverTransformer().nodes([node]);
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

        this.instance.emitEvent('onTransform', e.target);
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

        this.instance.emitEvent('onTransform', null);

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
        this.didMove = false;

        if (e.evt?.buttons === 0) {
          e.target.stopDrag();
          return;
        }

        const stage = this.instance.getStage();

        const isErasing = this.instance.getActiveAction() === 'eraseTool';

        if (isErasing) {
          e.target.stopDrag();
          return;
        }

        this.instance.emitEvent('onDrag', e.target);

        if (stage.isMouseWheelPressed()) {
          e.cancelBubble = true;
          e.target.stopDrag();
        }
      });

      const handleDragMove = (e: KonvaEventObject<DragEvent, Konva.Node>) => {
        if (e.evt?.buttons === 0) {
          e.target.stopDrag();
          return;
        }

        this.didMove = true;

        const stage = this.instance.getStage();

        const isErasing = this.instance.getActiveAction() === 'eraseTool';

        if (isErasing) {
          e.target.stopDrag();
          return;
        }

        if (stage.isMouseWheelPressed()) {
          e.cancelBubble = true;
          e.target.stopDrag();
          return;
        }

        if (
          this.isSelecting() &&
          this.isNodeSelected(node) &&
          this.getSelectionPlugin()?.getSelectedNodes().length === 1
        ) {
          clearContainerTargets(this.instance);

          const layerToMove = checkIfOverContainer(this.instance, e.target);

          if (layerToMove) {
            layerToMove.fire(WEAVE_NODE_CUSTOM_EVENTS.onTargetEnter, {
              bubbles: true,
            });
          }
        }
      };

      node.on('dragmove', throttle(handleDragMove, 100));

      node.on('dragend', (e) => {
        if (!this.didMove) {
          return;
        }

        const isErasing = this.instance.getActiveAction() === 'eraseTool';

        if (isErasing) {
          e.target.stopDrag();
          return;
        }

        this.instance.emitEvent('onDrag', null);

        if (
          this.isSelecting() &&
          this.isNodeSelected(node) &&
          this.getSelectionPlugin()?.getSelectedNodes().length === 1
        ) {
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

          this.instance.updateNode(
            this.serialize(node as WeaveElementInstance)
          );
        }
      });

      node.on('pointerover', (e) => {
        e.cancelBubble = true;

        const stage = this.instance.getStage();

        const realNode = this.instance.getInstanceRecursive(node);

        const isTargetable = !(e.target.getAttrs().isTargetable === false);
        const isLocked = realNode.getAttrs().locked ?? false;

        // Node is locked
        if (
          this.isSelecting() &&
          !this.isNodeSelected(realNode) &&
          !this.isPasting() &&
          isLocked
        ) {
          const stage = this.instance.getStage();
          stage.container().style.cursor = 'default';
        }

        // Node is not locked
        if (
          this.isSelecting() &&
          !this.isNodeSelected(realNode) &&
          !this.isPasting() &&
          isTargetable &&
          !isLocked &&
          stage.mode() === WEAVE_STAGE_MODE.normal
        ) {
          const stage = this.instance.getStage();
          stage.container().style.cursor = 'pointer';
          this.setHoverState(realNode);
        }

        if (!isTargetable) {
          this.hideHoverState();
        }

        // We're on pasting mode
        if (this.isPasting()) {
          const stage = this.instance.getStage();
          stage.container().style.cursor = 'crosshair';
        }
      });
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
}
