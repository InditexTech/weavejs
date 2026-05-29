// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
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
import { mergeExceptArrays } from '@/utils/utils';

export class WeaveStarNode extends WeaveNode {
  private config: WeaveStarProperties;
  protected nodeType: string = WEAVE_STAR_NODE_TYPE;
  initialize = undefined;

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
    const star = new Konva.Group({
      ...props,
      name: 'node',
    });

    const numPoints = star.getAttr('numPoints') as number;
    const innerRadius = star.getAttr('innerRadius') as number;
    const outerRadius = star.getAttr('outerRadius') as number;

    const internalStarBg = new Konva.Star({
      ...props,
      name: undefined,
      id: `${props.id}-bg`,
      nodeId: props.id,
      x: outerRadius,
      y: outerRadius,
      numPoints,
      innerRadius,
      outerRadius,
      fill: props.fill || 'transparent',
      strokeWidth: 0,
      strokeScaleEnabled: true,
      rotation: 0,
    });

    const internalStarBgBox = internalStarBg.getClientRect({
      relativeTo: star,
    });
    internalStarBg.x(internalStarBg.x() - internalStarBgBox.x);
    internalStarBg.y(internalStarBg.y() - internalStarBgBox.y);

    star.add(internalStarBg);

    const innerStarScale = (outerRadius - props.strokeWidth) / outerRadius;
    const internalStarBorder = new Konva.Star({
      ...props,
      name: undefined,
      id: `${props.id}-border`,
      x: outerRadius,
      y: outerRadius,
      numPoints,
      innerRadius: innerRadius * innerStarScale,
      outerRadius: outerRadius * innerStarScale,
      fill: 'transparent',
      strokeWidth: props.strokeWidth || 0,
      strokeScaleEnabled: true,
      rotation: 0,
      listening: false,
    });

    const internalStarBorderBox = internalStarBorder.getClientRect({
      relativeTo: star,
    });

    const diffX = internalStarBgBox.width - internalStarBorderBox.width;
    const diffY = internalStarBgBox.height - internalStarBorderBox.height;

    internalStarBorder.x(
      internalStarBorder.x() - internalStarBorderBox.x + diffX / 2
    );
    internalStarBorder.y(
      internalStarBorder.y() - internalStarBorderBox.y + diffY / 2
    );

    star.add(internalStarBorder);

    internalStarBorder.moveToTop();
    internalStarBg.moveToBottom();

    this.setupDefaultNodeAugmentation(star);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    star.getTransformerProperties = function () {
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

    star.allowedAnchors = function () {
      return ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
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

    const numPoints = nodeInstance.getAttr('numPoints') as number;
    const innerRadius = nodeInstance.getAttr('innerRadius') as number;
    const outerRadius = nodeInstance.getAttr('outerRadius') as number;

    const star = nodeInstance as Konva.Group;
    const internalStarBg = star.findOne(`#${nextProps.id}-bg`) as Konva.Star;
    const internalStarBorder = star.findOne(
      `#${nextProps.id}-border`
    ) as Konva.Star;

    if (internalStarBg && internalStarBorder) {
      internalStarBg.setAttrs({
        ...nextProps,
        name: undefined,
        id: `${nextProps.id}-bg`,
        nodeId: nextProps.id,
        x: outerRadius,
        y: outerRadius,
        numPoints,
        innerRadius,
        outerRadius,
        fill: nextProps.fill || 'transparent',
        strokeWidth: 0,
        strokeScaleEnabled: true,
        rotation: 0,
      });

      const internalStarBgBox = internalStarBg.getClientRect({
        relativeTo: star,
      });
      internalStarBg.x(internalStarBg.x() - internalStarBgBox.x);
      internalStarBg.y(internalStarBg.y() - internalStarBgBox.y);

      internalStarBg.moveToBottom();

      const innerStarScale =
        (outerRadius - nextProps.strokeWidth) / outerRadius;

      internalStarBorder.setAttrs({
        ...nextProps,
        name: undefined,
        id: `${nextProps.id}-border`,
        x: outerRadius,
        y: outerRadius,
        numPoints,
        innerRadius: innerRadius * innerStarScale,
        outerRadius: outerRadius * innerStarScale,
        stroke: nextProps.stroke || 'transparent',
        strokeWidth: nextProps.strokeWidth || 0,
        strokeScaleEnabled: true,
        listening: false,
        rotation: 0,
      });

      const internalStarBorderBox = internalStarBorder.getClientRect({
        relativeTo: star,
      });

      const diffX = internalStarBgBox.width - internalStarBorderBox.width;
      const diffY = internalStarBgBox.height - internalStarBorderBox.height;

      internalStarBorder.x(
        internalStarBorder.x() - internalStarBorderBox.x + diffX / 2
      );
      internalStarBorder.y(
        internalStarBorder.y() - internalStarBorderBox.y + diffY / 2
      );
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

    const outerRadius = node.getAttr('outerRadius') as number;
    const innerRadius = node.getAttr('innerRadius') as number;

    node.setAttrs({
      outerRadius: outerRadius * node.scaleX(),
      innerRadius: innerRadius * node.scaleX(),
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
      x: element.props.outerRadius,
      y: element.props.outerRadius,
    };
  }

  static defaultState(nodeId: string): WeaveStateElement {
    return {
      ...super.defaultState(nodeId),
      type: WEAVE_STAR_NODE_TYPE,
      props: {
        ...super.defaultState(nodeId).props,
        nodeType: WEAVE_STAR_NODE_TYPE,
        x: 0,
        y: 0,
        numPoints: 5,
        innerRadius: 50,
        outerRadius: 100,
        stroke: '#000000',
        fill: '#FFFFFF',
        strokeWidth: 1,
        strokeScaleEnabled: true,
        rotation: 0,
        zIndex: 1,
        children: [],
      },
    };
  }

  static addNodeState(
    defaultNodeState: WeaveStateElement,
    props: WeaveElementAttributes
  ): WeaveStateElement {
    return mergeExceptArrays(defaultNodeState, {
      props: {
        x: props.x,
        y: props.y,
        numPoints: props.numPoints,
        innerRadius: props.innerRadius,
        outerRadius: props.outerRadius,
        rotation: props.rotation,
        fill: props.fill,
        ...(props.stroke && { stroke: props.stroke }),
        ...(props.strokeWidth && {
          strokeWidth: props.strokeWidth,
        }),
      },
    });
  }

  static updateNodeState(
    prevNodeState: WeaveStateElement,
    nextProps: WeaveElementAttributes
  ): WeaveStateElement {
    return mergeExceptArrays(prevNodeState, {
      props: {
        x: nextProps.x,
        y: nextProps.y,
        numPoints: nextProps.numPoints,
        innerRadius: nextProps.innerRadius,
        outerRadius: nextProps.outerRadius,
        rotation: nextProps.rotation,
        fill: nextProps.fill,
        ...(nextProps.stroke && { stroke: nextProps.stroke }),
        ...(nextProps.strokeWidth && {
          strokeWidth: nextProps.strokeWidth,
        }),
      },
    });
  }

  static getSchema() {
    const baseSchema = super.getSchema();

    const nodeSchema = baseSchema.extend({
      type: z
        .literal(WEAVE_STAR_NODE_TYPE)
        .describe(
          `Type of the node, for a start node it will always be "${WEAVE_STAR_NODE_TYPE}"`
        ),
      props: baseSchema.shape.props.extend({
        nodeType: z
          .literal(WEAVE_STAR_NODE_TYPE)
          .describe(
            `Type of the node, for a rectangle node it will always be "${WEAVE_STAR_NODE_TYPE}"`
          ),

        numPoints: z
          .number()
          .describe(
            'Number of points of the star, must be greater than or equal to 3'
          ),
        innerRadius: z
          .number()
          .describe(
            'Inner radius of the star, must be greater than or equal to 0'
          ),
        outerRadius: z
          .number()
          .describe(
            'Outer radius of the star, must be greater than or equal to 0'
          ),

        fill: z
          .string()
          .describe(
            'Fill color of the star in hex format with alpha channel (e.g. #RRGGBBAA)'
          ),

        stroke: z
          .string()
          .describe(
            'Stroke color of the star in hex format with alpha channel (e.g. #RRGGBBAA)'
          ),
        strokeWidth: z.number().describe('Stroke width of the star in pixels'),
        strokeScaleEnabled: z
          .boolean()
          .describe(
            'Whether the star stroke width should scale when the node is scaled. Defaults to true.'
          ),
      }),
    });

    return nodeSchema;
  }
}
