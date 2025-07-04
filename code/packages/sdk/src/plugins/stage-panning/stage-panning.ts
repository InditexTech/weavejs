// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from '@/plugins/plugin';
import { WEAVE_STAGE_PANNING_KEY } from './constants';
import type { KonvaEventObject } from 'konva/lib/Node';
import { throttle } from 'lodash';
import type { Stage } from 'konva/lib/Stage';

export class WeaveStagePanningPlugin extends WeavePlugin {
  private moveToolActive: boolean;
  private isMouseMiddleButtonPressed: boolean;
  private isCtrlOrMetaPressed: boolean;
  private isSpaceKeyPressed: boolean;
  protected previousPointer!: string | null;
  getLayerName = undefined;
  initLayer = undefined;
  onRender: undefined;

  constructor() {
    super();

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
    let previousMouseX = Infinity;
    let previousMouseY = Infinity;

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

    stage.on('pointerdown', (e) => {
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
        this.enableMove();
      }
    });

    stage.on('pointerup', (e) => {
      const activeAction = this.instance.getActiveAction();

      let disableMove = false;
      if (
        e &&
        (e.evt.pointerType !== 'mouse' ||
          (e.evt.pointerType === 'mouse' && e.evt.buttons === 0)) &&
        activeAction === 'moveTool'
      ) {
        this.moveToolActive = false;
        disableMove = true;
      }

      if (e && e.evt.pointerType === 'mouse' && e.evt.buttons === 0) {
        this.isMouseMiddleButtonPressed = false;
        disableMove = true;
      }

      if (disableMove) {
        this.disableMove();
      }
    });

    const handleMouseMove = () => {
      const mousePos = stage.getPointerPosition();

      if (previousMouseX === Infinity) {
        previousMouseX = mousePos?.x ?? 0;
      }
      if (previousMouseY === Infinity) {
        previousMouseY = mousePos?.y ?? 0;
      }

      const deltaX = previousMouseX - (mousePos?.x ?? 0);
      const deltaY = previousMouseY - (mousePos?.y ?? 0);

      previousMouseX = mousePos?.x ?? 0;
      previousMouseY = mousePos?.y ?? 0;

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

      stage.x(stage.x() - deltaX);
      stage.y(stage.y() - deltaY);

      this.instance.emitEvent('onStageMove');
    };

    stage.on('pointermove', throttle(handleMouseMove, 50));

    stage.on('pointerdown', () => {
      const mousePos = stage.getPointerPosition();

      previousMouseX = mousePos?.x ?? 0;
      previousMouseY = mousePos?.y ?? 0;
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

      stage.x(stage.x() - e.evt.deltaX);
      stage.y(stage.y() - e.evt.deltaY);

      this.instance.emitEvent('onStageMove');
    };

    stage.on('wheel', handleWheel);
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
