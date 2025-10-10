// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import { WEAVE_RECTANGLE_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type {
  WeaveRectangleNodeParams,
  WeaveRectangleProperties,
} from './types';

export class WeaveRectangleNode extends WeaveNode {
  private config: WeaveRectangleProperties;
  protected nodeType: string = WEAVE_RECTANGLE_NODE_TYPE;

  constructor(params?: WeaveRectangleNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: {
        ...config?.transform,
      },
    };
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const rectangle = new Konva.Rect({
      ...props,
      isCloned: undefined,
      isCloneOrigin: undefined,
      name: 'node',
      strokeScaleEnabled: true,
    });

    this.setupDefaultNodeAugmentation(rectangle);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    rectangle.getTransformerProperties = function () {
      return defaultTransformerProperties;
    };

    this.setupDefaultNodeEvents(rectangle);

    return rectangle;
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

  scaleReset(node: Konva.Rect): void {
    const scale = node.scale();

    node.width(Math.max(5, node.width() * scale.x));
    node.height(Math.max(5, node.height() * scale.y));

    // reset scale to 1
    node.scale({ x: 1, y: 1 });
  }
}
