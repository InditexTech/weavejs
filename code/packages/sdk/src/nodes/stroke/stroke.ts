// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import merge from 'lodash/merge';
import Konva from 'konva';
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
import type { Vector2d } from 'konva/lib/types';

export class WeaveStrokeNode extends WeaveNode {
  private readonly config: WeaveStrokeProperties;
  protected nodeType: string = WEAVE_STROKE_NODE_TYPE;

  constructor(params?: WeaveStrokeNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = merge(WEAVE_STROKE_NODE_DEFAULT_CONFIG, config);
  }

  private resamplePoints(pts: WeaveStrokePoint[], spacing: number) {
    if (pts.length < 2) return pts;
    const resampled = [pts[0]];

    for (let i = 1; i < pts.length; i++) {
      let last = resampled[resampled.length - 1];
      const current = pts[i];
      const segDist = this.dist(last, current);

      if (segDist === 0) continue;

      let remaining = segDist;
      while (remaining >= spacing) {
        const t = spacing / segDist;
        const newPt = this.lerpPoint(last, current, t);
        resampled.push(newPt);
        last = newPt;
        remaining = this.dist(last, current);
      }
    }
    return resampled;
  }

  private dist(a: Vector2d, b: Vector2d) {
    const dx = b.x - a.x,
      dy = b.y - a.y;
    return Math.hypot(dx, dy);
  }

  // Interpolate between points
  private lerpPoint(a: WeaveStrokePoint, b: WeaveStrokePoint, t: number) {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      pressure: a.pressure + (b.pressure - a.pressure) * t,
    };
  }

  // Build polygon for a given segment of centerline
  private buildPolygonFromPressure(pts: WeaveStrokePoint[], baseWidth: number) {
    if (pts.length < 2) return [];

    const left = [];
    const right = [];

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const w = (baseWidth + p.pressure * this.config.pressureScale) / 2;

      let dx, dy;
      if (i === 0) {
        dx = pts[1].x - p.x;
        dy = pts[1].y - p.y;
      } else if (i === pts.length - 1) {
        dx = p.x - pts[i - 1].x;
        dy = p.y - pts[i - 1].y;
      } else {
        dx = pts[i + 1].x - pts[i - 1].x;
        dy = pts[i + 1].y - pts[i - 1].y;
      }

      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      left.push({ x: p.x + nx * w, y: p.y + ny * w });
      right.push({ x: p.x - nx * w, y: p.y - ny * w });
    }

    const reversed = right.toReversed();
    return left.concat(reversed);
  }

  // Split into dash segments
  private dashSegments(pts: WeaveStrokePoint[], pattern: number[]) {
    const segments = [];
    let patIndex = 0;
    let patDist = pattern[patIndex];
    let draw = true;
    let segPts = [pts[0]];

    for (let i = 1; i < pts.length; i++) {
      let d = this.dist(pts[i - 1], pts[i]);

      while (d >= patDist) {
        const t = patDist / d;
        const mid = this.lerpPoint(pts[i - 1], pts[i], t);
        segPts.push(mid);

        if (draw) segments.push(segPts);

        draw = !draw;
        patIndex = (patIndex + 1) % pattern.length;
        patDist = pattern[patIndex];

        segPts = [mid];
        d -= patDist;
        pts[i - 1] = mid;
      }
      segPts.push(pts[i]);
      patDist -= d;
    }
    if (draw && segPts.length > 1) {
      segments.push(segPts);
    }
    return segments;
  }

  private catmullRomSpline(pts: WeaveStrokePoint[], spacing: number) {
    const curvePoints = [];

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      for (let t = 0; t < 1; t += spacing) {
        const t2 = t * t;
        const t3 = t2 * t;

        const x =
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

        const y =
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

        const pressure =
          0.5 *
          (2 * p1.pressure +
            (-p0.pressure + p2.pressure) * t +
            (2 * p0.pressure -
              5 * p1.pressure +
              4 * p2.pressure -
              p3.pressure) *
              t2 +
            (-p0.pressure + 3 * p1.pressure - 3 * p2.pressure + p3.pressure) *
              t3);

        curvePoints.push({ x, y, pressure });
      }
    }
    return curvePoints;
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const stroke = new Konva.Shape({
      ...props,
      name: 'node',
      sceneFunc: (ctx, shape) => {
        const strokeElements: WeaveStrokePoint[] =
          shape.getAttrs().strokeElements;

        if (strokeElements.length === 0) {
          return;
        }

        if (strokeElements.length < 2) return;

        const color = shape.getAttrs().stroke ?? 'black';
        const strokeWidth = shape.getAttrs().strokeWidth ?? 1;

        const smoothPoints = this.catmullRomSpline(
          strokeElements,
          this.config.smoothingFactor
        );
        const evenlySpaced = this.resamplePoints(
          smoothPoints,
          this.config.resamplingSpacing
        );
        const dashes = this.dashSegments(
          evenlySpaced,
          shape.getAttrs().dash || []
        );

        dashes.forEach((segment) => {
          const poly = this.buildPolygonFromPressure(segment, strokeWidth);
          if (!poly.length) return;
          ctx.beginPath();
          ctx.moveTo(poly[0].x, poly[0].y);
          for (let i = 1; i < poly.length; i++) {
            ctx.lineTo(poly[i].x, poly[i].y);
          }
          ctx.strokeStyle = color; // dash color
          ctx.lineCap = shape.getAttrs().lineCap ?? 'butt';
          ctx.lineJoin = shape.getAttrs().lineJoin ?? 'miter';
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
        });
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
