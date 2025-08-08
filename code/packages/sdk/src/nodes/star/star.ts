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
import { WEAVE_STAR_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveStarNodeParams, WeaveStarProperties } from './types';
import type { Vector2d } from 'konva/lib/types';

export class WeaveStarNode extends WeaveNode {
  private config: WeaveStarProperties;
  protected nodeType: string = WEAVE_STAR_NODE_TYPE;

  constructor(params?: WeaveStarNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: {
        ...config?.transform,
      },
    };
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const star = new Konva.Star({
      ...props,
      name: 'node',
      numPoints: props.numPoints,
      innerRadius: props.innerRadius,
      outerRadius: props.outerRadius,
    });

    this.setupDefaultNodeAugmentation(star);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    star.getTransformerProperties = function () {
      const actualAttrs = this.getAttrs();

      if (actualAttrs.keepAspectRatio) {
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
      }

      return defaultTransformerProperties;
    };

    star.allowedAnchors = function () {
      const actualAttrs = this.getAttrs();

      if (actualAttrs.keepAspectRatio) {
        return ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      }

      return [
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'middle-left',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ];
    };

    this.setupDefaultNodeEvents(star);

    return star;
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
      const actualSelectedNodes = nodesSelectionPlugin.getSelectedNodes();
      nodesSelectionPlugin.setSelectedNodes(actualSelectedNodes);
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  scaleReset(node: Konva.Star): void {
    node.innerRadius(Math.max(5, node.innerRadius() * node.scaleX()));
    node.outerRadius(Math.max(5, node.outerRadius() * node.scaleY()));

    // reset scale to
    node.scale({ x: 1, y: 1 });
  }

  realOffset(element: WeaveStateElement): Vector2d {
    return {
      x: element.props.outerRadius,
      y: element.props.outerRadius,
    };
  }
}
