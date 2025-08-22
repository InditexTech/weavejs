// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from '@/plugins/plugin';
import { WEAVE_STAGE_PANNING_KEY } from './constants';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage } from 'konva/lib/Stage';
import type { Vector2d } from 'konva/lib/types';
import type { WeaveStageZoomPlugin } from '../stage-zoom/stage-zoom';
import type { WeaveContextMenuPlugin } from '../context-menu/context-menu';
import { MOVE_TOOL_ACTION_NAME } from '@/actions/move-tool/constants';
import {
  getTopmostShadowHost,
  // getTopmostShadowHost,
  isInShadowDOM,
} from '@/utils';
import type { WeaveNodesEdgeSnappingPlugin } from '../nodes-edge-snapping/nodes-edge-snapping';
import type { WeaveNodesDistanceSnappingPlugin } from '../nodes-distance-snapping/nodes-distance-snapping';
import type { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import { WEAVE_NODES_EDGE_SNAPPING_PLUGIN_KEY } from '../nodes-edge-snapping/constants';
import { WEAVE_NODES_DISTANCE_SNAPPING_PLUGIN_KEY } from '../nodes-distance-snapping/constants';
import { WEAVE_NODES_SELECTION_KEY } from '../nodes-selection/constants';
import { WEAVE_CONTEXT_MENU_PLUGIN_KEY } from '../context-menu/constants';

export class WeaveStagePanningPlugin extends WeavePlugin {
  private moveToolActive: boolean;
  private isMouseLeftButtonPressed: boolean;
  private isMouseMiddleButtonPressed: boolean;
  private isCtrlOrMetaPressed: boolean;
  private isDragging: boolean;
  private enableMove: boolean;
  private isSpaceKeyPressed: boolean;
  private pointers: Map<number, Vector2d>;
  private panning: boolean = false;
  protected previousPointer!: string | null;
  getLayerName = undefined;
  initLayer = undefined;
  onRender: undefined;

  constructor() {
    super();

    this.pointers = new Map<number, { x: number; y: number }>();
    this.panning = false;
    this.isDragging = false;
    this.enableMove = false;
    this.enabled = true;
    this.moveToolActive = false;
    this.isMouseLeftButtonPressed = false;
    this.isMouseMiddleButtonPressed = false;
    this.isCtrlOrMetaPressed = false;
    this.isSpaceKeyPressed = false;
    this.previousPointer = null;
  }

  getName(): string {
    return WEAVE_STAGE_PANNING_KEY;
  }

  onInit(): void {
    this.initEvents();
  }

  private setCursor() {
    const stage = this.instance.getStage();
    if (stage.container().style.cursor !== 'grabbing') {
      this.previousPointer = stage.container().style.cursor;
      stage.container().style.cursor = 'grabbing';
    }
  }

  private disableMove() {
    const stage = this.instance.getStage();
    if (stage.container().style.cursor === 'grabbing') {
      stage.container().style.cursor = this.previousPointer ?? 'default';
      this.previousPointer = null;
    }
  }

  private initEvents() {
    const stage = this.instance.getStage();

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        this.isCtrlOrMetaPressed = true;
      }
      if (e.code === 'Space') {
        this.getContextMenuPlugin()?.disable();
        this.getNodesSelectionPlugin()?.disable();
        this.getNodesEdgeSnappingPlugin()?.disable();
        this.getNodesDistanceSnappingPlugin()?.disable();

        this.isSpaceKeyPressed = true;
        this.setCursor();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        this.isCtrlOrMetaPressed = false;
      }
      if (e.code === 'Space') {
        this.getContextMenuPlugin()?.enable();
        this.getNodesSelectionPlugin()?.enable();
        this.getNodesEdgeSnappingPlugin()?.enable();
        this.getNodesDistanceSnappingPlugin()?.enable();

        this.isSpaceKeyPressed = false;
        this.disableMove();
      }
    });

    let lastPos: Vector2d | null = null;

    stage.on('pointerdown', (e) => {
      this.pointers.set(e.evt.pointerId, {
        x: e.evt.clientX,
        y: e.evt.clientY,
      });

      if (this.pointers.size > 1) {
        return;
      }

      const activeAction = this.instance.getActiveAction();

      this.enableMove = false;

      if (activeAction === MOVE_TOOL_ACTION_NAME) {
        this.moveToolActive = true;
      }

      if (e.evt.pointerType === 'mouse' && e.evt.buttons === 1) {
        this.isMouseLeftButtonPressed = true;
      }

      if (e.evt.pointerType === 'mouse' && e.evt.buttons === 4) {
        this.isMouseMiddleButtonPressed = true;
      }

      const isTouchOrPen = ['touch', 'pen'].includes(e.evt.pointerType);

      if (
        this.enabled &&
        (this.isSpaceKeyPressed ||
          (this.moveToolActive &&
            (this.isMouseLeftButtonPressed || isTouchOrPen)) ||
          this.isMouseMiddleButtonPressed)
      ) {
        this.enableMove = true;
      }

      if (this.enableMove) {
        this.isDragging = true;
        lastPos = stage.getPointerPosition();
        this.setCursor();
      }
    });

    stage.on('pointercancel', (e) => {
      this.pointers.delete(e.evt.pointerId);

      lastPos = null;
    });

    const handleMouseMove = (e: KonvaEventObject<PointerEvent, Stage>) => {
      if (['touch', 'pen'].includes(e.evt.pointerType) && e.evt.buttons !== 1) {
        return;
      }

      this.pointers.set(e.evt.pointerId, {
        x: e.evt.clientX,
        y: e.evt.clientY,
      });

      if (this.pointers.size > 1) {
        return;
      }

      if (this.isSpaceKeyPressed) {
        stage.container().style.cursor = 'grabbing';
      }

      if (!this.isDragging) return;

      this.getContextMenuPlugin()?.cancelLongPressTimer();

      const pos = stage.getPointerPosition();

      if (pos && lastPos) {
        const dx = pos.x - lastPos.x;
        const dy = pos.y - lastPos.y;

        stage.x(stage.x() + dx);
        stage.y(stage.y() + dy);
      }

      lastPos = pos;

      this.instance.emitEvent('onStageMove');
    };

    stage.on('pointermove', handleMouseMove);

    stage.on('pointerup', (e) => {
      this.pointers.delete(e.evt.pointerId);

      this.isMouseLeftButtonPressed = false;
      this.isMouseMiddleButtonPressed = false;
      this.moveToolActive = false;
      this.isDragging = false;
      this.enableMove = false;

      this.panning = false;
    });

    // Pan with wheel mouse pressed
    const handleWheel = (e: WheelEvent) => {
      const performPanning = !this.isCtrlOrMetaPressed && !e.ctrlKey;

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      let elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
      if (isInShadowDOM(stage.container())) {
        const shadowHost = getTopmostShadowHost(stage.container());
        if (shadowHost) {
          elementUnderMouse = shadowHost.elementFromPoint(mouseX, mouseY);
        }
      }

      if (
        !this.enabled ||
        this.isCtrlOrMetaPressed ||
        e.buttons === 4 ||
        !performPanning ||
        this.instance.getClosestParentWithWeaveId(elementUnderMouse) !==
          stage.container()
      ) {
        return;
      }

      this.getContextMenuPlugin()?.cancelLongPressTimer();

      stage.x(stage.x() - e.deltaX);
      stage.y(stage.y() - e.deltaY);

      this.instance.emitEvent('onStageMove');
    };

    window.addEventListener('wheel', handleWheel, { passive: true });

    stage.container().style.touchAction = 'none';
    stage.container().style.userSelect = 'none';
    stage.container().style.setProperty('-webkit-user-drag', 'none');

    stage.getContent().addEventListener(
      'touchmove',
      function (e) {
        e.preventDefault();
      },
      { passive: false }
    );
  }

  isPanning(): boolean {
    return this.panning;
  }

  getDistance(p1: Vector2d, p2: Vector2d): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.hypot(dx, dy);
  }

  getTouchCenter(): { x: number; y: number } | null {
    const points = Array.from(this.pointers.values());
    if (points.length !== 2) return null;

    const [p1, p2] = points;
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  }

  getZoomPlugin() {
    const zoomPlugin =
      this.instance.getPlugin<WeaveStageZoomPlugin>('stageZoom');
    return zoomPlugin;
  }

  getContextMenuPlugin() {
    const contextMenuPlugin = this.instance.getPlugin<WeaveContextMenuPlugin>(
      WEAVE_CONTEXT_MENU_PLUGIN_KEY
    );
    return contextMenuPlugin;
  }

  getNodesSelectionPlugin() {
    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>(
      WEAVE_NODES_SELECTION_KEY
    );
    return selectionPlugin;
  }

  getNodesEdgeSnappingPlugin() {
    const snappingPlugin =
      this.instance.getPlugin<WeaveNodesEdgeSnappingPlugin>(
        WEAVE_NODES_EDGE_SNAPPING_PLUGIN_KEY
      );
    return snappingPlugin;
  }

  getNodesDistanceSnappingPlugin() {
    const snappingPlugin =
      this.instance.getPlugin<WeaveNodesDistanceSnappingPlugin>(
        WEAVE_NODES_DISTANCE_SNAPPING_PLUGIN_KEY
      );
    return snappingPlugin;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
