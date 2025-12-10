// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from '@/plugins/plugin';
import { WEAVE_STAGE_RESIZE_KEY } from './constants';
import { setupUpscaleStage } from '@/utils/upscale';

export class WeaveStageResizePlugin extends WeavePlugin {
  getLayerName = undefined;
  initLayer = undefined;
  onRender: undefined;

  getName(): string {
    return WEAVE_STAGE_RESIZE_KEY;
  }

  private resizeStage() {
    const stage = this.instance.getStage();

    const containerParent = stage.container().parentNode;

    if (!this.enabled) {
      return;
    }

    if (containerParent) {
      setupUpscaleStage(this.instance, stage);

      const plugins = this.instance.getPlugins();
      for (const pluginId of Object.keys(plugins)) {
        const pluginInstance = plugins[pluginId];
        pluginInstance.onRender?.();
      }
    }
  }

  onInit(): void {
    // Resize when window is resized
    window.addEventListener('resize', () => {
      this.resizeStage();
    });

    // Resize when stage container is resized
    const resizeObserver = new ResizeObserver(() => {
      this.resizeStage();
    });

    const stage = this.instance.getStage();
    resizeObserver.observe(stage.container());
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
