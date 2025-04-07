// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  WeaveExportNodeOptions,
  WEAVE_EXPORT_BACKGROUND_COLOR,
  WEAVE_EXPORT_FILE_FORMAT,
  WEAVE_EXPORT_FORMATS,
} from '@inditextech/weavejs-types';
import { WeaveAction } from '../action';
import { WeaveExportStageActionParams } from './types';

export class WeaveExportStageToolAction extends WeaveAction {
  protected cancelAction!: () => void;
  private defaultFormatOptions: WeaveExportNodeOptions = {
    format: WEAVE_EXPORT_FORMATS.PNG,
    padding: 0,
    pixelRatio: 1,
    backgroundColor: WEAVE_EXPORT_BACKGROUND_COLOR,
    quality: 1,
  };
  private options!: WeaveExportNodeOptions;
  internalUpdate = undefined;
  init = undefined;

  getName(): string {
    return 'exportStageTool';
  }

  private async exportStage() {
    const img = await this.instance.exportStage(this.options);

    const link = document.createElement('a');
    link.href = img.src;
    link.download = `stage${
      WEAVE_EXPORT_FILE_FORMAT[this.options.format ?? WEAVE_EXPORT_FORMATS.PNG]
    }`;
    link.click();

    this.cancelAction?.();
  }

  async trigger(
    cancelAction: () => void,
    { options }: WeaveExportStageActionParams
  ) {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    this.cancelAction = cancelAction;

    this.options = {
      ...this.defaultFormatOptions,
      ...options,
    };
    await this.exportStage();
  }

  cleanup() {
    const stage = this.instance.getStage();

    stage.container().tabIndex = 0;
    stage.container().click();
    stage.container().focus();

    this.instance.triggerAction('selectionTool');
  }
}
