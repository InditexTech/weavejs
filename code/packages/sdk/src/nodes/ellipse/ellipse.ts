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
import { WEAVE_ELLIPSE_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveEllipseNodeParams, WeaveEllipseProperties } from './types';
import type { Vector2d } from 'konva/lib/types';

export class WeaveEllipseNode extends WeaveNode {
  private config: WeaveEllipseProperties;
  protected nodeType: string = WEAVE_ELLIPSE_NODE_TYPE;

  constructor(params?: WeaveEllipseNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: {
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

      const baseConfig = this.defaultGetTransformerProperties(
        this.config.transform
      );

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

    ellipse.allowedAnchors = () => {
      const stage = this.instance.getStage();
      const actualEllipse = stage.findOne(`#${ellipse.id()}`) as Konva.Ellipse;

      if (actualEllipse.getAttrs().keepAspectRatio) {
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

  scaleReset(node: Konva.Ellipse): void {
    node.radiusX(Math.max(5, node.radiusX() * node.scaleX()));
    node.radiusY(Math.max(5, node.radiusY() * node.scaleY()));

    // reset scale to 1
    node.scale({ x: 1, y: 1 });
  }

  realOffset(element: WeaveStateElement): Vector2d {
    return {
      x: element.props.radiusX,
      y: element.props.radiusY,
    };
  }
}
