// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from '@/plugins/plugin';
import {
  type WeaveStageContextMenuPluginConfig,
  type WeaveStageContextMenuPluginOnNodeContextMenuEvent,
  type WeaveStageContextMenuPluginParams,
} from './types';
import {
  type WeaveElementInstance,
  type WeaveSelection,
} from '@inditextech/weave-types';
import { type Vector2d } from 'konva/lib/types';
import { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import {
  WEAVE_CONTEXT_MENU_KEY,
  WEAVE_CONTEXT_MENU_X_OFFSET_DEFAULT,
  WEAVE_CONTEXT_MENU_Y_OFFSET_DEFAULT,
  WEAVE_CONTEXT_MENU_TAP_HOLD_TIMEOUT,
} from './constants';
import type { WeaveNode } from '@/nodes/node';
import { WEAVE_NODES_SELECTION_KEY } from '@/plugins/nodes-selection/constants';

export class WeaveContextMenuPlugin extends WeavePlugin {
  private config: WeaveStageContextMenuPluginConfig;
  private touchTimer: NodeJS.Timeout | undefined;
  private contextMenuVisible: boolean;
  private tapHold: boolean;
  private tapHoldTimeout: number;
  private pointers: Record<string, PointerEvent>;
  getLayerName = undefined;
  initLayer = undefined;
  onRender: undefined;

  constructor(params: WeaveStageContextMenuPluginParams) {
    super();

    this.touchTimer = undefined;
    this.tapHold = false;
    this.contextMenuVisible = false;
    this.tapHoldTimeout = WEAVE_CONTEXT_MENU_TAP_HOLD_TIMEOUT;
    const { config } = params ?? {};
    this.config = {
      xOffset: WEAVE_CONTEXT_MENU_X_OFFSET_DEFAULT,
      yOffset: WEAVE_CONTEXT_MENU_Y_OFFSET_DEFAULT,
      ...config,
    };
    this.pointers = {};
  }

  getName(): string {
    return WEAVE_CONTEXT_MENU_KEY;
  }

  onInit(): void {
    this.initEvents();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  triggerContextMenu(target: any): void {
    const stage = this.instance.getStage();

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>(
      WEAVE_NODES_SELECTION_KEY
    );

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

    if (clickOnTransformer && selectionPlugin) {
      const transformer = selectionPlugin.getTransformer();

      nodes = transformer
        .getNodes()
        .map((node) => {
          const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
            node.getAttrs().nodeType
          );

          return {
            instance: node as WeaveElementInstance,
            node: nodeHandler?.serialize(node as WeaveElementInstance),
          };
        })
        .filter((node) => typeof node !== 'undefined');
    }

    const containerRect = stage.container().getBoundingClientRect();
    const pointerPos = stage.getPointerPosition();

    if (containerRect && pointerPos) {
      const point: Vector2d = {
        x: containerRect.left + pointerPos.x + (this.config.xOffset ?? 4),
        y: containerRect.top + pointerPos.y + (this.config.yOffset ?? 4),
      };

      this.contextMenuVisible = true;

      this.instance.emitEvent<WeaveStageContextMenuPluginOnNodeContextMenuEvent>(
        'onNodeContextMenu',
        {
          selection: nodes,
          point,
          visible: true,
        }
      );
    }
  }

  closeContextMenu(): void {
    this.contextMenuVisible = false;

    this.instance.emitEvent<WeaveStageContextMenuPluginOnNodeContextMenuEvent>(
      'onNodeContextMenu',
      {
        selection: [],
        point: { x: 0, y: 0 },
        visible: false,
      }
    );
  }

  private initEvents() {
    const stage = this.instance.getStage();

    stage.on('pointerdown', (e) => {
      this.pointers[e.evt.pointerId] = e.evt;

      e.evt.preventDefault();

      if (
        e.evt.pointerType === 'touch' &&
        Object.keys(this.pointers).length > 1
      ) {
        return;
      }

      this.touchTimer = setTimeout(() => {
        this.tapHold = true;
        this.triggerContextMenu(e.target);
      }, this.tapHoldTimeout);
    });

    stage.on('pointermove', () => {
      if (this.touchTimer) {
        clearTimeout(this.touchTimer);
      }
    });

    stage.on('pointerup', (e) => {
      delete this.pointers[e.evt.pointerId];

      e.evt.preventDefault();

      if (
        e.evt.pointerType === 'touch' &&
        Object.keys(this.pointers).length + 1 > 1
      ) {
        return;
      }

      if (this.touchTimer) {
        clearTimeout(this.touchTimer);
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

        this.instance.emitEvent<WeaveStageContextMenuPluginOnNodeContextMenuEvent>(
          'onNodeContextMenu',
          {
            selection: [],
            point,
            visible: false,
          }
        );
      }
    });
  }

  isContextMenuVisible(): boolean {
    return this.contextMenuVisible;
  }

  isTapHold(): boolean {
    return this.tapHold;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
