// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { Line } from 'konva/lib/shapes/Line';
import { WeavePlugin } from '@/plugins/plugin';
import {
  WEAVE_GRID_DEFAULT_COLOR,
  WEAVE_GRID_DEFAULT_ORIGIN_COLOR,
  WEAVE_GRID_DEFAULT_SIZE,
  WEAVE_GRID_DEFAULT_TYPE,
  WEAVE_GRID_LAYER_ID,
  WEAVE_GRID_TYPES,
  WEAVE_STAGE_GRID_KEY,
} from './constants';
import {
  type WeaveStageGridPluginConfig,
  type WeaveStageGridPluginParams,
  type WeaveStageGridType,
} from './types';
import { Circle } from 'konva/lib/shapes/Circle';
import type { KonvaEventObject } from 'konva/lib/Node';
import { throttle } from 'lodash';

function isZeroOrClose(value: number, tolerance: number = 1e-6): boolean {
  return Math.abs(value) <= tolerance;
}

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
      ...config,
    };
  }

  getName(): string {
    return WEAVE_STAGE_GRID_KEY;
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

    stage.on('mousedown', (e) => {
      const activeAction = this.instance.getActiveAction();

      if (e && e.evt.button === 0 && activeAction === 'moveTool') {
        this.moveToolActive = true;
        e.cancelBubble = true;
      }

      if (e && (e.evt.button === 2 || e.evt.buttons === 4)) {
        this.isMouseMiddleButtonPressed = true;
        e.cancelBubble = true;
      }
    });

    stage.on('mouseup', (e) => {
      const activeAction = this.instance.getActiveAction();

      if (e && e.evt.button === 0 && activeAction === 'moveTool') {
        this.moveToolActive = false;
        e.cancelBubble = true;
      }

      if (e && (e.evt.button === 1 || e.evt.buttons === 0)) {
        this.isMouseMiddleButtonPressed = false;
        e.cancelBubble = true;
      }
    });

    const handleMouseMove = (e: KonvaEventObject<MouseEvent, Konva.Stage>) => {
      e.evt.preventDefault();

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

    stage.on('mousemove', throttle(handleMouseMove, 50));

    stage.on('touchmove', (e) => {
      e.evt.preventDefault();

      if (!this.enabled) {
        return;
      }

      this.onRender();
    });

    window.addEventListener('wheel', () => {
      if (
        !this.enabled ||
        this.isSpaceKeyPressed ||
        this.isMouseMiddleButtonPressed
      ) {
        return;
      }

      this.onRender();
    });
  }

  getLayer(): Konva.Layer | undefined {
    const stage = this.instance.getStage();
    const layer = stage.findOne(`#${WEAVE_GRID_LAYER_ID}`) as
      | Konva.Layer
      | undefined;
    return layer;
  }

  private renderGrid(): void {
    const layer = this.getLayer();

    if (!layer) {
      return;
    }

    layer.destroyChildren();

    if (!this.enabled) {
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
        this.renderGridLines();
        break;
    }
  }

  private round(number: number, step: number) {
    return Math.round(number / step) * step;
  }

  private renderGridLines() {
    const layer = this.getLayer();

    if (!layer) {
      return;
    }

    const stage = this.instance.getStage();

    const stageXRound = this.round(stage.x(), this.config.gridSize) * -1;

    const overflowX = this.round(
      10 * this.config.gridSize,
      this.config.gridSize
    );
    const overflowY = this.round(
      10 * this.config.gridSize,
      this.config.gridSize
    );

    const pointsX = [];
    for (
      let i = stageXRound - overflowX;
      i < stageXRound + stage.width() + overflowX;
      i += this.config.gridSize
    ) {
      pointsX.push({ real: i / stage.scaleX(), ref: i });
    }

    const stageYRound = this.round(stage.y(), this.config.gridSize) * -1;

    const pointsY = [];
    for (
      let i = stageYRound - overflowY;
      i < stageYRound + stage.height() + overflowY;
      i += this.config.gridSize
    ) {
      pointsY.push({ real: i / stage.scaleY(), ref: i });
    }

    for (let index = 0; index < pointsX.length; index++) {
      const { real: point, ref } = pointsX[index];

      let color = this.config.gridColor;
      if (point === 0) {
        color = this.config.gridOriginColor;
      }

      layer.add(
        new Line({
          points: [
            point,
            (-stage.y() - overflowY) / stage.scaleY(),
            point,
            (-stage.y() + stage.height() + overflowY) / stage.scaleY(),
          ],
          stroke: color,
          strokeWidth:
            (isZeroOrClose(ref % (10 * this.config.gridSize)) ? 2.5 : 0.5) /
            stage.scaleX(),
          listening: false,
        })
      );
    }

    for (let index = 0; index < pointsY.length; index++) {
      const { real: point, ref } = pointsY[index];

      let color = this.config.gridColor;
      if (point === 0) {
        color = this.config.gridOriginColor;
      }

      layer.add(
        new Line({
          points: [
            (-stage.x() - overflowX) / stage.scaleX(),
            point,
            (-stage.x() + stage.width() + overflowX) / stage.scaleX(),
            point,
          ],
          stroke: color,
          strokeWidth:
            (isZeroOrClose(ref % (10 * this.config.gridSize)) ? 2.5 : 0.5) /
            stage.scaleX(),
          listening: false,
        })
      );
    }
  }

  private renderGridDots() {
    const layer = this.getLayer();

    if (!layer) {
      return;
    }

    const stage = this.instance.getStage();

    const overflowX = 10 * this.config.gridSize;
    const overflowY = 10 * this.config.gridSize;

    const stageXRound = this.round(stage.x(), this.config.gridSize) * -1;

    const pointsX = [];
    for (
      let i = stageXRound - overflowX;
      i < stageXRound + stage.width() + overflowX;
      i += this.config.gridSize
    ) {
      pointsX.push({ real: i / stage.scaleX(), ref: i });
    }

    const stageYRound = this.round(stage.y(), this.config.gridSize) * -1;

    const pointsY = [];
    for (
      let i = stageYRound - overflowY;
      i < stageYRound + stage.height() + overflowY;
      i += this.config.gridSize
    ) {
      pointsY.push({ real: i / stage.scaleY(), ref: i });
    }

    for (let indexX = 0; indexX < pointsX.length; indexX++) {
      const { real: pointX, ref: refX } = pointsX[indexX];

      for (let indexY = 0; indexY < pointsY.length; indexY++) {
        const { real: pointY, ref: refY } = pointsY[indexY];

        let color = this.config.gridColor;
        if (refX === 0 || refY === 0) {
          color = this.config.gridOriginColor;
        }

        layer.add(
          new Circle({
            x: pointX,
            y: pointY,
            radius: (pointX === 0 || pointY === 0 ? 2.5 : 1.5) / stage.scaleX(),
            fill: color,
            stroke: color,
            strokeWidth: 0,
            listening: false,
          })
        );
      }
    }
  }

  onRender(): void {
    this.renderGrid();
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
