// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveStrokePoint } from '@/nodes/stroke/types';
import type { WeaveBrushFinalizeConfig } from '../types';
import { finalizePoints } from './finalize';

/** A stroke as it is drawn: its centerline and the half-width at each point. */
export type RenderedLine = {
  centerline: WeaveStrokePoint[];
  halfWidths: number[];
};

/** Gives the line a stroke would be drawn with for a set of points. */
export type GeometryOf = (points: WeaveStrokePoint[]) => RenderedLine | null;

/** Segments searched on each side of the last match: both lines run the same way. */
const SEARCH_WINDOW = 24;

/** The most points of a line that are compared, so a long stroke stays cheap. */
const MAX_SAMPLES = 1500;

/**
 * The largest distance from a point of `from` to the line `to`, taking the
 * greater of how far the centerline is and how much the width differs, so both
 * a moved line and a changed width count. The lines run the same way, so the
 * nearest segment is looked for around the one matched last, and the search
 * widens only when the best match is at the edge of what was searched.
 */
function oneWay(
  from: RenderedLine,
  to: RenderedLine,
  fromIsDrawn = true,
  hits?: { at: number; d: number }[],
  threshold = Infinity
): number {
  const a = from.centerline;
  const b = to.centerline;
  if (a.length === 0 || b.length === 0) return 0;

  if (b.length === 1) {
    let worst = 0;
    for (let i = 0; i < a.length; i++) {
      worst = Math.max(
        worst,
        Math.hypot(a[i].x - b[0].x, a[i].y - b[0].y),
        Math.abs(from.halfWidths[i] - to.halfWidths[0])
      );
    }
    return worst;
  }

  const last = b.length - 2;
  const stride = Math.max(1, Math.ceil(a.length / MAX_SAMPLES));
  let worst = 0;
  let at = 0;

  for (let n = 0; n < a.length; n += stride) {
    // always compare the very end
    const i = n + stride >= a.length ? a.length - 1 : n;
    const p = a[i];

    let lo = Math.max(0, at - SEARCH_WINDOW);
    let hi = Math.min(last, at + SEARCH_WINDOW);
    let best = Infinity;
    let bestAt = lo;
    let bestT = 0;

    for (;;) {
      for (let k = lo; k <= hi; k++) {
        const s = b[k];
        const e = b[k + 1];
        const dx = e.x - s.x;
        const dy = e.y - s.y;
        const l = dx * dx + dy * dy;
        const t = l
          ? Math.max(0, Math.min(1, ((p.x - s.x) * dx + (p.y - s.y) * dy) / l))
          : 0;
        const d = Math.hypot(p.x - (s.x + dx * t), p.y - (s.y + dy * t));
        if (d < best) {
          best = d;
          bestAt = k;
          bestT = t;
        }
      }
      const atLow = bestAt === lo && lo > 0;
      const atHigh = bestAt === hi && hi < last;
      if (!atLow && !atHigh) break;
      if (atLow) lo = Math.max(0, lo - 2 * SEARCH_WINDOW);
      if (atHigh) hi = Math.min(last, hi + 2 * SEARCH_WINDOW);
    }

    at = bestAt;
    const width =
      to.halfWidths[bestAt] +
      (to.halfWidths[bestAt + 1] - to.halfWidths[bestAt]) * bestT;
    const here = Math.max(best, Math.abs(from.halfWidths[i] - width));
    worst = Math.max(worst, here);
    // where on the drawn line the two part ways
    if (hits && here > threshold) {
      hits.push({ at: fromIsDrawn ? i : bestAt + bestT, d: here });
    }
    if (i === a.length - 1) break;
  }

  return worst;
}

/**
 * How far apart two drawn strokes are, in canvas units: the largest distance
 * between their centerlines, or between their widths, in either direction.
 */
export function renderedDeviation(a: RenderedLine, b: RenderedLine): number {
  return Math.max(oneWay(a, b), oneWay(b, a));
}

export type FinalizeWithinDeviationInput = {
  /** The points of the stroke as it was drawn. */
  points: WeaveStrokePoint[];
  /** What the finishing step of the profile made of them. */
  candidate: WeaveStrokePoint[];
  finalize: WeaveBrushFinalizeConfig;
  toolTolerance: number;
  /** Zoom of the stage when the stroke ends. */
  zoom: number;
  /** Largest allowed difference, in screen pixels. */
  maxDeviationPx: number;
  geometryOf: GeometryOf;
  /** When to stop, as `performance.now()` gives the time. Defaults to a fixed time after the start. */
  deadline?: number;
};

export type FinalizeWithinDeviationResult = {
  points: WeaveStrokePoint[];
  /** How far the result is from the stroke as drawn, in screen pixels. */
  deviationPx: number;
  /** Whether the result differs from what the finishing step made. */
  tightened: boolean;
};

/** Passes of the refinement; each adds the points where the lines part most. */
const MAX_PASSES = 24;

/** Most places refined in one pass. */
const MAX_PLACES_PER_PASS = 64;

/**
 * Longest the refinement may run, in milliseconds. A stroke that needs more is
 * kept as it was drawn rather than holding up the release of the pointer.
 */
const MAX_REFINE_MS = 80;

/**
 * How far a line may move, as a share of how wide it is drawn. A shift that is
 * a visible part of a hairline is nothing on a broad stroke, so the bound grows
 * with the width, up to `MAX_BOUND_GROWTH` times the bound given.
 */
const WIDTH_SHARE = 0.05;
const MAX_BOUND_GROWTH = 4;

/** Drawn points kept on each side of a place that insertion cannot fix. */
const LOCAL_SPAN = 6;

/** Samples between two places that are told apart: closer ones are one place. */
const PLACE_GAP = 3;

/** The coarse simplification the refinement starts from, in bounds. */
const SEED_TOLERANCE_FACTOR = 4;

/** Length of the polyline through the points, at each point. */
function arcLengths(points: { x: number; y: number }[]): number[] {
  const along = [0];
  for (let i = 1; i < points.length; i++) {
    along.push(
      along[i - 1] +
        Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    );
  }
  return along;
}

/** Index of the last entry of `sorted` that is not above `value`. */
function lastAtMost(sorted: number[], value: number): number {
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (sorted[mid] <= value) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Keeps the stroke that is saved within `maxDeviationPx` of the stroke that was
 * drawn. The result of the finishing step is measured the way strokes are
 * drawn, not point by point: a curve through a few points can bend away from
 * the drawn line between them, or, rarely, overshoot it.
 *
 * When it is too far off the stroke is rebuilt from the drawn points. It starts
 * from a coarse pressure-aware simplification and adds, pass after pass, the
 * drawn point nearest to each place where the saved line is farthest from the
 * drawn one, until none is. Points are added only where the line needs them, so
 * a stroke that is mostly smooth stays small. If that does not match the drawn
 * line, or takes too long, every point is kept.
 */
export function finalizeWithinDeviation({
  points,
  candidate,
  finalize,
  toolTolerance,
  zoom,
  maxDeviationPx,
  geometryOf,
  deadline,
}: FinalizeWithinDeviationInput): FinalizeWithinDeviationResult {
  const unchanged = (deviationPx = 0) => ({
    points: candidate,
    deviationPx,
    tightened: false,
  });

  if (maxDeviationPx <= 0 || Number.isNaN(maxDeviationPx) || points.length < 3)
    return unchanged();

  const started = performance.now();
  const limit = deadline ?? started + MAX_REFINE_MS;
  const scale = zoom > 0 && Number.isFinite(zoom) ? zoom : 1;

  const drawn = geometryOf(points);
  if (!drawn) return unchanged();

  // a hairline may move little, a broad stroke more
  const widths = drawn.halfWidths.map((h) => 2 * h).sort((a, b) => a - b);
  const typicalWidthPx = (widths[Math.floor(widths.length / 2)] ?? 0) * scale;
  const boundPx = Math.max(
    maxDeviationPx,
    Math.min(maxDeviationPx * MAX_BOUND_GROWTH, WIDTH_SHARE * typicalWidthPx)
  );
  const bound = boundPx / scale;

  const first = (() => {
    const line = geometryOf(candidate);
    return line ? renderedDeviation(drawn, line) : Infinity;
  })();
  if (first <= bound) return unchanged(first * scale);

  // where the drawn centerline is, along the drawn points
  const centerArc = arcLengths(drawn.centerline);
  const centerTotal = centerArc.at(-1) || 1;
  const pointArc = arcLengths(points);
  const pointTotal = pointArc.at(-1) || 1;

  const pointAt = (at: number): number => {
    const k = Math.min(centerArc.length - 1, Math.max(0, Math.floor(at)));
    const next = Math.min(centerArc.length - 1, k + 1);
    const arc = centerArc[k] + (centerArc[next] - centerArc[k]) * (at - k);
    return lastAtMost(pointArc, (arc / centerTotal) * pointTotal);
  };

  const last = points.length - 1;
  const seed = finalizePoints(
    points,
    {
      ...finalize,
      mode: 'dpPressure',
      toleranceUnit: 'screen',
      tolerance: boundPx * SEED_TOLERANCE_FACTOR,
    },
    toolTolerance,
    scale
  );
  const where = new Map<WeaveStrokePoint, number>();
  points.forEach((p, i) => where.set(p, i));
  const kept = new Set<number>([0, last]);
  for (const p of seed) {
    const i = where.get(p);
    if (i !== undefined) kept.add(i);
  }

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    if (performance.now() > limit) break;
    const order = [...kept].sort((a, b) => a - b);
    const saved = order.map((i) => points[i]);
    const line = geometryOf(saved);
    if (!line) break;

    const hits: { at: number; d: number }[] = [];
    const deviation = Math.max(
      oneWay(drawn, line, true, hits, bound),
      oneWay(line, drawn, false, hits, bound)
    );
    if (deviation <= bound) {
      return { points: saved, deviationPx: deviation * scale, tightened: true };
    }

    // one place for each stretch where the lines are apart, the worst of it
    hits.sort((a, b) => a.at - b.at);
    const places: { at: number; d: number; lastAt: number }[] = [];
    for (const hit of hits) {
      const previous = places.at(-1);
      if (previous && hit.at - previous.lastAt <= PLACE_GAP) {
        previous.lastAt = hit.at;
        if (hit.d > previous.d) {
          previous.at = hit.at;
          previous.d = hit.d;
        }
      } else {
        places.push({ at: hit.at, d: hit.d, lastAt: hit.at });
      }
    }
    places.sort((a, b) => b.d - a.d);

    let added = 0;
    for (const place of places.slice(0, MAX_PLACES_PER_PASS)) {
      const near = pointAt(place.at);
      const above = order.findIndex((i) => i > near);
      const lo = above > 0 ? order[above - 1] : -1;
      const hi = above > 0 ? order[above] : -1;

      // the drawn point at the place, or the middle of the stretch if it is taken
      if (above > 0 && hi - lo > 1) {
        const pick = near > lo && near < hi ? near : (lo + hi) >> 1;
        if (!kept.has(pick)) {
          kept.add(pick);
          added++;
          continue;
        }
      }

      // The points there are already as close as they come, yet the lines
      // still part: the curve through them bends differently from the drawn
      // one, as at a sharp turn. Keep the drawn points around the place.
      for (
        let i = Math.max(0, near - LOCAL_SPAN);
        i <= Math.min(last, near + LOCAL_SPAN);
        i++
      ) {
        if (!kept.has(i)) {
          kept.add(i);
          added++;
        }
      }
    }
    if (added === 0) break;
  }

  // nothing simpler matches the drawn line, or there is no time to find it
  return { points, deviationPx: 0, tightened: true };
}
