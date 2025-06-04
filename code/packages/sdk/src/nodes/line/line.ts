// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  WEAVE_DEFAULT_TRANSFORM_PROPERTIES,
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
        ...WEAVE_DEFAULT_TRANSFORM_PROPERTIES,
        ...config?.transform,
      },
    };
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const line = new Konva.Line({
      ...props,
      name: 'node',
    });

    line.getTransformerProperties = () => {
      return this.config.transform;
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

  protected scaleReset(node: Konva.Node): void {
    // for lines, adjust points to scale
    if (node.getAttrs().nodeType === 'line') {
      const lineNode = node as Konva.Line;
      const oldPoints = lineNode.points();
      const newPoints = [];
      for (let i = 0; i < oldPoints.length / 2; i++) {
        const point = {
          x: oldPoints[i * 2] * lineNode.scaleX(),
          y: oldPoints[i * 2 + 1] * lineNode.scaleY(),
        };
        newPoints.push(point.x, point.y);
      }
      lineNode.points(newPoints);
    }

    node.width(Math.max(5, node.width() * node.scaleX()));
    node.height(Math.max(5, node.height() * node.scaleY()));

    // reset scale to 1
    node.scaleX(1);
    node.scaleY(1);
  }
}
