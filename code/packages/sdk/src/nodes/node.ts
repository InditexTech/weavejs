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

    node.on('dragmove', (e) => {
      if (this.isSelecting() && this.isNodeSelected(node)) {
        clearContainerTargets(this.instance);

        const layerToMove = checkIfOverContainer(this.instance, e.target);

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
        clearContainerTargets(this.instance);

        const layerToMove = moveNodeToContainer(this.instance, e.target);

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
