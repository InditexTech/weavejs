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
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage } from 'konva/lib/Stage';

export class WeaveContextMenuPlugin extends WeavePlugin {
  private config: WeaveStageContextMenuPluginConfig;
  private touchTimer: NodeJS.Timeout | undefined;
  private contextMenuVisible: boolean;
  private tapHold: boolean;
  private tapHoldTimeout: number;
  private pointers: Record<string, PointerEvent>;
  private onAction!: string | undefined;
  private actualNode!: Konva.Node | null;
  private dragging!: boolean;
  private transforming!: boolean;
  protected tapStart: { x: number; y: number; time: number } | null;
  getLayerName = undefined;
  initLayer = undefined;
  onRender: undefined;

  constructor(params: WeaveStageContextMenuPluginParams) {
    super();

    this.onAction = undefined;
    this.dragging = false;
    this.transforming = false;
    this.touchTimer = undefined;
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
    return WEAVE_CONTEXT_MENU_KEY;
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

  checkMoved(e: KonvaEventObject<PointerEvent, Stage>): boolean {
    if (!this.tapStart) {
      return false;
    }

    const dx = e.evt.clientX - this.tapStart.x;
    const dy = e.evt.clientY - this.tapStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const MOVED_DISTANCE = 5; // px

    if (dist < MOVED_DISTANCE) {
      return false;
    }

    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  triggerContextMenu(target: any): void {
    const stage = this.instance.getStage();

    const selectionPlugin = this.getSelectionPlugin();

    let nodes: WeaveSelection[] = [];

    if (target !== stage) {
      const realTarget = this.instance.getInstanceRecursive(target);

      const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
        realTarget.getAttrs().nodeType
      );

      nodes = [
        {
          instance: realTarget as WeaveElementInstance,
          node: nodeHandler?.serialize(realTarget as WeaveElementInstance),
        },
      ];
    }

    if (this.contextMenuVisible) {
      this.closeContextMenu();
    }
    selectionPlugin?.setSelectedNodes([...nodes.map((node) => node.instance)]);

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

  private getSelectionPlugin(): WeaveNodesSelectionPlugin | undefined {
    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>(
      WEAVE_NODES_SELECTION_KEY
    );

    return selectionPlugin;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getSelectedNode(e: any) {
    const stage = this.instance.getStage();

    let selectedGroup: Konva.Node | Stage = stage;

    const allInter = stage.getAllIntersections({
      x: e.evt.clientX,
      y: e.evt.clientY,
    });

    if (allInter.length === 1) {
      selectedGroup = this.instance.getInstanceRecursive(allInter[0]);
    } else {
      const allInterFramesFiltered = allInter.filter(
        (ele) => ele.getAttrs().nodeType !== 'frame'
      );
      if (allInterFramesFiltered.length > 0) {
        selectedGroup = this.instance.getInstanceRecursive(
          allInterFramesFiltered[0]
        );
      }
    }

    return selectedGroup;
  }

  private initEvents() {
    const stage = this.instance.getStage();

    this.instance.addEventListener(
      'onActiveActionChange',
      (activeAction: string | undefined) => {
        this.onAction = activeAction;
      }
    );

    this.instance.addEventListener('onDrag', (node: Konva.Node | null) => {
      this.actualNode = node;
      if (node) {
        this.dragging = true;
      } else {
        this.dragging = false;
      }
    });

    this.instance.addEventListener('onTransform', (node: Konva.Node | null) => {
      this.actualNode = node;
      if (node) {
        this.transforming = true;
      } else {
        this.transforming = false;
      }
    });

    stage.on('pointerdown', (e) => {
      this.setTapStart(e);
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

        const moved = this.checkMoved(e);

        const actualActions = this.instance.getActiveAction();
        if (actualActions !== 'selectionTool') {
          return;
        }

        const shouldKillLongPressTimer =
          moved &&
          this.touchTimer &&
          (typeof this.onAction === 'undefined' ||
            (typeof this.onAction !== 'undefined' &&
              ['selectionTool'].includes(this.onAction))) &&
          ((typeof this.dragging !== 'undefined' && this.dragging) ||
            (typeof this.transforming !== 'undefined' && this.transforming));

        if (shouldKillLongPressTimer) {
          clearTimeout(this.touchTimer);
        } else {
          this.actualNode?.stopDrag();
          delete this.pointers[e.evt.pointerId];

          const selectedGroup = this.getSelectedNode(e);
          this.triggerContextMenu(selectedGroup);
        }
      }, this.tapHoldTimeout);
    });

    stage.on('pointermove', (e) => {
      if (e.evt.buttons === 0) {
        return;
      }

      const moved = this.checkMoved(e);

      if (moved && this.touchTimer) {
        clearTimeout(this.touchTimer);
      }
    });

    stage.on('pointerup', (e) => {
      this.checkMoved(e);

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

      const selectedGroup = this.getSelectedNode(e);
      this.triggerContextMenu(selectedGroup);
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
