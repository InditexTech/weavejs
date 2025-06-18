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
import { getBoundingBox } from '@/utils';

export class WeaveExportManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('export-manager');
    this.logger.debug('Export manager created');
  }

  exportNodes(
    nodes: WeaveElementInstance[],
    options: WeaveExportNodesOptions
  ): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const {
        format = WEAVE_EXPORT_FORMATS.PNG,
        padding = 0,
        pixelRatio = 1,
        backgroundColor = WEAVE_EXPORT_BACKGROUND_COLOR,
      } = options;

      const stage = this.instance.getStage();
      const mainLayer = this.instance.getMainLayer();

      const realNodes: Konva.Node[] = nodes
        .map((node) => {
          if (node.getAttrs().nodeId) {
            return stage.findOne(`#${node.getAttrs().nodeId}`);
          }
          return node;
        })
        .filter((node) => typeof node !== 'undefined');

      if (mainLayer) {
        const bounds = getBoundingBox(stage, realNodes);

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
          fill: backgroundColor,
        });

        exportGroup.add(background);

        for (const node of realNodes) {
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

        exportGroup.toImage({
          x: backgroundRect.x,
          y: backgroundRect.y,
          width: backgroundRect.width,
          height: backgroundRect.height,
          mimeType: format,
          pixelRatio,
          quality: options.quality ?? 1,
          callback: (img) => {
            exportGroup.destroy();

            resolve(img);
          },
        });
      }
    });
  }
}
