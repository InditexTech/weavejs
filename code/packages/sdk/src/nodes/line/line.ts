// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import { WEAVE_LINE_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveLineNodeParams, WeaveLineProperties } from './types';

export class WeaveLineNode extends WeaveNode {
  private config: WeaveLineProperties;
  protected nodeType: string = WEAVE_LINE_NODE_TYPE;

  constructor(params?: WeaveLineNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: {
        ...config?.transform,
      },
    };
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const line = new Konva.Line({
      ...props,
      name: 'node',
    });

    this.setupDefaultNodeAugmentation(line);

    line.getTransformerProperties = () => {
      return this.defaultGetTransformerProperties(this.config.transform);
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

  scaleReset(node: Konva.Line): void {
    const scale = node.scale();

    const oldPoints = node.points();
    const newPoints = [];

    for (let i = 0; i < oldPoints.length; i += 2) {
      const x = oldPoints[i] * scale.x;
      const y = oldPoints[i + 1] * scale.y;
      newPoints.push(x, y);
    }

    node.points(newPoints);

    // reset scale to 1
    node.scale({ x: 1, y: 1 });
  }
}
