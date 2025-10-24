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
    const keys = Object.keys(this.selectedHalos);
    keys.forEach((key) => {
      this.selectedHalos[key].destroy();
      delete this.selectedHalos[key];
    });
  }

  private getNodeRectInfo(node: Konva.Node) {
    const stage = node.getStage();
    if (!stage) return null;

    const clone = node.clone();

    const box = clone.getClientRect({
      skipTransform: true,
      skipStroke: true,
      relativeTo: node.getParent() ?? this.instance.getMainLayer(),
    });
    const localBox = clone.getClientRect({
      skipTransform: true,
      skipStroke: true,
    });

    const transform = clone.getAbsoluteTransform();

    // Compute the four absolute corners of the box
    const corners = [
      { x: localBox.x, y: localBox.y },
      { x: localBox.x + localBox.width, y: localBox.y },
      { x: localBox.x + localBox.width, y: localBox.y + localBox.height },
      { x: localBox.x, y: localBox.y + localBox.height },
    ].map((p) => transform.point(p));

    return {
      x: corners[0].x,
      y: corners[0].y,
      width: box.width * clone.scaleX(),
      height: box.height * clone.scaleY(),
      rotation: clone.rotation(),
    };
  }

  createSelectionHalo(node: Konva.Node): void {
    const nodeId: string = node.getAttrs().id ?? '';

    if (this.selectedHalos[nodeId]) {
      return;
    }

    const info = this.getNodeRectInfo(node);

    if (info) {
      const parent = node.getParent();
      // Is a Container (frame)
      if (node.getAttrs().nodeId) {
        const realParent = this.instance
          .getStage()
          .findOne(`#${node.getAttrs().nodeId}`);
        if (realParent) {
          info.x += realParent.x();
          info.y += realParent.y();
        }
      }
      // Its parent is a Container (frame)
      if (parent && parent.getAttrs().nodeId) {
        const realParent = this.instance
          .getStage()
          .findOne(`#${parent.getAttrs().nodeId}`);
        if (realParent) {
          info.x += realParent.x();
          info.y += realParent.y();
        }
      }

      this.selectedHalos[nodeId] = new Konva.Rect({
        id: `${nodeId}-selection-halo`,
        name: 'selection-halo',
        x: info.x,
        y: info.y,
        width: info.width,
        height: info.height,
        rotation: info.rotation,
        stroke: this.config.style.stroke,
        strokeWidth: this.config.style.strokeWidth,
        fill: this.config.style.fill,
        strokeScaleEnabled: false,
        draggable: false,
        listening: false,
      });

      this.instance.getSelectionLayer()?.add(this.selectedHalos[nodeId]);
    }
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
