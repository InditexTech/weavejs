// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import {
  type WeaveExportFormats,
  type WeaveExportNodesOptions,
  WEAVE_EXPORT_BACKGROUND_COLOR,
  WEAVE_EXPORT_FILE_FORMAT,
  WEAVE_EXPORT_FORMATS,
} from '@inditextech/weave-types';
import { WeaveAction } from '../action';
import { EXPORT_STAGE_TOOL_ACTION_NAME } from './constants';
import type { WeaveExportNodesActionParams } from '../export-nodes-tool/types';
import type Konva from 'konva';

export class WeaveExportStageToolAction extends WeaveAction {
  protected cancelAction!: () => void;
  private defaultFormatOptions: WeaveExportNodesOptions = {
    format: WEAVE_EXPORT_FORMATS.PNG,
    padding: 0,
    pixelRatio: 1,
    backgroundColor: WEAVE_EXPORT_BACKGROUND_COLOR,
    quality: 1,
  };
  private options!: WeaveExportNodesOptions;
  onPropsChange = undefined;
  onInit = undefined;

  getName(): string {
    return EXPORT_STAGE_TOOL_ACTION_NAME;
  }

  private async exportStage(
    boundingNodes: (nodes: Konva.Node[]) => Konva.Node[]
  ) {
    const mainLayer = this.instance.getMainLayer();

    const img = await this.instance.exportNodes(
      mainLayer?.getChildren() ?? [],
      boundingNodes,
      this.options
    );

    const link = document.createElement('a');
    link.href = img.src;
    link.download = `${uuidv4()}${
      WEAVE_EXPORT_FILE_FORMAT[
        (this.options.format as WeaveExportFormats) ?? WEAVE_EXPORT_FORMATS.PNG
      ]
    }`;
    link.click();

    this.cancelAction?.();
  }

  async trigger(
    cancelAction: () => void,
    { boundingNodes, options }: WeaveExportNodesActionParams
  ): Promise<void> {
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
    await this.exportStage(boundingNodes ?? ((nodes) => nodes));
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().tabIndex = 0;
    stage.container().click();
    stage.container().focus();

    this.instance.triggerAction('selectionTool');
  }
}
