// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from '@/plugins/plugin';
import {
  WeaveStageContextMenuPluginCallbacks,
  WeaveStageContextMenuPluginOptions,
} from './types';
import { WeaveElementInstance, WeaveSelection } from '@inditextech/weave-types';
import { Vector2d } from 'konva/lib/types';
import { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';

export class WeaveContextMenuPlugin extends WeavePlugin {
  private config: WeaveStageContextMenuPluginOptions;
  private callbacks: WeaveStageContextMenuPluginCallbacks;
  private touchTimer: NodeJS.Timeout | undefined;
  private tapHold: boolean;
  getLayerName = undefined;
  initLayer = undefined;
  render: undefined;

  constructor(
    options: WeaveStageContextMenuPluginOptions,
    callbacks: WeaveStageContextMenuPluginCallbacks
  ) {
    super();

    this.touchTimer = undefined;
    this.tapHold = false;
    this.config = options;
    this.callbacks = callbacks;
  }

  getName() {
    return 'contextMenu';
  }

  init() {
    this.initEvents();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  triggerContextMenu(target: any) {
    const stage = this.instance.getStage();

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    let clickOnTransformer = false;
    if (selectionPlugin) {
      const transformer = selectionPlugin.getTransformer();
      const box = transformer.getClientRect();
      const mousePos = stage.getPointerPosition();
      if (
        mousePos &&
        mousePos.x >= box.x &&
        mousePos.x <= box.x + box.width &&
        mousePos.y >= box.y &&
        mousePos.y <= box.y + box.height
      ) {
        clickOnTransformer = true;
      }
    }

    if (target !== stage && !clickOnTransformer) {
      return;
    }

    let nodes: WeaveSelection[] = [];

    if (clickOnTransformer) {
      const transformer = selectionPlugin.getTransformer();

      nodes = transformer
        .getNodes()
        .map((node) => {
          const nodeHandler = this.instance.getNodeHandler(
            node.getAttrs().nodeType
          );

          return {
            instance: node as WeaveElementInstance,
            node: nodeHandler.toNode(node as WeaveElementInstance),
          };
        })
        .filter((node) => node !== undefined);
    }

    const containerRect = stage.container().getBoundingClientRect();
    const pointerPos = stage.getPointerPosition();

    if (containerRect && pointerPos) {
      const point: Vector2d = {
        x: containerRect.left + pointerPos.x + (this.config.xOffset ?? 4),
        y: containerRect.top + pointerPos.y + (this.config.yOffset ?? 4),
      };

      this.callbacks.onNodeMenu?.(this.instance, nodes, point, true);
    }
  }

  private initEvents() {
    const stage = this.instance.getStage();

    stage.on('touchstart', (e) => {
      e.evt.preventDefault();

      this.touchTimer = setTimeout(() => {
        this.tapHold = true;
        this.triggerContextMenu(e.target);
      }, 500);
    });

    stage.on('touchmove', (e) => {
      e.evt.preventDefault();
      this.tapHold = false;
      if (this.touchTimer) {
        clearTimeout(this.touchTimer);
      }
    });

    stage.on('touchend', (e) => {
      e.evt.preventDefault();

      if (this.touchTimer) {
        clearTimeout(this.touchTimer);
      }
      if (this.tapHold) {
        this.tapHold = false;
      }
    });

    stage.on('contextmenu', (e) => {
      e.evt.preventDefault();

      if (!this.enabled) {
        return;
      }

      this.triggerContextMenu(e.target);
    });

    this.instance.addEventListener('onStageSelection', () => {
      if (this.tapHold) {
        return;
      }

      const containerRect = stage.container().getBoundingClientRect();
      const pointerPos = stage.getPointerPosition();

      if (containerRect && pointerPos) {
        const point: Vector2d = {
          x: containerRect.left + pointerPos.x + (this.config.xOffset ?? 4),
          y: containerRect.top + pointerPos.y + (this.config.yOffset ?? 4),
        };

        this.callbacks.onNodeMenu?.(this.instance, [], point, false);
      }
    });
  }

  isTapHold() {
    return this.tapHold;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}
