// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from '@/plugins/plugin';
import { WEAVE_STAGE_DROP_AREA_KEY } from './constants';
import type { WeaveStageDropPluginOnStageDropEvent } from './types';

export class WeaveStageDropAreaPlugin extends WeavePlugin {
  getLayerName = undefined;
  initLayer = undefined;
  onRender: undefined;

  constructor() {
    super();

    this.enabled = true;
  }

  getName(): string {
    return WEAVE_STAGE_DROP_AREA_KEY;
  }

  onInit(): void {
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

      this.instance.emitEvent<WeaveStageDropPluginOnStageDropEvent>(
        'onStageDrop',
        e
      );
    });
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
