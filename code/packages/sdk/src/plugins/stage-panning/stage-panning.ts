// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from '@/plugins/plugin';
import { WEAVE_STAGE_PANNING_KEY } from './constants';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';
import { throttle } from 'lodash';

export class WeaveStagePanningPlugin extends WeavePlugin {
  private moveToolActive: boolean;
  private isMouseMiddleButtonPressed: boolean;
  private isCtrlOrMetaPressed: boolean;
  private isSpaceKeyPressed: boolean;
  // private overStage: boolean;
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
    // this.overStage = false;
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

    // stage.container().addEventListener('mouseenter', () => {
    //   this.overStage = true;
    // });

    // stage.container().addEventListener('mouseleave', () => {
    //   this.overStage = false;
    // });

    stage.on('mousedown', (e) => {
      const activeAction = this.instance.getActiveAction();

      let enableMove = false;
      if (e && e.evt.button === 0 && activeAction === 'moveTool') {
        this.moveToolActive = true;
        enableMove = true;
      }

      if (e && (e.evt.button === 2 || e.evt.buttons === 4)) {
        this.isMouseMiddleButtonPressed = true;
        enableMove = true;
      }

      if (enableMove) {
        this.enableMove();
        e.cancelBubble = true;
      }
    });

    stage.on('mouseup', (e) => {
      const activeAction = this.instance.getActiveAction();

      let disableMove = false;
      if (e && e.evt.button === 0 && activeAction === 'moveTool') {
        this.moveToolActive = false;
        disableMove = true;
      }

      if (e && (e.evt.button === 1 || e.evt.buttons === 0)) {
        this.isMouseMiddleButtonPressed = false;
        disableMove = true;
      }

      if (disableMove) {
        this.disableMove();
        e.cancelBubble = true;
      }
    });

    const handleMouseMove = (e: KonvaEventObject<MouseEvent, Konva.Stage>) => {
      e.evt.preventDefault();

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

      this.instance.emit('onStageMove', undefined);
    };

    stage.on('mousemove', throttle(handleMouseMove, 50));

    stage.on('touchstart', (e) => {
      e.evt.preventDefault();

      const mousePos = stage.getPointerPosition();

      previousMouseX = mousePos?.x ?? 0;
      previousMouseY = mousePos?.y ?? 0;
    });

    stage.on('touchmove', (e) => {
      e.evt.preventDefault();

      const activeAction = this.instance.getActiveAction();
      if (activeAction !== 'moveTool') {
        return;
      }

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

      if (!this.enabled) {
        return;
      }

      stage.x(stage.x() - deltaX);
      stage.y(stage.y() - deltaY);

      this.instance.emit('onStageMove', undefined);
    });

    const handleWheel = (e: WheelEvent) => {
      const stage = this.instance.getStage();

      if (
        !this.enabled ||
        !stage.isFocused() ||
        this.isCtrlOrMetaPressed ||
        !this.isSpaceKeyPressed
      ) {
        return;
      }

      stage.x(stage.x() - e.deltaX);
      stage.y(stage.y() - e.deltaY);

      this.instance.emit('onStageMove', undefined);
    };

    window.addEventListener('wheel', throttle(handleWheel, 10));
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
