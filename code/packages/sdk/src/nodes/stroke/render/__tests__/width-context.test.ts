// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import {
  arcLengths,
  headingsAlong,
  mulberry32,
  strokeSeed,
  variationAt,
} from '../width-context';

describe('strokeSeed', () => {
  it('is a fixed function of the id', () => {
    expect(strokeSeed('abc')).toBe(440920331);
    expect(strokeSeed('stroke-1')).toBe(54591995);
  });

  it('is the same for the preview of a finished stroke', () => {
    expect(strokeSeed('abc--preview')).toBe(strokeSeed('abc'));
  });

  it('differs between ids and accepts a missing one', () => {
    expect(strokeSeed('a')).not.toBe(strokeSeed('b'));
    expect(Number.isInteger(strokeSeed(undefined))).toBe(true);
  });
});

describe('mulberry32', () => {
  it('produces the reference sequence', () => {
    const r = mulberry32(1);
    expect([r(), r(), r()]).toEqual([
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522,
    ]);
  });

  it('repeats for the same seed', () => {
    const a = mulberry32(99);
    const b = mulberry32(99);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('variationAt', () => {
  const seed = strokeSeed('stroke-1');

  it('is deterministic and within -1 to 1', () => {
    for (let s = 0; s < 500; s += 3.7) {
      const v = variationAt(seed, s, 10);
      expect(v).toBe(variationAt(seed, s, 10));
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is smooth: a small step changes it a little', () => {
    for (let s = 0; s < 200; s += 0.5) {
      expect(
        Math.abs(variationAt(seed, s + 0.05, 10) - variationAt(seed, s, 10))
      ).toBeLessThan(0.05);
    }
  });

  it('depends on the seed and actually varies', () => {
    const other = strokeSeed('stroke-2');
    const a = [0, 7, 14, 21, 28].map((s) => variationAt(seed, s, 10));
    const b = [0, 7, 14, 21, 28].map((s) => variationAt(other, s, 10));
    expect(a).not.toEqual(b);
    expect(new Set(a).size).toBeGreaterThan(2);
  });

  it('does not depend on anything before the point asked for', () => {
    expect(variationAt(seed, 37, 10)).toBe(variationAt(seed, 37, 10));
  });

  it('treats a negative distance as the start', () => {
    expect(variationAt(seed, -5, 10)).toBe(variationAt(seed, 0, 10));
  });
});

describe('headingsAlong', () => {
  const along = (pts: { x: number; y: number }[]) => arcLengths(pts);
  const row = (n: number, dx: number, dy: number) =>
    Array.from({ length: n }, (_, i) => ({ x: i * dx, y: i * dy }));

  it('reads the direction of a straight path at every point', () => {
    const pts = row(20, 2, 2);
    const h = headingsAlong(pts, along(pts), 10);
    for (const v of h) expect(v).toBeCloseTo(Math.PI / 4, 6);
  });

  it('is 0 for a path going right and pi for one going left', () => {
    const right = row(10, 3, 0);
    expect(headingsAlong(right, along(right), 6).every((h) => h === 0)).toBe(true);
    const left = row(10, -3, 0);
    for (const h of headingsAlong(left, along(left), 6)) {
      expect(Math.abs(h)).toBeCloseTo(Math.PI, 6);
    }
  });

  it('smooths a zig-zag over the window', () => {
    const zig = Array.from({ length: 40 }, (_, i) => ({
      x: i * 4,
      y: i % 2 ? 1 : -1,
    }));
    const h = headingsAlong(zig, along(zig), 24);
    for (const v of h.slice(5, 35)) expect(Math.abs(v)).toBeLessThan(0.1);
  });

  it('handles one point and points that do not move', () => {
    expect(headingsAlong([{ x: 1, y: 1 }], [0], 5)).toEqual([0]);
    const still = [
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 5 },
    ];
    expect(headingsAlong(still, along(still), 5).every(Number.isFinite)).toBe(true);
  });
});
