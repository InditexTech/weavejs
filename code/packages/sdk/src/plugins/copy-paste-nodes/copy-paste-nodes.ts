import { WeavePlugin } from '@/plugins/plugin';
import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import {
  NodeSerializable,
  WeaveElementInstance,
  WeaveStateElement,
} from '@/types';
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

    document.onpaste = async (event) => {
      console.log('ON PASTE', event);

      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      try {
        const object = JSON.parse(await navigator.clipboard.readText());
        if (object.weave) {
          // TODO: Handle paste for single item, select where to put it
          for (const element of Object.keys(object.weave)) {
            const node = object.weave[element];
            const newNodeId = uuidv4();
            node.key = newNodeId;
            node.props.id = newNodeId;
            node.props.x = 0;
            node.props.y = 0;
            this.instance.addNode(node);
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
      } catch (ex) {}

      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          console.log({ item });
          if (item.types.includes('image/png')) {
            const pngImage = await item.getType('image/png');
            this.callbacks?.onPasteExternalImage?.(pngImage);
            break;
          }
          if (item.types.includes('image/jpeg')) {
            const jpegImage = await item.getType('image/jpeg');
            this.callbacks?.onPasteExternalImage?.(jpegImage);
            break;
          }
          if (item.types.includes('image/gif')) {
            const gifImage = await item.getType('image/gif');
            this.callbacks?.onPasteExternalImage?.(gifImage);
            break;
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
      } catch (ex) {}
    };

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

  private async performCopy() {
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

    const copyClipboard: { weave: Record<string, WeaveStateElement> } = {
      weave: {},
    };
    for (const node of this.selectedElements) {
      const nodeHandler = this.instance.getNodeHandler(
        node.getAttrs().nodeType
      );
      const nodeJson = nodeHandler.toNode(node as WeaveElementInstance);
      copyClipboard.weave[node.getAttrs().id ?? ''] = nodeJson;
    }

    console.log('CP', { copyClipboard, json: JSON.stringify(copyClipboard) });

    await navigator.clipboard.writeText(JSON.stringify(copyClipboard));

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

  async copy() {
    await this.performCopy();
  }

  paste() {
    this.performPaste();
  }

  getSelectedNodes() {
    return this.mapToPasteNodes();
  }

  isPasting() {
    return this.state === COPY_PASTE_NODES_PLUGIN_STATE.PASTING;
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
