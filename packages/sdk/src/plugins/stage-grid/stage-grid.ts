import Konva from "konva";
import { Line } from "konva/lib/shapes/Line";
import { WeavePlugin } from "@/plugins/plugin";
import { WEAVE_GRID_LAYER_ID } from "./constants";
import { WeaveStageGridPluginParams } from "./types";

export class WeaveStageGridPlugin extends WeavePlugin {
  private layer!: Konva.Layer;
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
    return "weaveStageGrid";
  }

  getLayerName() {
    return WEAVE_GRID_LAYER_ID;
  }

  initLayer() {
    const stage = this.instance.getStage();

    const layer = new Konva.Layer({ id: this.getLayerName() });
    stage.add(layer);

    this.layer = layer;
  }

  init() {
    this.initEvents();
  }

  private initEvents() {
    const stage = this.instance.getStage();

    stage.on("wheel", (e) => {
      e.evt.preventDefault();
      this.render();
    });
  }

  private renderGrid() {
    const stage = this.instance.getStage();

    this.layer.destroyChildren();

    const size = stage.width() / this.gridSize;

    const delta = 2 * size;

    const startPageX = Math.ceil((stage.x() + delta) / stage.scaleX() / size) * size;
    const startPageY = Math.ceil((stage.y() + delta) / stage.scaleY() / size) * size;
    const endPageX = Math.floor((stage.x() + stage.width() + 4 * delta) / stage.scaleX() / size) * size;
    const endPageY = Math.floor((stage.y() + stage.height() + 4 * delta) / stage.scaleY() / size) * size;
    const numRows = Math.round((endPageY - startPageY) / size);
    const numCols = Math.round((endPageX - startPageX) / size);

    for (let row = 0; row <= numRows; row++) {
      const pageY = row * size + startPageY;
      const canvasY = pageY - 2 * startPageY;
      this.layer.add(
        new Line({
          points: [
            (-stage.x() - 2 * delta) / stage.scaleX(),
            canvasY,
            (stage.width() - stage.x() + 2 * delta) / stage.scaleX(),
            canvasY,
          ],
          stroke: "rgba(0, 0, 0, 0.2)",
          strokeWidth: 0.5,
        }),
      );
    }

    for (let col = 0; col <= numCols; col++) {
      const pageX = col * size + startPageX;
      const canvasX = pageX - 2 * startPageX;
      this.layer.add(
        new Line({
          points: [
            canvasX,
            (-stage.y() - 2 * delta) / stage.scaleY(),
            canvasX,
            (stage.height() - stage.y() + 2 * delta) / stage.scaleY(),
          ],
          stroke: "rgba(0, 0, 0, 0.2)",
          strokeWidth: 0.5,
        }),
      );
    }
  }

  render() {
    this.renderGrid();
  }
}
