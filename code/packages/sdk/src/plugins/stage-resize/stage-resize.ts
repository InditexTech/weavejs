// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from '@/plugins/plugin';
import { WEAVE_STAGE_RESIZE_KEY } from './constants';

export class WeaveStageResizePlugin extends WeavePlugin {
  getLayerName = undefined;
  initLayer = undefined;
  onRender: undefined;

  getName(): string {
    return WEAVE_STAGE_RESIZE_KEY;
  }

  onInit(): void {
    const stage = this.instance.getStage();

    window.addEventListener('resize', () => {
      const containerParent = stage.container().parentNode;

      if (!this.enabled) {
        return;
      }

      if (containerParent) {
        const containerBoundBox = stage.container().getBoundingClientRect();

        const containerWidth = containerBoundBox.width;
        const containerHeight = containerBoundBox.height;
        stage.width(containerWidth);
        stage.height(containerHeight);

        const plugins = this.instance.getPlugins();
        for (const pluginId of Object.keys(plugins)) {
          const pluginInstance = plugins[pluginId];
          pluginInstance.onRender?.();
        }
      }
    });
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
