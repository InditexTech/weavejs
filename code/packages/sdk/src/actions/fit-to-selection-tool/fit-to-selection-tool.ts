// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveAction } from '@/actions/action';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { WeaveStageZoomPlugin } from '@/plugins/stage-zoom/stage-zoom';
import { type WeaveFitToSelectionToolActionParams } from './types';

export class WeaveFitToSelectionToolAction extends WeaveAction {
  protected previousAction!: string;
  protected cancelAction!: () => void;
  internalUpdate = undefined;

  getName(): string {
    return 'fitToSelectionTool';
  }

  private getNodesSelectionPlugin() {
    return this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
  }

  private getStageZoomPlugin() {
    return this.instance.getPlugin<WeaveStageZoomPlugin>('stageZoom');
  }

  init(): void {
    const stageZoomPlugin = this.getStageZoomPlugin();
    if (!stageZoomPlugin) {
      throw new Error(
        'WeaveFitToSelectionTool requires the WeaveStageZoomPlugin to be loaded'
      );
    }
    const nodesSelectionPlugin = this.getNodesSelectionPlugin();
    if (!nodesSelectionPlugin) {
      throw new Error(
        'WeaveFitToSelectionTool requires the WeaveNodeSelectionPlugin to be loaded'
      );
    }
  }

  trigger(
    cancelAction: () => void,
    params: WeaveFitToSelectionToolActionParams
  ): void {
    const stageZoomPlugin = this.getStageZoomPlugin();

    stageZoomPlugin.fitToSelection();

    this.previousAction = params.previousAction;
    this.cancelAction = cancelAction;

    this.cancelAction();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    this.instance.triggerAction(this.previousAction);

    stage.container().style.cursor = 'default';
  }
}
