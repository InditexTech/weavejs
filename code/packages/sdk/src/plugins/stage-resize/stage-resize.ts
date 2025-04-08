// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from "@/plugins/plugin";

export class WeaveStageResizePlugin extends WeavePlugin {
  getLayerName = undefined;
  initLayer = undefined;
  render: undefined;

  registersLayers() {
    return false;
  }

  getName() {
    return 'stageResize';
  }

  init() {
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
          pluginInstance.render?.();
        }
      }
    });
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}
