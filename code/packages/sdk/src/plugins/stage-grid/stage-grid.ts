import Konva from 'konva';
import { Line } from 'konva/lib/shapes/Line';
import { WeavePlugin } from '@/plugins/plugin';
import { WEAVE_GRID_LAYER_ID, WEAVE_GRID_TYPES } from './constants';
import { WeaveStageGridPluginParams, WeaveStageGridType } from './types';
import { Circle } from 'konva/lib/shapes/Circle';

export class WeaveStageGridPlugin extends WeavePlugin {
  private type: WeaveStageGridType = 'lines';
  private gridSize: number;

  constructor(params: WeaveStageGridPluginParams) {
    super();

    const { gridSize = 50 } = params;

    this.gridSize = gridSize;
  }

  registersLayers() {
    return true;
  }

  getName() {
    return 'stageGrid';
  }

  getLayerName() {
    return WEAVE_GRID_LAYER_ID;
  }

  initLayer() {
    const stage = this.instance.getStage();

    const layer = new Konva.Layer({ id: this.getLayerName() });
    stage.add(layer);
  }

  init() {
    this.initEvents();
    this.renderGrid();
  }

  private initEvents() {
    const stage = this.instance.getStage();

    stage.on('mousemove', (e) => {
      e.evt.preventDefault();
      this.render();
    });

    stage.on('wheel', (e) => {
      e.evt.preventDefault();
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

  private renderGridLines() {
    const layer = this.getLayer();

    if (!layer) {
      return;
    }

    const stage = this.instance.getStage();

    const size = stage.width() / this.gridSize;

    const delta = 2 * size;

    const startPageX =
      Math.ceil((stage.x() + delta) / stage.scaleX() / size) * size;
    const startPageY =
      Math.ceil((stage.y() + delta) / stage.scaleY() / size) * size;
    const endPageX =
      Math.floor(
        (stage.x() + stage.width() + 4 * delta) / stage.scaleX() / size
      ) * size;
    const endPageY =
      Math.floor(
        (stage.y() + stage.height() + 4 * delta) / stage.scaleY() / size
      ) * size;
    const numRows = Math.round((endPageY - startPageY) / size);
    const numCols = Math.round((endPageX - startPageX) / size);

    for (let row = 0; row <= numRows; row++) {
      const pageY = row * size + startPageY;
      const canvasY = pageY - 2 * startPageY;
      layer.add(
        new Line({
          points: [
            (-stage.x() - 2 * delta) / stage.scaleX(),
            canvasY,
            (stage.width() - stage.x() + 2 * delta) / stage.scaleX(),
            canvasY,
          ],
          stroke: 'rgba(0, 0, 0, 0.2)',
          strokeWidth: 0.5,
        })
      );
    }

    for (let col = 0; col <= numCols; col++) {
      const pageX = col * size + startPageX;
      const canvasX = pageX - 2 * startPageX;
      layer.add(
        new Line({
          points: [
            canvasX,
            (-stage.y() - 2 * delta) / stage.scaleY(),
            canvasX,
            (stage.height() - stage.y() + 2 * delta) / stage.scaleY(),
          ],
          stroke: 'rgba(0, 0, 0, 0.2)',
          strokeWidth: 0.5,
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

    const size = stage.width() / this.gridSize;

    const delta = 2 * size;

    const startPageX =
      Math.ceil((stage.x() + delta) / stage.scaleX() / size) * size;
    const startPageY =
      Math.ceil((stage.y() + delta) / stage.scaleY() / size) * size;
    const endPageX =
      Math.floor(
        (stage.x() + stage.width() + 4 * delta) / stage.scaleX() / size
      ) * size;
    const endPageY =
      Math.floor(
        (stage.y() + stage.height() + 4 * delta) / stage.scaleY() / size
      ) * size;
    const numRows = Math.round((endPageY - startPageY) / size);
    const numCols = Math.round((endPageX - startPageX) / size);

    for (let row = 0; row <= numRows; row++) {
      const pageY = row * size + startPageY;
      const canvasY = pageY - 2 * startPageY;

      for (let col = 0; col <= numCols; col++) {
        const pageX = col * size + startPageX;
        const canvasX = pageX - 2 * startPageX;

        layer.add(
          new Circle({
            x: canvasX,
            y: canvasY,
            radius: 1,
            fill: 'rgba(0, 0, 0, 0.2)',
            stroke: 'rgba(0, 0, 0, 0.2)',
            strokeWidth: 0,
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
  }

  disable() {
    this.enabled = false;
    this.getLayer()?.hide();
  }

  getType() {
    return this.type;
  }

  setType(type: WeaveStageGridType) {
    this.type = type;
  }
}
