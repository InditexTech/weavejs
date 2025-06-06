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
import { WEAVE_REGULAR_POLYGON_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type {
  WeaveRegularPolygonNodeParams,
  WeaveRegularPolygonProperties,
} from './types';

export class WeaveRegularPolygonNode extends WeaveNode {
  private config: WeaveRegularPolygonProperties;
  protected nodeType: string = WEAVE_REGULAR_POLYGON_NODE_TYPE;

  constructor(params?: WeaveRegularPolygonNodeParams) {
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
    const regularPolygon = new Konva.RegularPolygon({
      ...props,
      name: 'node',
      sides: props.sides,
      radius: props.radius,
    });

    regularPolygon.getTransformerProperties = () => {
      return {
        ...this.config.transform,
        enabledAnchors: [
          'top-left',
          'top-right',
          'bottom-left',
          'bottom-right',
        ],
        keepRatio: true,
      };
    };

    this.setupDefaultNodeEvents(regularPolygon);

    return regularPolygon;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
      radius: nextProps.radius,
    });

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      const actualSelectedNodes = nodesSelectionPlugin.getSelectedNodes();
      nodesSelectionPlugin.setSelectedNodes(actualSelectedNodes);
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  protected scaleReset(node: Konva.Node): void {
    const regularPolygonNode = node as Konva.RegularPolygon;
    regularPolygonNode.radius(
      Math.max(5, regularPolygonNode.radius() * regularPolygonNode.scaleX())
    );

    // reset scale to 1
    node.scaleX(1);
    node.scaleY(1);
  }
}
