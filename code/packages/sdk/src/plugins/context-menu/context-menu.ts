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
  WEAVE_CONTEXT_MENU_PLUGIN_KEY,
  WEAVE_CONTEXT_MENU_X_OFFSET_DEFAULT,
  WEAVE_CONTEXT_MENU_Y_OFFSET_DEFAULT,
  WEAVE_CONTEXT_MENU_TAP_HOLD_TIMEOUT,
} from './constants';
import type { WeaveNode } from '@/nodes/node';
import { WEAVE_NODES_SELECTION_KEY } from '@/plugins/nodes-selection/constants';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage } from 'konva/lib/Stage';
import { Transformer } from 'konva/lib/shapes/Transformer';
import { getTargetedNode } from '@/utils';
import { SELECTION_TOOL_ACTION_NAME } from '@/actions/selection-tool/constants';

export class WeaveContextMenuPlugin extends WeavePlugin {
  private config: WeaveStageContextMenuPluginConfig;
  private contextMenuVisible: boolean;
  private tapHold: boolean;
  private tapHoldTimeout: number;
  private pointers: Record<string, PointerEvent>;
  private timer!: NodeJS.Timeout | null;
  protected tapStart: { x: number; y: number; time: number } | null;
  getLayerName = undefined;
  initLayer = undefined;
  onRender: undefined;

  constructor(params: WeaveStageContextMenuPluginParams) {
    super();

    this.timer = null;
    this.tapHold = false;
    this.contextMenuVisible = false;
    this.tapStart = { x: 0, y: 0, time: 0 };
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
    return WEAVE_CONTEXT_MENU_PLUGIN_KEY;
  }

  onInit(): void {
    this.initEvents();
  }

  isPressed(e: KonvaEventObject<PointerEvent, Stage>): boolean {
    return e.evt.buttons > 0;
  }

  setTapStart(e: KonvaEventObject<PointerEvent, Stage>): void {
    this.tapStart = {
      x: e.evt.clientX,
      y: e.evt.clientY,
      time: performance.now(),
    };
  }

  triggerContextMenu(
    eventTarget: Konva.Node,
    target: Konva.Node | undefined
  ): void {
    const stage = this.instance.getStage();

    const selectionPlugin = this.getSelectionPlugin();

    let nodes: WeaveSelection[] = [];

    if (target && target !== stage) {
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

    const eventTargetParent = eventTarget.getParent();
    if (eventTargetParent instanceof Konva.Transformer) {
      nodes = eventTargetParent.nodes().map((node) => {
        const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
          node.getAttrs().nodeType
        );

        return {
          instance: node as WeaveElementInstance,
          node: nodeHandler?.serialize(node as WeaveElementInstance),
        };
      });
    }

    if (this.contextMenuVisible) {
      this.closeContextMenu();
    }

    if (
      selectionPlugin &&
      !(
        eventTarget.getParent() instanceof Transformer &&
        selectionPlugin.getSelectedNodes().length > 0
      )
    ) {
      selectionPlugin.setSelectedNodes([...nodes.map((node) => node.instance)]);
      selectionPlugin.getHoverTransformer().nodes([]);
    }

    const containerRect = stage.container().getBoundingClientRect();
    const pointerPos = stage.getPointerPosition();
    const relativeClickPoint = stage.getRelativePointerPosition();

    if (containerRect && pointerPos && relativeClickPoint) {
      const contextMenuPoint: Vector2d = {
        x: containerRect.left + pointerPos.x + (this.config.xOffset ?? 4),
        y: containerRect.top + pointerPos.y + (this.config.yOffset ?? 4),
      };

      const stageClickPoint = this.getStageClickPoint(pointerPos);

      this.contextMenuVisible = true;

      this.instance.emitEvent<WeaveStageContextMenuPluginOnNodeContextMenuEvent>(
        'onNodeContextMenu',
        {
          selection: nodes,
          contextMenuPoint,
          clickPoint: pointerPos,
          stageClickPoint,
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
        contextMenuPoint: { x: 0, y: 0 },
        clickPoint: { x: 0, y: 0 },
        stageClickPoint: { x: 0, y: 0 },
        visible: false,
      }
    );
  }

  private getSelectionPlugin(): WeaveNodesSelectionPlugin | undefined {
    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>(
      WEAVE_NODES_SELECTION_KEY
    );

    return selectionPlugin;
  }

  cancelLongPressTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private initEvents() {
    const stage = this.instance.getStage();

    stage.on('pointerdown', (e) => {
      // e.evt.preventDefault();

      this.setTapStart(e);
      this.pointers[e.evt.pointerId] = e.evt;

      if (e.evt.buttons === 0) {
        return;
      }

      if (e.evt.pointerType === 'mouse') {
        return;
      }

      if (
        e.evt.pointerType === 'touch' &&
        Object.keys(this.pointers).length > 1
      ) {
        return;
      }

      if (this.timer) {
        return;
      }

      this.timer = setTimeout(() => {
        this.tapHold = true;

        const actualActions = this.instance.getActiveAction();
        if (actualActions !== SELECTION_TOOL_ACTION_NAME) {
          return;
        }

        delete this.pointers[e.evt.pointerId];

        const selectedGroup = getTargetedNode(this.instance);
        this.triggerContextMenu(e.target, selectedGroup);
      }, this.tapHoldTimeout);
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

      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
        this.tapHold = false;
      }
    });

    stage.on('contextmenu', (e) => {
      e.evt.preventDefault();

      if (!this.enabled) {
        return;
      }

      const selectedGroup = getTargetedNode(this.instance);
      this.triggerContextMenu(e.target, selectedGroup);
    });

    this.instance.addEventListener('onStageSelection', () => {
      if (this.tapHold) {
        return;
      }

      const containerRect = stage.container().getBoundingClientRect();
      const pointerPos = stage.getPointerPosition();

      if (containerRect && pointerPos) {
        const contextMenuPoint: Vector2d = {
          x: containerRect.left + pointerPos.x + (this.config.xOffset ?? 4),
          y: containerRect.top + pointerPos.y + (this.config.yOffset ?? 4),
        };

        const stageClickPoint = this.getStageClickPoint(pointerPos);

        this.instance.emitEvent<WeaveStageContextMenuPluginOnNodeContextMenuEvent>(
          'onNodeContextMenu',
          {
            selection: [],
            contextMenuPoint,
            clickPoint: pointerPos,
            stageClickPoint,
            visible: false,
          }
        );
      }
    });
  }

  private getStageClickPoint(pointerPos: Vector2d): Vector2d {
    const stage = this.instance.getStage();

    const scale = stage.scale();
    const position = stage.position();

    const stageClickPoint = {
      x: (pointerPos.x - position.x) / scale.x,
      y: (pointerPos.y - position.y) / scale.y,
    };

    return stageClickPoint;
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
