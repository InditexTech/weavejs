// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type Logger } from 'pino';
import { Weave } from '@/weave';
import { v4 as uuidv4 } from 'uuid';
import {
  type WeaveElementInstance,
  type WeaveExportNodesOptions,
  WEAVE_EXPORT_BACKGROUND_COLOR,
  WEAVE_EXPORT_FORMATS,
} from '@inditextech/weave-types';
import Konva from 'konva';
import { getExportBoundingBox } from '@/utils';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { WEAVE_NODES_SELECTION_KEY } from '@/plugins/nodes-selection/constants';
import type { WeaveStageGridPlugin } from '@/plugins/stage-grid/stage-grid';
import { WEAVE_STAGE_GRID_KEY } from '@/plugins/stage-grid/constants';
import type { WeaveNodesEdgeSnappingPlugin } from '@/plugins/nodes-edge-snapping/nodes-edge-snapping';
import { WEAVE_NODES_EDGE_SNAPPING_PLUGIN_KEY } from '@/plugins/nodes-edge-snapping/constants';
import type { WeaveNodesDistanceSnappingPlugin } from '@/plugins/nodes-distance-snapping/nodes-distance-snapping';
import { WEAVE_NODES_DISTANCE_SNAPPING_PLUGIN_KEY } from '@/plugins/nodes-distance-snapping/constants';

export class WeaveExportManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('export-manager');
    this.logger.debug('Export manager created');
  }

  private fitKonvaPixelRatio(
    sw: number,
    sh: number,
    targetPR = 1,
    maxArea = 16777216
  ) {
    if (sw <= 0 || sh <= 0) return { pixelRatio: 0, outW: 0, outH: 0 };

    const desiredArea = sw * sh * targetPR * targetPR;
    let pr = targetPR;

    if (desiredArea > maxArea) {
      pr = Math.sqrt(maxArea / (sw * sh));
    }

    // Integer canvas size Konva will create:
    const outW = Math.max(1, Math.floor(sw * pr));
    const outH = Math.max(1, Math.floor(sh * pr));

    return { pixelRatio: pr, outW, outH };
  }

  exportNodesAsImage(
    nodes: WeaveElementInstance[],
    boundingNodes: (nodes: Konva.Node[]) => Konva.Node[],
    options: WeaveExportNodesOptions
  ): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const {
        format = WEAVE_EXPORT_FORMATS.PNG,
        padding = 0,
        pixelRatio = 1,
        backgroundColor = WEAVE_EXPORT_BACKGROUND_COLOR,
      } = options;

      this.getNodesSelectionPlugin()?.disable();
      this.getNodesDistanceSnappingPlugin()?.disable();
      this.getNodesEdgeSnappingPlugin()?.disable();
      this.getStageGridPlugin()?.disable();

      const stage = this.instance.getStage();
      const mainLayer = this.instance.getMainLayer();

      const originalPosition = { x: stage.x(), y: stage.y() };
      const originalScale = { x: stage.scaleX(), y: stage.scaleY() };

      stage.scale({ x: 1, y: 1 });

      if (mainLayer) {
        const bounds = getExportBoundingBox(stage, boundingNodes(nodes));

        const scaleX = stage.scaleX();
        const scaleY = stage.scaleY();

        const unscaledBounds = {
          x: bounds.x / scaleX,
          y: bounds.y / scaleY,
          width: bounds.width / scaleX,
          height: bounds.height / scaleY,
        };

        const exportGroup = new Konva.Group();

        const background = new Konva.Rect({
          x: unscaledBounds.x - padding,
          y: unscaledBounds.y - padding,
          width: unscaledBounds.width + 2 * padding,
          height: unscaledBounds.height + 2 * padding,
          strokeWidth: 0,
          fill: backgroundColor,
        });

        exportGroup.add(background);

        for (const node of nodes) {
          const clonedNode = node.clone({ id: uuidv4() });
          const absPos = node.getAbsolutePosition();
          clonedNode.absolutePosition({
            x: absPos.x / scaleX,
            y: absPos.y / scaleY,
          });
          exportGroup.add(clonedNode);
        }

        mainLayer.add(exportGroup);

        const backgroundRect = background.getClientRect();

        stage.batchDraw();

        const { pixelRatio: finalPixelRatio } = this.fitKonvaPixelRatio(
          Math.round(backgroundRect.width),
          Math.round(backgroundRect.height),
          pixelRatio
        );

        exportGroup.toImage({
          x: Math.round(backgroundRect.x),
          y: Math.round(backgroundRect.y),
          width: Math.round(backgroundRect.width),
          height: Math.round(backgroundRect.height),
          mimeType: format,
          pixelRatio: finalPixelRatio,
          quality: options.quality ?? 1,
          callback: (img) => {
            exportGroup.destroy();

            stage.position(originalPosition);
            stage.scale(originalScale);
            stage.batchDraw();

            this.getNodesSelectionPlugin()?.enable();
            this.getNodesDistanceSnappingPlugin()?.enable();
            this.getNodesEdgeSnappingPlugin()?.enable();
            this.getStageGridPlugin()?.enable();

            resolve(img);
          },
        });
      }
    });
  }

  async exportNodesAsBuffer(
    nodes: string[],
    boundingNodes: (nodes: Konva.Node[]) => Konva.Node[],
    options: WeaveExportNodesOptions
  ): Promise<{
    composites: { input: Buffer; left: number; top: number }[];
    width: number;
    height: number;
  }> {
    const {
      format = WEAVE_EXPORT_FORMATS.PNG,
      padding = 0,
      pixelRatio = 1,
      backgroundColor = WEAVE_EXPORT_BACKGROUND_COLOR,
    } = options;

    this.getNodesSelectionPlugin()?.disable();
    this.getNodesDistanceSnappingPlugin()?.disable();
    this.getNodesEdgeSnappingPlugin()?.disable();
    this.getStageGridPlugin()?.disable();

    const stage = this.instance.getStage();
    const mainLayer = this.instance.getMainLayer();

    const originalPosition = { x: stage.x(), y: stage.y() };
    const originalScale = { x: stage.scaleX(), y: stage.scaleY() };

    stage.scale({ x: 1, y: 1 });

    let realNodes = [...nodes];
    if (nodes.length === 0) {
      realNodes =
        mainLayer?.getChildren().map((node) => node.getAttrs().id ?? '') ?? [];
    }

    const konvaNodes = [];
    for (const nodeId of realNodes) {
      const node = stage.findOne(`#${nodeId}`);
      if (node) {
        konvaNodes.push(node);
      }
    }

    if (mainLayer) {
      const bounds = getExportBoundingBox(stage, boundingNodes(konvaNodes));

      const scaleX = stage.scaleX();
      const scaleY = stage.scaleY();

      const unscaledBounds = {
        x: bounds.x / scaleX,
        y: bounds.y / scaleY,
        width: bounds.width / scaleX,
        height: bounds.height / scaleY,
      };

      const exportGroup = new Konva.Group();

      const background = new Konva.Rect({
        x: unscaledBounds.x - padding,
        y: unscaledBounds.y - padding,
        width: unscaledBounds.width + 2 * padding,
        height: unscaledBounds.height + 2 * padding,
        strokeWidth: 0,
        fill: backgroundColor,
      });

      exportGroup.add(background);

      for (const node of konvaNodes) {
        const clonedNode = node.clone({ id: uuidv4() });
        const absPos = node.getAbsolutePosition();
        clonedNode.absolutePosition({
          x: absPos.x / scaleX,
          y: absPos.y / scaleY,
        });
        exportGroup.add(clonedNode);
      }

      mainLayer.add(exportGroup);

      const backgroundRect = background.getClientRect();

      stage.batchDraw();

      const composites: { input: Buffer; left: number; top: number }[] = [];

      const maxRenderSize = 1920; // safe max for Cairo
      const tileSize = Math.floor(maxRenderSize / pixelRatio);

      const imageWidth = Math.round(backgroundRect.width);
      const imageHeight = Math.round(backgroundRect.height);

      let compositeX: number = 0;
      let compositeY: number = 0;
      for (
        let y = Math.round(backgroundRect.y);
        y < imageHeight;
        y += tileSize
      ) {
        compositeX = 0;

        for (
          let x = Math.round(backgroundRect.x);
          x < imageWidth;
          x += tileSize
        ) {
          const width = Math.min(tileSize, imageWidth - x);
          const height = Math.min(tileSize, imageHeight - y);

          const canvas = (await exportGroup.toCanvas({
            x,
            y,
            width: width,
            height: height,
            mimeType: format,
            pixelRatio,
            quality: options.quality ?? 1,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          })) as any;

          const buffer = canvas.toBuffer();

          composites.push({
            top: compositeY * pixelRatio,
            left: compositeX * pixelRatio,
            input: buffer,
          });
          compositeX = compositeX + tileSize;
        }

        compositeY = compositeY + tileSize;
      }

      exportGroup.destroy();

      stage.position(originalPosition);
      stage.scale(originalScale);
      stage.batchDraw();

      this.getNodesSelectionPlugin()?.enable();
      this.getNodesDistanceSnappingPlugin()?.enable();
      this.getNodesEdgeSnappingPlugin()?.enable();
      this.getStageGridPlugin()?.enable();

      return {
        composites,
        width: imageWidth * pixelRatio,
        height: imageHeight * pixelRatio,
      };
    }

    throw new Error('Failed to export nodes as data URL');
  }

  imageToBase64(img: HTMLImageElement, mimeType: string): string {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(img, 0, 0);

    const URL = canvas.toDataURL(mimeType);

    canvas.remove();

    return URL;
  }

  getNodesSelectionPlugin() {
    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>(
      WEAVE_NODES_SELECTION_KEY
    );
    return selectionPlugin;
  }

  getStageGridPlugin() {
    const gridPlugin =
      this.instance.getPlugin<WeaveStageGridPlugin>(WEAVE_STAGE_GRID_KEY);
    return gridPlugin;
  }

  getNodesEdgeSnappingPlugin() {
    const snappingPlugin =
      this.instance.getPlugin<WeaveNodesEdgeSnappingPlugin>(
        WEAVE_NODES_EDGE_SNAPPING_PLUGIN_KEY
      );
    return snappingPlugin;
  }

  getNodesDistanceSnappingPlugin() {
    const snappingPlugin =
      this.instance.getPlugin<WeaveNodesDistanceSnappingPlugin>(
        WEAVE_NODES_DISTANCE_SNAPPING_PLUGIN_KEY
      );
    return snappingPlugin;
  }
}
