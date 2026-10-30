// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveStrokePoint } from '../types';

export type CentripetalOptions = {
  /** Detail, in canvas units: rendered edges stay within a tenth of it of the curve. */
  edge: number;
  /** Fewest subdivisions of a curved span. */
  minSteps: number;
  /** Most subdivisions of one span. */
  maxSteps: number;
  /** Spans that deviate from their chord by less than this are one edge. */
  flatness: number;
  /** How pressure is interpolated between the two points of a span. */
  pressure: 'catmullRom' | 'linear';
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Interval between two knots: the square root of the distance (alpha 0.5). */
const knotStep = (a: WeaveStrokePoint, b: WeaveStrokePoint) =>
  Math.max(Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)), 1e-6);

type Window = {
  p: [WeaveStrokePoint, WeaveStrokePoint, WeaveStrokePoint, WeaveStrokePoint];
  t: [number, number, number, number];
};

/** Barry-Goldman evaluation of the centripetal Catmull-Rom curve at `u` in 0..1 of the middle span. */
function evaluate(w: Window, u: number): WeaveStrokePoint {
  const { p, t } = w;
  const at = lerp(t[1], t[2], u);

  const blend = (channel: 'x' | 'y' | 'pressure') => {
    const a1 = lerp(p[0][channel], p[1][channel], (at - t[0]) / (t[1] - t[0]));
    const a2 = lerp(p[1][channel], p[2][channel], (at - t[1]) / (t[2] - t[1]));
    const a3 = lerp(p[2][channel], p[3][channel], (at - t[2]) / (t[3] - t[2]));
    const b1 = lerp(a1, a2, (at - t[0]) / (t[2] - t[0]));
    const b2 = lerp(a2, a3, (at - t[1]) / (t[3] - t[1]));
    return lerp(b1, b2, (at - t[1]) / (t[2] - t[1]));
  };

  return { x: blend('x'), y: blend('y'), pressure: blend('pressure') };
}

function distanceToSegment(
  p: WeaveStrokePoint,
  a: WeaveStrokePoint,
  b: WeaveStrokePoint
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = dx * dx + dy * dy;
  const t = l
    ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l))
    : 0;
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/**
 * Samples a centripetal Catmull-Rom curve through `pts`.
 *
 * The knot intervals follow the distance between points, so the curve does not
 * overshoot or form cusps when the points are unevenly spaced, which the
 * uniform parametrization does. Pressure is interpolated linearly between the
 * two points of a span, or smoothly but never beyond them, so the width of the
 * stroke cannot exceed the widest of its neighbouring widths.
 */
export function getCentripetalPoints(
  pts: WeaveStrokePoint[],
  opts: CentripetalOptions
): WeaveStrokePoint[] {
  if (pts.length < 2) return [...pts];

  const out: WeaveStrokePoint[] = [];

  for (let i = -1; i < pts.length - 2; i++) {
    const p0 = pts[Math.max(i, 0)];
    const p1 = pts[i + 1];
    const p2 = pts[i + 2];
    const p3 = pts[Math.min(i + 3, pts.length - 1)];

    const t1 = knotStep(p0, p1);
    const t2 = t1 + knotStep(p1, p2);
    const t3 = t2 + knotStep(p2, p3);
    const w: Window = { p: [p0, p1, p2, p3], t: [0, t1, t2, t3] };


    let deviation = 0;
    for (const probe of [0.25, 0.5, 0.75]) {
      deviation = Math.max(
        deviation,
        distanceToSegment(evaluate(w, probe), p1, p2)
      );
    }

    // The curve bends by `deviation` away from its chord, and halving a span
    // quarters that, so the steps that keep every edge within a tenth of the
    // detail length of the curve follow from the square root.
    const tolerance = Math.max(opts.edge * 0.1, 1e-6);
    const steps =
      deviation < opts.flatness
        ? 1
        : Math.min(
            Math.max(
              Math.ceil(Math.sqrt(deviation / tolerance)),
              opts.minSteps
            ),
            opts.maxSteps
          );

    const lo = Math.min(p1.pressure, p2.pressure);
    const hi = Math.max(p1.pressure, p2.pressure);

    for (let s = 0; s < steps; s++) {
      const u = s / steps;
      const q = evaluate(w, u);
      q.pressure =
        opts.pressure === 'linear'
          ? lerp(p1.pressure, p2.pressure, u)
          : Math.min(hi, Math.max(lo, q.pressure));
      out.push(q);
    }
  }

  out.push(pts[pts.length - 1]);
  return out;
}
