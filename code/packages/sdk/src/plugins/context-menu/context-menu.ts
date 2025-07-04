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
import type Konva from 'konva';

export class WeaveContextMenuPlugin extends WeavePlugin {
  private config: WeaveStageContextMenuPluginConfig;
  private touchTimer: NodeJS.Timeout | undefined;
  private contextMenuVisible: boolean;
  private tapHold: boolean;
  private tapHoldTimeout: number;
  private pointers: Record<string, PointerEvent>;
  private dragging!: boolean;
  private transforming!: boolean;
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

    let nodes: WeaveSelection[] = [];

    if (target !== stage && clickOnTransformer && selectionPlugin) {
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

    if (target !== stage && !clickOnTransformer) {
      const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
        target.getAttrs().nodeType
      );

      nodes = [
        {
          instance: target as WeaveElementInstance,
          node: nodeHandler?.serialize(target as WeaveElementInstance),
        },
      ];
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

    this.instance.addEventListener('onDrag', (node: Konva.Node | null) => {
      if (node) {
        this.dragging = true;
      } else {
        this.dragging = false;
      }
    });

    this.instance.addEventListener('onTransform', (node: Konva.Node | null) => {
      if (node) {
        this.transforming = true;
      } else {
        this.transforming = false;
      }
    });

    stage.on('pointerdown', (e) => {
      this.pointers[e.evt.pointerId] = e.evt;

      if (e.evt.pointerType === 'mouse') {
        return;
      }

      if (
        e.evt.pointerType === 'touch' &&
        Object.keys(this.pointers).length > 1
      ) {
        return;
      }

      this.touchTimer = setTimeout(() => {
        this.tapHold = true;
        if (this.touchTimer && (this.dragging || this.transforming)) {
          clearTimeout(this.touchTimer);
          return;
        }
        this.triggerContextMenu(e.target);
      }, this.tapHoldTimeout);
    });

    stage.on('pointermove', (e) => {
      if (e.evt.pointerType === 'mouse') {
        return;
      }

      if (this.touchTimer) {
        clearTimeout(this.touchTimer);
      }
    });

    stage.on('pointerup', (e) => {
      delete this.pointers[e.evt.pointerId];

      if (e.evt.pointerType === 'mouse') {
        return;
      }

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
