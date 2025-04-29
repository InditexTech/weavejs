// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { Line } from 'konva/lib/shapes/Line';
import { WeavePlugin } from '@/plugins/plugin';
import {
  WEAVE_GRID_DEFAULT_SIZE,
  WEAVE_GRID_LAYER_ID,
  WEAVE_GRID_TYPES,
} from './constants';
import { WeaveStageGridPluginParams, WeaveStageGridType } from './types';
import { Circle } from 'konva/lib/shapes/Circle';

export class WeaveStageGridPlugin extends WeavePlugin {
  private moveToolActive: boolean;
  private isMouseMiddleButtonPressed: boolean;
  private isSpaceKeyPressed: boolean;
  private type: WeaveStageGridType = 'lines';
  private gridColor: string = 'rgba(0,0,0,0.2)';
  private originColor: string = 'rgba(255,0,0,0.2)';
  private gridSize: number;

  constructor(params: WeaveStageGridPluginParams) {
    super();

    const { gridSize = WEAVE_GRID_DEFAULT_SIZE } = params;

    this.moveToolActive = false;
    this.isMouseMiddleButtonPressed = false;
    this.isSpaceKeyPressed = false;
    this.gridSize = gridSize;
  }

  getName() {
    return 'stageGrid';
  }

  getLayerName() {
    return WEAVE_GRID_LAYER_ID;
  }

  initLayer() {
    const stage = this.instance.getStage();

    const layer = new Konva.Layer({
      id: this.getLayerName(),
      listening: false,
    });
    stage.add(layer);
  }

  init() {
    this.initEvents();
    this.renderGrid();
  }

  private initEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        this.isSpaceKeyPressed = true;
      }
    });

    stage.container().addEventListener('keyup', (e) => {
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

    stage.on('mousemove', (e) => {
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

      this.render();
    });

    stage.on('touchmove', (e) => {
      e.evt.preventDefault();

      if (!this.enabled) {
        return;
      }

      this.render();
    });

    stage.on('wheel', (e) => {
      e.evt.preventDefault();

      if (
        !this.enabled ||
        this.isSpaceKeyPressed ||
        this.isMouseMiddleButtonPressed
      ) {
        return;
      }

      this.render();
    });
  }

  getLayer() {
    const stage = this.instance.getStage();
    const layer = stage.findOne(`#${WEAVE_GRID_LAYER_ID}`) as
      | Konva.Layer
      | undefined;
    return layer;
  }

  private renderGrid() {
    const layer = this.getLayer();

    if (!layer) {
      return;
    }

    layer.destroyChildren();

    if (!this.enabled) {
      return;
    }

    switch (this.type) {
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

    const stageXRound = this.round(stage.x(), this.gridSize) * -1;

    const pointsX = [];
    for (
      let i = stageXRound;
      i < stageXRound + stage.width();
      i += this.gridSize
    ) {
      pointsX.push(i / stage.scaleX());
    }

    const stageYRound = this.round(stage.y(), this.gridSize) * -1;

    const pointsY = [];
    for (
      let i = stageYRound;
      i < stageYRound + stage.height();
      i += this.gridSize
    ) {
      pointsY.push(i / stage.scaleY());
    }

    for (let index = 0; index < pointsX.length; index++) {
      const point = pointsX[index];

      let color = this.gridColor;
      if (point === 0) {
        color = this.originColor;
      }

      layer.add(
        new Line({
          points: [
            point,
            (-stage.y() - 2 * this.gridSize) / stage.scaleY(),
            point,
            (stage.height() - stage.y() + 2 * this.gridSize) / stage.scaleY(),
          ],
          stroke: color,
          strokeWidth:
            (point % (10 * (this.gridSize / stage.scaleX())) === 0
              ? 2.5
              : 0.5) / stage.scaleX(),
          listening: false,
        })
      );
    }

    for (let index = 0; index < pointsY.length; index++) {
      const point = pointsY[index];

      let color = this.gridColor;
      if (point === 0) {
        color = this.originColor;
      }

      layer.add(
        new Line({
          points: [
            (-stage.x() - 2 * this.gridSize) / stage.scaleX(),
            point,
            (stage.width() - stage.x() + 2 * this.gridSize) / stage.scaleX(),
            point,
          ],
          stroke: color,
          strokeWidth:
            (point % (10 * (this.gridSize / stage.scaleY())) === 0
              ? 2.5
              : 0.5) / stage.scaleX(),
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

    const stageXRound = this.round(stage.x(), this.gridSize) * -1;

    const pointsX = [];
    for (
      let i = stageXRound;
      i < stageXRound + stage.width();
      i += this.gridSize
    ) {
      pointsX.push(i / stage.scaleX());
    }

    const stageYRound = this.round(stage.y(), this.gridSize) * -1;

    const pointsY = [];
    for (
      let i = stageYRound;
      i < stageYRound + stage.height();
      i += this.gridSize
    ) {
      pointsY.push(i / stage.scaleY());
    }

    for (let indexX = 0; indexX < pointsX.length; indexX++) {
      const pointX = pointsX[indexX];

      for (let indexY = 0; indexY < pointsY.length; indexY++) {
        const pointY = pointsY[indexY];

        let color = this.gridColor;
        if (pointX === 0 || pointY === 0) {
          color = this.originColor;
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

  render() {
    this.renderGrid();
  }

  enable() {
    this.enabled = true;
    this.getLayer()?.show();
    this.render();
  }

  disable() {
    this.enabled = false;
    this.getLayer()?.hide();
    this.render();
  }

  getType() {
    return this.type;
  }

  setType(type: WeaveStageGridType) {
    this.type = type;
    this.render();
  }
}
