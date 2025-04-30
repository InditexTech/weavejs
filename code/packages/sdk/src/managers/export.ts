// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type Logger } from 'pino';
import { Weave } from '@/weave';
import { v4 as uuidv4 } from 'uuid';
import {
  type WeaveElementInstance,
  type WeaveExportNodeOptions,
  WEAVE_EXPORT_BACKGROUND_COLOR,
  WEAVE_EXPORT_FORMATS,
} from '@inditextech/weave-types';
import Konva from 'konva';

export class WeaveExportManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('export-manager');
    this.logger.debug('Export manager created');
  }

  exportStage(options: WeaveExportNodeOptions): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const {
        format = WEAVE_EXPORT_FORMATS.PNG,
        padding = 0,
        pixelRatio = 1,
        backgroundColor = WEAVE_EXPORT_BACKGROUND_COLOR,
      } = options;

      const stage = this.instance.getStage();
      const mainLayer = this.instance.getMainLayer();

      const previousScale = stage.scaleX();
      const previousX = stage.x();
      const previousY = stage.y();
      let background: Konva.Rect | undefined = undefined;

      if (mainLayer) {
        const box = mainLayer.getClientRect({ relativeTo: stage });
        const scale = Math.min(
          stage.width() / (box.width + padding * 2),
          stage.height() / (box.height + padding * 2)
        );

        stage.setAttrs({
          x: -box.x * scale + (stage.width() - box.width * scale) / 2,
          y: -box.y * scale + (stage.height() - box.height * scale) / 2,
        });

        const actScale = stage.scale();
        actScale.x = scale;
        actScale.y = scale;
        stage.scale(actScale);

        const plugins = this.instance.getPlugins();
        for (const pluginId of Object.keys(plugins)) {
          const pluginInstance = plugins[pluginId];
          pluginInstance.render?.();
        }

        const stageClientRect = stage.getClientRect({ relativeTo: stage });

        background = new Konva.Rect({
          x: stageClientRect.x,
          y: stageClientRect.y,
          width: stageClientRect.width,
          height: stageClientRect.height,
          fill: backgroundColor,
        });

        mainLayer.add(background);
        background.moveToBottom();

        stage.toImage({
          mimeType: format,
          x: (mainLayer?.x() ?? 0) - padding,
          y: (mainLayer?.y() ?? 0) - padding,
          width: (mainLayer?.width() ?? 0) + padding * 2,
          height: (mainLayer?.height() ?? 0) + padding * 2,
          pixelRatio,
          quality: options.quality ?? 1,
          callback: (img) => {
            stage.setAttrs({
              x: previousX,
              y: previousY,
              scaleX: previousScale,
              scaleY: previousScale,
            });

            const plugins = this.instance.getPlugins();
            for (const pluginId of Object.keys(plugins)) {
              const pluginInstance = plugins[pluginId];
              pluginInstance.render?.();
            }

            background?.destroy();

            resolve(img);
          },
        });
      }
    });
  }

  exportNode(
    node: WeaveElementInstance,
    options: WeaveExportNodeOptions
  ): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const {
        format = WEAVE_EXPORT_FORMATS.PNG,
        padding = 0,
        pixelRatio = 1,
        backgroundColor = WEAVE_EXPORT_BACKGROUND_COLOR,
      } = options;

      // const stage = this.instance.getStage();
      const mainLayer = this.instance.getMainLayer();

      if (mainLayer) {
        const clonedNode = node.clone({ id: uuidv4() });

        const group = new Konva.Group({
          x: clonedNode.getAbsolutePosition().x,
          y: clonedNode.getAbsolutePosition().y,
          visible: false,
        });
        mainLayer.add(group);

        const nodeClientRect = clonedNode.getClientRect();

        const background = new Konva.Rect({
          x: 0,
          y: 0,
          width: nodeClientRect.width + 2 * padding,
          height: nodeClientRect.height + 2 * padding,
          fill: backgroundColor,
        });

        group.add(background);
        background.zIndex(0);

        clonedNode.moveTo(group);
        clonedNode.setPosition({
          x: padding,
          y: padding,
        });
        clonedNode.zIndex(1);

        group.visible(true);
        group.toImage({
          mimeType: format,
          pixelRatio,
          quality: options.quality ?? 1,
          callback: (img) => {
            group?.destroy();

            resolve(img);
          },
        });
      }
    });
  }
}
