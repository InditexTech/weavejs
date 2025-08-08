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
import { WEAVE_STROKE_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type {
  WeaveStrokeNodeParams,
  WeaveStrokePoint,
  WeaveStrokeProperties,
} from './types';

export class WeaveStrokeNode extends WeaveNode {
  private readonly config: WeaveStrokeProperties;
  protected nodeType: string = WEAVE_STROKE_NODE_TYPE;

  constructor(params?: WeaveStrokeNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: {
        ...config?.transform,
      },
    };
  }

  private drawStroke(
    strokeElements: WeaveStrokePoint[],
    prevLineWidth: number,
    context: Konva.Context,
    shape: Konva.Shape
  ): number {
    const strokeWidth = shape.getAttrs().strokeWidth ?? 1;

    const l = strokeElements.length - 1;
    if (strokeElements.length >= 3) {
      const prevPoint = strokeElements[l - 1];
      const actualPoint = strokeElements[l];
      const xc = (actualPoint.x + prevPoint.x) / 2;
      const yc = (actualPoint.y + prevPoint.y) / 2;
      context.lineWidth =
        Math.log(actualPoint.pressure + 1) * strokeWidth + prevLineWidth * 0.8;
      context.quadraticCurveTo(
        strokeElements[l - 1].x,
        strokeElements[l - 1].y,
        xc,
        yc
      );
      return context.lineWidth;
    } else {
      const point = strokeElements[l];
      context.lineWidth = Math.log(point.pressure + 1) * strokeWidth;
      return context.lineWidth;
    }
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const stroke = new Konva.Shape({
      ...props,
      name: 'node',
      sceneFunc: (context, shape) => {
        context.beginPath();

        context.strokeStyle = shape.getAttrs().stroke ?? 'black';
        context.setLineDash(shape.getAttrs().dash || []);
        context.lineCap = shape.getAttrs().lineCap ?? 'round';
        context.lineJoin = shape.getAttrs().lineJoin ?? 'round';

        const strokeElements: WeaveStrokePoint[] =
          shape.getAttrs().strokeElements;

        if (strokeElements.length === 0) {
          return;
        }

        context.moveTo(strokeElements[0].x, strokeElements[0].y);

        let prevLineWidth: number = 0;
        const strokePath: WeaveStrokePoint[] = [];
        strokeElements.forEach((point) => {
          strokePath.push(point);
          prevLineWidth = this.drawStroke(
            strokePath,
            prevLineWidth,
            context,
            shape
          );
        });

        context.strokeShape(shape);
      },
      dashEnabled: false,
      hitFunc: (context, shape) => {
        context.beginPath();
        context.rect(0, 0, shape.width(), shape.height());
        context.closePath();
        // important Konva method that fill and stroke shape from its properties
        context.fillStrokeShape(shape);
      },
    });

    this.setupDefaultNodeAugmentation(stroke);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    stroke.getTransformerProperties = function () {
      return defaultTransformerProperties;
    };

    this.setupDefaultNodeEvents(stroke);

    return stroke;
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
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  scaleReset(node: Konva.Node): void {
    const strokeNode = node as Konva.Shape;
    const oldPoints = [...strokeNode.getAttrs().strokeElements];
    const newPoints = [];
    for (const actPoint of oldPoints) {
      const point = {
        ...actPoint,
        x: actPoint.x * strokeNode.scaleX(),
        y: actPoint.y * strokeNode.scaleY(),
      };
      newPoints.push(point);
    }
    strokeNode.setAttrs({
      strokeElements: newPoints,
    });

    node.width(Math.max(5, node.width() * node.scaleX()));
    node.height(Math.max(5, node.height() * node.scaleY()));

    // reset scale to 1
    node.scale({ x: 1, y: 1 });
  }

  serialize(instance: WeaveElementInstance): WeaveStateElement {
    const attrs = instance.getAttrs();

    const cleanedAttrs = { ...attrs };
    delete cleanedAttrs.draggable;
    delete cleanedAttrs.sceneFunc;
    delete cleanedAttrs.hitFunc;

    return {
      key: attrs.id ?? '',
      type: attrs.nodeType,
      props: {
        ...cleanedAttrs,
        id: attrs.id ?? '',
        nodeType: attrs.nodeType,
        children: [],
      },
    };
  }
}
