// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from '@/plugins/plugin';
import { WeaveStageDropAreaPluginCallbacks } from './types';

export class WeaveStageDropAreaPlugin extends WeavePlugin {
  private callbacks?: WeaveStageDropAreaPluginCallbacks;
  getLayerName = undefined;
  initLayer = undefined;
  render: undefined;

  constructor(callbacks?: WeaveStageDropAreaPluginCallbacks) {
    super();

    this.callbacks = callbacks;
    this.enabled = true;
  }

  getName() {
    return 'stageDropArea';
  }

  init() {
    this.initEvents();
  }

  private initEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    stage.container().addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();

      this.callbacks?.onStageDrop?.(e);
      this.instance.emitEvent('onStageDrop', e);
    });
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}
