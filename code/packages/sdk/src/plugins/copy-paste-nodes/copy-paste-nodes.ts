import { WeavePlugin } from '@/plugins/plugin';
import Konva from 'konva';
import { NodeSerializable } from '@/types';
import { COPY_PASTE_NODES_PLUGIN_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import { WeaveNodesSelectionChangeCallback } from '../nodes-selection/types';
import {
  WeaveCopyPasteNodesPluginCallbacks,
  WeaveCopyPasteNodesPluginState,
} from './types';

export class WeaveCopyPasteNodesPlugin extends WeavePlugin {
  protected selectedElements: (Konva.Group | Konva.Shape)[];
  protected state: WeaveCopyPasteNodesPluginState;
  private callbacks: WeaveCopyPasteNodesPluginCallbacks | undefined;
  getLayerName: undefined;
  initLayer: undefined;
  render: undefined;

  constructor(callbacks?: WeaveCopyPasteNodesPluginCallbacks) {
    super();

    this.callbacks = callbacks;
    this.state = COPY_PASTE_NODES_PLUGIN_STATE.IDLE;
    this.selectedElements = [];
  }

  registersLayers() {
    return false;
  }

  getName() {
    return 'copyPasteNodes';
  }

  init() {
    this.initEvents();
  }

  private initEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancel();
        return;
      }

      if (e.key === 'c' && (e.metaKey || e.ctrlKey)) {
        this.performCopy();
        return;
      }
      if (e.key === 'v' && (e.metaKey || e.ctrlKey)) {
        this.performPaste();
        return;
      }
    });

    stage.on('click tap', (e) => {
      e.evt.preventDefault();

      if (this.state === COPY_PASTE_NODES_PLUGIN_STATE.IDLE) {
        return;
      }

      if (this.state === COPY_PASTE_NODES_PLUGIN_STATE.PASTING) {
        this.handlePaste();
        return;
      }
    });

    this.instance.addEventListener<WeaveNodesSelectionChangeCallback>(
      'onNodesChange',
      () => {
        this.callbacks?.onCanCopyChange?.(this.canCopy());
        this.callbacks?.onCanPasteChange?.(
          this.canPaste(),
          this.mapToPasteNodes()
        );
      }
    );
  }

  private mapToPasteNodes() {
    return this.selectedElements.map((node) => ({
      konvaNode: node,
      node: node.getAttrs() as NodeSerializable,
    }));
  }

  private setState(state: WeaveCopyPasteNodesPluginState) {
    this.state = state;
  }

  private handlePaste() {
    const { mousePoint, container } = this.instance.getMousePointer();

    this.instance.cloneNodes(this.selectedElements, container, mousePoint);

    this.selectedElements = [];

    this.cancel();
  }

  private performCopy() {
    this.callbacks?.onCanCopyChange?.(this.canCopy());
    this.callbacks?.onCanPasteChange?.(this.canPaste(), this.mapToPasteNodes());

    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';
    stage.container().focus();

    this.setState(COPY_PASTE_NODES_PLUGIN_STATE.IDLE);

    const nodesSelectionPlugin = this.getNodesSelectionPlugin();
    const selectedNodes = nodesSelectionPlugin.getSelectedNodes();
    if (selectedNodes.length === 0) {
      return;
    }

    this.selectedElements = selectedNodes;

    this.callbacks?.onCanCopyChange?.(this.canCopy());
    this.callbacks?.onCanPasteChange?.(this.canPaste(), this.mapToPasteNodes());
  }

  private performPaste() {
    this.callbacks?.onCanCopyChange?.(this.canCopy());
    this.callbacks?.onCanPasteChange?.(this.canPaste(), this.mapToPasteNodes());

    const stage = this.instance.getStage();

    if (this.selectedElements.length === 0) {
      return;
    }

    stage.container().style.cursor = 'crosshair';
    stage.container().focus();

    this.setState(COPY_PASTE_NODES_PLUGIN_STATE.PASTING);
  }

  copy() {
    this.performCopy();
  }

  paste() {
    this.performPaste();
  }

  getSelectedNodes() {
    return this.mapToPasteNodes();
  }

  canCopy() {
    const nodesSelectionPlugin = this.getNodesSelectionPlugin();
    const selectedNodes = nodesSelectionPlugin.getSelectedNodes();
    return (
      this.state === COPY_PASTE_NODES_PLUGIN_STATE.IDLE &&
      selectedNodes.length > 0
    );
  }

  canPaste() {
    return this.selectedElements.length > 0;
  }

  private cancel() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';
    stage.container().focus();

    this.selectedElements = [];
    this.setState(COPY_PASTE_NODES_PLUGIN_STATE.IDLE);

    this.callbacks?.onCanCopyChange?.(this.canCopy());
    this.callbacks?.onCanPasteChange?.(this.canPaste(), this.mapToPasteNodes());
  }

  private getNodesSelectionPlugin() {
    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (!nodesSelectionPlugin) {
      throw new Error('Nodes selection plugin not found');
    }
    return nodesSelectionPlugin;
  }
}
