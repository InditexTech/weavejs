// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Piecewise cubic Bézier fitting of a digitized curve, after Philip J.
 * Schneider, "An Algorithm for Automatically Fitting Digitized Curves"
 * (Graphics Gems, 1990). The result is G1-continuous and stays within a
 * tolerance of the input points.
 */

export type Vec = { x: number; y: number };

export type FittedSegment = {
  /** Control points: start, two handles, end. */
  bez: [Vec, Vec, Vec, Vec];
  /** Index of the first and last input point the segment covers. */
  first: number;
  last: number;
  /** Curve parameter of each covered input point, from 0 to 1. */
  u: number[];
};

const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const length = (a: Vec) => Math.hypot(a.x, a.y);
const normalize = (a: Vec): Vec => {
  const l = length(a);
  return l > 0 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
};

const B0 = (u: number) => (1 - u) ** 3;
const B1 = (u: number) => 3 * u * (1 - u) ** 2;
const B2 = (u: number) => 3 * u * u * (1 - u);
const B3 = (u: number) => u ** 3;

/** Point on a cubic Bézier curve. */
export function bezierPoint(b: [Vec, Vec, Vec, Vec], t: number): Vec {
  return {
    x: B0(t) * b[0].x + B1(t) * b[1].x + B2(t) * b[2].x + B3(t) * b[3].x,
    y: B0(t) * b[0].y + B1(t) * b[1].y + B2(t) * b[2].y + B3(t) * b[3].y,
  };
}

function derivative(b: [Vec, Vec, Vec, Vec], t: number): Vec {
  const q = [sub(b[1], b[0]), sub(b[2], b[1]), sub(b[3], b[2])].map((v) => scale(v, 3));
  const s = 1 - t;
  return {
    x: s * s * q[0].x + 2 * s * t * q[1].x + t * t * q[2].x,
    y: s * s * q[0].y + 2 * s * t * q[1].y + t * t * q[2].y,
  };
}

function secondDerivative(b: [Vec, Vec, Vec, Vec], t: number): Vec {
  const q = [
    add(sub(b[2], scale(b[1], 2)), b[0]),
    add(sub(b[3], scale(b[2], 2)), b[1]),
  ].map((v) => scale(v, 6));
  return {
    x: (1 - t) * q[0].x + t * q[1].x,
    y: (1 - t) * q[0].y + t * q[1].y,
  };
}

/**
 * Direction of the curve at `index`, estimated over a window at least
 * `window` long on each side (but inside `first..last`), so that noise in the
 * nearest samples does not tilt it. With `before` false only the following
 * points are used (a start tangent); with `after` false only the preceding
 * ones (an end tangent). The vector points forward along the stroke.
 */
function windowTangent(
  pts: Vec[],
  index: number,
  first: number,
  last: number,
  window: number,
  before: boolean,
  after: boolean
): Vec {
  let back = index;
  if (before) {
    while (back > first && length(sub(pts[index], pts[back])) < window) back--;
  }
  let ahead = index;
  if (after) {
    while (ahead < last && length(sub(pts[ahead], pts[index])) < window) ahead++;
  }
  return normalize(sub(pts[ahead], pts[back]));
}

function chordLengthParameterize(pts: Vec[], first: number, last: number): number[] {
  const u = [0];
  for (let i = first + 1; i <= last; i++) {
    u.push(u[u.length - 1] + length(sub(pts[i], pts[i - 1])));
  }
  const total = u[u.length - 1] || 1;
  return u.map((v) => v / total);
}

function generateBezier(
  pts: Vec[],
  first: number,
  last: number,
  u: number[],
  tHat1: Vec,
  tHat2: Vec
): [Vec, Vec, Vec, Vec] {
  const p0 = pts[first];
  const p3 = pts[last];

  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  for (let i = 0; i < u.length; i++) {
    const a0 = scale(tHat1, B1(u[i]));
    const a1 = scale(tHat2, B2(u[i]));
    c00 += dot(a0, a0);
    c01 += dot(a0, a1);
    c11 += dot(a1, a1);
    const tmp = sub(
      pts[first + i],
      add(scale(p0, B0(u[i]) + B1(u[i])), scale(p3, B2(u[i]) + B3(u[i])))
    );
    x0 += dot(a0, tmp);
    x1 += dot(a1, tmp);
  }

  const det = c00 * c11 - c01 * c01;
  const alphaL = det === 0 ? 0 : (x0 * c11 - x1 * c01) / det;
  const alphaR = det === 0 ? 0 : (c00 * x1 - c01 * x0) / det;

  const segLength = length(sub(p3, p0));
  const epsilon = 1e-6 * segLength;
  if (alphaL < epsilon || alphaR < epsilon) {
    const d = segLength / 3;
    return [p0, add(p0, scale(tHat1, d)), add(p3, scale(tHat2, d)), p3];
  }
  return [p0, add(p0, scale(tHat1, alphaL)), add(p3, scale(tHat2, alphaR)), p3];
}

function newtonRaphson(b: [Vec, Vec, Vec, Vec], p: Vec, u: number): number {
  const d = sub(bezierPoint(b, u), p);
  const d1 = derivative(b, u);
  const d2 = secondDerivative(b, u);
  const numerator = dot(d, d1);
  const denominator = dot(d1, d1) + dot(d, d2);
  return denominator === 0 ? u : u - numerator / denominator;
}

function maxError(
  pts: Vec[],
  first: number,
  last: number,
  b: [Vec, Vec, Vec, Vec],
  u: number[]
): { error: number; split: number } {
  let split = Math.floor((last - first + 1) / 2) + first;
  let max = 0;
  for (let i = first + 1; i < last; i++) {
    const d = sub(bezierPoint(b, u[i - first]), pts[i]);
    const e = dot(d, d);
    if (e >= max) {
      max = e;
      split = i;
    }
  }
  return { error: max, split };
}

function fitCubic(
  pts: Vec[],
  first: number,
  last: number,
  tHat1: Vec,
  tHat2: Vec,
  errorSq: number,
  window: number,
  out: FittedSegment[]
): void {
  if (last - first === 1) {
    const d = length(sub(pts[last], pts[first])) / 3;
    out.push({
      bez: [
        pts[first],
        add(pts[first], scale(tHat1, d)),
        add(pts[last], scale(tHat2, d)),
        pts[last],
      ],
      first,
      last,
      u: [0, 1],
    });
    return;
  }

  let u = chordLengthParameterize(pts, first, last);
  let bez = generateBezier(pts, first, last, u, tHat1, tHat2);
  let { error, split } = maxError(pts, first, last, bez, u);

  if (error < errorSq) {
    out.push({ bez, first, last, u });
    return;
  }

  if (error < errorSq * 4) {
    for (let i = 0; i < 4; i++) {
      const prime = u.map((v, k) => {
        const p = newtonRaphson(bez, pts[first + k], v);
        return Number.isFinite(p) ? Math.min(Math.max(p, 0), 1) : v;
      });
      bez = generateBezier(pts, first, last, prime, tHat1, tHat2);
      ({ error, split } = maxError(pts, first, last, bez, prime));
      u = prime;
      if (error < errorSq) {
        out.push({ bez, first, last, u });
        return;
      }
    }
  }

  const center = windowTangent(pts, split, first, last, window, true, true);
  const back = scale(center, -1);
  fitCubic(pts, first, split, tHat1, back, errorSq, window, out);
  fitCubic(pts, split, last, center, tHat2, errorSq, window, out);
}

/**
 * Fits cubic Bézier segments to a polyline so that no input point is farther
 * than `tolerance` from the curve. Needs at least two points, none repeated
 * consecutively.
 */
export function fitCurve(points: Vec[], tolerance: number): FittedSegment[] {
  if (points.length < 2) return [];
  const out: FittedSegment[] = [];
  const last = points.length - 1;
  // Tangents are estimated over a few tolerances, wider than the noise the
  // tolerance is meant to absorb, instead of from the two nearest samples.
  const window = tolerance * 3;
  fitCubic(
    points,
    0,
    last,
    windowTangent(points, 0, 0, last, window, false, true),
    scale(windowTangent(points, last, 0, last, window, true, false), -1),
    tolerance * tolerance,
    window,
    out
  );
  return out;
}
