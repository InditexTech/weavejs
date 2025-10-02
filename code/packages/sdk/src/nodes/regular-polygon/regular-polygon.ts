// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import { WEAVE_REGULAR_POLYGON_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type {
  WeaveRegularPolygonNodeParams,
  WeaveRegularPolygonProperties,
} from './types';
import type { Vector2d } from 'konva/lib/types';

export class WeaveRegularPolygonNode extends WeaveNode {
  private config: WeaveRegularPolygonProperties;
  protected nodeType: string = WEAVE_REGULAR_POLYGON_NODE_TYPE;

  constructor(params?: WeaveRegularPolygonNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: { ...config?.transform },
    };
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const regularPolygon = new Konva.RegularPolygon({
      ...props,
      name: 'node',
      sides: props.sides,
      radius: props.radius,
      strokeScaleEnabled: true,
    });

    this.setupDefaultNodeAugmentation(regularPolygon);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    regularPolygon.getTransformerProperties = function () {
      return {
        ...defaultTransformerProperties,
        enabledAnchors: [
          'top-left',
          'top-right',
          'bottom-left',
          'bottom-right',
        ],
        keepRatio: true,
      };
    };

    regularPolygon.allowedAnchors = function () {
      return ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
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

  scaleReset(node: Konva.RegularPolygon): void {
    node.radius(Math.max(5, node.radius() * node.scaleX()));

    // reset scale to 1
    node.scale({ x: 1, y: 1 });
  }

  realOffset(element: WeaveStateElement): Vector2d {
    return {
      x: element.props.radius,
      y: element.props.radius,
    };
  }
}
