// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveStrokePoint } from '../types';

/** Position in the space of the stroke node. */
type XY = { x: number; y: number };

/** The eraser at one step of the drag: a segment and a radius, in node space. */
export type WeaveEraserCapsule = {
  a: XY;
  b: XY;
  r: number;
};

/** What the stroke is drawn with: see `WeaveStrokeNode.getRenderedGeometry`. */
export type WeaveEraserStrokeGeometry = {
  centerline: WeaveStrokePoint[];
  halfWidths: number[];
  ends: 'round' | 'flat';
};

/** A stretch of the stroke that survives the eraser. */
export type WeaveEraserRun = {
  points: WeaveStrokePoint[];
  /** Half-width of the drawn stroke at each point. */
  halfWidths: number[];
  /** The run starts at a cut, not at the start of the stroke. */
  startCut: boolean;
  /** The run ends at a cut, not at the end of the stroke. */
  endCut: boolean;
};

export type WeaveEraserCutResult = {
  /** Whether the eraser touches the stroke at all. */
  erased: boolean;
  /** The surviving stretches, in order along the stroke. */
  runs: WeaveEraserRun[];
};

const SEARCH_ITERATIONS = 48;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function pointToSegment(p: XY, a: XY, b: XY): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq
    ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq))
    : 0;
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

const cross = (o: XY, a: XY, b: XY) =>
  (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

function segmentsCross(a: XY, b: XY, c: XY, d: XY): boolean {
  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Distance between two segments; zero when they cross. */
export function segmentToSegment(a: XY, b: XY, c: XY, d: XY): number {
  if (segmentsCross(a, b, c, d)) return 0;
  return Math.min(
    pointToSegment(a, c, d),
    pointToSegment(b, c, d),
    pointToSegment(c, a, b),
    pointToSegment(d, a, b)
  );
}

type Interval = [number, number];

/**
 * How far into the eraser a stretch of the stroke is at a point of one
 * segment: negative where the eraser reaches it. It is convex in `t` along a
 * straight segment, so the erased part of a segment is a single interval.
 *
 * With round ends a piece is closed by a round cap, so the cut must leave
 * room for it: the centerline point has to stay `halfWidth` clear of the
 * eraser. With flat ends a piece is closed square, so what matters is where
 * the eraser touches the drawn cross-section.
 */
function reach(
  p0: WeaveStrokePoint,
  p1: WeaveStrokePoint,
  h0: number,
  h1: number,
  nx: number,
  ny: number,
  flat: boolean,
  cap: WeaveEraserCapsule,
  t: number
): number {
  const x = lerp(p0.x, p1.x, t);
  const y = lerp(p0.y, p1.y, t);
  const h = lerp(h0, h1, t);
  if (flat) {
    return (
      segmentToSegment(
        { x: x - nx * h, y: y - ny * h },
        { x: x + nx * h, y: y + ny * h },
        cap.a,
        cap.b
      ) - cap.r
    );
  }
  return pointToSegment({ x, y }, cap.a, cap.b) - cap.r - h;
}

/** The part of a segment the capsule erases, or null. */
function erasedPart(
  p0: WeaveStrokePoint,
  p1: WeaveStrokePoint,
  h0: number,
  h1: number,
  flat: boolean,
  cap: WeaveEraserCapsule
): Interval | null {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const length = Math.hypot(dx, dy);
  // a zero-length segment has no direction: treat its section as a point
  const useFlat = flat && length > 0;
  const nx = length > 0 ? -dy / length : 0;
  const ny = length > 0 ? dx / length : 0;

  const reachAt = (t: number) => reach(p0, p1, h0, h1, nx, ny, useFlat, cap, t);

  // reject by bounds before searching
  const margin = cap.r + Math.max(h0, h1);
  if (
    Math.max(p0.x, p1.x) + margin < Math.min(cap.a.x, cap.b.x) ||
    Math.min(p0.x, p1.x) - margin > Math.max(cap.a.x, cap.b.x) ||
    Math.max(p0.y, p1.y) + margin < Math.min(cap.a.y, cap.b.y) ||
    Math.min(p0.y, p1.y) - margin > Math.max(cap.a.y, cap.b.y)
  ) {
    return null;
  }

  let lo = 0;
  let hi = 1;
  for (let i = 0; i < SEARCH_ITERATIONS; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (reachAt(m1) < reachAt(m2)) hi = m2;
    else lo = m1;
  }
  const tMin = (lo + hi) / 2;
  if (reachAt(tMin) >= 0) return null;

  let start = 0;
  if (reachAt(0) >= 0) {
    let a = 0;
    let b = tMin;
    for (let i = 0; i < SEARCH_ITERATIONS; i++) {
      const m = (a + b) / 2;
      if (reachAt(m) >= 0) a = m;
      else b = m;
    }
    start = b;
  }

  let end = 1;
  if (reachAt(1) >= 0) {
    let a = tMin;
    let b = 1;
    for (let i = 0; i < SEARCH_ITERATIONS; i++) {
      const m = (a + b) / 2;
      if (reachAt(m) >= 0) b = m;
      else a = m;
    }
    end = a;
  }

  return [start, end];
}

function complement(erased: Interval[]): Interval[] {
  const kept: Interval[] = [];
  let at = 0;
  for (const [s, e] of erased) {
    if (s > at) kept.push([at, s]);
    at = Math.max(at, e);
  }
  if (at < 1) kept.push([at, 1]);
  return kept;
}

const pointAt = (
  p0: WeaveStrokePoint,
  p1: WeaveStrokePoint,
  t: number
): WeaveStrokePoint => ({
  x: lerp(p0.x, p1.x, t),
  y: lerp(p0.y, p1.y, t),
  pressure: lerp(p0.pressure, p1.pressure, t),
});

/** Where a stroke is erased from: see `WeaveStrokeNode.setEraseMask`. */
export type WeaveEraseMask = WeaveEraserCapsule[];

/**
 * What has been worked out of the erase of one stroke, so that a mask that only
 * grows, as an eraser dragged over a stroke does, costs the new capsules and
 * not all of them again at every step.
 */
export type WeaveEraseMemo = {
  centerline: WeaveStrokePoint[];
  halfWidths: number[];
  flat: boolean;
  /** The capsules merged so far, in order. */
  capsules: WeaveEraserCapsule[];
  /** The erased part of each segment, as sorted intervals that do not overlap. */
  erased: Map<number, Interval[]>;
};

export function createEraseMemo(
  geometry: WeaveEraserStrokeGeometry
): WeaveEraseMemo {
  return {
    centerline: geometry.centerline,
    halfWidths: geometry.halfWidths,
    flat: geometry.ends === 'flat',
    capsules: [],
    erased: new Map(),
  };
}

/** Adds an interval to a sorted list of intervals that do not overlap. */
function addInterval(list: Interval[], iv: Interval): Interval[] {
  const out: Interval[] = [];
  let [start, end] = iv;
  let placed = false;
  for (const other of list) {
    if (other[1] < start) {
      out.push(other);
    } else if (other[0] > end) {
      if (!placed) {
        out.push([start, end]);
        placed = true;
      }
      out.push(other);
    } else {
      start = Math.min(start, other[0]);
      end = Math.max(end, other[1]);
    }
  }
  if (!placed) out.push([start, end]);
  return out;
}

/** Whether the memo is for these centerline and widths and capsules that only grew. */
function memoFits(
  memo: WeaveEraseMemo,
  geometry: WeaveEraserStrokeGeometry,
  capsules: WeaveEraserCapsule[]
): boolean {
  if (
    memo.centerline !== geometry.centerline ||
    memo.halfWidths !== geometry.halfWidths ||
    memo.flat !== (geometry.ends === 'flat') ||
    memo.capsules.length > capsules.length
  ) {
    return false;
  }
  for (let i = 0; i < memo.capsules.length; i++) {
    if (memo.capsules[i] !== capsules[i]) return false;
  }
  return true;
}

/** Works out what one more capsule erases of every segment of the stroke. */
function mergeCapsule(memo: WeaveEraseMemo, cap: WeaveEraserCapsule): void {
  const { centerline: pts, halfWidths, flat } = memo;
  for (let i = 0; i < pts.length - 1; i++) {
    const part = erasedPart(
      pts[i],
      pts[i + 1],
      halfWidths[i],
      halfWidths[i + 1],
      flat,
      cap
    );
    if (part) memo.erased.set(i, addInterval(memo.erased.get(i) ?? [], part));
  }
}

/**
 * Cuts a stroke with the eraser: the stretches of its drawn centerline that
 * the capsules do not reach, with the cut points interpolated (pressure
 * included). A stroke that is not touched comes back as one run with no cut.
 *
 * `memo` keeps what was worked out, to be given back with the same stroke and a
 * list of capsules that has only grown. Then only the new capsules are worked
 * out. A memo that does not fit is started again.
 */
export function cutStroke(
  geometry: WeaveEraserStrokeGeometry,
  capsules: WeaveEraserCapsule[],
  memo?: WeaveEraseMemo
): WeaveEraserCutResult {
  const { centerline: pts, halfWidths } = geometry;

  if (pts.length === 0) return { erased: false, runs: [] };

  if (pts.length === 1) {
    // a single point is drawn as a disc whatever the ends
    const hit = capsules.some(
      (c) => pointToSegment(pts[0], c.a, c.b) < c.r + halfWidths[0]
    );
    return hit
      ? { erased: true, runs: [] }
      : {
          erased: false,
          runs: [
            {
              points: [pts[0]],
              halfWidths: [halfWidths[0]],
              startCut: false,
              endCut: false,
            },
          ],
        };
  }

  let state = memo ?? createEraseMemo(geometry);
  if (!memoFits(state, geometry, capsules)) {
    const fresh = createEraseMemo(geometry);
    if (memo) Object.assign(memo, fresh);
    state = memo ?? fresh;
  }
  for (let k = state.capsules.length; k < capsules.length; k++) {
    mergeCapsule(state, capsules[k]);
    state.capsules.push(capsules[k]);
  }

  const runs: WeaveEraserRun[] = [];
  let current: WeaveEraserRun | null = null;
  const last = pts.length - 2;

  for (let i = 0; i <= last; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];

    const kept = complement(state.erased.get(i) ?? []);

    // an open run goes on only if this segment is kept from its very start
    if (current && !(kept.length > 0 && kept[0][0] === 0)) {
      current.endCut = true;
      current = null;
    }

    for (const [ta, tb] of kept) {
      if (!current) {
        current = {
          points: [ta === 0 ? p0 : pointAt(p0, p1, ta)],
          halfWidths: [lerp(halfWidths[i], halfWidths[i + 1], ta)],
          startCut: !(i === 0 && ta === 0),
          endCut: false,
        };
        runs.push(current);
      }
      if (tb === 1) {
        current.points.push(p1);
        current.halfWidths.push(halfWidths[i + 1]);
      } else {
        current.points.push(pointAt(p0, p1, tb));
        current.halfWidths.push(lerp(halfWidths[i], halfWidths[i + 1], tb));
        current.endCut = true;
        current = null;
      }
    }
  }

  return { erased: state.erased.size > 0, runs };
}
