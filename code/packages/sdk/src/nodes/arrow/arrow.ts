// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import { WEAVE_ARROW_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveArrowNodeParams, WeaveArrowProperties } from './types';

export class WeaveArrowNode extends WeaveNode {
  private config: WeaveArrowProperties;
  protected nodeType: string = WEAVE_ARROW_NODE_TYPE;

  constructor(params?: WeaveArrowNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: {
        ...config?.transform,
      },
    };
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const line = new Konva.Arrow({
      ...props,
      name: 'node',
      points: props.points,
      strokeScaleEnabled: true,
    });

    this.setupDefaultNodeAugmentation(line);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    line.getTransformerProperties = function () {
      return defaultTransformerProperties;
    };

    this.setupDefaultNodeEvents(line);

    return line;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  scaleReset(node: Konva.Arrow): void {
    const oldPoints = node.points();
    const newPoints = [];
    for (let i = 0; i < oldPoints.length / 2; i++) {
      const point = {
        x: oldPoints[i * 2] * node.scaleX(),
        y: oldPoints[i * 2 + 1] * node.scaleY(),
      };
      newPoints.push(point.x, point.y);
    }
    node.points(newPoints);

    node.width(Math.max(5, node.width() * node.scaleX()));
    node.height(Math.max(5, node.height() * node.scaleY()));

    // reset scale to 1
    node.scale({ x: 1, y: 1 });
  }
}
