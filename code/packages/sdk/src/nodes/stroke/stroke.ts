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
import { mergeExceptArrays } from '@/utils/utils';
import { getCentripetalPoints } from './render/curve';
import { halfWidthAt, readStrokeLook } from './render/look';
import { drawRoundOutline } from './render/round-outline';
import type { WeaveStrokeLook } from './types';

export class WeaveStrokeNode extends WeaveNode {
  private readonly config: WeaveStrokeProperties;
  private previewLook: WeaveStrokeLook | null = null;
  protected nodeType: string = WEAVE_STROKE_NODE_TYPE;
  initialize = undefined;

  /**
   * Below this chord deviation (in canvas units) a spline span is treated as
   * straight and emitted as a single edge. Subdividing a straight span costs
   * vertices without changing any pixel.
   */
  private static readonly SPLINE_FLATNESS_EPSILON = 0.08;

  constructor(params?: WeaveStrokeNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = mergeExceptArrays(WEAVE_STROKE_NODE_DEFAULT_CONFIG, config);
  }

  private resamplePoints(
    pts: WeaveStrokePoint[],
    minDist = this.config.resamplingSpacing
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

  /** Perpendicular distance from `p` to the segment `a`-`b`. */
  private distanceToSegment(
    p: WeaveStrokePoint,
    a: WeaveStrokePoint,
    b: WeaveStrokePoint
  ): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    let t = lengthSq ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
  }

  /**
   * Evaluates the uniform Catmull-Rom basis for one 4-point window at `t`.
   */
  private catmullRomAt(
    p0: WeaveStrokePoint,
    p1: WeaveStrokePoint,
    p2: WeaveStrokePoint,
    p3: WeaveStrokePoint,
    t: number
  ): WeaveStrokePoint {
    const tt = t * t;
    const ttt = tt * t;

    const q1 = -ttt + 2 * tt - t;
    const q2 = 3 * ttt - 5 * tt + 2;
    const q3 = -3 * ttt + 4 * tt + t;
    const q4 = ttt - tt;

    return {
      x: (q1 * p0.x + q2 * p1.x + q3 * p2.x + q4 * p3.x) / 2,
      y: (q1 * p0.y + q2 * p1.y + q3 * p2.y + q4 * p3.y) / 2,
      pressure:
        (q1 * p0.pressure +
          q2 * p1.pressure +
          q3 * p2.pressure +
          q4 * p3.pressure) /
        2,
    };
  }

  /**
   * Samples a Catmull-Rom spline through `pts`, subdividing each span by its
   * ARC LENGTH rather than by a fixed step count.
   *
   * A fixed count is the reason a finished stroke looks faceted while the
   * one being drawn looks smooth: both render with the same number of
   * subdivisions per span, but a live stroke's control points sit ~1-2px
   * apart while a finalized stroke's - after Douglas-Peucker simplification
   * - sit a median 9-28px apart. The same 8 subdivisions therefore produce
   * sub-pixel edges live and edges up to ~15px long once finalized, with
   * visible turns between them.
   *
   * `resolution` is now the MINIMUM number of subdivisions for a curved
   * span (so dense, live-drawn spans behave exactly as before); long spans
   * get proportionally more, capped so pathological input cannot explode
   * the vertex count. Spans whose midpoint deviates from their chord by
   * less than `SPLINE_FLATNESS_EPSILON` are effectively straight and are
   * emitted as a single edge - subdividing a straight line adds vertices
   * without changing a pixel.
   */
  private getSplinePoints(
    pts: WeaveStrokePoint[],
    resolution = this.config.splineResolution,
    opts?: {
      targetEdge?: number;
      maxSteps?: number;
      flatness?: number;
      pressure?: 'catmullRom' | 'linear';
    }
  ): WeaveStrokePoint[] {
    if (pts.length < 2) return [...pts];

    const targetEdge = opts?.targetEdge ?? this.config.splineTargetEdge;
    const maxSteps = opts?.maxSteps ?? this.config.splineMaxSteps;
    const flatness = opts?.flatness ?? WeaveStrokeNode.SPLINE_FLATNESS_EPSILON;
    const result: WeaveStrokePoint[] = [];

    for (let i = -1; i < pts.length - 2; i++) {
      const p0 = pts[Math.max(i, 0)];
      const p1 = pts[i + 1];
      const p2 = pts[i + 2];
      const p3 = pts[Math.min(i + 3, pts.length - 1)];

      const chord = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      // Flatness must be probed at several parameters, not just the
      // midpoint: on an S-shaped span the curve crosses its own chord at
      // t=0.5, so a midpoint-only test reports zero deviation for a span
      // that is markedly curved and would collapse it to one long edge.
      let deviation = 0;
      for (const probe of [0.25, 0.5, 0.75]) {
        const at = this.catmullRomAt(p0, p1, p2, p3, probe);
        deviation = Math.max(deviation, this.distanceToSegment(at, p1, p2));
      }

      const steps =
        deviation < flatness
          ? 1
          : Math.min(
              Math.max(Math.ceil(chord / targetEdge), resolution),
              maxSteps
            );

      for (let s = 0; s < steps; s++) {
        const q = this.catmullRomAt(p0, p1, p2, p3, s / steps);
        if (opts?.pressure === 'linear') {
          q.pressure = p1.pressure + (p2.pressure - p1.pressure) * (s / steps);
        }
        result.push(q);
      }
    }
    result.push(pts[pts.length - 1]);
    return result;
  }

  private drawRoundCap(
    ctx: Konva.Context,
    a: WeaveStrokePoint,
    b: WeaveStrokePoint,
    color: string | CanvasGradient
  ) {
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const r = Math.hypot(a.x - b.x, a.y - b.y) / 2;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draws a filled polygon from the accumulated left/right outline points of a
   * dash segment and adds round caps at both ends.
   * NOTE: mutates `rightSide` via Array.reverse() — callers must not reuse it after this call.
   *
   * The outline is NOT re-smoothed here. It used to be, back when the
   * centerline was sampled at a fixed subdivision count and could be coarse;
   * now that the centerline is subdivided by arc length, its offset curves
   * are already smooth, and measurement showed the extra spline pass cost
   * roughly half of the node's total render time while changing the drawn
   * result by well under a pixel (95th-percentile outline edge 1.72px vs
   * 1.76px; byte-identical on long, gently-curved strokes).
   */
  private drawDashPolygon(
    ctx: Konva.Context,
    leftSide: WeaveStrokePoint[],
    rightSide: WeaveStrokePoint[],
    color: string | CanvasGradient,
    mergeCaps = false
  ): void {
    const capStartL = leftSide[0];
    const capStartR = rightSide[0];
    const capEndL = leftSide.at(-1);
    const capEndR = rightSide.at(-1);

    const outlineRight = rightSide.reverse();

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(leftSide[0].x, leftSide[0].y);
    for (const p of leftSide) ctx.lineTo(p.x, p.y);
    for (const p of outlineRight) ctx.lineTo(p.x, p.y);
    ctx.closePath();

    if (mergeCaps) {
      // The round ends join the polygon in the same path, wound the same way,
      // so one fill covers both and a translucent colour is not blended twice.
      const outline = [...leftSide, ...outlineRight];
      let area = 0;
      for (let i = 0; i < outline.length; i++) {
        const a = outline[i];
        const b = outline[(i + 1) % outline.length];
        area += a.x * b.y - b.x * a.y;
      }
      for (const [a, b] of [
        [capStartL, capStartR],
        [capEndL!, capEndR!],
      ]) {
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const r = Math.hypot(a.x - b.x, a.y - b.y) / 2;
        ctx.moveTo(cx + r, cy);
        ctx.arc(cx, cy, r, 0, Math.PI * 2, area < 0);
      }
      ctx.fill();
      return;
    }

    ctx.fill();

    this.drawRoundCap(ctx, capStartL, capStartR, color);
    this.drawRoundCap(ctx, capEndL!, capEndR!, color);
  }

  private drawRibbonWithDash(
    ctx: Konva.Context,
    pts: WeaveStrokePoint[],
    baseW: number,
    color: string | CanvasGradient,
    dash: number[]
  ) {
    if (!pts) return;

    if (pts.length < 2) {
      const pt = pts[0];
      const r = Math.max((baseW * pt.pressure) / 2, 0.5);
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const filtered = this.resamplePoints(pts, this.config.resamplingSpacing);
    const centerline = this.getSplinePoints(
      filtered,
      this.config.splineResolution
    );

    this.drawCenterlineRibbon(
      ctx,
      centerline,
      (_i, p) => Math.max((baseW * p.pressure) / 2, 0.5),
      color,
      dash,
      false
    );
  }

  /**
   * Draws the offset-outline ribbon along an already prepared centerline.
   * `halfWidth` gives the half-width at each centerline point.
   */
  private drawCenterlineRibbon(
    ctx: Konva.Context,
    centerline: WeaveStrokePoint[],
    halfWidth: (index: number, point: WeaveStrokePoint) => number,
    color: string | CanvasGradient,
    dash: number[],
    mergeCaps: boolean
  ) {
    let dashIndex = 0;
    let dashOn = true;
    let dashRemaining = dash.length ? dash[0] : Infinity;

    let leftSide: WeaveStrokePoint[] = [];
    let rightSide: WeaveStrokePoint[] = [];
    // Closing vertices of the run currently being accumulated. Emitting both
    // the start and the end of every sub-step would duplicate each shared
    // joint: twice the vertices, and - because the two copies are offset
    // along different segment normals - a small zig-zag at every joint of
    // the filled outline. Each sub-step therefore contributes only its
    // start, and the pending end is appended once when the run is flushed.
    let pendingEndLeft: WeaveStrokePoint | null = null;
    let pendingEndRight: WeaveStrokePoint | null = null;

    const flushRun = () => {
      if (!dashOn || !leftSide.length || !rightSide.length) return;
      if (pendingEndLeft && pendingEndRight) {
        leftSide.push(pendingEndLeft);
        rightSide.push(pendingEndRight);
      }
      this.drawDashPolygon(ctx, leftSide, rightSide, color, mergeCaps);
    };

    for (let i = 0; i < centerline.length - 1; i++) {
      const p0 = centerline[i];
      const p1 = centerline[i + 1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const segLen = Math.hypot(dx, dy) || 1;
      const nx = -dy / segLen;
      const ny = dx / segLen;

      const w0 = halfWidth(i, p0);
      const w1 = halfWidth(i + 1, p1);

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
          leftSide.push({ x: x0 + nx * pw0, y: y0 + ny * pw0, pressure: 1 });
          rightSide.push({ x: x0 - nx * pw0, y: y0 - ny * pw0, pressure: 1 });
          pendingEndLeft = { x: x1 + nx * pw1, y: y1 + ny * pw1, pressure: 1 };
          pendingEndRight = { x: x1 - nx * pw1, y: y1 - ny * pw1, pressure: 1 };
        }

        dashRemaining -= step;
        if (dashRemaining <= 0) {
          flushRun();

          // Reset for next dash segment
          leftSide = [];
          rightSide = [];
          pendingEndLeft = null;
          pendingEndRight = null;

          dashOn = !dashOn;
          dashIndex = (dashIndex + 1) % dash.length;
          dashRemaining = dash[dashIndex];
        }

        traveled += step;
      }
    }

    // Fill the last dash polygon if needed
    flushRun();
  }

  /**
   * The look a stroke is drawn with: the viewer-side preview if one is on,
   * otherwise the look saved with the stroke. `null` draws the legacy ribbon.
   */
  private resolveLook(shape: Konva.Shape): WeaveStrokeLook | null {
    return this.previewLook ?? readStrokeLook(shape.getAttrs().look);
  }

  /**
   * Draws every stroke of this screen with `look`, without changing any saved
   * stroke and without other users seeing it. `null` turns the preview off.
   */
  setLookPreview(look: unknown | null): void {
    this.previewLook = look === null ? null : readStrokeLook(look);
    this.redrawStrokes();
  }

  getLookPreview(): WeaveStrokeLook | null {
    return this.previewLook;
  }

  private redrawStrokes(): void {
    const stage = this.instance?.getStage?.();
    if (!stage || typeof stage.find !== 'function') return;
    const layers = new Set<Konva.Layer | null>();
    for (const node of stage.find('.node')) {
      if (node.getAttrs().nodeType === WEAVE_STROKE_NODE_TYPE) {
        layers.add(node.getLayer());
      }
    }
    for (const layer of layers) layer?.batchDraw();
  }

  /** Screen pixels per canvas unit at a shape. */
  private screenScale(shape: Konva.Shape): number {
    const scale = shape.getAbsoluteScale?.().x;
    return typeof scale === 'number' && Number.isFinite(scale) && scale > 0
      ? scale
      : 1;
  }

  /**
   * The centerline of a stroke with a look: the points resampled and joined by
   * the look's curve. Spacing and detail are in screen pixels when the look
   * follows the zoom, in canvas units otherwise; `scale` is screen pixels per
   * canvas unit.
   */
  private buildLookCenterline(
    look: WeaveStrokeLook,
    scale: number,
    pts: WeaveStrokePoint[]
  ): WeaveStrokePoint[] {
    const toCanvas = (px: number) => (look.zoomAware ? px / scale : px);
    const edge = toCanvas(look.edgePx);
    const flatness = toCanvas(WeaveStrokeNode.SPLINE_FLATNESS_EPSILON);
    const maxSteps = look.zoomAware
      ? Math.max(this.config.splineMaxSteps, 256)
      : this.config.splineMaxSteps;

    const filtered = this.resamplePoints(pts, toCanvas(look.spacingPx));

    if (look.curve === 'centripetal') {
      return getCentripetalPoints(filtered, {
        edge,
        minSteps: 2,
        maxSteps,
        flatness,
        pressure: look.pressureInterp,
      });
    }
    if (look.curve === 'none') {
      return filtered;
    }
    return this.getSplinePoints(filtered, this.config.splineResolution, {
      targetEdge: edge,
      maxSteps,
      flatness,
      pressure: look.pressureInterp,
    });
  }

  /**
   * Draws a stroke that has a look: the centerline is built with the look's
   * curve, spacing and detail, widths follow its width rule, and the outline is
   * the legacy ribbon or the round one.
   */
  private drawRibbonWithLook(
    ctx: Context,
    shape: Konva.Shape,
    look: WeaveStrokeLook,
    pts: WeaveStrokePoint[],
    baseW: number,
    color: string | CanvasGradient,
    dash: number[]
  ) {
    if (!pts) return;

    if (pts.length < 2) {
      const pt = pts[0];
      const r = halfWidthAt(look, baseW, pt.pressure, Infinity, Infinity);
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const scale = this.screenScale(shape);
    const centerline = this.buildLookCenterline(look, scale, pts);

    // distance along the stroke, in the unit the tapers are given in
    const unit = look.zoomAware ? scale : 1;
    const along: number[] = [0];
    for (let i = 1; i < centerline.length; i++) {
      along.push(
        along[i - 1] +
          Math.hypot(
            centerline[i].x - centerline[i - 1].x,
            centerline[i].y - centerline[i - 1].y
          ) *
            unit
      );
    }
    const total = along[along.length - 1];
    const halfWidth = (i: number, p: WeaveStrokePoint) =>
      halfWidthAt(look, baseW, p.pressure, along[i], total - along[i]);

    if (look.outline === 'legacy') {
      this.drawCenterlineRibbon(
        ctx,
        centerline,
        halfWidth,
        color,
        dash,
        look.caps === 'merged'
      );
      return;
    }

    // `round`, and `freehand` until it has an outline of its own
    drawRoundOutline(
      ctx,
      centerline.map((p, i) => ({ x: p.x, y: p.y, r: halfWidth(i, p) })),
      color,
      dash,
      scale
    );
  }

  private drawShape(ctx: Context, shape: Konva.Shape) {
    const strokeElements: WeaveStrokePoint[] = shape.getAttrs().strokeElements;

    if (strokeElements?.length === 0) {
      return;
    }

    const color = shape.getAttrs().stroke ?? 'black';
    const strokeWidth = shape.getAttrs().strokeWidth ?? 1;
    const dash = shape.getAttrs().dash ?? [];

    const look = this.resolveLook(shape);
    if (look) {
      this.drawRibbonWithLook(
        ctx,
        shape,
        look,
        strokeElements,
        strokeWidth,
        color,
        dash
      );
      return;
    }

    this.drawRibbonWithDash(ctx, strokeElements, strokeWidth, color, dash);
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const stroke = new Konva.Shape({
      ...props,
      name: 'node',
      sceneFunc: (ctx, shape) => {
        this.drawShape(ctx, shape);
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
    delete cleanedAttrs.dragBoundFunc;

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
