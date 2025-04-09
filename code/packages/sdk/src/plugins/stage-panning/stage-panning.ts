// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from '@/plugins/plugin';

export class WeaveStagePanningPlugin extends WeavePlugin {
  private isMouseMiddleButtonPressed: boolean;
  private isSpaceKeyPressed: boolean;
  protected previousPointer!: string | null;
  getLayerName = undefined;
  initLayer = undefined;
  render: undefined;

  constructor() {
    super();

    this.enabled = true;
    this.isMouseMiddleButtonPressed = false;
    this.isSpaceKeyPressed = false;
    this.previousPointer = null;
  }

  registersLayers() {
    return false;
  }

  getName() {
    return 'stagePanning';
  }

  init() {
    this.initEvents();
  }

  private enableMove() {
    const stage = this.instance.getStage();
    if (stage.container().style.cursor !== 'move') {
      this.previousPointer = stage.container().style.cursor;
      stage.container().style.cursor = 'move';
    }
  }

  private disableMove() {
    const stage = this.instance.getStage();
    if (stage.container().style.cursor === 'move') {
      stage.container().style.cursor = this.previousPointer ?? 'default';
      this.previousPointer = null;
    }
  }

  private initEvents() {
    let previousMouseX = Infinity;
    let previousMouseY = Infinity;

    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        this.isSpaceKeyPressed = true;
        this.enableMove();
      }
    });

    stage.container().addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpaceKeyPressed = false;
        this.disableMove();
      }
    });

    stage.on('mousedown', (e) => {
      if (e && (e.evt.button == 2 || e.evt.buttons == 4)) {
        this.isMouseMiddleButtonPressed = true;
        this.enableMove();
        e.cancelBubble = true;
      }
    });

    stage.on('mouseup', (e) => {
      if (e && (e.evt.button == 1 || e.evt.buttons == 0)) {
        this.isMouseMiddleButtonPressed = false;
        this.disableMove();
        e.cancelBubble = true;
      }
    });

    stage.on('mousemove', (e) => {
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
        !(this.isSpaceKeyPressed || this.isMouseMiddleButtonPressed)
      ) {
        return;
      }

      stage.x(stage.x() - deltaX);
      stage.y(stage.y() - deltaY);
    });

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
    });

    stage.on('wheel', (e) => {
      e.evt.preventDefault();

      if (
        !this.enabled ||
        this.isSpaceKeyPressed ||
        this.isMouseMiddleButtonPressed
      ) {
        return;
      }

      stage.x(stage.x() - e.evt.deltaX);
      stage.y(stage.y() - e.evt.deltaY);
    });
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}
