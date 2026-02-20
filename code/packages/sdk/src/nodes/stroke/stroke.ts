// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { Context } from 'konva/lib/Context';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import {
  WEAVE_STROKE_NODE_DEFAULT_CONFIG,
  WEAVE_STROKE_NODE_TYPE,
} from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type {
  WeaveStrokeNodeParams,
  WeaveStrokePoint,
  WeaveStrokeProperties,
} from './types';
import type { WeaveStageZoomPlugin } from '@/plugins/stage-zoom/stage-zoom';
import { mergeExceptArrays } from '@/utils';

export class WeaveStrokeNode extends WeaveNode {
  private readonly config: WeaveStrokeProperties;
  protected nodeType: string = WEAVE_STROKE_NODE_TYPE;

  constructor(params?: WeaveStrokeNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = mergeExceptArrays(WEAVE_STROKE_NODE_DEFAULT_CONFIG, config);
  }

  private resamplePoints(
    pts: WeaveStrokePoint[],
    minDist = 2
  ): WeaveStrokePoint[] {
    if (pts.length < 2) return pts;
    const result: WeaveStrokePoint[] = [pts[0]];
    let last = pts[0];
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - last.x;
      const dy = pts[i].y - last.y;
      if (dx * dx + dy * dy >= minDist * minDist) {
        result.push(pts[i]);
        last = pts[i];
      }
    }
    return result;
  }

  private getSplinePoints(pts: WeaveStrokePoint[], resolution = 8) {
    const result = [];
    for (let i = -1; i < pts.length - 2; i++) {
      const p0 = pts[Math.max(i, 0)];
      const p1 = pts[i + 1];
      const p2 = pts[i + 2];
      const p3 = pts[Math.min(i + 3, pts.length - 1)];

      for (let t = 0; t < 1; t += 1 / resolution) {
        const tt = t * t;
        const ttt = tt * t;

        const q1 = -ttt + 2 * tt - t;
        const q2 = 3 * ttt - 5 * tt + 2;
        const q3 = -3 * ttt + 4 * tt + t;
        const q4 = ttt - tt;

        const x = (q1 * p0.x + q2 * p1.x + q3 * p2.x + q4 * p3.x) / 2;
        const y = (q1 * p0.y + q2 * p1.y + q3 * p2.y + q4 * p3.y) / 2;
        const pressure =
          (q1 * p0.pressure +
            q2 * p1.pressure +
            q3 * p2.pressure +
            q4 * p3.pressure) /
          2;

        result.push({ x, y, pressure });
      }
    }
    result.push(pts[pts.length - 1]);
    return result;
  }

  private drawRibbonWithDash(
    ctx: Konva.Context,
    pts: WeaveStrokePoint[],
    baseW: number,
    color: string | CanvasGradient,
    dash: number[]
  ) {
    if (!pts) return;

    if (pts.length < 2) return;

    const filtered = this.resamplePoints(pts, 2);
    const centerline = this.getSplinePoints(filtered, 8);

    let dashIndex = 0;
    let dashOn = true;
    let dashRemaining = dash.length ? dash[0] : Infinity;

    let leftSide: WeaveStrokePoint[] = [];
    let rightSide: WeaveStrokePoint[] = [];

    for (let i = 0; i < centerline.length - 1; i++) {
      const p0 = centerline[i];
      const p1 = centerline[i + 1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const segLen = Math.hypot(dx, dy) || 1;
      const nx = -dy / segLen;
      const ny = dx / segLen;

      const w0 = (baseW * p0.pressure) / 2;
      const w1 = (baseW * p1.pressure) / 2;

      let traveled = 0;

      while (traveled < segLen) {
        const step = Math.min(dashRemaining, segLen - traveled);
        const t0 = traveled / segLen;
        const t1 = (traveled + step) / segLen;

        const x0 = p0.x + dx * t0;
        const y0 = p0.y + dy * t0;
        const x1 = p0.x + dx * t1;
        const y1 = p0.y + dy * t1;

        const pw0 = w0 + (w1 - w0) * t0;
        const pw1 = w0 + (w1 - w0) * t1;

        if (dashOn) {
          // Add to current dash polygon
          leftSide.push({ x: x0 + nx * pw0, y: y0 + ny * pw0, pressure: 1 });
          rightSide.push({ x: x0 - nx * pw0, y: y0 - ny * pw0, pressure: 1 });

          leftSide.push({ x: x1 + nx * pw1, y: y1 + ny * pw1, pressure: 1 });
          rightSide.push({ x: x1 - nx * pw1, y: y1 - ny * pw1, pressure: 1 });
        }

        dashRemaining -= step;
        if (dashRemaining <= 0) {
          // Fill current dash polygon if it exists
          if (dashOn && leftSide.length && rightSide.length) {
            const smoothLeft = this.getSplinePoints(leftSide, 4);
            const smoothRight = this.getSplinePoints(rightSide.reverse(), 4);

            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.moveTo(smoothLeft[0].x, smoothLeft[0].y);
            for (const p of smoothLeft) ctx.lineTo(p.x, p.y);
            for (const p of smoothRight) ctx.lineTo(p.x, p.y);
            ctx.closePath();
            ctx.fill();
          }

          // Reset for next dash segment
          leftSide = [];
          rightSide = [];

          dashOn = !dashOn;
          dashIndex = (dashIndex + 1) % dash.length;
          dashRemaining = dash[dashIndex];
        }

        traveled += step;
      }
    }

    // Fill the last dash polygon if needed
    if (dashOn && leftSide.length && rightSide.length) {
      const smoothLeft = this.getSplinePoints(leftSide, 4);
      const smoothRight = this.getSplinePoints(rightSide.reverse(), 4);

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.moveTo(smoothLeft[0].x, smoothLeft[0].y);
      for (const p of smoothLeft) ctx.lineTo(p.x, p.y);
      for (const p of smoothRight) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawShape(ctx: Context, shape: Konva.Shape) {
    const strokeElements: WeaveStrokePoint[] = shape.getAttrs().strokeElements;

    if (strokeElements?.length === 0) {
      return;
    }

    const color = shape.getAttrs().stroke ?? 'black';
    const strokeWidth = shape.getAttrs().strokeWidth ?? 1;
    const dash = shape.getAttrs().dash ?? [];

    this.drawRibbonWithDash(ctx, strokeElements, strokeWidth, color, dash);
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const stroke = new Konva.Shape({
      ...props,
      name: 'node',
      sceneFunc: (ctx, shape) => {
        this.drawShape(ctx, shape);
      },
      lineCap: 'round',
      lineJoin: 'round',
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

    stroke.getNodeAnchors = function () {
      return [];
    };

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

  getZoomPlugin() {
    const zoomPlugin =
      this.instance.getPlugin<WeaveStageZoomPlugin>('stageZoom');
    return zoomPlugin;
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
    delete cleanedAttrs.mutexLocked;
    delete cleanedAttrs.mutexUserId;
    delete cleanedAttrs.draggable;
    delete cleanedAttrs.sceneFunc;
    delete cleanedAttrs.hitFunc;
    delete cleanedAttrs.overridesMouseControl;

    return {
      key: attrs.id ?? '',
      type: attrs.nodeType,
      props: {
        ...cleanedAttrs,
        isCloned: undefined,
        isCloneOrigin: undefined,
        id: attrs.id ?? '',
        nodeType: attrs.nodeType,
        children: [],
      },
    };
  }
}
