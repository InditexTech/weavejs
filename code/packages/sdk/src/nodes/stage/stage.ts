// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import { WEAVE_STAGE_DEFAULT_MODE, WEAVE_STAGE_NODE_TYPE } from './constants';
import { MOVE_TOOL_ACTION_NAME } from '@/actions/move-tool/constants';
import { SELECTION_TOOL_ACTION_NAME } from '@/actions/selection-tool/constants';

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

    stage.position({ x: 0, y: 0 });

    if (!this.instance.isServerSide()) {
      const container = stage.container();
      container.setAttribute('tabindex', '0');

      stage.container().addEventListener('focus', () => {
        this.stageFocused = true;
      });

      stage.container().addEventListener('blur', () => {
        this.stageFocused = false;
      });
    }

    Konva.Stage.prototype.mode = function (mode?: string) {
      if (typeof mode !== 'undefined') {
        this._mode = mode;
      }
      return this._mode;
    };

    Konva.Stage.prototype.allowActions = function (actions?: string[]) {
      if (typeof actions !== 'undefined') {
        this._allowActions = actions;
      }
      return this._allowActions;
    };

    Konva.Stage.prototype.allowSelectNodes = function (nodeTypes?: string[]) {
      if (typeof nodeTypes !== 'undefined') {
        this._allowSelectNodeTypes = nodeTypes;
      }
      return this._allowSelectNodeTypes;
    };

    Konva.Stage.prototype.allowSelection = function (allowSelection?: boolean) {
      if (typeof allowSelection !== 'undefined') {
        this._allowSelection = allowSelection;
      }
      return this._allowSelection;
    };

    stage.mode(WEAVE_STAGE_DEFAULT_MODE);

    stage.on('pointerdown', (e) => {
      if (e.evt.button === 1) {
        this.wheelMousePressed = true;
      }

      if (
        !this.instance.isServerSide() &&
        [MOVE_TOOL_ACTION_NAME].includes(this.instance.getActiveAction() ?? '')
      ) {
        stage.container().style.cursor = 'grabbing';
      }
    });

    stage.on('pointermove', (e) => {
      const activeAction = this.instance.getActiveAction();

      if (
        !this.instance.isServerSide() &&
        ![MOVE_TOOL_ACTION_NAME].includes(activeAction ?? '') &&
        stage.allowSelection() &&
        !stage.allowActions().includes(this.instance.getActiveAction() ?? '') &&
        !stage.allowSelectNodes().includes(e.target.getAttrs()?.nodeType ?? '')
      ) {
        const stage = this.instance.getStage();
        stage.container().style.cursor = 'default';
      }
      if (
        e.target === stage &&
        [SELECTION_TOOL_ACTION_NAME].includes(activeAction ?? '')
      ) {
        const stage = this.instance.getStage();
        stage.container().style.cursor = 'default';
      }
    });

    stage.on('pointerup', (e) => {
      const activeAction = this.instance.getActiveAction();

      if (e.evt.button === 1) {
        this.wheelMousePressed = false;
      }

      if (
        !this.instance.isServerSide() &&
        [MOVE_TOOL_ACTION_NAME].includes(activeAction ?? '')
      ) {
        stage.container().style.cursor = 'grab';
      }
    });

    stage.on('pointerover', (e) => {
      const activeAction = this.instance.getActiveAction();

      if ([MOVE_TOOL_ACTION_NAME].includes(activeAction ?? '')) {
        return;
      }

      if (e.target !== stage && !e.target.getAttrs().nodeId) return;

      const parent = (e.target as Konva.Node).getParent();
      if (parent && parent instanceof Konva.Transformer) return;

      this.hideHoverState();

      if (!this.instance.isServerSide()) {
        stage.container().style.cursor = 'default';
      }
    });

    return stage;
  }

  onUpdate(): void {}
}
