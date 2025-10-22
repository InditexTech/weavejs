// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WeavePlugin } from '@/plugins/plugin';
import {
  WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_DEFAULT_CONFIG,
  WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY,
  WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_LAYER_ID,
} from './constants';
import { mergeExceptArrays } from '@/utils';
import type {
  WeaveNodesMultiSelectionFeedbackConfig,
  WeaveNodesMultiSelectionFeedbackPluginParams,
} from './types';

export class WeaveNodesMultiSelectionFeedbackPlugin extends WeavePlugin {
  private config!: WeaveNodesMultiSelectionFeedbackConfig;
  protected selectedHalos: Record<string, Konva.Rect> = {};

  onRender: undefined;
  onInit: undefined;

  constructor(params?: WeaveNodesMultiSelectionFeedbackPluginParams) {
    super();

    this.config = mergeExceptArrays(
      WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_DEFAULT_CONFIG,
      params?.config ?? {}
    );

    this.selectedHalos = {};
  }

  getName(): string {
    return WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY;
  }

  getLayerName(): string {
    return WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_LAYER_ID;
  }

  initLayer(): void {
    const stage = this.instance.getStage();

    const findLayer = stage.findOne(`#${this.getLayerName()}`);

    if (!findLayer) {
      const layer = new Konva.Layer({ id: this.getLayerName() });
      stage.add(layer);
    }
  }

  getSelectedHalos() {
    return this.selectedHalos;
  }

  cleanupSelectedHalos() {
    this.selectedHalos = {};
  }

  createSelectionHalo(node: Konva.Node): void {
    const nodeId: string = node.getAttrs().id ?? '';

    if (this.selectedHalos[nodeId]) {
      return;
    }

    this.selectedHalos[nodeId] = new Konva.Rect({
      id: `${nodeId}-selection-halo`,
      name: 'selection-halo',
      x: node.x(),
      y: node.y(),
      width: node.width(),
      height: node.height(),
      stroke: this.config.style.stroke,
      strokeWidth: this.config.style.strokeWidth,
      fill: this.config.style.fill,
      draggable: false,
      listening: false,
    });

    this.instance.getSelectionLayer()?.add(this.selectedHalos[nodeId]);
  }

  destroySelectionHalo(node: Konva.Node): void {
    const nodeId: string = node.getAttrs().id ?? '';
    if (this.selectedHalos[nodeId]) {
      this.selectedHalos[nodeId].destroy();
      delete this.selectedHalos[nodeId];
    }
  }

  hideSelectionHalo(node: Konva.Node): void {
    const selectionLayer = this.instance.getSelectionLayer();

    if (selectionLayer) {
      const groupHalo = selectionLayer.findOne(
        `#${node.getAttrs().id}-selection-halo`
      );
      if (groupHalo) {
        groupHalo.hide();
      }
    }
  }

  handleSelectionHalo(node: Konva.Node): void {
    const selectionLayer = this.instance.getSelectionLayer();

    if (selectionLayer) {
      const groupHalo = selectionLayer.findOne(
        `#${node.getAttrs().id}-selection-halo`
      );
      if (groupHalo) {
        groupHalo.rotation(node.rotation());
        groupHalo.x(node.x());
        groupHalo.y(node.y());
        groupHalo.width(node.width());
        groupHalo.height(node.height());
        groupHalo.show();
      }
    }
  }

  private getLayer() {
    const stage = this.instance.getStage();
    return stage.findOne(`#${this.getLayerName()}`) as Konva.Layer | undefined;
  }

  enable(): void {
    this.getLayer()?.show();
    this.enabled = true;
  }

  disable(): void {
    this.getLayer()?.hide();
    this.enabled = false;
  }
}
