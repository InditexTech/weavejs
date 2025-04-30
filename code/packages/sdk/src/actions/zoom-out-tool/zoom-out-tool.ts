// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveAction } from '@/actions/action';
import { WeaveStageZoomPlugin } from '@/plugins/stage-zoom/stage-zoom';
import { type WeaveZoomOutToolActionParams } from './types';

export class WeaveZoomOutToolAction extends WeaveAction {
  protected previousAction!: string;
  protected cancelAction!: () => void;
  internalUpdate = undefined;

  getName(): string {
    return 'zoomOutTool';
  }

  private getStageZoomPlugin() {
    return this.instance.getPlugin<WeaveStageZoomPlugin>('stageZoom');
  }

  onInit(): void {
    const stageZoomPlugin = this.getStageZoomPlugin();
    if (!stageZoomPlugin) {
      throw new Error(
        'WeaveZoomOutToolAction requires the WeaveStageZoomPlugin to be loaded'
      );
    }
  }

  trigger(
    cancelAction: () => void,
    params: WeaveZoomOutToolActionParams
  ): void {
    const stageZoomPlugin = this.getStageZoomPlugin();

    if (!stageZoomPlugin.canZoomOut()) {
      return;
    }

    stageZoomPlugin.zoomOut();

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
