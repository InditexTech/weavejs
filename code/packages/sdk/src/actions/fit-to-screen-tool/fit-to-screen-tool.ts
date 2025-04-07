// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveAction } from '@/actions/action';
import { WeaveStageZoomPlugin } from '@/plugins/stage-zoom/stage-zoom';

export class WeaveFitToScreenToolAction extends WeaveAction {
  internalUpdate = undefined;
  cleanup = undefined;

  getName(): string {
    return 'fitToScreenTool';
  }

  private getStageZoomPlugin() {
    return this.instance.getPlugin<WeaveStageZoomPlugin>('stageZoom');
  }

  init() {
    const stageZoomPlugin = this.getStageZoomPlugin();
    if (!stageZoomPlugin) {
      throw new Error(
        'WeaveFitToScreenToolAction requires the WeaveStageZoomPlugin to be loaded'
      );
    }
  }

  trigger(cancelAction: () => void) {
    const stageZoomPlugin = this.getStageZoomPlugin();
    stageZoomPlugin.fitToScreen();
    cancelAction();
  }
}
