// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveAction } from '@/actions/action';
import { type WeaveSelectionToolActionState } from './types';
import { SELECTION_TOOL_ACTION_NAME, SELECTION_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';

export class WeaveSelectionToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveSelectionToolActionState;
  protected cancelAction!: () => void;
  internalUpdate = undefined;
  init = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = SELECTION_TOOL_STATE.IDLE;
  }

  getName(): string {
    return SELECTION_TOOL_ACTION_NAME;
  }

  private setupEvents() {
    this.initialized = true;
  }

  private setState(state: WeaveSelectionToolActionState) {
    this.state = state;
  }

  private setSelection() {
    const stage = this.instance.getStage();

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      this.instance.enablePlugin('nodesSelection');
      tr.show();
    }

    stage.container().style.cursor = 'default';
    stage.container().focus();

    this.setState(SELECTION_TOOL_STATE.SELECTING);
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

    this.setSelection();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      this.instance.disablePlugin('nodesSelection');
      tr.hide();
    }

    this.setState(SELECTION_TOOL_STATE.IDLE);
  }
}
