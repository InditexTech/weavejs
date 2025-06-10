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
import { WEAVE_ELLIPSE_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveEllipseNodeParams, WeaveEllipseProperties } from './types';

export class WeaveEllipseNode extends WeaveNode {
  private config: WeaveEllipseProperties;
  protected nodeType: string = WEAVE_ELLIPSE_NODE_TYPE;

  constructor(params?: WeaveEllipseNodeParams) {
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
    const ellipse = new Konva.Ellipse({
      ...props,
      name: 'node',
      radiusX: props.radiusX,
      radiusY: props.radiusY,
    });

    this.setupDefaultNodeAugmentation(ellipse);

    ellipse.getTransformerProperties = () => {
      const stage = this.instance.getStage();

      const node = stage.findOne(`#${props.id}`) as Konva.Ellipse | undefined;

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

    this.setupDefaultNodeEvents(ellipse);

    return ellipse;
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
    const ellipseNode = node as Konva.Ellipse;
    ellipseNode.radiusX(
      Math.max(5, ellipseNode.radiusX() * ellipseNode.scaleX())
    );
    ellipseNode.radiusY(
      Math.max(5, ellipseNode.radiusY() * ellipseNode.scaleY())
    );

    // reset scale to 1
    node.scaleX(1);
    node.scaleY(1);
  }
}
