// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from '@/plugins/plugin';
import { v4 as uuidv4 } from 'uuid';
import { NodeSerializable, WeaveStateElement } from '@inditextech/weave-types';
import { COPY_PASTE_NODES_PLUGIN_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import {
  WeaveCopyPasteNodesPluginCallbacks,
  WeaveCopyPasteNodesPluginState,
  WeavePasteModel,
} from './types';
import { Vector2d } from 'konva/lib/types';

export class WeaveCopyPasteNodesPlugin extends WeavePlugin {
  protected state: WeaveCopyPasteNodesPluginState;
  private callbacks: WeaveCopyPasteNodesPluginCallbacks | undefined;
  private toPaste: WeavePasteModel | undefined;
  getLayerName: undefined;
  initLayer: undefined;
  render: undefined;

  constructor(callbacks?: WeaveCopyPasteNodesPluginCallbacks) {
    super();

    this.callbacks = callbacks;
    this.state = COPY_PASTE_NODES_PLUGIN_STATE.IDLE;
  }

  getName() {
    return 'copyPasteNodes';
  }

  init() {
    this.initEvents();
  }

  private readClipboardData() {
    return new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        if (typeof navigator.clipboard === 'undefined') {
          return reject(new Error('Clipboard API not supported'));
        }

        navigator.clipboard
          .readText()
          .then((text) => {
            try {
              const object = JSON.parse(text);
              if (object.weave && object.weaveMinPoint) {
                this.toPaste = {
                  weaveInstanceId: object.weaveInstanceId,
                  weave: object.weave,
                  weaveMinPoint: object.weaveMinPoint,
                };
              }
              resolve();
            } catch (ex) {
              reject(ex);
            }
          })
          .catch((error) => {
            reject(error);
          });
      });
    });
  }

  private writeClipboardData(data: string) {
    return new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        if (typeof navigator.clipboard === 'undefined') {
          return reject(new Error('Clipboard API not supported'));
        }

        navigator.clipboard
          .writeText(data)
          .then(() => {
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      });
    });
  }

  private initEvents() {
    const stage = this.instance.getStage();

    document.oncopy = async () => {
      this.performCopy();
      return;
    };

    document.onpaste = async (event) => {
      if (!this.enabled) {
        return;
      }

      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      try {
        await this.readClipboardData();
        this.performPaste();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
      } catch (ex) {
        this.callbacks?.onPaste?.(ex as Error);
        this.instance.emitEvent('onPaste', ex as Error);
      }

      try {
        const items = await navigator.clipboard.read();
        if (items && items.length === 1) {
          const item = items[0];

          this.callbacks?.onPasteExternal?.(item);
          this.instance.emitEvent('onPasteExternal', item);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
      } catch (ex) {
        this.callbacks?.onPaste?.(ex as Error);
        this.instance.emitEvent('onPaste', ex as Error);
      }
    };

    stage.container().addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancel();
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
  }

  private mapToPasteNodes() {
    const nodesSelectionPlugin = this.getNodesSelectionPlugin();
    const selectedNodes = nodesSelectionPlugin.getSelectedNodes();

    return selectedNodes.map((node) => ({
      konvaNode: node,
      node: node.getAttrs() as NodeSerializable,
    }));
  }

  private setState(state: WeaveCopyPasteNodesPluginState) {
    this.state = state;
  }

  private handlePaste() {
    if (this.toPaste) {
      const { mousePoint, container } = this.instance.getMousePointer();

      for (const element of Object.keys(this.toPaste.weave)) {
        const node = this.toPaste.weave[element];
        const newNodeId = uuidv4();
        node.key = newNodeId;
        node.props.id = newNodeId;
        node.props.x =
          mousePoint.x + (node.props.x - this.toPaste.weaveMinPoint.x);
        node.props.y =
          mousePoint.y + (node.props.y - this.toPaste.weaveMinPoint.y);
        this.instance.addNode(node, container?.getAttr('id'));

        this.callbacks?.onPaste?.();
        this.instance.emitEvent('onPaste', undefined);
      }

      this.toPaste = undefined;
    }

    this.cancel();
  }

  private async performCopy() {
    if (!this.enabled) {
      return;
    }

    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';
    stage.container().focus();

    this.setState(COPY_PASTE_NODES_PLUGIN_STATE.IDLE);

    const nodesSelectionPlugin = this.getNodesSelectionPlugin();
    const selectedNodes = nodesSelectionPlugin.getSelectedNodes();
    if (selectedNodes.length === 0) {
      return;
    }

    const copyClipboard: {
      weaveInstanceId: string;
      weave: Record<string, WeaveStateElement>;
      weaveMinPoint: Vector2d;
    } = {
      weaveInstanceId: this.instance.getId(),
      weave: {},
      weaveMinPoint: { x: 0, y: 0 },
    };

    const result = this.instance.nodesToGroupSerialized(selectedNodes);
    if (result && result.serializedNodes && result.serializedNodes.length > 0) {
      copyClipboard.weaveMinPoint = result.minPoint;
      for (const serializedNode of result.serializedNodes) {
        copyClipboard.weave[serializedNode.key ?? ''] = serializedNode;
      }

      try {
        await this.writeClipboardData(JSON.stringify(copyClipboard));
        this.callbacks?.onCopy?.();
        this.instance.emitEvent('onCopy', undefined);
      } catch (ex) {
        this.callbacks?.onCopy?.(ex as Error);
        this.instance.emitEvent('onCopy', ex as Error);
      }
    }
  }

  private performPaste() {
    if (!this.enabled) {
      return;
    }

    const stage = this.instance.getStage();

    stage.container().style.cursor = 'crosshair';
    stage.container().focus();

    this.state = COPY_PASTE_NODES_PLUGIN_STATE.PASTING;
  }

  async copy() {
    await this.performCopy();
  }

  async paste() {
    await this.readClipboardData();
    this.performPaste();
  }

  getSelectedNodes() {
    return this.mapToPasteNodes();
  }

  isPasting() {
    return this.state === COPY_PASTE_NODES_PLUGIN_STATE.PASTING;
  }

  private cancel() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';
    stage.container().focus();

    this.toPaste = undefined;
    this.setState(COPY_PASTE_NODES_PLUGIN_STATE.IDLE);
  }

  private getNodesSelectionPlugin() {
    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (!nodesSelectionPlugin) {
      throw new Error('Nodes selection plugin not found');
    }
    return nodesSelectionPlugin;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}
