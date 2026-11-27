// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveStrokePoint } from '../types';

type XY = { x: number; y: number };

export type WeaveErasureBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * What a circular eraser took off a stroke over one stretch of a drag, in the
 * space of the stroke node: the area within `radius` of the path through
 * `points`.
 */
export type WeaveStrokeCircleErasure = {
  shape: 'circle';
  radius: number;
  /** The centre of the eraser along the drag, as x, y, x, y, ... */
  points: number[];
};

/**
 * The same for a square eraser: the area a square sweeps as its centre goes
 * through `points`. `axes` are the vectors from the centre to the middle of two
 * neighbouring sides (x and y of one, then x and y of the other), so a square
 * that the node's rotation or scale has turned into a parallelogram is kept as
 * it was.
 */
export type WeaveStrokeSquareErasure = {
  shape: 'square';
  axes: [number, number, number, number];
  points: number[];
};

export type WeaveStrokeErasure =
  | WeaveStrokeCircleErasure
  | WeaveStrokeSquareErasure;

/** One convex piece of the erased area: the sweep of the eraser between two samples. */
export type WeaveErasureHole =
  | { kind: 'capsule'; a: XY; b: XY; r: number; bounds: WeaveErasureBounds }
  | { kind: 'polygon'; points: XY[]; bounds: WeaveErasureBounds };

/** The part of a 2D context that clipping a hole out needs. */
export type WeaveErasureClipContext = {
  beginPath(): void;
  rect(x: number, y: number, w: number, h: number): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(
    x: number,
    y: number,
    r: number,
    a0: number,
    a1: number,
    ccw?: boolean
  ): void;
  closePath(): void;
  clip(fillRule?: 'nonzero' | 'evenodd'): void;
};

const isNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const checked = new WeakSet<object>();

/**
 * The erasures of a stroke as they were saved, without any entry that is not
 * well formed: what another client or an older release saved must never make a
 * stroke fail to draw. Entries that pass are returned as they are.
 */
export function readErasures(raw: unknown): WeaveStrokeErasure[] {
  if (!Array.isArray(raw)) return [];

  const out: WeaveStrokeErasure[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    if (checked.has(item)) {
      out.push(item as WeaveStrokeErasure);
      continue;
    }

    const e = item as Record<string, unknown>;
    const points = e['points'];
    if (
      !Array.isArray(points) ||
      points.length < 2 ||
      points.length % 2 !== 0 ||
      !points.every(isNumber)
    ) {
      continue;
    }

    if (
      e['shape'] === 'circle' &&
      isNumber(e['radius']) &&
      (e['radius'] as number) > 0
    ) {
      checked.add(item);
      out.push(item as WeaveStrokeErasure);
      continue;
    }

    const axes = e['axes'];
    if (
      e['shape'] === 'square' &&
      Array.isArray(axes) &&
      axes.length === 4 &&
      axes.every(isNumber) &&
      axes[0] * axes[3] - axes[1] * axes[2] !== 0
    ) {
      checked.add(item);
      out.push(item as WeaveStrokeErasure);
    }
  }
  return out;
}

const boundsOf = (points: XY[], pad = 0): WeaveErasureBounds => {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const p of points) {
    x1 = Math.min(x1, p.x);
    y1 = Math.min(y1, p.y);
    x2 = Math.max(x2, p.x);
    y2 = Math.max(y2, p.y);
  }
  return {
    x: x1 - pad,
    y: y1 - pad,
    width: x2 - x1 + 2 * pad,
    height: y2 - y1 + 2 * pad,
  };
};

const intersects = (a: WeaveErasureBounds, b: WeaveErasureBounds) =>
  a.x <= b.x + b.width &&
  a.x + a.width >= b.x &&
  a.y <= b.y + b.height &&
  a.y + a.height >= b.y;

const cross = (o: XY, a: XY, b: XY) =>
  (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** Convex hull, counter-clockwise (Andrew's monotone chain). */
function hull(points: XY[]): XY[] {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;

  const lower: XY[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, q) <= 0) {
      lower.pop();
    }
    lower.push(q);
  }
  const upper: XY[] = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, q) <= 0) {
      upper.pop();
    }
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

const holesCache = new WeakMap<
  object,
  { length: number; holes: WeaveErasureHole[] }
>();

/**
 * The convex pieces an erasure is made of, one for each step of the drag (one
 * for a single sample). The result is kept for as long as the erasure is not
 * changed.
 */
export function holesOf(erasure: WeaveStrokeErasure): WeaveErasureHole[] {
  const { points } = erasure;
  const cached = holesCache.get(erasure);
  if (cached && cached.length === points.length) return cached.holes;

  const holes: WeaveErasureHole[] = [];
  const n = points.length / 2;
  const at = (i: number): XY => ({ x: points[2 * i], y: points[2 * i + 1] });

  if (erasure.shape === 'circle') {
    const r = erasure.radius;
    for (let i = n === 1 ? 0 : 1; i < n; i++) {
      const a = at(n === 1 ? 0 : i - 1);
      const b = at(i);
      holes.push({ kind: 'capsule', a, b, r, bounds: boundsOf([a, b], r) });
    }
  } else {
    const [ux, uy, vx, vy] = erasure.axes;
    const corners = (c: XY): XY[] => [
      { x: c.x + ux + vx, y: c.y + uy + vy },
      { x: c.x + ux - vx, y: c.y + uy - vy },
      { x: c.x - ux - vx, y: c.y - uy - vy },
      { x: c.x - ux + vx, y: c.y - uy + vy },
    ];
    for (let i = n === 1 ? 0 : 1; i < n; i++) {
      const pts = hull(
        n === 1 ? corners(at(0)) : [...corners(at(i - 1)), ...corners(at(i))]
      );
      holes.push({ kind: 'polygon', points: pts, bounds: boundsOf(pts) });
    }
  }

  holesCache.set(erasure, { length: points.length, holes });
  return holes;
}

/** The pieces of several erasures, in order. */
export const holesOfAll = (
  erasures: WeaveStrokeErasure[]
): WeaveErasureHole[] => erasures.flatMap(holesOf);

/** Appends the outline of a hole to the current path. */
function pathOf(ctx: WeaveErasureClipContext, hole: WeaveErasureHole): void {
  if (hole.kind === 'polygon') {
    ctx.moveTo(hole.points[0].x, hole.points[0].y);
    for (let i = 1; i < hole.points.length; i++) {
      ctx.lineTo(hole.points[i].x, hole.points[i].y);
    }
    ctx.closePath();
    return;
  }

  const { a, b, r } = hole;
  if (a.x === b.x && a.y === b.y) {
    ctx.moveTo(a.x + r, a.y);
    ctx.arc(a.x, a.y, r, 0, Math.PI * 2, false);
    ctx.closePath();
    return;
  }
  const t = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.moveTo(
    a.x + r * Math.cos(t + Math.PI / 2),
    a.y + r * Math.sin(t + Math.PI / 2)
  );
  ctx.arc(a.x, a.y, r, t + Math.PI / 2, t + (3 * Math.PI) / 2, false);
  ctx.arc(b.x, b.y, r, t - Math.PI / 2, t + Math.PI / 2, false);
  ctx.closePath();
}

/**
 * Narrows the clip of the context to what is outside every hole, so what is
 * drawn next leaves the holes bare, with the edge of the eraser, whatever the
 * holes overlap. Each hole is one clip: an even-odd path of the whole `area`
 * and the hole. The caller saves the context before and restores it after.
 * Holes that do not reach `area` are left out; the result tells whether any
 * was applied.
 */
export function clipOutHoles(
  ctx: WeaveErasureClipContext,
  area: WeaveErasureBounds,
  holes: WeaveErasureHole[]
): boolean {
  let applied = false;
  for (const hole of holes) {
    if (!intersects(hole.bounds, area)) continue;
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.width, area.height);
    pathOf(ctx, hole);
    ctx.clip('evenodd');
    applied = true;
  }
  return applied;
}

const distanceToSegment = (p: XY, a: XY, b: XY) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = dx * dx + dy * dy;
  const t = l
    ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l))
    : 0;
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
};

/** Whether a point is inside a hole. */
export function holeContains(hole: WeaveErasureHole, p: XY): boolean {
  const b = hole.bounds;
  if (p.x < b.x || p.x > b.x + b.width || p.y < b.y || p.y > b.y + b.height) {
    return false;
  }
  if (hole.kind === 'capsule')
    return distanceToSegment(p, hole.a, hole.b) <= hole.r;

  const pts = hole.points;
  for (let i = 0; i < pts.length; i++) {
    if (cross(pts[i], pts[(i + 1) % pts.length], p) < 0) return false;
  }
  return true;
}

/** Distance from a point to a convex polygon, 0 inside it. */
function distanceToPolygon(p: XY, pts: XY[]): number {
  let inside = true;
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (cross(a, b, p) < 0) inside = false;
    best = Math.min(best, distanceToSegment(p, a, b));
  }
  return inside ? 0 : best;
}

export type WeaveVisibleExtent = {
  /** Nothing of the stroke is left to see. */
  empty: boolean;
  /**
   * The box of the centerline that is left, with a step of it on each side: the
   * box of the ink is this one with the width of the stroke added all round. Null
   * when there is nothing left.
   */
  bounds: WeaveErasureBounds | null;
};

/** A place on the centerline, with the width of the stroke there and the direction across it. */
type Slice = { x: number; y: number; h: number; nx: number; ny: number };

/** Most places that are looked at for one stroke, however long it is. */
const MAX_SLICES = 20000;

/**
 * Places along the centerline, no farther apart than `step`, also within a long
 * straight stretch between two points.
 */
function slicesOf(
  geometry: { centerline: WeaveStrokePoint[]; halfWidths: number[] },
  step: number
): Slice[] {
  const { centerline, halfWidths } = geometry;
  const n = centerline.length;
  if (n === 1) {
    return [
      {
        x: centerline[0].x,
        y: centerline[0].y,
        h: halfWidths[0],
        nx: 0,
        ny: 0,
      },
    ];
  }

  let total = 0;
  for (let i = 1; i < n; i++) {
    total += Math.hypot(
      centerline[i].x - centerline[i - 1].x,
      centerline[i].y - centerline[i - 1].y
    );
  }
  const spacing = Math.max(step, total / MAX_SLICES, 1e-9);

  const out: Slice[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = centerline[i];
    const b = centerline[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    const nx = length > 0 ? -dy / length : 0;
    const ny = length > 0 ? dx / length : 0;
    const k = Math.max(1, Math.ceil(length / spacing));
    for (let s = 0; s < k; s++) {
      const t = s / k;
      out.push({
        x: a.x + dx * t,
        y: a.y + dy * t,
        h: halfWidths[i] + (halfWidths[i + 1] - halfWidths[i]) * t,
        nx,
        ny,
      });
    }
  }
  const last = out[out.length - 1];
  const end = centerline[n - 1];
  out.push({
    x: end.x,
    y: end.y,
    h: halfWidths[n - 1],
    nx: last.nx,
    ny: last.ny,
  });
  return out;
}

/**
 * Whether any of the holes reaches the ink of a stroke, as far as its centerline
 * and widths tell: a hole within the half-width of a place on the centerline,
 * and `margin` more so that nothing the holes touch is missed. The centerline is
 * looked at along each stretch, not only at its points, as a long straight
 * stroke has few. A hole that only crosses the box of a stroke does not touch.
 */
export function touchesInk(
  geometry: { centerline: WeaveStrokePoint[]; halfWidths: number[] },
  holes: WeaveErasureHole[],
  margin: number
): boolean {
  if (geometry.centerline.length === 0 || holes.length === 0) return false;

  for (const { x, y, h } of slicesOf(geometry, margin)) {
    const reach = h + margin;
    for (const hole of holes) {
      const b = hole.bounds;
      if (
        x + reach < b.x ||
        x - reach > b.x + b.width ||
        y + reach < b.y ||
        y - reach > b.y + b.height
      ) {
        continue;
      }
      const centre = { x, y };
      const distance =
        hole.kind === 'capsule'
          ? distanceToSegment(centre, hole.a, hole.b) - hole.r
          : distanceToPolygon(centre, hole.points);
      if (distance <= reach) return true;
    }
  }
  return false;
}

/**
 * What is left of a stroke once the holes are out: which places along its
 * centerline still have some of their width showing. A place is given up only
 * when samples across its width, `resolution` apart, are all inside the holes,
 * so the box that comes out is never smaller than what shows.
 */
export function visibleExtent(
  geometry: { centerline: WeaveStrokePoint[]; halfWidths: number[] },
  holes: WeaveErasureHole[],
  resolution: number
): WeaveVisibleExtent {
  if (geometry.centerline.length === 0) return { empty: true, bounds: null };

  const slices = slicesOf(geometry, 2 * resolution);
  const n = slices.length;
  const alive = new Array<boolean>(n).fill(true);

  if (holes.length > 0) {
    const reach = boundsOf(
      holes.flatMap((h) => [
        { x: h.bounds.x, y: h.bounds.y },
        { x: h.bounds.x + h.bounds.width, y: h.bounds.y + h.bounds.height },
      ])
    );

    for (let i = 0; i < n; i++) {
      const { x, y, h, nx, ny } = slices[i];
      if (
        !intersects({ x: x - h, y: y - h, width: 2 * h, height: 2 * h }, reach)
      ) {
        continue;
      }

      const samples: XY[] = [{ x, y }];
      if (nx !== 0 || ny !== 0) {
        const k = Math.max(2, Math.min(64, Math.ceil((2 * h) / resolution)));
        for (let s = 0; s <= k; s++) {
          const t = -1 + (2 * s) / k;
          samples.push({ x: x + nx * h * t, y: y + ny * h * t });
        }
      } else {
        for (let s = 0; s < 8; s++) {
          const a = (s * Math.PI) / 4;
          samples.push({ x: x + h * Math.cos(a), y: y + h * Math.sin(a) });
        }
      }

      alive[i] = samples.some(
        (p) => !holes.some((hole) => holeContains(hole, p))
      );
    }
  }

  if (!alive.some(Boolean)) return { empty: true, bounds: null };

  const visible: XY[] = [];
  for (let i = 0; i < n; i++) {
    if (alive[i] || alive[i - 1] || alive[i + 1]) visible.push(slices[i]);
  }
  return { empty: false, bounds: boundsOf(visible) };
}

/**
 * The path through `points` (x, y, x, y, ...) reduced so that no point of the
 * original is farther than `tolerance` from the reduced one. The first and the
 * last are kept, and a path that never leaves its place is one point.
 */
export function simplifyPoints(points: number[], tolerance: number): number[] {
  const n = points.length / 2;
  if (n <= 2) {
    const stays = n === 2 && points[0] === points[2] && points[1] === points[3];
    return stays ? [points[0], points[1]] : [...points];
  }

  const keep = new Array<boolean>(n).fill(false);
  keep[0] = true;
  keep[n - 1] = true;
  const stack: [number, number][] = [[0, n - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    const a = { x: points[2 * first], y: points[2 * first + 1] };
    const b = { x: points[2 * last], y: points[2 * last + 1] };
    let worst = -1;
    let worstAt = -1;
    for (let i = first + 1; i < last; i++) {
      const d = distanceToSegment(
        { x: points[2 * i], y: points[2 * i + 1] },
        a,
        b
      );
      if (d > worst) {
        worst = d;
        worstAt = i;
      }
    }
    if (worst > tolerance) {
      keep[worstAt] = true;
      stack.push([first, worstAt], [worstAt, last]);
    }
  }

  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!keep[i]) continue;
    // a point where the path stays put, as at a click, is one point
    const same =
      out.length > 0 &&
      out[out.length - 2] === points[2 * i] &&
      out[out.length - 1] === points[2 * i + 1];
    if (!same) out.push(points[2 * i], points[2 * i + 1]);
  }
  return out;
}

/** An erasure with its path reduced to `tolerance` and its numbers rounded. */
export function compactErasure(
  erasure: WeaveStrokeErasure,
  tolerance: number,
  decimals = 3
): WeaveStrokeErasure {
  const k = 10 ** decimals;
  const round = (v: number) => Math.round(v * k) / k;
  const points = simplifyPoints(erasure.points, tolerance).map(round);

  return erasure.shape === 'circle'
    ? { shape: 'circle', radius: round(erasure.radius), points }
    : {
        shape: 'square',
        axes: erasure.axes.map(round) as [number, number, number, number],
        points,
      };
}

/**
 * An erasure after the stroke it belongs to was scaled by `sx` and `sy`, as the
 * points of the stroke are when it is resized. A circle stays a circle, with the
 * mean of the two scales; a square follows exactly.
 */
export function scaleErasure(
  erasure: WeaveStrokeErasure,
  sx: number,
  sy: number
): WeaveStrokeErasure {
  const points = erasure.points.map((v, i) => v * (i % 2 === 0 ? sx : sy));
  if (erasure.shape === 'circle') {
    return {
      shape: 'circle',
      radius: erasure.radius * Math.sqrt(Math.abs(sx * sy)),
      points,
    };
  }
  const [ux, uy, vx, vy] = erasure.axes;
  return {
    shape: 'square',
    axes: [ux * sx, uy * sy, vx * sx, vy * sy],
    points,
  };
}

/** Whether a hole reaches an area. */
export const holeReaches = (
  hole: WeaveErasureHole,
  area: WeaveErasureBounds
): boolean => intersects(hole.bounds, area);
