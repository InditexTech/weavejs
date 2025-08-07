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
  WEAVE_COPY_PASTE_CONFIG_DEFAULT,
  WEAVE_COPY_PASTE_NODES_KEY,
  WEAVE_COPY_PASTE_PASTE_CATCHER_ID,
  WEAVE_COPY_PASTE_PASTE_MODES,
} from './constants';
import { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import {
  type WeaveCopyPastePasteMode,
  type WeaveCopyPasteNodesPluginOnCopyEvent,
  type WeaveCopyPasteNodesPluginOnPasteEvent,
  type WeaveCopyPasteNodesPluginOnPasteExternalEvent,
  type WeaveCopyPasteNodesPluginState,
  type WeavePasteModel,
  type WeaveToPasteNode,
  type WeaveCopyPasteNodesPluginParams,
  type WeaveCopyPasteNodesPluginConfig,
} from './types';
import type { WeaveNode } from '@/nodes/node';
import type { Vector2d } from 'konva/lib/types';
import {
  containerOverCursor,
  getBoundingBox,
  getTopmostShadowHost,
  isInShadowDOM,
} from '@/utils';

export class WeaveCopyPasteNodesPlugin extends WeavePlugin {
  protected state: WeaveCopyPasteNodesPluginState;
  private readonly config: WeaveCopyPasteNodesPluginConfig;
  private lastInternalPasteSnapshot: string;
  private actualInternalPaddingX: number;
  private actualInternalPaddingY: number;
  private toPaste: WeavePasteModel | undefined;
  getLayerName: undefined;
  initLayer: undefined;
  onRender: undefined;

  constructor(params?: Partial<WeaveCopyPasteNodesPluginParams>) {
    super();

    this.config = {
      ...WEAVE_COPY_PASTE_CONFIG_DEFAULT,
      ...params?.config,
    };

    this.actualInternalPaddingX = 0;
    this.actualInternalPaddingY = 0;
    this.lastInternalPasteSnapshot = '';
    this.state = COPY_PASTE_NODES_PLUGIN_STATE.IDLE;
  }

  getName(): string {
    return WEAVE_COPY_PASTE_NODES_KEY;
  }

  onInit(): void {
    this.initEvents();
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

  private existsPasteCatcher() {
    return document.getElementById(WEAVE_COPY_PASTE_PASTE_CATCHER_ID) !== null;
  }

  private createPasteCatcher() {
    const stage = this.instance.getStage();

    if (!this.existsPasteCatcher()) {
      const catcher = document.createElement('div');
      catcher.id = WEAVE_COPY_PASTE_PASTE_CATCHER_ID;
      catcher.contentEditable = 'true';
      catcher.style.position = 'absolute';
      catcher.style.top = '-1px';
      catcher.style.left = '-1px';
      catcher.style.width = '1px';
      catcher.style.height = '1px';
      catcher.style.zIndex = '-1';
      catcher.style.outline = 'none';
      catcher.style.opacity = '0';
      catcher.onpaste = () => false;
      catcher.oncontextmenu = () => false;
      catcher.tabIndex = 0;

      const stageContainer = stage.container();
      if (stageContainer?.parentNode) {
        stageContainer.parentNode.appendChild(catcher);
      }
    }
  }

  private getCatcherElement(): HTMLElement | null {
    const stage = this.instance.getStage();
    let catcher = document.getElementById(WEAVE_COPY_PASTE_PASTE_CATCHER_ID);
    if (isInShadowDOM(stage.container())) {
      const shadowHost = getTopmostShadowHost(stage.container());
      if (shadowHost) {
        catcher = shadowHost.querySelector(
          `#${WEAVE_COPY_PASTE_PASTE_CATCHER_ID}`
        );
      }
    }
    return catcher;
  }

  private focusPasteCatcher() {
    const catcher = this.getCatcherElement();
    catcher?.focus();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private checkIfInternalElementsAreNew(newData: string) {
    if (!this.config.paddingOnPaste.enabled) {
      return false;
    }

    if (this.lastInternalPasteSnapshot !== newData) {
      this.lastInternalPasteSnapshot = newData;
      return true;
    }

    return false;
  }

  private updateInternalPastePadding() {
    if (this.config.paddingOnPaste.enabled) {
      this.actualInternalPaddingX =
        this.actualInternalPaddingX + this.config.paddingOnPaste.paddingX;
      this.actualInternalPaddingY =
        this.actualInternalPaddingY + this.config.paddingOnPaste.paddingY;
    }
  }

  initEvents(): void {
    const stage = this.instance.getStage();

    this.createPasteCatcher();

    const catcher = this.getCatcherElement();

    window.addEventListener('keydown', async (e) => {
      if (stage.isFocused() && e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();

        await this.performCopy();

        return;
      }
      if (stage.isFocused() && e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        this.focusPasteCatcher();

        if (!this.enabled) {
          return;
        }
      }
    });

    if (catcher) {
      document.addEventListener('paste', (e) => {
        e.preventDefault();

        const dataList: DataTransferItemList | undefined =
          e.clipboardData?.items;

        if (!dataList) return;

        if (dataList?.length > 0) {
          // is external data, handle it on app...
          const container = stage.container();
          const scale = stage.scale();
          const position = stage.position();

          const width = container.clientWidth;
          const height = container.clientHeight;

          const centerX = (width / 2 - position.x) / scale.x;
          const centerY = (height / 2 - position.y) / scale.y;

          const pastePosition: Vector2d = {
            x: centerX,
            y: centerY,
          };

          this.instance.emitEvent<WeaveCopyPasteNodesPluginOnPasteExternalEvent>(
            'onPasteExternal',
            {
              positionCalculated: true,
              position: pastePosition,
              dataList,
              items: undefined,
            }
          );
        }
      });

      catcher.addEventListener('paste', async (e) => {
        e.preventDefault();

        let items: ClipboardItems | undefined = undefined;

        let hasWeaveData = false;

        if (!items) {
          if (this.isClipboardAPIAvailable()) {
            items = await navigator.clipboard.read();
          }
        }

        if (!items || items.length === 0) {
          return;
        }

        if (this.isClipboardAPIAvailable()) {
          const readText = await navigator.clipboard.readText();
          const continueToPaste = this.isWeaveData(readText);
          if (continueToPaste) {
            hasWeaveData = true;
          }
        }

        if (hasWeaveData) {
          this.handlePaste();
        }
      });
    }
  }

  private isWeaveData(text: string): boolean {
    try {
      const object = JSON.parse(text);
      if (object.weave && object.weaveMinPoint) {
        this.toPaste = {
          weaveInstanceId: object.weaveInstanceId,
          weave: object.weave,
          weaveMinPoint: object.weaveMinPoint,
        };
      }
      return true;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      return false;
    }
  }

  // private getTextFromClipboard(item: DataTransferItem): Promise<string> {
  //   return new Promise((resolve) => {
  //     item.getAsString((text) => {
  //       resolve(text);
  //     });
  //   });
  // }

  private mapToPasteNodes() {
    const nodesSelectionPlugin = this.getNodesSelectionPlugin();
    const selectedNodes = nodesSelectionPlugin?.getSelectedNodes();

    return (selectedNodes ?? []).map((node) => ({
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

  private handlePaste(position?: Vector2d, relativePosition?: Vector2d) {
    const stage = this.instance.getStage();

    if (this.toPaste) {
      const nodesToSelect = [];

      const newElements = this.checkIfInternalElementsAreNew(
        JSON.stringify(this.toPaste)
      );

      if (this.config.paddingOnPaste.enabled && newElements) {
        this.actualInternalPaddingX = 0;
        this.actualInternalPaddingY = 0;
      }

      this.updateInternalPastePadding();

      for (const element of Object.keys(this.toPaste.weave)) {
        const node = this.toPaste.weave[element].element;
        const posRelativeToSelection =
          this.toPaste.weave[element].posRelativeToSelection;
        let containerId = this.toPaste.weave[element].containerId;

        if (node.props.children) {
          this.recursivelyUpdateKeys(node.props.children);
        }

        const newNodeId = uuidv4();
        delete node.props.containerId;
        node.key = newNodeId;
        node.props.id = newNodeId;
        if (position) {
          const container = containerOverCursor(
            this.instance,
            [],
            relativePosition
          );

          let localPos = position;
          if (!container) {
            containerId = this.instance.getMainLayer()?.getAttrs().id ?? '';

            const scale = stage.scaleX(); // assume uniform scale
            const stagePos = stage.position(); // stage position (pan)

            localPos = {
              x:
                (localPos.x -
                  stagePos.x +
                  (this.config.paddingOnPaste.enabled
                    ? this.actualInternalPaddingX
                    : 0)) /
                scale,
              y:
                (localPos.y -
                  stagePos.y +
                  (this.config.paddingOnPaste.enabled
                    ? this.actualInternalPaddingY
                    : 0)) /
                scale,
            };
          }
          if (container && container.getAttrs().nodeType === 'frame') {
            containerId = container.getAttrs().id ?? '';

            localPos = container
              .getAbsoluteTransform()
              .copy()
              .invert()
              .point(position);
          }

          const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
            node.props.nodeType ?? ''
          );

          if (nodeHandler) {
            const realOffset = nodeHandler.realOffset(node);

            node.props.x = localPos.x + realOffset.x + posRelativeToSelection.x;
            node.props.y = localPos.y + realOffset.y + posRelativeToSelection.y;
          }
        } else {
          const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
            node.props.nodeType ?? ''
          );

          if (nodeHandler) {
            node.props.x =
              node.props.x +
              (this.config.paddingOnPaste.enabled
                ? this.actualInternalPaddingX
                : 0);
            node.props.y =
              node.props.y +
              (this.config.paddingOnPaste.enabled
                ? this.actualInternalPaddingY
                : 0);
          }
        }

        this.instance.addNode(node, containerId);

        const realNode = this.instance.getStage().findOne(`#${newNodeId}`);
        if (realNode) {
          nodesToSelect.push(realNode);
        }
      }

      this.instance.emitEvent<WeaveCopyPasteNodesPluginOnPasteEvent>(
        'onPaste',
        {
          error: undefined,
          pastedNodes: nodesToSelect.map((n) => n.getAttrs().id ?? ''),
        }
      );

      const nodesSelectionPlugin = this.getNodesSelectionPlugin();
      nodesSelectionPlugin?.setSelectedNodes(nodesToSelect);

      this.instance?.triggerAction('fitToSelectionTool', {
        previousAction: 'selectionTool',
        smartZoom: true,
      });

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
    const selectedNodes = nodesSelectionPlugin?.getSelectedNodes();
    if (!selectedNodes || selectedNodes.length === 0) {
      return;
    }

    const box = getBoundingBox(stage, selectedNodes);

    const copyClipboard: WeavePasteModel = {
      weaveInstanceId: this.instance.getId(),
      weave: {},
      weaveMinPoint: { x: 0, y: 0 },
    };

    for (const node of selectedNodes) {
      const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
        node.getAttrs().nodeType
      );

      if (!nodeHandler) {
        continue;
      }

      const parentNode = node.getParent();
      let parentId = parentNode?.getAttrs().id;
      if (parentNode?.getAttrs().nodeId) {
        const realParent = this.instance
          .getStage()
          .findOne(`#${parentNode.getAttrs().nodeId}`);
        if (realParent) {
          parentId = realParent.getAttrs().id;
        }
      }

      if (!parentId) {
        continue;
      }

      const serializedNode = nodeHandler.serialize(node);
      const nodeBox = node.getClientRect({ relativeTo: stage });

      copyClipboard.weave[serializedNode.key ?? ''] = {
        element: serializedNode,
        posRelativeToSelection: {
          x: nodeBox.x - (box?.x ?? 0),
          y: nodeBox.y - (box?.y ?? 0),
        },
        containerId: parentId,
      };
    }

    try {
      await this.writeClipboardData(JSON.stringify(copyClipboard));

      this.actualInternalPaddingX = 0;
      this.actualInternalPaddingY = 0;
      this.lastInternalPasteSnapshot = '';

      this.instance.emitEvent<WeaveCopyPasteNodesPluginOnCopyEvent>('onCopy');
    } catch (ex) {
      this.instance.emitEvent<WeaveCopyPasteNodesPluginOnCopyEvent>('onCopy', {
        error: ex as Error,
      });
    }
  }

  async copy(): Promise<void> {
    await this.performCopy();
  }

  async paste(position?: Vector2d, relativePosition?: Vector2d): Promise<void> {
    const stage = this.instance.getStage();

    try {
      const readText = await navigator.clipboard.readText();
      const continueToPaste = this.isWeaveData(readText);
      if (continueToPaste) {
        this.handlePaste(position, relativePosition);
        return;
      }
    } catch (ex) {
      this.instance.emitEvent<WeaveCopyPasteNodesPluginOnPasteEvent>(
        'onPaste',
        { error: ex as Error }
      );
    }

    try {
      const items = await navigator.clipboard.read();

      let positionCalculated = false;
      let pastePosition = relativePosition;

      if (typeof pastePosition === 'undefined') {
        positionCalculated = true;

        const container = stage.container();
        const scale = stage.scale();
        const position = stage.position();

        const centerClientX = container.clientWidth / 2;
        const centerClientY = container.clientHeight / 2;

        const centerX = (centerClientX - position.x) / scale.x;
        const centerY = (centerClientY - position.y) / scale.y;

        pastePosition = {
          x: centerX,
          y: centerY,
        };
      }

      this.instance.emitEvent<WeaveCopyPasteNodesPluginOnPasteExternalEvent>(
        'onPasteExternal',
        { positionCalculated, position: pastePosition, items }
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
    } catch (ex) {
      this.instance.emitEvent<WeaveCopyPasteNodesPluginOnPasteEvent>(
        'onPaste',
        { error: ex as Error }
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

    return nodesSelectionPlugin;
  }

  isClipboardApiEnabled(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.clipboard &&
      typeof navigator.clipboard.readText === 'function' &&
      window.isSecureContext
    );
  }

  async getAvailablePasteMode(
    canHandleExternal: (items: ClipboardItems) => Promise<boolean>
  ): Promise<WeaveCopyPastePasteMode> {
    if (!this.isClipboardApiEnabled()) {
      return WEAVE_COPY_PASTE_PASTE_MODES.CLIPBOARD_API_NOT_SUPPORTED;
    }

    try {
      const readText = await navigator.clipboard.readText();
      const allowPaste = this.isWeaveData(readText);
      if (allowPaste) {
        return WEAVE_COPY_PASTE_PASTE_MODES.INTERNAL;
      }

      const items = await navigator.clipboard.read();
      if (await canHandleExternal(items)) {
        return WEAVE_COPY_PASTE_PASTE_MODES.EXTERNAL;
      }
    } catch (e) {
      this.getLogger().error('Error reading clipboard data', e as Error);
      return WEAVE_COPY_PASTE_PASTE_MODES.CLIPBOARD_API_ERROR;
    }

    return WEAVE_COPY_PASTE_PASTE_MODES.NOT_ALLOWED;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isClipboardAPIAvailable() {
    return !!navigator.clipboard;
  }

  detectBrowser() {
    const ua = navigator.userAgent;

    return {
      isSafari: /^((?!chrome|android).)*safari/i.test(ua),
      isFirefox: ua.toLowerCase().includes('firefox'),
      isChrome:
        ua.toLowerCase().includes('chrome') &&
        !ua.toLowerCase().includes('edge'),
      isEdge: ua.toLowerCase().includes('edg'),
      isIOS: /iP(ad|hone|od)/.test(navigator.userAgent),
    };
  }
}
