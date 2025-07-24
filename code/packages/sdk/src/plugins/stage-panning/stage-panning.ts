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
import type { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';

export class WeaveStagePanningPlugin extends WeavePlugin {
  private moveToolActive: boolean;
  private isMouseMiddleButtonPressed: boolean;
  private isCtrlOrMetaPressed: boolean;
  private isSpaceKeyPressed: boolean;
  private pointers: Map<number, Vector2d>;
  private lastCenter: Vector2d | null;
  private pinching: boolean = false;
  private panning: boolean = false;
  private threshold: number; // Minimum distance to start panning
  private pointersDistanceDiffThreshold: number;
  protected previousPointer!: string | null;
  getLayerName = undefined;
  initLayer = undefined;
  onRender: undefined;

  constructor() {
    super();

    this.pointers = new Map<number, { x: number; y: number }>();
    this.lastCenter = null;
    this.pinching = false;
    this.panning = false;
    this.threshold = 5;
    this.pointersDistanceDiffThreshold = 10;
    this.enabled = true;
    this.moveToolActive = false;
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

  private enableMove() {
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
        this.isSpaceKeyPressed = true;
        this.enableMove();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        this.isCtrlOrMetaPressed = false;
      }
      if (e.code === 'Space') {
        this.isSpaceKeyPressed = false;
        this.disableMove();
      }
    });

    let startPointersDistance: number | null = null;
    let startCenter: Vector2d | null = null;
    let lastPos: Vector2d | null = null;
    let isDragging = false;
    let velocity = { x: 0, y: 0 };
    let lastTime = 0;

    stage.on('pointerdown', (e) => {
      // stage.setPointersPositions(e.evt);
      this.pointers.set(e.evt.pointerId, {
        x: e.evt.clientX,
        y: e.evt.clientY,
      });

      const activeAction = this.instance.getActiveAction();

      let enableMove = false;
      if (
        e &&
        (e.evt.pointerType !== 'mouse' ||
          (e.evt.pointerType === 'mouse' && e.evt.buttons === 1)) &&
        activeAction === 'moveTool'
      ) {
        this.moveToolActive = true;
        enableMove = true;
      }

      if (!enableMove && e.evt.pointerType === 'mouse' && e.evt.buttons === 4) {
        this.isMouseMiddleButtonPressed = true;
        enableMove = true;
      }

      if (
        e.evt.pointerType !== 'mouse' &&
        this.pointers.size === 2 &&
        !this.pinching &&
        !this.panning
      ) {
        const center = this.getTouchCenter();

        const [p1, p2] = Array.from(this.pointers.values());
        const pointersDistance = this.getDistance(p1, p2);

        if (!startCenter) {
          startPointersDistance = pointersDistance;
          startCenter = center;
          this.lastCenter = center;
          this.pinching = false;
          this.panning = false;
          velocity = { x: 0, y: 0 };
        }

        isDragging = true;
        lastPos = stage.getPointerPosition();
        lastTime = performance.now();
        this.enableMove();
        return;
      }

      if (enableMove) {
        isDragging = true;
        lastPos = stage.getPointerPosition();
        lastTime = performance.now();
        velocity = { x: 0, y: 0 };
        this.enableMove();
      }
    });

    stage.on('pointercancel', (e) => {
      this.pointers.delete(e.evt.pointerId);

      lastPos = null;
      this.lastCenter = null;
    });

    const handleMouseMove = (e: KonvaEventObject<PointerEvent, Stage>) => {
      // stage.setPointersPositions(e.evt);

      // if (!this.pointers.has(e.evt.pointerId)) return;

      this.pointers.set(e.evt.pointerId, {
        x: e.evt.clientX,
        y: e.evt.clientY,
      });

      if (!isDragging) return;

      const center = this.getTouchCenter();

      if (e.evt.pointerType !== 'mouse' && this.pointers.size !== 2) {
        startCenter = null;
        startPointersDistance = null;
        this.pinching = false;
        this.panning = false;
      }

      if (e.evt.pointerType !== 'mouse' && this.pointers.size === 2) {
        this.getContextMenuPlugin()?.cancelLongPressTimer();

        const [p1, p2] = Array.from(this.pointers.values());
        const pointersDistance = this.getDistance(p1, p2);

        if (!startCenter) {
          startPointersDistance = pointersDistance;
          startCenter = center;
          this.lastCenter = center;
          this.pinching = false;
          this.panning = false;
        }

        if (center && startCenter && startPointersDistance && this.lastCenter) {
          const now = performance.now();
          const dt = now - lastTime;

          const dx = center.x - startCenter.x;
          const dy = center.y - startCenter.y;

          const distanceCenters = Math.hypot(dx, dy);
          const distanceChange = Math.abs(
            pointersDistance - startPointersDistance
          );

          if (
            !this.pinching &&
            distanceCenters > this.threshold &&
            distanceChange <= this.pointersDistanceDiffThreshold
          ) {
            this.panning = true;
          }

          if (
            !this.panning &&
            distanceCenters <= this.threshold &&
            distanceChange > this.pointersDistanceDiffThreshold
          ) {
            this.pinching = true;
          }

          if (this.panning) {
            this.getNodesSelectionPlugin()?.disable();

            const dx = center.x - this.lastCenter.x;
            const dy = center.y - this.lastCenter.y;
            velocity = { x: dx / dt, y: dy / dt };

            stage.x(stage.x() + dx);
            stage.y(stage.y() + dy);

            this.instance.emitEvent('onStageMove');
          }

          this.lastCenter = center;
          lastTime = now;
          return;
        }
      }

      this.lastCenter = center;

      // Pan with space pressed and no mouse buttons pressed
      if (
        !this.enabled ||
        !(
          this.isSpaceKeyPressed ||
          this.isMouseMiddleButtonPressed ||
          this.moveToolActive
        )
      ) {
        return;
      }

      this.getContextMenuPlugin()?.cancelLongPressTimer();
      this.getNodesSelectionPlugin()?.disable();

      const pos = stage.getPointerPosition();
      const now = performance.now();
      const dt = now - lastTime;

      if (pos && lastPos) {
        const dx = pos.x - lastPos.x;
        const dy = pos.y - lastPos.y;
        velocity = { x: dx / dt, y: dy / dt };

        stage.x(stage.x() + dx);
        stage.y(stage.y() + dy);
      }

      lastPos = pos;
      lastTime = now;

      this.instance.emitEvent('onStageMove');
    };

    stage.on('pointermove', handleMouseMove);

    // Apply inertia
    const decay = 0.95;
    const animateInertia = () => {
      velocity.x *= decay;
      velocity.y *= decay;

      if (Math.abs(velocity.x) < 0.01 && Math.abs(velocity.y) < 0.01) {
        return;
      }

      stage.x(stage.x() + velocity.x);
      stage.y(stage.y() + velocity.y);

      this.instance.emitEvent('onStageMove');

      requestAnimationFrame(animateInertia);
    };

    stage.on('pointerup', (e) => {
      this.pointers.delete(e.evt.pointerId);

      if (e.evt.pointerType !== 'mouse' && this.pointers.size < 2) {
        this.getNodesSelectionPlugin()?.enable();
        isDragging = false;
        startCenter = null;
        startPointersDistance = null;
        this.lastCenter = null;

        this.pinching = false;
        this.panning = false;

        requestAnimationFrame(animateInertia);

        return;
      }

      isDragging = false;

      this.pinching = false;
      this.panning = false;
      requestAnimationFrame(animateInertia);
    });

    // Pan with wheel mouse pressed
    const handleWheel = (e: KonvaEventObject<WheelEvent, Stage>) => {
      e.evt.preventDefault();

      const stage = this.instance.getStage();

      const performPanning = !this.isCtrlOrMetaPressed && !e.evt.ctrlKey;

      if (
        !this.enabled ||
        !stage.isFocused() ||
        this.isCtrlOrMetaPressed ||
        e.evt.buttons === 4 ||
        !performPanning
      ) {
        return;
      }

      this.getContextMenuPlugin()?.cancelLongPressTimer();
      this.getNodesSelectionPlugin()?.disable();

      stage.x(stage.x() - e.evt.deltaX);
      stage.y(stage.y() - e.evt.deltaY);

      this.getNodesSelectionPlugin()?.enable();

      this.instance.emitEvent('onStageMove');
    };

    stage.on('wheel', handleWheel);

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

  getNodesSelectionPlugin() {
    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    return selectionPlugin;
  }

  getZoomPlugin() {
    const zoomPlugin =
      this.instance.getPlugin<WeaveStageZoomPlugin>('stageZoom');
    return zoomPlugin;
  }

  getContextMenuPlugin() {
    const contextMenuPlugin =
      this.instance.getPlugin<WeaveContextMenuPlugin>('contextMenu');
    return contextMenuPlugin;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
