// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type Logger } from 'pino';
import { Weave } from '@/weave';
import { v4 as uuidv4 } from 'uuid';
import {
  type BoundingBox,
  type WeaveElementInstance,
  type WeaveExportNodesOptions,
  WEAVE_EXPORT_BACKGROUND_COLOR,
  WEAVE_EXPORT_FORMATS,
  WEAVE_KONVA_BACKEND,
} from '@inditextech/weave-types';
import Konva from 'konva';
import { getExportBoundingBox } from '@/utils/utils';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import {
  WEAVE_NODES_SELECTION_KEY,
  WEAVE_NODES_SELECTION_LAYER_ID,
} from '@/plugins/nodes-selection/constants';
import type { WeaveStageGridPlugin } from '@/plugins/stage-grid/stage-grid';
import {
  WEAVE_GRID_LAYER_ID,
  WEAVE_STAGE_GRID_PLUGIN_KEY,
} from '@/plugins/stage-grid/constants';

export class WeaveExportManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('export-manager');
    this.logger.debug('Export manager created');
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private parseExportOptions(options: WeaveExportNodesOptions) {
    return {
      format: options.format ?? WEAVE_EXPORT_FORMATS.PNG,
      padding: options.padding ?? 0,
      pixelRatio: options.pixelRatio ?? 1,
      backgroundColor: options.backgroundColor ?? WEAVE_EXPORT_BACKGROUND_COLOR,
    };
  }

  private saveAndDisablePlugins() {
    const nodesSelectionPluginPrev =
      this.getNodesSelectionPlugin()?.isEnabled();
    const nodesStageGridPluginPrev = this.getStageGridPlugin()?.isEnabled();
    this.getNodesSelectionPlugin()?.disable();
    this.getStageGridPlugin()?.disable();
    return { nodesSelectionPluginPrev, nodesStageGridPluginPrev };
  }

  private restorePlugins(
    nodesSelectionPluginPrev: boolean | undefined,
    nodesStageGridPluginPrev: boolean | undefined
  ) {
    if (nodesSelectionPluginPrev) {
      this.getNodesSelectionPlugin()?.enable();
    }
    if (nodesStageGridPluginPrev) {
      this.getStageGridPlugin()?.enable();
    }
  }

  private saveAndResetStage(resetPosition = false) {
    const stage = this.instance.getStage();
    const originalPosition = { x: stage.x(), y: stage.y() };
    const originalScale = { x: stage.scaleX(), y: stage.scaleY() };
    stage.scale({ x: 1, y: 1 });
    if (resetPosition) {
      stage.position({ x: 0, y: 0 });
    }
    return { stage, originalPosition, originalScale };
  }

  private restoreStage(
    stage: Konva.Stage,
    originalPosition: { x: number; y: number },
    originalScale: { x: number; y: number }
  ) {
    stage.position(originalPosition);
    stage.scale(originalScale);
    stage.batchDraw();
  }

  private buildNodesExportGroup(
    nodes: Konva.Node[],
    boundingNodes: (nodes: Konva.Node[]) => Konva.Node[],
    stage: Konva.Stage,
    mainLayer: Konva.Layer,
    padding: number,
    backgroundColor: string
  ) {
    const bounds = getExportBoundingBox(boundingNodes(nodes));

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

    return { exportGroup, background, backgroundRect };
  }

  private buildAreaBackground(
    area: { x: number; y: number; width: number; height: number },
    stage: Konva.Stage,
    mainLayer: Konva.Layer,
    padding: number,
    backgroundColor: string,
    relativeToStage = false
  ) {
    const bounds = area;
    const scaleX = stage.scaleX();
    const scaleY = stage.scaleY();

    const unscaledBounds = {
      x: bounds.x / scaleX,
      y: bounds.y / scaleY,
      width: bounds.width / scaleX,
      height: bounds.height / scaleY,
    };

    const background = new Konva.Rect({
      x: unscaledBounds.x - padding,
      y: unscaledBounds.y - padding,
      width: unscaledBounds.width + 2 * padding,
      height: unscaledBounds.height + 2 * padding,
      strokeWidth: 0,
      fill: backgroundColor,
    });

    mainLayer.add(background);
    background.moveToBottom();
    stage.batchDraw();

    const backgroundRect = relativeToStage
      ? background.getClientRect({ relativeTo: stage })
      : background.getClientRect();

    return { background, backgroundRect };
  }

  private async renderTiles(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    source: any,
    backgroundRect: { x: number; y: number; width: number; height: number },
    format: string,
    pixelRatio: number,
    quality: number
  ): Promise<{ composites: { input: Buffer; left: number; top: number }[] }> {
    const composites: { input: Buffer; left: number; top: number }[] = [];

    const imageWidth = Math.round(backgroundRect.width);
    const imageHeight = Math.round(backgroundRect.height);

    const maxRenderSize = 1920; // safe max for Cairo
    const cols = Math.ceil(imageWidth / maxRenderSize);
    const rows = Math.ceil(imageHeight / maxRenderSize);

    const tileWidth = Math.floor(imageWidth / cols);
    const tileHeight = Math.floor(imageHeight / rows);

    for (let y = 0; y < imageHeight; y += tileHeight) {
      for (let x = 0; x < imageWidth; x += tileWidth) {
        const width = Math.min(tileWidth, imageWidth - x);
        const height = Math.min(tileHeight, imageHeight - y);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const canvas: any = await source.toCanvas({
          x: Math.round(backgroundRect.x) + x,
          y: Math.round(backgroundRect.y) + y,
          width,
          height,
          mimeType: format,
          pixelRatio,
          quality,
        });

        let buffer: Buffer | null = null;
        if (
          globalThis._weave_serverSideBackend === WEAVE_KONVA_BACKEND.CANVAS
        ) {
          buffer = canvas.toBuffer();
        }
        if (globalThis._weave_serverSideBackend === WEAVE_KONVA_BACKEND.SKIA) {
          buffer = await canvas.toBuffer();
        }

        if (!buffer) {
          throw new Error('Failed to generate image buffer');
        }

        composites.push({
          top: y * pixelRatio,
          left: x * pixelRatio,
          input: buffer,
        });
      }
    }

    return { composites };
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

  private cloneStageForExport(): {
    stage: Konva.Stage;
    mainLayer: Konva.Layer;
    originalScale: { scaleX: number; scaleY: number };
  } {
    const originalStage = this.instance.getStage();
    const stage = originalStage.clone();
    const mainLayer = stage.findOne('#mainLayer') as Konva.Layer;

    if (!mainLayer) {
      throw new Error('Main layer not found');
    }

    const selectionLayer = stage.findOne(
      `#${WEAVE_NODES_SELECTION_LAYER_ID}`
    ) as Konva.Layer;
    selectionLayer?.destroy();

    const gridLayer = stage.findOne(`#${WEAVE_GRID_LAYER_ID}`) as Konva.Layer;
    gridLayer?.destroy();

    const scaleX = originalStage.scaleX();
    const scaleY = originalStage.scaleY();

    return { stage, mainLayer, originalScale: { scaleX, scaleY } };
  }

  private setupForExport({
    nodes,
    bounds,
    stage,
    mainLayer,
    scaleX,
    scaleY,
    options,
    exportArea,
  }: {
    nodes: WeaveElementInstance[];
    bounds: BoundingBox;
    stage: Konva.Stage;
    mainLayer: Konva.Layer;
    scaleX: number;
    scaleY: number;
    options: WeaveExportNodesOptions;
    exportArea: boolean;
  }): {
    exportGroup: Konva.Group;
    pixelRatio: number;
    backgroundRect: { x: number; y: number; width: number; height: number };
  } {
    const {
      padding = 0,
      pixelRatio = 1,
      backgroundColor = WEAVE_EXPORT_BACKGROUND_COLOR,
    } = options;

    const unscaledBounds = {
      x: bounds.x / scaleX,
      y: bounds.y / scaleY,
      width: bounds.width / scaleX,
      height: bounds.height / scaleY,
    };

    const background = new Konva.Rect({
      x: unscaledBounds.x - padding,
      y: unscaledBounds.y - padding,
      width: unscaledBounds.width + 2 * padding,
      height: unscaledBounds.height + 2 * padding,
      strokeWidth: 0,
      fill: backgroundColor,
    });

    const exportGroup = new Konva.Group();

    if (!exportArea) {
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
    } else {
      mainLayer.add(background);
    }

    const backgroundRect = background.getClientRect();

    stage.batchDraw();

    const { pixelRatio: finalPixelRatio } = this.fitKonvaPixelRatio(
      Math.round(backgroundRect.width),
      Math.round(backgroundRect.height),
      pixelRatio
    );

    return {
      exportGroup,
      pixelRatio: finalPixelRatio,
      backgroundRect,
    };
  }

  exportNodesAsImage(
    nodes: WeaveElementInstance[],
    boundingNodes: (nodes: Konva.Node[]) => Konva.Node[],
    options: WeaveExportNodesOptions
  ): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const { format = WEAVE_EXPORT_FORMATS.PNG } = options;

      const {
        stage,
        mainLayer,
        originalScale: { scaleX, scaleY },
      } = this.cloneStageForExport();

      if (mainLayer) {
        const {
          pixelRatio: finalPixelRatio,
          backgroundRect,
          exportGroup,
        } = this.setupForExport({
          nodes,
          bounds: getExportBoundingBox(boundingNodes(nodes)),
          stage,
          mainLayer,
          scaleX,
          scaleY,
          options,
          exportArea: false,
        });

        exportGroup.toImage({
          x: Math.round(backgroundRect.x),
          y: Math.round(backgroundRect.y),
          width: Math.round(backgroundRect.width),
          height: Math.round(backgroundRect.height),
          mimeType: format,
          pixelRatio: finalPixelRatio,
          quality: options.quality ?? 1,
          callback: (img: HTMLImageElement) => {
            exportGroup.destroy();

            stage.destroy();

            resolve(img);
          },
        });
      }
    });
  }

  exportNodesAsBlob(
    nodes: WeaveElementInstance[],
    boundingNodes: (nodes: Konva.Node[]) => Konva.Node[],
    options: WeaveExportNodesOptions
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const { format = WEAVE_EXPORT_FORMATS.PNG } = options;

      const {
        stage,
        mainLayer,
        originalScale: { scaleX, scaleY },
      } = this.cloneStageForExport();

      if (mainLayer) {
        const {
          pixelRatio: finalPixelRatio,
          backgroundRect,
          exportGroup,
        } = this.setupForExport({
          nodes,
          bounds: getExportBoundingBox(boundingNodes(nodes)),
          stage,
          mainLayer,
          scaleX,
          scaleY,
          options,
          exportArea: false,
        });

        exportGroup.toBlob({
          x: Math.round(backgroundRect.x),
          y: Math.round(backgroundRect.y),
          width: Math.round(backgroundRect.width),
          height: Math.round(backgroundRect.height),
          mimeType: format,
          pixelRatio: finalPixelRatio,
          quality: options.quality ?? 1,
          callback: (blob: Blob | null) => {
            exportGroup.destroy();

            stage.destroy();

            if (!blob) {
              reject(new Error('Failed to generate image blob'));
              return;
            }
            resolve(blob);
          },
        });
      }
    });
  }

  exportNodesAsCanvas(
    nodes: WeaveElementInstance[],
    boundingNodes: (nodes: Konva.Node[]) => Konva.Node[],
    options: WeaveExportNodesOptions
  ): Promise<HTMLCanvasElement> {
    return new Promise((resolve) => {
      const { format = WEAVE_EXPORT_FORMATS.PNG } = options;

      const {
        stage,
        mainLayer,
        originalScale: { scaleX, scaleY },
      } = this.cloneStageForExport();

      if (mainLayer) {
        const {
          pixelRatio: finalPixelRatio,
          backgroundRect,
          exportGroup,
        } = this.setupForExport({
          nodes,
          bounds: getExportBoundingBox(boundingNodes(nodes)),
          stage,
          mainLayer,
          scaleX,
          scaleY,
          options,
          exportArea: false,
        });

        exportGroup.toCanvas({
          x: Math.round(backgroundRect.x),
          y: Math.round(backgroundRect.y),
          width: Math.round(backgroundRect.width),
          height: Math.round(backgroundRect.height),
          mimeType: format,
          pixelRatio: finalPixelRatio,
          quality: options.quality ?? 1,
          callback: (canvas: HTMLCanvasElement) => {
            exportGroup.destroy();

            stage.destroy();

            resolve(canvas);
          },
        });
      }
    });
  }

  exportAreaAsImage(
    area: { x: number; y: number; width: number; height: number },
    options: WeaveExportNodesOptions
  ): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const { format = WEAVE_EXPORT_FORMATS.PNG } = options;

      const {
        stage,
        mainLayer,
        originalScale: { scaleX, scaleY },
      } = this.cloneStageForExport();

      if (mainLayer) {
        const { pixelRatio: finalPixelRatio } = this.setupForExport({
          nodes: [],
          bounds: area,
          stage,
          mainLayer,
          scaleX,
          scaleY,
          options,
          exportArea: true,
        });

        stage.toImage({
          x: area.x,
          y: area.y,
          width: area.width,
          height: area.height,
          mimeType: format,
          pixelRatio: finalPixelRatio,
          quality: options.quality ?? 1,
          callback: (img) => {
            stage.destroy();

            resolve(img);
          },
        });
      }
    });
  }

  exportAreaAsBlob(
    area: { x: number; y: number; width: number; height: number },
    options: WeaveExportNodesOptions
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const { format = WEAVE_EXPORT_FORMATS.PNG } = options;

      const {
        stage,
        mainLayer,
        originalScale: { scaleX, scaleY },
      } = this.cloneStageForExport();

      if (mainLayer) {
        const { pixelRatio: finalPixelRatio } = this.setupForExport({
          nodes: [],
          bounds: area,
          stage,
          mainLayer,
          scaleX,
          scaleY,
          options,
          exportArea: true,
        });

        stage.toBlob({
          x: area.x,
          y: area.y,
          width: area.width,
          height: area.height,
          mimeType: format,
          pixelRatio: finalPixelRatio,
          quality: options.quality ?? 1,
          callback: (blob: Blob | null) => {
            stage.destroy();

            if (!blob) {
              reject(new Error('Failed to generate image blob'));
              return;
            }

            resolve(blob);
          },
        });
      }
    });
  }

  exportAreaAsCanvas(
    area: { x: number; y: number; width: number; height: number },
    options: WeaveExportNodesOptions
  ): Promise<HTMLCanvasElement> {
    return new Promise((resolve) => {
      const { format = WEAVE_EXPORT_FORMATS.PNG } = options;

      const {
        stage,
        mainLayer,
        originalScale: { scaleX, scaleY },
      } = this.cloneStageForExport();

      if (mainLayer) {
        const { pixelRatio: finalPixelRatio } = this.setupForExport({
          nodes: [],
          bounds: area,
          stage,
          mainLayer,
          scaleX,
          scaleY,
          options,
          exportArea: true,
        });

        stage.toCanvas({
          x: area.x,
          y: area.y,
          width: area.width,
          height: area.height,
          mimeType: format,
          pixelRatio: finalPixelRatio,
          quality: options.quality ?? 1,
          callback: (canvas: HTMLCanvasElement) => {
            stage.destroy();

            resolve(canvas);
          },
        });
      }
    });
  }

  async exportNodesServerSide(
    nodes: string[],
    boundingNodes: (nodes: Konva.Node[]) => Konva.Node[],
    options: WeaveExportNodesOptions
  ): Promise<{
    composites: { input: Buffer; left: number; top: number }[];
    width: number;
    height: number;
  }> {
    const { format, padding, pixelRatio, backgroundColor } =
      this.parseExportOptions(options);
    const { nodesSelectionPluginPrev, nodesStageGridPluginPrev } =
      this.saveAndDisablePlugins();
    const { stage, originalPosition, originalScale } = this.saveAndResetStage();
    const mainLayer = this.instance.getMainLayer();

    if (!mainLayer) {
      throw new Error('Main layer not found');
    }

    let realNodes = [...nodes];
    if (nodes.length === 0) {
      realNodes =
        mainLayer.getChildren().map((node) => node.getAttrs().id ?? '') ?? [];
    }

    const konvaNodes = [];
    for (const nodeId of realNodes) {
      const node = stage.findOne(`#${nodeId}`);
      if (node) {
        konvaNodes.push(node);
      }
    }

    const { exportGroup, backgroundRect } = this.buildNodesExportGroup(
      konvaNodes,
      boundingNodes,
      stage,
      mainLayer,
      padding,
      backgroundColor
    );

    const { composites } = await this.renderTiles(
      exportGroup,
      backgroundRect,
      format,
      pixelRatio,
      options.quality ?? 1
    );

    const imageWidth = Math.round(backgroundRect.width);
    const imageHeight = Math.round(backgroundRect.height);

    exportGroup.destroy();
    this.restoreStage(stage, originalPosition, originalScale);
    this.restorePlugins(nodesSelectionPluginPrev, nodesStageGridPluginPrev);

    return {
      composites,
      width: imageWidth * pixelRatio,
      height: imageHeight * pixelRatio,
    };
  }

  async exportAreaServerSide(
    area: { x: number; y: number; width: number; height: number },
    options: WeaveExportNodesOptions
  ): Promise<{
    composites: { input: Buffer; left: number; top: number }[];
    width: number;
    height: number;
  }> {
    const { format, padding, pixelRatio, backgroundColor } =
      this.parseExportOptions(options);
    const { nodesSelectionPluginPrev, nodesStageGridPluginPrev } =
      this.saveAndDisablePlugins();
    const { stage, originalPosition, originalScale } = this.saveAndResetStage();
    const mainLayer = this.instance.getMainLayer();

    if (!mainLayer) {
      throw new Error('Main layer not found');
    }

    const { background, backgroundRect } = this.buildAreaBackground(
      area,
      stage,
      mainLayer,
      padding,
      backgroundColor,
      true
    );

    const { composites } = await this.renderTiles(
      mainLayer,
      backgroundRect,
      format,
      pixelRatio,
      options.quality ?? 1
    );

    const imageWidth = Math.round(backgroundRect.width);
    const imageHeight = Math.round(backgroundRect.height);

    background.destroy();
    this.restoreStage(stage, originalPosition, originalScale);
    this.restorePlugins(nodesSelectionPluginPrev, nodesStageGridPluginPrev);

    return {
      composites,
      width: imageWidth * pixelRatio,
      height: imageHeight * pixelRatio,
    };
  }

  imageToBase64(img: HTMLImageElement, mimeType: string): string {
    if (img.naturalWidth === 0 && img.naturalHeight === 0) {
      throw new Error('Image has no content');
    }

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
    const gridPlugin = this.instance.getPlugin<WeaveStageGridPlugin>(
      WEAVE_STAGE_GRID_PLUGIN_KEY
    );
    return gridPlugin;
  }

  blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () =>
        reject(new Error('Failed to convert blob to data URL'));

      reader.readAsDataURL(blob);
    });
  }
}
