// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveAction } from '@/actions/action';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { WeaveStageZoomPlugin } from '@/plugins/stage-zoom/stage-zoom';
import { type WeaveFitToSelectionToolActionParams } from './types';
import { FIT_TO_SELECTION_TOOL_ACTION_NAME } from './constants';

export class WeaveFitToSelectionToolAction extends WeaveAction {
  protected previousAction!: string;
  protected cancelAction!: () => void;
  onPropsChange = undefined;

  getName(): string {
    return FIT_TO_SELECTION_TOOL_ACTION_NAME;
  }

  private getNodesSelectionPlugin() {
    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (!nodesSelectionPlugin) {
      throw new Error(
        'WeaveFitToSelectionToolAction requires the WeaveNodesSelectionPlugin to be loaded'
      );
    }

    return nodesSelectionPlugin;
  }

  private getStageZoomPlugin() {
    const stageZoomPlugin =
      this.instance.getPlugin<WeaveStageZoomPlugin>('stageZoom');

    if (!stageZoomPlugin) {
      throw new Error(
        'WeaveFitToSelectionToolAction requires the WeaveStageZoomPlugin to be loaded'
      );
    }

    return stageZoomPlugin;
  }

  onInit(): void {
    this.getStageZoomPlugin();
    this.getNodesSelectionPlugin();
  }

  trigger(
    cancelAction: () => void,
    params: WeaveFitToSelectionToolActionParams
  ): void {
    const stageZoomPlugin = this.getStageZoomPlugin();

    stageZoomPlugin.fitToSelection(params?.smartZoom ?? false);

    this.previousAction = params.previousAction;
    this.cancelAction = cancelAction;

    this.cancelAction();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    if (this.previousAction) {
      this.instance.triggerAction(this.previousAction);
    }

    stage.container().style.cursor = 'default';
  }
}
