// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveAction } from '@/actions/action';
import {
  type WeaveMoveToolActionParams,
  type WeaveMoveToolActionState,
} from './types';
import { MOVE_TOOL_ACTION_NAME, MOVE_TOOL_STATE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';

export class WeaveMoveToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveMoveToolActionState;
  protected cancelAction!: () => void;
  protected triggerSelectionTool!: boolean;
  onPropsChange = undefined;
  onInit = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = MOVE_TOOL_STATE.IDLE;
  }

  getName(): string {
    return MOVE_TOOL_ACTION_NAME;
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (
        e.key === 'Escape' &&
        this.instance.getActiveAction() === MOVE_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
    });

    stage.on('pointerdown', () => {
      if (
        [MOVE_TOOL_ACTION_NAME].includes(this.instance.getActiveAction() ?? '')
      ) {
        stage.container().style.cursor = 'grabbing';
        return;
      }
    });

    stage.on('pointerup', () => {
      if (
        [MOVE_TOOL_ACTION_NAME].includes(this.instance.getActiveAction() ?? '')
      ) {
        stage.container().style.cursor = 'grab';
        return;
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveMoveToolActionState) {
    this.state = state;
  }

  private setMoving() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'grab';
    stage.container().focus();

    this.setState(MOVE_TOOL_STATE.MOVING);

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin && !selectionPlugin.isEnabled()) {
      const tr = selectionPlugin.getTransformer();
      this.instance.enablePlugin('nodesSelection');
      tr.listening(false);
      tr.draggable(false);
      tr.show();
    }
  }

  trigger(cancelAction: () => void, params?: WeaveMoveToolActionParams): void {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    if (!this.initialized) {
      this.setupEvents();
    }
    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    const { triggerSelectionTool = true } = params ?? {};

    this.triggerSelectionTool = triggerSelectionTool;
    this.cancelAction = cancelAction;

    this.setMoving();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.listening(true);
      tr.draggable(true);
    }

    if (selectionPlugin && this.triggerSelectionTool) {
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    this.setState(MOVE_TOOL_STATE.IDLE);
  }
}
