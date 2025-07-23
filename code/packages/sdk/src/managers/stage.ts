// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { type Logger } from 'pino';
import { Weave } from '@/weave';
import {
  WEAVE_NODE_LAYER_ID,
  WEAVE_UTILITY_LAYER_ID,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import type { StageConfig } from 'konva/lib/Stage';
import { WEAVE_NODES_SELECTION_LAYER_ID } from '@/plugins/nodes-selection/constants';

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

  getConfiguration(): StageConfig {
    return this.config;
  }

  setStage(stage: Konva.Stage): void {
    this.stage = stage;
  }

  getStage(): Konva.Stage {
    return this.stage;
  }

  getMainLayer(): Konva.Layer | undefined {
    const stage = this.getStage();
    return stage.findOne(`#${WEAVE_NODE_LAYER_ID}`);
  }

  getSelectionLayer(): Konva.Layer | undefined {
    const stage = this.getStage();
    return stage.findOne(`#${WEAVE_NODES_SELECTION_LAYER_ID}`);
  }

  getUtilityLayer(): Konva.Layer | undefined {
    const stage = this.getStage();
    return stage.findOne(`#${WEAVE_UTILITY_LAYER_ID}`);
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

  initStage(): void {
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

    this.setStage(stage);
  }

  getContainerNodes(): WeaveElementInstance[] {
    return this.instance.getMainLayer()?.find((node: Konva.Node) => {
      return node.getAttrs().containerId;
    }) as WeaveElementInstance[];
  }
}
