// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveExportNodesOptions,
  type WeaveElementInstance,
  WEAVE_EXPORT_BACKGROUND_COLOR,
  WEAVE_EXPORT_FORMATS,
} from '@inditextech/weave-types';
import { type WeaveExportNodesActionParams } from './types';
import { WeaveAction } from '../action';
import { EXPORT_NODES_TOOL_ACTION_NAME } from './constants';
import type Konva from 'konva';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';

export class WeaveExportNodesToolAction extends WeaveAction {
  protected cancelAction!: () => void;
  protected triggerSelectionTool!: boolean;
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
    return EXPORT_NODES_TOOL_ACTION_NAME;
  }

  private async exportNodes(
    nodes: WeaveElementInstance[],
    boundingNodes: (nodes: Konva.Node[]) => Konva.Node[]
  ): Promise<HTMLImageElement> {
    const img = await this.instance.exportNodes(
      nodes,
      boundingNodes ?? ((nodes) => nodes),
      this.options
    );

    return img;
  }

  async trigger(
    cancelAction: () => void,
    {
      nodes,
      boundingNodes,
      options,
      triggerSelectionTool = true,
    }: WeaveExportNodesActionParams
  ): Promise<HTMLImageElement> {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    this.triggerSelectionTool = triggerSelectionTool;
    this.cancelAction = cancelAction;

    this.options = {
      ...this.defaultFormatOptions,
      ...options,
    };

    const img = await this.exportNodes(
      nodes,
      boundingNodes ?? ((nodes) => nodes)
    );

    this.cancelAction?.();

    return img;
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().tabIndex = 0;
    stage.container().click();
    stage.container().focus();

    if (this.triggerSelectionTool) {
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }
  }
}
