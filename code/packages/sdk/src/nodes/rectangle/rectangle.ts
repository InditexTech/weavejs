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
import { WEAVE_RECTANGLE_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type {
  WeaveRectangleNodeParams,
  WeaveRectangleProperties,
} from './types';
import { mergeExceptArrays } from '@/index';

export class WeaveRectangleNode extends WeaveNode {
  private config: WeaveRectangleProperties;
  protected nodeType: string = WEAVE_RECTANGLE_NODE_TYPE;
  initialize = undefined;

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
    const rectangle = new Konva.Group({
      ...props,
      name: 'node',
    });

    const internalRectBg = new Konva.Rect({
      ...props,
      name: undefined,
      id: `${props.id}-bg`,
      nodeId: props.id,
      x: 0,
      y: 0,
      width: props.width,
      height: props.height,
      fill: props.fill || 'transparent',
      strokeWidth: 0,
      strokeScaleEnabled: true,
      cornerRadius: (props.cornerRadius || 0) * 1.1,
      rotation: 0,
    });

    rectangle.add(internalRectBg);

    const internalRectBorder = new Konva.Rect({
      ...props,
      name: undefined,
      id: `${props.id}-border`,
      x: props.strokeWidth / 2,
      y: props.strokeWidth / 2,
      width: props.width - props.strokeWidth,
      height: props.height - props.strokeWidth,
      fill: 'transparent',
      strokeWidth: props.strokeWidth || 0,
      strokeScaleEnabled: true,
      rotation: 0,
      listening: false,
    });

    rectangle.add(internalRectBorder);

    internalRectBorder.moveToTop();
    internalRectBg.moveToBottom();

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

    const rectangle = nodeInstance as Konva.Group;
    const internalRectBg = rectangle.findOne(
      `#${nextProps.id}-bg`
    ) as Konva.Rect;
    const internalRectBorder = rectangle.findOne(
      `#${nextProps.id}-border`
    ) as Konva.Rect;

    if (internalRectBg) {
      internalRectBg.setAttrs({
        ...nextProps,
        name: undefined,
        id: `${nextProps.id}-bg`,
        nodeId: nextProps.id,
        x: 0,
        y: 0,
        cornerRadius: (nextProps.cornerRadius || 0) * 1.1,
        width: nextProps.width,
        height: nextProps.height,
        fill: nextProps.fill || 'transparent',
        strokeWidth: 0,
        strokeScaleEnabled: true,
        rotation: 0,
      });
      internalRectBg.moveToBottom();
    }

    if (internalRectBorder) {
      internalRectBorder.setAttrs({
        ...nextProps,
        name: undefined,
        id: `${nextProps.id}-border`,
        x: nextProps.strokeWidth / 2,
        y: nextProps.strokeWidth / 2,
        width: nextProps.width - nextProps.strokeWidth,
        height: nextProps.height - nextProps.strokeWidth,
        stroke: nextProps.stroke || 'transparent',
        strokeWidth: nextProps.strokeWidth || 0,
        strokeScaleEnabled: true,
        listening: false,
        rotation: 0,
      });
      internalRectBorder.moveToTop();
    }

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  static defaultState(nodeId: string): WeaveStateElement {
    return {
      ...super.defaultState(nodeId),
      type: WEAVE_RECTANGLE_NODE_TYPE,
      props: {
        ...super.defaultState(nodeId).props,
        nodeType: WEAVE_RECTANGLE_NODE_TYPE,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
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
        width: props.width,
        height: props.height,
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
        width: nextProps.width,
        height: nextProps.height,
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
        .literal(WEAVE_RECTANGLE_NODE_TYPE)
        .describe(
          `Type of the node, for a rectangle node it will always be "${WEAVE_RECTANGLE_NODE_TYPE}"`
        ),
      props: baseSchema.shape.props.extend({
        nodeType: z
          .literal(WEAVE_RECTANGLE_NODE_TYPE)
          .describe(
            `Type of the node, for a rectangle node it will always be "${WEAVE_RECTANGLE_NODE_TYPE}"`
          ),

        width: z.number().describe('Width of the rectangle in pixels'),
        height: z.number().describe('Height of the rectangle in pixels'),

        fill: z
          .string()
          .describe(
            'Fill color of the rectangle in hex format with alpha channel (e.g. #RRGGBBAA)'
          ),

        stroke: z
          .string()
          .describe(
            'Stroke color of the rectangle in hex format with alpha channel (e.g. #RRGGBBAA)'
          ),
        strokeWidth: z
          .number()
          .describe('Stroke width of the rectangle in pixels'),
        strokeScaleEnabled: z
          .boolean()
          .describe(
            'Whether the rectangle stroke width should scale when the node is scaled. Defaults to true.'
          ),
      }),
    });

    return nodeSchema;
  }
}
