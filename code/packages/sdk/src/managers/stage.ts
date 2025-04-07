import Konva from 'konva';
import { Logger } from 'pino';
import { Weave } from '@/weave';
import { WEAVE_NODE_LAYER_ID } from '@inditextech/weavejs-types';

export class WeaveStageManager {
  private instance: Weave;
  private logger: Logger;
  private stage!: Konva.Stage;
  private config!: Konva.StageConfig;

  constructor(instance: Weave, config: Konva.StageConfig) {
    this.instance = instance;
    this.config = config;
    this.logger = this.instance.getChildLogger('stage-manager');
    this.logger.debug({ config }, 'Stage manager created');
  }

  getConfiguration() {
    return this.config;
  }

  setStage(stage: Konva.Stage) {
    this.stage = stage;
  }

  getStage() {
    return this.stage;
  }

  getMainLayer() {
    const stage = this.getStage();
    return stage.findOne(`#${WEAVE_NODE_LAYER_ID}`) as Konva.Layer | undefined;
  }

  getInstanceRecursive(
    instance: Konva.Node,
    filterInstanceType: string[] = []
  ): Konva.Node {
    const attributes = instance.getAttrs();

    if (
      instance.getParent() &&
      instance.getParent()?.getAttrs().nodeType &&
      !['stage', 'layer', ...filterInstanceType].includes(
        instance.getParent()?.getAttrs().nodeType
      )
    ) {
      return this.getInstanceRecursive(instance.getParent() as Konva.Node);
    }

    if (attributes.id === 'mainLayer') {
      return this.instance.getMainLayer() as Konva.Node;
    }

    if (attributes.id === 'stage') {
      return this.instance.getMainLayer() as Konva.Node;
    }

    return instance;
  }

  initStage() {
    const props = {
      container: this.instance.getStageConfiguration().container,
      width: this.instance.getStageConfiguration().width,
      height: this.instance.getStageConfiguration().height,
      id: 'stage',
      initialZIndex: undefined,
    };
    const stage = new Konva.Stage({
      ...props,
    });

    stage.draw();

    this.setStage(stage);
  }
}
