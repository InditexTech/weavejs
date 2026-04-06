// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WeavePlugin } from '@/plugins/plugin';
import {
  WEAVE_GRID_LAYER_ID,
  WEAVE_GRID_TYPES,
  WEAVE_STAGE_GRID_PLUGIN_KEY,
  WEAVE_GRID_DEFAULT_CONFIG,
  WEAVE_GRID_DOT_TYPES,
} from './constants';
import {
  type WeaveStageGridDotType,
  type WeaveStageGridPluginConfig,
  type WeaveStageGridPluginParams,
  type WeaveStageGridType,
} from './types';
import { throttle } from 'lodash';
import { MOVE_TOOL_ACTION_NAME } from '@/actions/move-tool/constants';
import { DEFAULT_THROTTLE_MS } from '@/constants';
import { mergeExceptArrays } from '@/index.node';

export class WeaveStageGridPlugin extends WeavePlugin {
  private moveToolActive!: boolean;
  private isMouseMiddleButtonPressed!: boolean;
  private isSpaceKeyPressed!: boolean;
  private actStageZoomX!: number;
  private actStageZoomY!: number;
  private actStagePosX!: number;
  private actStagePosY!: number;
  private readonly config!: WeaveStageGridPluginConfig;
  private forceStageChange!: boolean;

  constructor(params?: Partial<WeaveStageGridPluginParams>) {
    super();

    const { config } = params ?? {};

    this.moveToolActive = false;
    this.isMouseMiddleButtonPressed = false;
    this.isSpaceKeyPressed = false;
    this.forceStageChange = false;

    this.config = mergeExceptArrays(WEAVE_GRID_DEFAULT_CONFIG, config);

    this.initialize();
  }

  initialize(): void {
    this.moveToolActive = false;
    this.isMouseMiddleButtonPressed = false;
    this.isSpaceKeyPressed = false;
    this.forceStageChange = false;
    this.actStagePosX = 0;
    this.actStagePosY = 0;
    this.actStageZoomX = 1;
    this.actStageZoomY = 1;
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

    layer.moveToBottom();

    stage.add(layer);
  }

  onInit(): void {
    this.initEvents();
    this.renderGrid();
  }

  private initEvents() {
    const stage = this.instance.getStage();

    window.addEventListener(
      'keydown',
      (e) => {
        if (e.code === 'Space') {
          this.isSpaceKeyPressed = true;
        }
      },
      { signal: this.instance.getEventsController()?.signal }
    );

    window.addEventListener(
      'keyup',
      (e) => {
        if (e.code === 'Space') {
          this.isSpaceKeyPressed = false;
        }
      },
      { signal: this.instance.getEventsController()?.signal }
    );

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

    stage.on('pointermove', throttle(handleMouseMove, DEFAULT_THROTTLE_MS));

    stage.on('pointermove', () => {
      if (this.enabled) {
        this.onRender();
      }
    });
  }

  getLayer(): Konva.Layer | undefined {
    const stage = this.instance.getStage();
    const layer = stage.findOne(`#${WEAVE_GRID_LAYER_ID}`) as
      | Konva.Layer
      | undefined;
    return layer;
  }

  getShapeAdaptiveSpacing(baseSpacing: number, scale: number): number {
    const factor = Math.pow(2, Math.floor(Math.log2(1 / scale)));
    return baseSpacing * factor;
  }

  getAdaptiveSpacing(scale: number): number {
    const baseGridSpacing = this.config.gridSize;

    const minPixelSpacing = this.config.gridSize;
    const maxPixelSpacing = this.config.gridSize * 2;

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
    const invScale = this.config.gridStroke / scale;

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

    const highlightEvery = this.config.gridMajorEvery;

    for (let x = startX; x <= endX; x += spacing) {
      const index = Math.round(x / spacing);
      const isHighlight = index % highlightEvery === 0;
      const isOrigin = Math.abs(x) < spacing / 2;

      let stroke = this.config.gridColor;
      if (isOrigin) {
        stroke = this.config.gridOriginColor;
      } else if (isHighlight) {
        stroke = this.config.gridMajorColor;
      }

      let strokeWidth = invScale;
      if (isHighlight || isOrigin) {
        strokeWidth = invScale * this.config.gridMajorRatio;
      }

      let zIndex = 1;
      if (isOrigin) {
        zIndex = 3;
      } else if (isHighlight) {
        zIndex = 2;
      }

      const line = new Konva.Line({
        points: [x, startY, x, endY],
        stroke,
        strokeWidth,
        listening: false,
        zIndex,
      });
      gridLayer.add(line);
    }

    for (let y = startY; y <= endY; y += spacing) {
      const index = Math.round(y / spacing);
      const isHighlight = index % highlightEvery === 0;
      const isOrigin = Math.abs(y) < spacing / 2;

      let stroke = this.config.gridColor;
      if (isOrigin) {
        stroke = this.config.gridOriginColor;
      } else if (isHighlight) {
        stroke = this.config.gridMajorColor;
      }

      let strokeWidth = invScale;
      if (isHighlight || isOrigin) {
        strokeWidth = invScale * this.config.gridMajorRatio;
      }

      let zIndex = 1;
      if (isOrigin) {
        zIndex = 3;
      } else if (isHighlight) {
        zIndex = 2;
      }

      const line = new Konva.Line({
        points: [startX, y, endX, y],
        stroke,
        strokeWidth,
        listening: false,
        zIndex,
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

    const grid = new Konva.Shape({
      // opacity: 0.5,
      listening: false,
      sceneFunc: (ctx) => {
        const dotType = this.config.gridDotType;

        const scale = stage.scaleX();
        const pos = stage.position();

        const baseSpacing = this.config.gridSize;
        const spacing = this.getShapeAdaptiveSpacing(baseSpacing, scale);

        const highlightEvery = this.config.gridMajorEvery;

        const defaultColor = this.config.gridColor;
        const majorColor = this.config.gridMajorColor;
        const centerColor = this.config.gridOriginColor;

        if (dotType === WEAVE_GRID_DOT_TYPES.CIRCLE) {
          const scale = stage.scaleX();
          const pos = stage.position();
          // 👇 THIS is the key
          const topLeftX = -pos.x / scale;
          const topLeftY = -pos.y / scale;
          const viewWidth = stage.width() / scale;
          const viewHeight = stage.height() / scale;
          const startX = Math.floor(topLeftX / spacing) * spacing;
          const startY = Math.floor(topLeftY / spacing) * spacing;

          const dotRadius = this.config.gridDotRadius;
          const dotMajorRadius = dotRadius * this.config.gridMajorRatio;

          for (let x = startX; x < topLeftX + viewWidth; x += spacing) {
            for (let y = startY; y < topLeftY + viewHeight; y += spacing) {
              const indexX = Math.round(x / spacing);
              const indexY = Math.round(y / spacing);
              const isHighlightX = indexX % highlightEvery === 0;
              const isHighlightY = indexY % highlightEvery === 0;
              const isHighlight = isHighlightX || isHighlightY;

              const isOriginX = Math.abs(x) < spacing / 2;
              const isOriginY = Math.abs(y) < spacing / 2;
              const isOrigin = isOriginX || isOriginY;

              let fillStyle = defaultColor;
              if (isOrigin) {
                fillStyle = centerColor;
              } else if (isHighlight) {
                fillStyle = majorColor;
              }

              ctx.fillStyle = fillStyle;

              ctx.beginPath();
              ctx.arc(
                x,
                y,
                (isHighlight ? dotMajorRadius : dotRadius) / scale,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
          }
        }

        if (dotType === WEAVE_GRID_DOT_TYPES.SQUARE) {
          const topLeftX = -pos.x / scale;
          const topLeftY = -pos.y / scale;

          const viewWidth = stage.width() / scale;
          const viewHeight = stage.height() / scale;

          const startX = Math.floor(topLeftX / spacing) * spacing;
          const startY = Math.floor(topLeftY / spacing) * spacing;

          const defaultSize = this.config.gridDotRectSize;
          const majorSize = defaultSize * this.config.gridMajorRatio;

          for (let x = startX; x < topLeftX + viewWidth; x += spacing) {
            for (let y = startY; y < topLeftY + viewHeight; y += spacing) {
              const sx = Math.round(x * scale) / scale;
              const sy = Math.round(y * scale) / scale;

              const indexX = Math.round(sx / spacing);
              const indexY = Math.round(sy / spacing);
              const isHighlightX = indexX % highlightEvery === 0;
              const isHighlightY = indexY % highlightEvery === 0;
              const isHighlight = isHighlightX || isHighlightY;

              const isOriginX = Math.abs(sx) < spacing / 2;
              const isOriginY = Math.abs(sy) < spacing / 2;
              const isOrigin = isOriginX || isOriginY;

              let fillStyle = defaultColor;
              if (isOrigin) {
                fillStyle = centerColor;
              } else if (isHighlight) {
                fillStyle = majorColor;
              }

              ctx.fillStyle = fillStyle;

              const size = (isHighlight ? majorSize : defaultSize) / scale;

              ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
            }
          }
        }
      },
    });

    gridLayer.add(grid);
  }

  private hasStageChanged(): boolean {
    if (this.forceStageChange) {
      this.forceStageChange = false;
      return true;
    }

    const stage = this.instance.getStage();
    const actualScaleX = stage.scaleX();
    const actualScaleY = stage.scaleY();
    const actualPosX = stage.x();
    const actualPosY = stage.y();

    if (
      this.actStageZoomX === actualScaleX &&
      this.actStageZoomY === actualScaleY &&
      this.actStagePosX === actualPosX &&
      this.actStagePosY === actualPosY
    ) {
      return false;
    }

    this.actStageZoomX = actualScaleX;
    this.actStageZoomY = actualScaleY;
    this.actStagePosX = actualPosX;
    this.actStagePosY = actualPosY;

    return true;
  }

  renderGrid(): void {
    if (!this.hasStageChanged()) {
      return;
    }

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
    this.renderGrid();
  }

  enable(): void {
    this.enabled = true;
    this.getLayer()?.show();
    this.forceStageChange = true;
    this.onRender();
  }

  disable(): void {
    this.enabled = false;
    this.getLayer()?.hide();
    this.forceStageChange = true;
    this.onRender();
  }

  getType(): WeaveStageGridType {
    return this.config.type;
  }

  setType(type: WeaveStageGridType): void {
    this.config.type = type;
    this.forceStageChange = true;
    this.onRender();
  }

  getDotsType(): WeaveStageGridDotType {
    return this.config.gridDotType;
  }

  setDotsType(type: WeaveStageGridDotType): void {
    this.config.gridDotType = type;
    this.forceStageChange = true;
    this.onRender();
  }
}
