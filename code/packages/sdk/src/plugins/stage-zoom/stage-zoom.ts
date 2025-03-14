import { WeavePlugin } from '@/plugins/plugin';
import {
  WeaveStageZoomOnZoomChangeCallback,
  WeaveStageZoomPluginParams,
} from './types';
import Konva from 'konva';
import { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';

export class WeaveStageZoomPlugin extends WeavePlugin {
  getLayerName = undefined;
  initLayer = undefined;
  render: undefined;
  private zoomSteps: number[];
  private actualScale: number;
  private actualStep: number;
  private padding: number = 100;
  defaultStep: number;
  private onZoomChangeCb: WeaveStageZoomOnZoomChangeCallback | undefined;

  constructor(params: WeaveStageZoomPluginParams) {
    super();

    const {
      zoomSteps = [0.1, 0.25, 0.5, 1, 2, 4, 8],
      defaultZoom = 1,
      onZoomChange,
    } = params;

    this.zoomSteps = zoomSteps;

    if (!this.zoomSteps.includes(defaultZoom)) {
      throw new Error(`Default zoom ${defaultZoom} is not in zoom steps`);
    }

    this.actualStep = zoomSteps.findIndex((step) => step === defaultZoom);
    this.actualScale = this.zoomSteps[this.actualStep];
    this.defaultStep = this.actualStep;
    this.onZoomChangeCb = onZoomChange;
  }

  registersLayers() {
    return false;
  }

  getName() {
    return 'stageZoom';
  }

  init() {
    this.setZoom(this.zoomSteps[this.actualStep]);
  }

  private setZoom(scale: number, centered: boolean = true) {
    const stage = this.instance.getStage();

    const mainLayer = this.instance.getMainLayer();

    if (mainLayer) {
      const oldScale = stage.scaleX();

      const actScale = stage.scale();
      actScale.x = scale;
      actScale.y = scale;
      stage.scale(actScale);

      this.actualScale = scale;

      if (centered) {
        const stageCenter = {
          x: stage.width() / 2,
          y: stage.height() / 2,
        };

        const relatedTo = {
          x: (stageCenter.x - stage.x()) / oldScale,
          y: (stageCenter.y - stage.y()) / oldScale,
        };

        const newPos = {
          x: stageCenter.x - relatedTo.x * scale,
          y: stageCenter.y - relatedTo.y * scale,
        };

        stage.position(newPos);
      }

      const plugins = this.instance.getPlugins();
      for (const pluginId of Object.keys(plugins)) {
        const pluginInstance = plugins[pluginId];
        pluginInstance.render?.();
      }

      this.onZoomChangeCb?.({
        scale,
        zoomSteps: this.zoomSteps,
        actualStep: this.actualStep,
        onDefaultStep: this.actualStep === this.defaultStep,
        canZoomIn: this.canZoomIn(),
        canZoomOut: this.canZoomOut(),
      });
    }
  }

  canZoomOut() {
    const actualZoomIsStep = this.zoomSteps.findIndex(
      (scale) => scale === this.actualScale
    );
    if (actualZoomIsStep === -1) {
      this.actualStep = this.findClosestStepIndex();
    }

    return this.actualStep - 1 > 0;
  }

  canZoomIn() {
    const actualZoomIsStep = this.zoomSteps.findIndex(
      (scale) => scale === this.actualScale
    );
    if (actualZoomIsStep === -1) {
      this.actualStep = this.findClosestStepIndex();
    }

    return this.actualStep + 1 < this.zoomSteps.length;
  }

  zoomToStep(step: number) {
    if (step < 0 || step >= this.zoomSteps.length) {
      throw new Error(`Defined step ${step} is out of bounds`);
    }

    this.actualStep = step;
    this.setZoom(this.zoomSteps[step]);
  }

  private findClosestStepIndex() {
    let closestStepIndex = 0;
    let actualDiff = Infinity;
    for (let i = 0; i < this.zoomSteps.length; i++) {
      if (Math.abs(this.zoomSteps[i] - this.actualScale) < actualDiff) {
        closestStepIndex = i;
        actualDiff = Math.abs(this.zoomSteps[i] - this.actualScale);
      }
    }
    return closestStepIndex;
  }

  zoomIn() {
    if (!this.canZoomIn()) {
      return;
    }

    const actualZoomIsStep = this.zoomSteps.findIndex(
      (scale) => scale === this.actualScale
    );
    if (actualZoomIsStep === -1) {
      this.actualStep = this.findClosestStepIndex();
    } else {
      this.actualStep += 1;
    }

    this.setZoom(this.zoomSteps[this.actualStep]);
  }

  zoomOut() {
    if (!this.canZoomOut()) {
      return;
    }

    const actualZoomIsStep = this.zoomSteps.findIndex(
      (scale) => scale === this.actualScale
    );
    if (actualZoomIsStep === -1) {
      this.actualStep = this.findClosestStepIndex();
    } else {
      this.actualStep -= 1;
    }

    this.setZoom(this.zoomSteps[this.actualStep]);
  }

  fitToScreen() {
    const mainLayer = this.instance.getMainLayer();

    if (mainLayer?.getChildren().length === 0) {
      this.setZoom(this.zoomSteps[this.defaultStep]);
      return;
    }

    const stage = this.instance.getStage();

    if (mainLayer) {
      const box = mainLayer.getClientRect({ relativeTo: stage });
      const scale = Math.min(
        stage.width() / (box.width + this.padding * 2),
        stage.height() / (box.height + this.padding * 2)
      );

      stage.setAttrs({
        x: -box.x * scale + (stage.width() - box.width * scale) / 2,
        y: -box.y * scale + (stage.height() - box.height * scale) / 2,
      });

      this.setZoom(scale, false);
    }
  }

  fitToSelection() {
    const stage = this.instance.getStage();

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    const nodes = selectionPlugin.getTransformer().getNodes();

    console.log('NODES?', selectionPlugin.getTransformer(), nodes);

    if (nodes.length === 0) {
      return;
    }

    let zoomTransformer = stage.findOne('#zoomTransformer') as
      | Konva.Transformer
      | undefined;
    if (!zoomTransformer) {
      zoomTransformer = new Konva.Transformer({
        id: 'zoomTransformer',
        clearBeforeDraw: true,
        resizeEnabled: false,
        ignoreStroke: true,
        rotateEnabled: false,
        enabledAnchors: [],
        shouldOverdrawWholeArea: true,
        scaleX: stage.scaleX(),
        scaleY: stage.scaleY(),
      });

      const mainLayer = this.instance.getMainLayer();
      mainLayer?.add(zoomTransformer);
    }

    this.setZoom(1, false);
    stage.setAttrs({ x: 0, y: 0 });

    zoomTransformer.setNodes(selectionPlugin.getTransformer().getNodes());
    zoomTransformer.forceUpdate();

    const box = zoomTransformer.__getNodeRect();
    const scale = Math.min(
      stage.width() / (zoomTransformer.width() + this.padding * 2),
      stage.height() / (zoomTransformer.height() + this.padding * 2)
    );

    stage.setAttrs({
      x: -box.x * scale + (stage.width() - zoomTransformer.width() * scale) / 2,
      y:
        -box.y * scale +
        (stage.height() - zoomTransformer.height() * scale) / 2,
    });

    this.setZoom(scale, false);

    zoomTransformer.destroy();
  }
}
