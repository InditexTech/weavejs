// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import { WEAVE_STAR_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveStarNodeParams, WeaveStarProperties } from './types';

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

    star.getTransformerProperties = () => {
      const stage = this.instance.getStage();

      const baseConfig = this.defaultGetTransformerProperties(
        this.config.transform
      );

      const node = stage.findOne(`#${props.id}`) as Konva.Star | undefined;

      if (node && node.getAttrs().keepAspectRatio) {
        return {
          ...baseConfig,
          enabledAnchors: [
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
          ],
          keepRatio: true,
        };
      }

      return baseConfig;
    };

    star.allowedAnchors = () => {
      const stage = this.instance.getStage();
      const actualStar = stage.findOne(`#${star.id()}`) as Konva.Star;

      if (actualStar.getAttrs().keepAspectRatio) {
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
}
