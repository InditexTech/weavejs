// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/** A point of the centerline with the radius of the stroke there. */
export type RoundPoint = { x: number; y: number; r: number };

/** The part of a 2D context the outline needs. */
export type PathContext = {
  beginPath(): void;
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
  fill(): void;
  fillStyle: string | CanvasGradient | CanvasPattern;
};

/**
 * Drops points that the quads between their neighbours already cover. A point
 * is skipped only while every point skipped since the last kept one stays
 * within a hundredth of the radius of the chord that replaces them, in position
 * and in radius, so a vertex, a turn or a change of width is always kept. A gap
 * is also never wider than two radii. The first and last points are kept.
 */
export function thinRoundPoints(pts: RoundPoint[]): RoundPoint[] {
  if (pts.length <= 2) return pts;

  const out = [pts[0]];
  let anchor = 0;

  for (let i = 2; i < pts.length; i++) {
    const a = pts[anchor];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const chord = Math.hypot(dx, dy);
    // never let a gap grow past two radii, nor a window past 24 points
    let keepPrevious = chord > 2 * Math.min(a.r, b.r) || i - anchor > 24;

    for (let j = anchor + 1; j < i && !keepPrevious; j++) {
      const p = pts[j];
      const t =
        chord > 0
          ? Math.max(
              0,
              Math.min(
                1,
                ((p.x - a.x) * dx + (p.y - a.y) * dy) / (chord * chord)
              )
            )
          : 0;
      const off = Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
      const tolerance = 0.01 * Math.min(a.r, b.r, p.r);
      if (
        off > tolerance ||
        Math.abs(p.r - (a.r + (b.r - a.r) * t)) > tolerance
      ) {
        keepPrevious = true;
      }
    }

    if (keepPrevious) {
      out.push(pts[i - 1]);
      anchor = i - 1;
    }
  }

  out.push(pts[pts.length - 1]);
  return out;
}

/** Largest gap, in screen pixels, a skipped disc may leave on the outer side of a bend. */
const MAX_WEDGE_PX = 0.1;

const angleDiff = (a: number, b: number) => {
  let d = Math.abs(a - b);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
};

/**
 * Which points need their disc. Between two neighbours the tangent quad covers
 * the stroke exactly; a disc only matters where the outline turns, to fill the
 * wedge on the outside of the bend. Where the turn is so slight that the
 * wedge would be thinner than a tenth of a screen pixel the disc is skipped,
 * which removes most arcs of a smooth stroke and makes it far cheaper to fill.
 */
function pointsNeedingDisc(pts: RoundPoint[], scale: number): boolean[] {
  const need = new Array<boolean>(pts.length).fill(false);
  if (pts.length === 0) return need;
  need[0] = true;
  need[pts.length - 1] = true;

  // per segment i (pts[i-1] -> pts[i]): direction, outline lean, and validity
  const dir: number[] = [0];
  const lean: number[] = [0];
  const valid: boolean[] = [false];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[i - 1];
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    const l = Math.hypot(dx, dy);
    const ok = l > Math.abs(p.r - q.r) && l >= 1e-9;
    valid.push(ok);
    dir.push(Math.atan2(dy, dx));
    lean.push(ok ? Math.asin(Math.max(-1, Math.min(1, (q.r - p.r) / l))) : 0);
    if (!ok) {
      need[i] = true;
      need[i - 1] = true;
    }
  }

  for (let i = 1; i < pts.length - 1; i++) {
    if (need[i]) continue;
    if (!valid[i] || !valid[i + 1]) {
      need[i] = true;
      continue;
    }
    const turn =
      angleDiff(dir[i], dir[i + 1]) + Math.abs(lean[i + 1] - lean[i]);
    const radiusPx = Math.max(pts[i].r * scale, 1e-6);
    if (turn > Math.sqrt((8 * MAX_WEDGE_PX) / radiusPx)) need[i] = true;
  }
  return need;
}

/**
 * Appends the outline of a variable-width stroke to the current path: a disc at
 * every point and, between neighbours, the quad bounded by their two external
 * tangents. Every sub-path has the same winding, so a single non-zero fill is
 * the exact union: turns, reversals and ends are round by construction.
 */
export function appendRoundPath(
  ctx: PathContext,
  points: RoundPoint[],
  scale = 1
): void {
  const pts = thinRoundPoints(points);
  const need = pointsNeedingDisc(pts, scale);

  // every sub-path gets the same winding, so one non-zero fill is the union
  const polygon = (v: number[][]) => {
    let area = 0;
    for (let k = 0; k < v.length; k++) {
      const [x1, y1] = v[k];
      const [x2, y2] = v[(k + 1) % v.length];
      area += x1 * y2 - x2 * y1;
    }
    const w = area < 0 ? [...v].reverse() : v;
    ctx.moveTo(w[0][0], w[0][1]);
    for (let k = 1; k < w.length; k++) ctx.lineTo(w[k][0], w[k][1]);
    ctx.closePath();
  };

  // unit vectors from the centres of segment i to its two tangent points
  const tangents = (i: number): { a: number[]; b: number[] } | null => {
    const p = pts[i];
    const q = pts[i - 1];
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    const l = Math.hypot(dx, dy);
    // One disc contains the other: the discs alone already cover the span.
    if (l <= Math.abs(p.r - q.r) || l < 1e-9) return null;
    const ux = dx / l;
    const uy = dy / l;
    const k = (q.r - p.r) / l;
    const s = Math.sqrt(Math.max(0, 1 - k * k));
    return {
      a: [k * ux - s * uy, k * uy + s * ux],
      b: [k * ux + s * uy, k * uy - s * ux],
    };
  };

  // Where the path bends only slightly, neighbouring tangent quads are merged
  // into one polygon whose joints sit on the mitre of the two offsets: exact
  // on the inside of the bend and within a tenth of a pixel on the outside.
  let left: number[][] = [];
  let right: number[][] = [];
  let prev: { a: number[]; b: number[] } | null = null;

  const flush = () => {
    if (left.length >= 2) polygon([...left, ...right.reverse()]);
    left = [];
    right = [];
    prev = null;
  };

  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[i - 1];
    const t = tangents(i);
    if (!t) {
      flush();
      continue;
    }
    if (!prev) {
      left = [[q.x + q.r * t.a[0], q.y + q.r * t.a[1]]];
      right = [[q.x + q.r * t.b[0], q.y + q.r * t.b[1]]];
    } else {
      const mitre = (u: number[], v: number[]) => {
        const sx = u[0] + v[0];
        const sy = u[1] + v[1];
        const d = (sx * sx + sy * sy) / 2;
        return [(sx / d) * q.r, (sy / d) * q.r];
      };
      const ml = mitre(prev.a, t.a);
      const mr = mitre(prev.b, t.b);
      left.push([q.x + ml[0], q.y + ml[1]]);
      right.push([q.x + mr[0], q.y + mr[1]]);
    }
    prev = t;

    const last = i === pts.length - 1;
    const next = last ? null : tangents(i + 1);
    if (last || need[i] || !next) {
      left.push([p.x + p.r * t.a[0], p.y + p.r * t.a[1]]);
      right.push([p.x + p.r * t.b[0], p.y + p.r * t.b[1]]);
      flush();
    }
  }
  flush();

  for (let i = 0; i < pts.length; i++) {
    if (!need[i]) continue;
    const p = pts[i];
    ctx.moveTo(p.x + p.r, p.y);
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, false);
  }
}

/** Splits a centerline into the runs the dash pattern draws. */
export function splitRoundRuns(
  pts: RoundPoint[],
  dash: number[]
): RoundPoint[][] {
  if (!dash.length || dash.every((d) => !(d > 0))) return [pts];

  const runs: RoundPoint[][] = [];
  let index = 0;
  let on = true;
  let remaining = dash[0];
  let current: RoundPoint[] = on ? [pts[0]] : [];

  for (let i = 1; i < pts.length; i++) {
    let a = pts[i - 1];
    const b = pts[i];
    let segment = Math.hypot(b.x - a.x, b.y - a.y);

    while (segment > remaining) {
      const t = remaining / segment;
      const cut: RoundPoint = {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        r: a.r + (b.r - a.r) * t,
      };
      if (on) {
        current.push(cut);
        runs.push(current);
        current = [];
      } else {
        current = [cut];
      }
      on = !on;
      index = (index + 1) % dash.length;
      segment -= remaining;
      remaining = dash[index];
      a = cut;
      if (!(remaining > 0)) remaining = Number.EPSILON;
    }
    remaining -= segment;
    if (on) current.push(b);
  }

  if (on && current.length > 0) runs.push(current);
  return runs.filter((r) => r.length > 0);
}

/**
 * Fills a round outline, once per dash run, so overlaps inside a run never
 * blend twice and a translucent colour stays uniform.
 */
export function drawRoundOutline(
  ctx: PathContext,
  points: RoundPoint[],
  color: string | CanvasGradient,
  dash: number[] = [],
  scale = 1
): void {
  for (const run of splitRoundRuns(points, dash)) {
    ctx.beginPath();
    ctx.fillStyle = color;
    appendRoundPath(ctx, run, scale);
    ctx.fill();
  }
}
