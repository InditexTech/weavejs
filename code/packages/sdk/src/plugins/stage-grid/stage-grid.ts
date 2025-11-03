// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WeavePlugin } from '@/plugins/plugin';
import {
  WEAVE_GRID_DEFAULT_COLOR,
  WEAVE_GRID_DEFAULT_ORIGIN_COLOR,
  WEAVE_GRID_DEFAULT_STROKE,
  WEAVE_GRID_DEFAULT_RADIUS,
  WEAVE_GRID_DEFAULT_SIZE,
  WEAVE_GRID_DEFAULT_TYPE,
  WEAVE_GRID_LAYER_ID,
  WEAVE_GRID_TYPES,
  WEAVE_GRID_DEFAULT_MAJOR_LINE_RATIO,
  WEAVE_GRID_DEFAULT_MAJOR_DOT_RATIO,
  WEAVE_GRID_DEFAULT_MAJOR_EVERY,
  WEAVE_GRID_DEFAULT_DOT_MAX_DOTS_PER_AXIS,
  WEAVE_STAGE_GRID_PLUGIN_KEY,
} from './constants';
import {
  type WeaveStageGridPluginConfig,
  type WeaveStageGridPluginParams,
  type WeaveStageGridType,
} from './types';
import { throttle } from 'lodash';
import { MOVE_TOOL_ACTION_NAME } from '@/actions/move-tool/constants';

export class WeaveStageGridPlugin extends WeavePlugin {
  private moveToolActive: boolean;
  private isMouseMiddleButtonPressed: boolean;
  private isSpaceKeyPressed: boolean;
  private config!: WeaveStageGridPluginConfig;

  constructor(params?: Partial<WeaveStageGridPluginParams>) {
    super();

    const { config } = params ?? {};

    this.moveToolActive = false;
    this.isMouseMiddleButtonPressed = false;
    this.isSpaceKeyPressed = false;
    this.config = {
      type: WEAVE_GRID_DEFAULT_TYPE as WeaveStageGridType,
      gridColor: WEAVE_GRID_DEFAULT_COLOR,
      gridOriginColor: WEAVE_GRID_DEFAULT_ORIGIN_COLOR,
      gridSize: WEAVE_GRID_DEFAULT_SIZE,
      gridDotMaxDotsPerAxis: WEAVE_GRID_DEFAULT_DOT_MAX_DOTS_PER_AXIS,
      ...config,
    };
  }

  getName(): string {
    return WEAVE_STAGE_GRID_PLUGIN_KEY;
  }

  getLayerName(): string {
    return WEAVE_GRID_LAYER_ID;
  }

  initLayer(): void {
    const stage = this.instance.getStage();

    const layer = new Konva.Layer({
      id: this.getLayerName(),
      listening: false,
    });

    stage.add(layer);
  }

  onInit(): void {
    this.initEvents();
    this.renderGrid();
  }

  private initEvents() {
    const stage = this.instance.getStage();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        this.isSpaceKeyPressed = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpaceKeyPressed = false;
      }
    });

    this.instance.addEventListener('onStageMove', () => {
      this.onRender();
    });

    stage.on('pointerdown', (e) => {
      const activeAction = this.instance.getActiveAction();

      if (e && e.evt.button === 0 && activeAction === MOVE_TOOL_ACTION_NAME) {
        this.moveToolActive = true;
      }

      if (e && (e.evt.button === 2 || e.evt.buttons === 4)) {
        this.isMouseMiddleButtonPressed = true;
      }
    });

    stage.on('pointerup', (e) => {
      const activeAction = this.instance.getActiveAction();

      if (e && e.evt.button === 0 && activeAction === MOVE_TOOL_ACTION_NAME) {
        this.moveToolActive = false;
      }

      if (e && (e.evt.button === 1 || e.evt.buttons === 0)) {
        this.isMouseMiddleButtonPressed = false;
      }
    });

    const handleMouseMove = () => {
      if (
        !this.enabled ||
        !(
          this.isSpaceKeyPressed ||
          this.isMouseMiddleButtonPressed ||
          this.moveToolActive
        )
      ) {
        return;
      }

      this.onRender();
    };

    stage.on('pointermove', throttle(handleMouseMove, 50));

    stage.on('pointermove', () => {
      if (this.enabled) {
        this.onRender();
      }
    });

    // window.addEventListener('wheel', () => {
    //   if (
    //     !this.enabled ||
    //     this.isSpaceKeyPressed ||
    //     this.isMouseMiddleButtonPressed
    //   ) {
    //     return;
    //   }

    //   this.onRender();
    // });
  }

  getLayer(): Konva.Layer | undefined {
    const stage = this.instance.getStage();
    const layer = stage.findOne(`#${WEAVE_GRID_LAYER_ID}`) as
      | Konva.Layer
      | undefined;
    return layer;
  }

  getAdaptiveSpacing(scale: number): number {
    const baseGridSpacing = this.config.gridSize;

    const minPixelSpacing = 8;
    const maxPixelSpacing = 100;

    let spacing = baseGridSpacing;
    let pixelSpacing = spacing * scale;

    // Zoomed out → spacing too small on screen, make grid coarser
    while (pixelSpacing < minPixelSpacing) {
      spacing *= 2;
      pixelSpacing = spacing * scale;
    }

    // Zoomed in → spacing too big on screen, make grid finer
    while (pixelSpacing > maxPixelSpacing && spacing > baseGridSpacing / 16) {
      spacing /= 2;
      pixelSpacing = spacing * scale;
    }

    // Snap to nearest power-of-two multiple of baseGridSpacing
    const logFactor = Math.round(Math.log2(spacing / baseGridSpacing));
    const snappedSpacing = baseGridSpacing * Math.pow(2, logFactor);

    return snappedSpacing;
  }

  private getAdjustedSpacing(
    startX: number,
    endX: number,
    startY: number,
    endY: number,
    baseSpacing = 50
  ) {
    let spacing = baseSpacing;
    let dotCountX = Math.ceil((endX - startX) / spacing);
    let dotCountY = Math.ceil((endY - startY) / spacing);

    while (
      (dotCountX > this.config.gridDotMaxDotsPerAxis ||
        dotCountY > this.config.gridDotMaxDotsPerAxis) &&
      spacing < 1e6
    ) {
      spacing *= 2;
      dotCountX = Math.ceil((endX - startX) / spacing);
      dotCountY = Math.ceil((endY - startY) / spacing);
    }

    return spacing;
  }

  private renderGridLines(): void {
    const stage = this.instance.getStage();
    const gridLayer = this.getLayer();

    if (!gridLayer) {
      return;
    }

    gridLayer.destroyChildren(); // Clear previous grid

    if (!this.enabled) {
      return;
    }

    const scale = stage.scaleX();
    const spacing = this.getAdaptiveSpacing(scale);
    const invScale =
      (this.config.gridStroke ?? WEAVE_GRID_DEFAULT_STROKE) / scale;

    const offsetX = -stage.x() / stage.scaleX();
    const offsetY = -stage.y() / stage.scaleY();

    const margin = 2; // how many screen widths/heights to extend in each direction
    const worldWidth = stage.width() * invScale;
    const worldHeight = stage.height() * invScale;

    const startX =
      Math.floor((offsetX - margin * worldWidth) / spacing) * spacing;
    const startY =
      Math.floor((offsetY - margin * worldHeight) / spacing) * spacing;
    const endX = offsetX + (1 + margin) * worldWidth;
    const endY = offsetY + (1 + margin) * worldHeight;

    const highlightEvery =
      this.config.gridMajorEvery ?? WEAVE_GRID_DEFAULT_MAJOR_EVERY;

    for (let x = startX; x <= endX; x += spacing) {
      const index = Math.round(x / spacing);
      const isHighlight = index % highlightEvery === 0;
      const isOrigin = Math.abs(x) < spacing / 2;

      const line = new Konva.Line({
        points: [x, startY, x, endY],
        stroke: isOrigin ? this.config.gridOriginColor : this.config.gridColor,
        strokeWidth:
          !isHighlight && !isOrigin
            ? invScale
            : invScale *
              (this.config.gridMajorRatio ??
                WEAVE_GRID_DEFAULT_MAJOR_LINE_RATIO),
        listening: false,
      });
      gridLayer.add(line);
    }

    for (let y = startY; y <= endY; y += spacing) {
      const index = Math.round(y / spacing);
      const isHighlight = index % highlightEvery === 0;
      const isOrigin = Math.abs(y) < spacing / 2;

      const line = new Konva.Line({
        points: [startX, y, endX, y],
        stroke: isOrigin ? this.config.gridOriginColor : this.config.gridColor,
        strokeWidth: !isHighlight && !isOrigin ? invScale : invScale * 2,
        listening: false,
      });
      gridLayer.add(line);
    }
  }

  private renderGridDots(): void {
    const stage = this.instance.getStage();
    const gridLayer = this.getLayer();

    if (!gridLayer) {
      return;
    }

    gridLayer.destroyChildren(); // Clear previous grid

    if (!this.enabled) {
      return;
    }

    const scale = stage.scaleX();
    const spacing = this.getAdaptiveSpacing(scale);
    const invScale =
      (this.config.gridDotRadius ?? WEAVE_GRID_DEFAULT_RADIUS) / scale;
    const position = stage.position();

    const offsetX = -position.x * invScale;
    const offsetY = -position.y * invScale;

    const margin = 2; // how many screen widths/heights to extend in each direction
    const worldWidth = stage.width() * invScale;
    const worldHeight = stage.height() * invScale;

    let startX =
      Math.floor((offsetX - margin * worldWidth) / spacing) * spacing;
    const endX = offsetX + (1 + margin) * worldWidth;

    let startY =
      Math.floor((offsetY - margin * worldHeight) / spacing) * spacing;
    const endY = offsetY + (1 + margin) * worldHeight;

    let adjustedSpacing = spacing;
    let dotCountX = Math.ceil((endX - startX) / adjustedSpacing);
    let dotCountY = Math.ceil((endY - startY) / adjustedSpacing);

    while (
      (dotCountX > this.config.gridDotMaxDotsPerAxis ||
        dotCountY > this.config.gridDotMaxDotsPerAxis) &&
      adjustedSpacing < 1e6
    ) {
      adjustedSpacing *= 2;
      dotCountX = Math.ceil((endX - startX) / adjustedSpacing);
      dotCountY = Math.ceil((endY - startY) / adjustedSpacing);
    }

    this.getAdjustedSpacing(startX, endX, startY, endY, spacing);

    startX =
      Math.floor((offsetX - margin * worldWidth) / adjustedSpacing) *
      adjustedSpacing;
    startY =
      Math.floor((offsetY - margin * worldHeight) / adjustedSpacing) *
      adjustedSpacing;

    const highlightEvery =
      this.config.gridMajorEvery ?? WEAVE_GRID_DEFAULT_MAJOR_EVERY;

    const majorColor = this.config.gridColor;
    const gridMajorRatio =
      this.config.gridMajorRatio ?? WEAVE_GRID_DEFAULT_MAJOR_DOT_RATIO;

    const majorShape = new Konva.Shape({
      sceneFunc: function (context) {
        context.beginPath();
        for (let x = startX; x <= endX; x += adjustedSpacing) {
          for (let y = startY; y <= endY; y += adjustedSpacing) {
            if (Math.abs(x) < spacing / 2 || Math.abs(y) < spacing / 2)
              continue;

            const indexX = Math.round(x / spacing);
            const indexY = Math.round(y / spacing);
            const isHighlightX = indexX % highlightEvery === 0;
            const isHighlightY = indexY % highlightEvery === 0;

            const radius = !(isHighlightX || isHighlightY)
              ? invScale
              : invScale * gridMajorRatio;

            context.moveTo(x + radius, y);
            context.arc(x, y, radius, 0, Math.PI * 2, false);
          }
        }
        context.fillStyle = majorColor;
        context.fill();
      },
    });

    gridLayer.add(majorShape);

    const originColor = this.config.gridOriginColor;

    const originShape = new Konva.Shape({
      sceneFunc: function (context) {
        context.beginPath();
        for (let x = startX; x <= endX; x += adjustedSpacing) {
          const radius = invScale * gridMajorRatio;

          context.moveTo(x + radius, 0);
          context.arc(x, 0, radius, 0, Math.PI * 2);
        }
        for (let y = startY; y <= endY; y += adjustedSpacing) {
          const radius = invScale * gridMajorRatio;
          if (Math.abs(y) < spacing / 2) continue; // skip center dot (already added)
          context.moveTo(0 + radius, y);
          context.arc(0, y, radius, 0, Math.PI * 2);
        }
        context.fillStyle = originColor;
        context.fill();
      },
    });

    gridLayer.add(originShape);
  }

  renderGrid(): void {
    switch (this.config.type) {
      case WEAVE_GRID_TYPES.LINES:
        this.renderGridLines();
        break;
      case WEAVE_GRID_TYPES.DOTS:
        this.renderGridDots();
        break;
      default:
        break;
    }
  }

  onRender(): void {
    requestAnimationFrame(() => {
      this.renderGrid();
    });
  }

  enable(): void {
    this.enabled = true;
    this.getLayer()?.show();
    this.onRender();
  }

  disable(): void {
    this.enabled = false;
    this.getLayer()?.hide();
    this.onRender();
  }

  getType(): WeaveStageGridType {
    return this.config.type;
  }

  setType(type: WeaveStageGridType): void {
    this.config.type = type;
    this.onRender();
  }
}
