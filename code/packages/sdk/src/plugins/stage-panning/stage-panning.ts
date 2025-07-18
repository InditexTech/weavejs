// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from '@/plugins/plugin';
import { WEAVE_STAGE_PANNING_KEY } from './constants';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage } from 'konva/lib/Stage';
import type { Vector2d } from 'konva/lib/types';

export class WeaveStagePanningPlugin extends WeavePlugin {
  private moveToolActive: boolean;
  private isMouseMiddleButtonPressed: boolean;
  private isCtrlOrMetaPressed: boolean;
  private isSpaceKeyPressed: boolean;
  private readonly activePointers: Set<number>;
  protected previousPointer!: string | null;
  getLayerName = undefined;
  initLayer = undefined;
  onRender: undefined;

  constructor() {
    super();

    this.activePointers = new Set();
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

    let lastPos: Vector2d | null = null;
    let isDragging = false;
    let velocity = { x: 0, y: 0 };
    let lastTime = 0;

    stage.on('pointerdown', (e) => {
      this.activePointers.add(e.evt.pointerId);

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

      if (enableMove) {
        isDragging = true;
        lastPos = stage.getPointerPosition();
        lastTime = performance.now();
        velocity = { x: 0, y: 0 };
        this.enableMove();
      }
    });

    stage.on('pointercancel', () => {
      lastPos = null;
    });

    stage.on('pointerup', (e) => {
      this.activePointers.delete(e.evt.pointerId);

      isDragging = false;

      // Apply inertia
      const decay = 0.95;
      function animateInertia() {
        velocity.x *= decay;
        velocity.y *= decay;

        if (Math.abs(velocity.x) < 0.01 && Math.abs(velocity.y) < 0.01) return;

        stage.x(stage.x() + velocity.x * 16);
        stage.y(stage.y() + velocity.y * 16);
        stage.batchDraw();
        requestAnimationFrame(animateInertia);
      }

      requestAnimationFrame(animateInertia);
    });

    const handleMouseMove = () => {
      if (this.activePointers.size !== 1) {
        return;
      }

      if (!isDragging) return;

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

      const pos = stage.getPointerPosition();
      const now = performance.now();
      const dt = now - lastTime;

      if (pos && lastPos) {
        const dx = pos.x - lastPos.x;
        const dy = pos.y - lastPos.y;
        velocity = { x: dx / dt, y: dy / dt };

        stage.x(stage.x() + dx);
        stage.y(stage.y() + dy);
        stage.batchDraw();
      }

      lastPos = pos;
      lastTime = now;

      this.instance.emitEvent('onStageMove');
    };

    stage.on('pointermove', handleMouseMove);

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

      stage.x(stage.x() - e.evt.deltaX);
      stage.y(stage.y() - e.evt.deltaY);

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

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
