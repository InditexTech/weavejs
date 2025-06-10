// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from '@/plugins/plugin';
import { v4 as uuidv4 } from 'uuid';
import {
  type NodeSerializable,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import {
  COPY_PASTE_NODES_PLUGIN_STATE,
  WEAVE_COPY_PASTE_NODES_KEY,
} from './constants';
import { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import {
  type WeaveCopyPasteNodesPluginOnCopyEvent,
  type WeaveCopyPasteNodesPluginOnPasteEvent,
  type WeaveCopyPasteNodesPluginOnPasteExternalEvent,
  type WeaveCopyPasteNodesPluginState,
  type WeavePasteModel,
  type WeaveToPasteNode,
} from './types';
import { type Vector2d } from 'konva/lib/types';

export class WeaveCopyPasteNodesPlugin extends WeavePlugin {
  protected state: WeaveCopyPasteNodesPluginState;
  private toPaste: WeavePasteModel | undefined;
  getLayerName: undefined;
  initLayer: undefined;
  onRender: undefined;

  constructor() {
    super();

    this.state = COPY_PASTE_NODES_PLUGIN_STATE.IDLE;
  }

  getName(): string {
    return WEAVE_COPY_PASTE_NODES_KEY;
  }

  onInit(): void {
    this.initEvents();
  }

  private readClipboardData() {
    return new Promise<boolean>((resolve, reject) => {
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
              resolve(true);
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_) {
              resolve(false);
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

  initEvents(): void {
    const stage = this.instance.getStage();

    window.addEventListener('keydown', async (e) => {
      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();

        await this.performCopy();

        return;
      }
      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();

        if (!this.enabled) {
          return;
        }

        try {
          const continueToPaste = await this.readClipboardData();
          if (continueToPaste) {
            const position = this.instance.getStage().getPointerPosition();

            if (position) {
              this.state = COPY_PASTE_NODES_PLUGIN_STATE.PASTING;
              this.handlePaste(position);
            }
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
        } catch (ex) {
          this.instance.emitEvent<WeaveCopyPasteNodesPluginOnPasteEvent>(
            'onPaste',
            ex as Error
          );
        }

        try {
          const items = await navigator.clipboard.read();
          if (items && items.length === 1) {
            const item = items[0];

            const position = this.instance.getStage().getPointerPosition();

            if (position) {
              this.instance.emitEvent<WeaveCopyPasteNodesPluginOnPasteExternalEvent>(
                'onPasteExternal',
                { position, item }
              );
            }
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
        } catch (ex) {
          this.instance.emitEvent<WeaveCopyPasteNodesPluginOnPasteEvent>(
            'onPaste',
            ex as Error
          );
        }

        stage.container().focus();
        return;
      }
      if (e.key === 'Escape') {
        this.cancel();
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

  private recursivelyUpdateKeys(nodes: WeaveStateElement[]) {
    for (const child of nodes) {
      const newNodeId = uuidv4();
      child.key = newNodeId;
      child.props.id = newNodeId;
      if (child.props.children) {
        this.recursivelyUpdateKeys(child.props.children);
      }
    }
  }

  private handlePaste(position: Vector2d) {
    if (this.toPaste) {
      const { mousePoint, container } = this.instance.getMousePointer(position);

      for (const element of Object.keys(this.toPaste.weave)) {
        const node = this.toPaste.weave[element];

        if (node.props.children) {
          this.recursivelyUpdateKeys(node.props.children);
        }

        const newNodeId = uuidv4();
        delete node.props.containerId;
        node.key = newNodeId;
        node.props.id = newNodeId;
        node.props.x =
          mousePoint.x + (node.props.x - this.toPaste.weaveMinPoint.x);
        node.props.y =
          mousePoint.y + (node.props.y - this.toPaste.weaveMinPoint.y);
        this.instance.addNode(node, container?.getAttr('id'));

        this.instance.emitEvent<WeaveCopyPasteNodesPluginOnPasteEvent>(
          'onPaste'
        );
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

        this.instance.emitEvent<WeaveCopyPasteNodesPluginOnCopyEvent>('onCopy');
      } catch (ex) {
        this.instance.emitEvent<WeaveCopyPasteNodesPluginOnCopyEvent>(
          'onCopy',
          ex as Error
        );
      }
    }
  }

  async copy(): Promise<void> {
    await this.performCopy();
  }

  async paste(position: Vector2d): Promise<void> {
    try {
      const continueToPaste = await this.readClipboardData();
      if (continueToPaste) {
        this.handlePaste(position);
      }
    } catch (ex) {
      this.instance.emitEvent<WeaveCopyPasteNodesPluginOnPasteEvent>(
        'onPaste',
        ex as Error
      );
    }

    try {
      const items = await navigator.clipboard.read();
      if (items && items.length === 1) {
        const item = items[0];

        if (position) {
          this.instance.emitEvent<WeaveCopyPasteNodesPluginOnPasteExternalEvent>(
            'onPasteExternal',
            { position, item }
          );
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
    } catch (ex) {
      this.instance.emitEvent<WeaveCopyPasteNodesPluginOnPasteEvent>(
        'onPaste',
        ex as Error
      );
    }
  }

  getSelectedNodes(): WeaveToPasteNode[] {
    return this.mapToPasteNodes();
  }

  isPasting(): boolean {
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

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
