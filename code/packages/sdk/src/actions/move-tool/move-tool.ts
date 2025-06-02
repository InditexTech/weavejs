// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveAction } from '@/actions/action';
import { type WeaveMoveToolActionState } from './types';
import { MOVE_TOOL_ACTION_NAME, MOVE_TOOL_STATE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';

export class WeaveMoveToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveMoveToolActionState;
  protected cancelAction!: () => void;
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
  }

  trigger(cancelAction: () => void): void {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    if (!this.initialized) {
      this.setupEvents();
    }
    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    this.cancelAction = cancelAction;

    this.setMoving();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    this.setState(MOVE_TOOL_STATE.IDLE);
  }
}
