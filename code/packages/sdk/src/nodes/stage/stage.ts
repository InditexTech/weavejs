// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import { WEAVE_STAGE_NODE_TYPE } from './constants';

export class WeaveStageNode extends WeaveNode {
  protected nodeType: string = WEAVE_STAGE_NODE_TYPE;
  protected stageFocused: boolean = false;
  protected wheelMousePressed: boolean = false;

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const stage = new Konva.Stage({
      ...props,
    });

    this.wheelMousePressed = false;

    stage.isFocused = () => this.stageFocused;
    stage.isMouseWheelPressed = () => this.wheelMousePressed;

    const container = stage.container();
    container.setAttribute('tabindex', '0');

    stage.container().addEventListener('focus', () => {
      this.stageFocused = true;
    });

    stage.container().addEventListener('blur', () => {
      this.stageFocused = false;
    });

    stage.on('pointermove', (e) => {
      if (e.target === stage) {
        const stage = this.instance.getStage();
        stage.container().style.cursor = 'default';
      }
    });

    stage.on('pointerdown', (e) => {
      if (e.evt.button === 1) {
        this.wheelMousePressed = true;
      }
    });

    stage.on('pointerup', (e) => {
      if (e.evt.button === 1) {
        this.wheelMousePressed = false;
      }
    });

    stage.batchDraw();

    return stage;
  }

  onUpdate(): void {}
}
