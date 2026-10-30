// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import simplify from 'simplify-js';
import type { WeaveStrokePoint } from '@/nodes/stroke/types';
import type { WeaveBrushFinalizeConfig } from '../types';
import { bezierPoint, fitCurve, type FittedSegment } from './bezier-fit';

/** Size of one screen pixel in canvas units at a zoom level. */
const pixelSize = (zoom: number) =>
  zoom > 0 && Number.isFinite(zoom) ? 1 / zoom : 1;

/**
 * Tolerance applied when a stroke is finished, in canvas units. The legacy
 * value is the tool-level tolerance in canvas units; with the `screen` unit the
 * configured pixels are converted with the zoom in force when the stroke ends,
 * so the same setting gives the same on-screen fidelity at any zoom.
 */
export function resolveFinalizeTolerance(
  cfg: WeaveBrushFinalizeConfig,
  toolTolerance: number,
  zoom = 1
): number {
  const tolerance = cfg.tolerance ?? toolTolerance;
  return cfg.toleranceUnit === 'screen' ? tolerance * pixelSize(zoom) : tolerance;
}

type Segment = { a: WeaveStrokePoint; b: WeaveStrokePoint };

/** Distance from `p` to the segment, and where along it the closest point is. */
function toSegment(p: WeaveStrokePoint, { a, b }: Segment) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq
    ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq))
    : 0;
  return { distance: Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)), t };
}

/**
 * Douglas-Peucker simplification that also keeps pressure detail: a point is
 * kept when it is off the straight path by more than `tolerance`, or when its
 * pressure differs from the pressure interpolated along that path by more than
 * `tolerance / pressureWeight`.
 */
export function simplifyWithPressure(
  points: WeaveStrokePoint[],
  tolerance: number,
  pressureWeight: number
): WeaveStrokePoint[] {
  if (points.length <= 2) return points;

  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let worst = 0;
    let index = -1;

    for (let i = first + 1; i < last; i++) {
      const { distance, t } = toSegment(points[i], {
        a: points[first],
        b: points[last],
      });
      const expected =
        points[first].pressure +
        (points[last].pressure - points[first].pressure) * t;
      const error = Math.max(
        distance,
        Math.abs(points[i].pressure - expected) * pressureWeight
      );
      if (error > worst) {
        worst = error;
        index = i;
      }
    }

    if (worst > tolerance && index !== -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }

  return points.filter((_, i) => keep[i] === 1);
}

/** Pressure at curve parameter `t` of a segment, interpolated between input points. */
function pressureAt(
  seg: FittedSegment,
  points: WeaveStrokePoint[],
  t: number
): number {
  let prev = seg.u[0];
  for (let k = 1; k < seg.u.length; k++) {
    const next = Math.max(seg.u[k], prev);
    if (t <= next || k === seg.u.length - 1) {
      const span = next - prev;
      const f = span > 0 ? Math.min(1, Math.max(0, (t - prev) / span)) : 0;
      const p0 = points[seg.first + k - 1].pressure;
      const p1 = points[seg.first + k].pressure;
      return p0 + (p1 - p0) * f;
    }
    prev = next;
  }
  return points[seg.last].pressure;
}

/**
 * Fits a smooth curve through the stroke and samples it back to points, so the
 * saved format stays `{x, y, pressure}`. `tolerance` is the largest distance
 * between the curve and an input point; `spacing` is the distance between
 * sampled points. Both are in canvas units. The first and last points are kept
 * exactly.
 */
export function fitAndResample(
  points: WeaveStrokePoint[],
  tolerance: number,
  spacing: number
): WeaveStrokePoint[] {
  if (points.length < 3 || !(tolerance > 0)) return points;

  // Consecutive duplicates have no direction; the fit works on distinct points.
  const distinct = points.filter(
    (p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y
  );
  if (distinct.length < 3) return points;

  const segments = fitCurve(distinct, tolerance);
  if (segments.length === 0) return points;

  const out: WeaveStrokePoint[] = [];
  for (const seg of segments) {
    // approximate arc length of the segment
    let arc = 0;
    let prev = seg.bez[0];
    for (let k = 1; k <= 16; k++) {
      const q = bezierPoint(seg.bez, k / 16);
      arc += Math.hypot(q.x - prev.x, q.y - prev.y);
      prev = q;
    }
    const steps = Math.max(1, Math.ceil(arc / Math.max(spacing, 1e-6)));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const q = k === 0 ? seg.bez[0] : bezierPoint(seg.bez, t);
      out.push({ x: q.x, y: q.y, pressure: pressureAt(seg, distinct, t) });
    }
  }

  const end = distinct[distinct.length - 1];
  out.push({ x: end.x, y: end.y, pressure: end.pressure });
  return out;
}

/** Reduces a finished stroke's points as selected by the profile. */
export function finalizePoints(
  points: WeaveStrokePoint[],
  cfg: WeaveBrushFinalizeConfig,
  toolTolerance: number,
  zoom = 1
): WeaveStrokePoint[] {
  const tolerance = resolveFinalizeTolerance(cfg, toolTolerance, zoom);

  switch (cfg.mode) {
    case 'none':
      return points;
    case 'dpPressure':
      return simplifyWithPressure(
        points,
        tolerance,
        cfg.toleranceUnit === 'screen'
          ? cfg.pressureWeight * pixelSize(zoom)
          : cfg.pressureWeight
      );
    case 'bezierFit':
      return fitAndResample(
        points,
        tolerance,
        cfg.resampleSpacingPx * pixelSize(zoom)
      );
    default:
      // simplify-js returns the original point objects, so pressure is preserved.
      return simplify(points, tolerance, true) as WeaveStrokePoint[];
  }
}
