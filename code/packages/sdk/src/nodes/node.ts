import { Weave } from '@/weave';
import {
  WeaveElementAttributes,
  WeaveElementInstance,
  WeaveStateElement,
} from '@/types';
import { Logger } from 'pino';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import Konva from 'konva';
import { WeaveNodesSelectionChangeCallback } from '@/plugins/nodes-selection/types';
import { WeaveCopyPasteNodesPlugin } from '@/plugins/copy-paste-nodes/copy-paste-nodes';

export abstract class WeaveNode {
  protected instance!: Weave;
  protected nodeType!: string;
  private logger!: Logger;
  protected previousPointer!: string | null;

  register(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger(this.getNodeType());
    this.instance
      .getChildLogger('node')
      .debug(`Node with type [${this.getNodeType()}] registered`);

    return this;
  }

  getNodeType() {
    return this.nodeType;
  }

  getLogger() {
    return this.logger;
  }

  getSelectionPlugin() {
    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    return selectionPlugin;
  }

  isSelecting() {
    return this.instance.getActiveAction() === 'selectionTool';
  }

  isPasting() {
    const copyPastePlugin =
      this.instance.getPlugin<WeaveCopyPasteNodesPlugin>('copyPasteNodes');
    return copyPastePlugin.isPasting();
  }

  isNodeSelected(ele: Konva.Node) {
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

  setupDefaultNodeEvents(node: Konva.Node) {
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

    node.on('transform', (e) => {
      if (this.isSelecting() && this.isNodeSelected(node)) {
        this.instance.updateNode(this.toNode(node as WeaveElementInstance));
        e.cancelBubble = true;
      }
    });

    node.on('dragmove', (e) => {
      if (this.isSelecting() && this.isNodeSelected(node)) {
        this.instance.updateNode(this.toNode(node as WeaveElementInstance));
        e.cancelBubble = true;
      }
    });

    node.on('dragend', (e) => {
      if (this.isSelecting() && this.isNodeSelected(node)) {
        this.instance.updateNode(this.toNode(node as WeaveElementInstance));
        e.cancelBubble = true;
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

  abstract createNode(
    id: string,
    props: WeaveElementAttributes
  ): WeaveStateElement;

  abstract createInstance(props: WeaveElementAttributes): WeaveElementInstance;

  abstract updateInstance(
    instance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void;

  abstract removeInstance(instance: WeaveElementInstance): void;

  abstract toNode(instance: WeaveElementInstance): WeaveStateElement;
}
