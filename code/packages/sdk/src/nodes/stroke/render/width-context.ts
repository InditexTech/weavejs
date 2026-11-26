// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Per-point inputs of the width of a stroke that depend on its path and its id
 * rather than on pressure: a variation that is the same for every viewer and
 * the direction of travel. Everything here is a pure function of its input.
 */

/** 32-bit FNV-1a hash of a string, the seed of a stroke's variation. */
export function strokeSeed(id: unknown): number {
  // The preview of a finished stroke is re-keyed with this suffix while the
  // saved node is rendered; both must draw the same variation.
  const text = String(id ?? '').replace(/--preview$/, '');
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a 32-bit generator of numbers in [0, 1) from a seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Value, from -1 to 1, of the lattice point `k` of a seed. */
function lattice(seed: number, k: number): number {
  return mulberry32((seed ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0)() * 2 - 1;
}

/**
 * Smooth variation along a stroke, from -1 to 1: random values at every
 * `wavelength` of arc length, joined with a smoothstep. It depends only on the
 * seed and the arc length `s`, so a viewer, a redraw or a zoom level cannot
 * change it.
 */
export function variationAt(seed: number, s: number, wavelength: number): number {
  const x = Math.max(0, s) / Math.max(wavelength, 1e-6);
  const k = Math.floor(x);
  const f = x - k;
  const t = f * f * (3 - 2 * f);
  const a = lattice(seed, k);
  const b = lattice(seed, k + 1);
  return a + (b - a) * t;
}

type XY = { x: number; y: number };

/** Distance along a polyline at each of its points. */
export function arcLengths(points: XY[]): number[] {
  const along = [0];
  for (let i = 1; i < points.length; i++) {
    along.push(
      along[i - 1] +
        Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    );
  }
  return along;
}

/**
 * Direction of travel at every point, in radians: the direction between the
 * points half of `window` behind and ahead, so the heading follows the path
 * over that distance instead of jittering with every small step.
 */
export function headingsAlong(
  points: XY[],
  along: number[],
  window: number
): number[] {
  const n = points.length;
  const out = new Array<number>(n).fill(0);
  if (n < 2) return out;

  const half = Math.max(window, 1e-6) / 2;
  let back = 0;
  let ahead = 0;
  for (let i = 0; i < n; i++) {
    while (back < i && along[i] - along[back + 1] >= half) back++;
    if (ahead < i) ahead = i;
    while (ahead < n - 1 && along[ahead] - along[i] < half) ahead++;
    let dx = points[ahead].x - points[back].x;
    let dy = points[ahead].y - points[back].y;
    if (dx === 0 && dy === 0) {
      // no movement over the window: keep the heading of the neighbouring step
      const j = Math.min(i + 1, n - 1);
      dx = points[j].x - points[Math.max(j - 1, 0)].x;
      dy = points[j].y - points[Math.max(j - 1, 0)].y;
    }
    out[i] = Math.atan2(dy, dx);
  }
  return out;
}
