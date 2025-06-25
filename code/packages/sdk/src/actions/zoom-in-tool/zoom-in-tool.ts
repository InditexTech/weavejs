// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveAction } from '@/actions/action';
import { WeaveStageZoomPlugin } from '@/plugins/stage-zoom/stage-zoom';
import { type WeaveZoomInToolActionParams } from './types';
import { ZOOM_IN_TOOL_ACTION_NAME } from './constants';

export class WeaveZoomInToolAction extends WeaveAction {
  protected previousAction!: string;
  protected cancelAction!: () => void;
  onPropsChange = undefined;

  getName(): string {
    return ZOOM_IN_TOOL_ACTION_NAME;
  }

  private getStageZoomPlugin() {
    const stageZoomPlugin =
      this.instance.getPlugin<WeaveStageZoomPlugin>('stageZoom');

    if (!stageZoomPlugin) {
      throw new Error(
        'WeaveZoomInToolAction requires the WeaveStageZoomPlugin to be loaded'
      );
    }

    return stageZoomPlugin;
  }

  onInit(): void {
    this.getStageZoomPlugin();
  }

  trigger(cancelAction: () => void, params: WeaveZoomInToolActionParams): void {
    const stageZoomPlugin = this.getStageZoomPlugin();

    if (!stageZoomPlugin.canZoomIn()) {
      return;
    }

    stageZoomPlugin.zoomIn();

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
