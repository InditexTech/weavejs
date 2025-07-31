// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveExportNodesOptions,
  WEAVE_EXPORT_BACKGROUND_COLOR,
  WEAVE_EXPORT_FORMATS,
} from '@inditextech/weave-types';
import { WeaveAction } from '../action';
import { EXPORT_STAGE_TOOL_ACTION_NAME } from './constants';
import type { WeaveExportNodesActionParams } from '../export-nodes-tool/types';
import type Konva from 'konva';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';

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
  ): Promise<HTMLImageElement> {
    const mainLayer = this.instance.getMainLayer();

    const img = await this.instance.exportNodes(
      // mainLayer?.find('.node') ?? [],
      mainLayer?.getChildren() ?? [],
      boundingNodes,
      this.options
    );

    return img;
  }

  async trigger(
    cancelAction: () => void,
    { boundingNodes, options }: WeaveExportNodesActionParams
  ): Promise<HTMLImageElement> {
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

    const img = await this.exportStage(boundingNodes ?? ((nodes) => nodes));

    this.cancelAction?.();

    return img;
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().tabIndex = 0;
    stage.container().click();
    stage.container().focus();

    this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
  }
}
