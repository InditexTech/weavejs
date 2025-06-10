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
        ...WEAVE_DEFAULT_TRANSFORM_PROPERTIES,
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

      const node = stage.findOne(`#${props.id}`) as Konva.Star | undefined;

      if (node && node.getAttrs().keepAspectRatio) {
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
      }

      return this.config.transform;
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

  protected scaleReset(node: Konva.Node): void {
    const starNode = node as Konva.Star;
    starNode.innerRadius(
      Math.max(5, starNode.innerRadius() * starNode.scaleX())
    );
    starNode.outerRadius(
      Math.max(5, starNode.outerRadius() * starNode.scaleY())
    );

    // reset scale to 1
    node.scaleX(1);
    node.scaleY(1);
  }
}
