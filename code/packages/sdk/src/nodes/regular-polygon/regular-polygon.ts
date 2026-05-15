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

export class WeaveRegularPolygonNode extends WeaveNode {
  private config: WeaveRegularPolygonProperties;
  protected nodeType: string = WEAVE_REGULAR_POLYGON_NODE_TYPE;
  initialize = undefined;

  constructor(params?: WeaveRegularPolygonNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: { ...config?.transform },
    };
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const regularPolygon = new Konva.Group({
      ...props,
      name: 'node',
    });

    const sides = regularPolygon.getAttr('sides') as number;
    const radius = regularPolygon.getAttr('radius') as number;

    const internalRPBg = new Konva.RegularPolygon({
      ...props,
      name: undefined,
      id: `${props.id}-bg`,
      nodeId: props.id,
      x: radius,
      y: radius,
      sides,
      radius,
      fill: props.fill || 'transparent',
      strokeWidth: 0,
      strokeScaleEnabled: true,
      rotation: 0,
    });

    const internalRPBgBox = internalRPBg.getClientRect({
      relativeTo: regularPolygon,
    });
    internalRPBg.x(internalRPBg.x() - internalRPBgBox.x);
    internalRPBg.y(internalRPBg.y() - internalRPBgBox.y);

    regularPolygon.add(internalRPBg);

    const internalRPBorder = new Konva.RegularPolygon({
      ...props,
      name: undefined,
      id: `${props.id}-border`,
      x: radius,
      y: radius,
      sides,
      radius: radius - (props.strokeWidth || 0) / 2,
      fill: 'transparent',
      strokeWidth: props.strokeWidth || 0,
      strokeScaleEnabled: true,
      rotation: 0,
      listening: false,
    });

    const internalRPBorderBox = internalRPBorder.getClientRect({
      relativeTo: regularPolygon,
    });
    internalRPBorder.x(internalRPBorder.x() - internalRPBorderBox.x);
    internalRPBorder.y(internalRPBorder.y() - internalRPBorderBox.y);

    regularPolygon.add(internalRPBorder);

    internalRPBorder.moveToTop();
    internalRPBg.moveToBottom();

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
    });

    const sides = nodeInstance.getAttr('sides') as number;
    const radius = nodeInstance.getAttr('radius') as number;

    const regularPolygon = nodeInstance as Konva.Group;
    const internalRPBg = regularPolygon.findOne(
      `#${nextProps.id}-bg`
    ) as Konva.RegularPolygon;
    const internalRPBorder = regularPolygon.findOne(
      `#${nextProps.id}-border`
    ) as Konva.RegularPolygon;

    if (internalRPBg) {
      internalRPBg.setAttrs({
        ...nextProps,
        name: undefined,
        id: `${nextProps.id}-bg`,
        nodeId: nextProps.id,
        x: radius,
        y: radius,
        sides,
        radius,
        fill: nextProps.fill || 'transparent',
        strokeWidth: 0,
        strokeScaleEnabled: true,
        rotation: 0,
      });

      const internalRPBgBox = internalRPBg.getClientRect({
        relativeTo: regularPolygon,
      });
      internalRPBg.x(internalRPBg.x() - internalRPBgBox.x);
      internalRPBg.y(internalRPBg.y() - internalRPBgBox.y);

      internalRPBg.moveToBottom();
    }

    if (internalRPBorder) {
      internalRPBorder.setAttrs({
        ...nextProps,
        name: undefined,
        id: `${nextProps.id}-border`,
        x: radius,
        y: radius,
        sides,
        radius: radius - (nextProps.strokeWidth || 0) / 2,
        stroke: nextProps.stroke || 'transparent',
        strokeWidth: nextProps.strokeWidth || 0,
        strokeScaleEnabled: true,
        listening: false,
        rotation: 0,
      });

      const internalRPBorderBox = internalRPBorder.getClientRect({
        relativeTo: regularPolygon,
      });
      internalRPBorder.x(internalRPBorder.x() - internalRPBorderBox.x);
      internalRPBorder.y(internalRPBorder.y() - internalRPBorderBox.y);

      internalRPBorder.moveToTop();
    }

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      const actualSelectedNodes = nodesSelectionPlugin.getSelectedNodes();
      nodesSelectionPlugin.setSelectedNodes(actualSelectedNodes);
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  scaleReset(node: Konva.Node): void {
    const absTransform = node.getAbsoluteTransform().copy();

    const radius = node.getAttr('radius') as number;

    node.setAttrs({
      radius: radius * node.scaleX(),
    });
    node.scaleX(1);
    node.scaleY(1);

    const newTransform = node.getAbsoluteTransform();

    const dx = absTransform.m[4] - newTransform.m[4];
    const dy = absTransform.m[5] - newTransform.m[5];

    node.x(node.x() + dx);
    node.y(node.y() + dy);
  }

  realOffset(element: WeaveStateElement): Konva.Vector2d {
    return {
      x: element.props.radius,
      y: element.props.radius,
    };
  }
}
