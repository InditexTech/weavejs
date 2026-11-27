// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import type { WeaveStrokePoint } from '../../types';
import {
  clipOutHoles,
  compactErasure,
  holeContains,
  holesOf,
  holesOfAll,
  readErasures,
  scaleErasure,
  simplifyPoints,
  touchesInk,
  visibleExtent,
  type WeaveStrokeErasure,
} from '../erasure';

const circle = (
  points: number[],
  radius = 5
): Extract<WeaveStrokeErasure, { shape: 'circle' }> => ({
  shape: 'circle',
  radius,
  points,
});

const square = (
  points: number[],
  axes: [number, number, number, number] = [5, 0, 0, 5]
): Extract<WeaveStrokeErasure, { shape: 'square' }> => ({
  shape: 'square',
  axes,
  points,
});

const line = (x1: number, x2: number, y = 50, step = 1): WeaveStrokePoint[] => {
  const out: WeaveStrokePoint[] = [];
  for (let x = x1; x <= x2; x += step) out.push({ x, y, pressure: 1 });
  return out;
};

const geometry = (centerline: WeaveStrokePoint[], h: number) => ({
  centerline,
  halfWidths: centerline.map(() => h),
});

describe('readErasures', () => {
  it('keeps what is well formed, as it is', () => {
    const c = circle([1, 2, 3, 4]);
    const s = square([1, 2]);
    const read = readErasures([c, s]);
    expect(read).toHaveLength(2);
    expect(read[0]).toBe(c);
    expect(read[1]).toBe(s);
  });

  it.each([
    ['not an array', 'x'],
    ['no entries', undefined],
    ['null entry', [null]],
    ['no points', [{ shape: 'circle', radius: 3, points: [] }]],
    [
      'odd number of coordinates',
      [{ shape: 'circle', radius: 3, points: [1, 2, 3] }],
    ],
    [
      'coordinate not finite',
      [{ shape: 'circle', radius: 3, points: [1, NaN] }],
    ],
    [
      'coordinate not a number',
      [{ shape: 'circle', radius: 3, points: [1, '2'] }],
    ],
    ['radius not positive', [{ shape: 'circle', radius: 0, points: [1, 2] }]],
    ['unknown shape', [{ shape: 'star', radius: 3, points: [1, 2] }]],
    ['square without axes', [{ shape: 'square', points: [1, 2] }]],
    [
      'square with a flat parallelogram',
      [{ shape: 'square', axes: [1, 0, 2, 0], points: [1, 2] }],
    ],
  ])('leaves out an entry that is %s', (_name, raw) => {
    expect(readErasures(raw)).toEqual([]);
  });

  it('keeps the good entries next to a bad one', () => {
    const good = circle([0, 0]);
    expect(readErasures([{ shape: 'circle' }, good])).toEqual([good]);
  });
});

describe('holesOf', () => {
  it('makes a disc of a single sample', () => {
    const [h] = holesOf(circle([10, 20], 4));
    expect(h).toMatchObject({ kind: 'capsule', r: 4 });
    expect(h.kind === 'capsule' && h.a).toEqual({ x: 10, y: 20 });
    expect(h.kind === 'capsule' && h.b).toEqual({ x: 10, y: 20 });
    expect(h.bounds).toEqual({ x: 6, y: 16, width: 8, height: 8 });
  });

  it('makes a capsule of each step of a path', () => {
    const holes = holesOf(circle([0, 0, 10, 0, 10, 10], 2));
    expect(holes).toHaveLength(2);
    expect(holes[1].bounds).toEqual({ x: 8, y: -2, width: 4, height: 14 });
  });

  it('makes the square itself of a single sample', () => {
    const [h] = holesOf(square([10, 10], [3, 0, 0, 3]));
    expect(h.kind).toBe('polygon');
    expect(h.bounds).toEqual({ x: 7, y: 7, width: 6, height: 6 });
    expect(h.kind === 'polygon' && h.points).toHaveLength(4);
  });

  it('sweeps a square along a step into a hexagon', () => {
    const [h] = holesOf(square([0, 0, 10, 4], [3, 0, 0, 3]));
    expect(h.kind === 'polygon' && h.points).toHaveLength(6);
    expect(h.bounds).toEqual({ x: -3, y: -3, width: 16, height: 10 });
    // the swept area is solid between the two positions
    expect(holeContains(h, { x: 5, y: 2 })).toBe(true);
    expect(holeContains(h, { x: 12.9, y: 6.9 })).toBe(true);
    expect(holeContains(h, { x: -2.9, y: -2.9 })).toBe(true);
    // and the corners that no square reaches are not
    expect(holeContains(h, { x: 12.9, y: -2.9 })).toBe(false);
    expect(holeContains(h, { x: -2.9, y: 6.9 })).toBe(false);
  });

  it('follows a square that a node has turned into a parallelogram', () => {
    const [h] = holesOf(square([0, 0], [4, 2, -2, 4]));
    expect(holeContains(h, { x: 0, y: 0 })).toBe(true);
    // a corner of the parallelogram: u + v
    expect(holeContains(h, { x: 1.9, y: 5.9 })).toBe(true);
    // not inside what the axis-aligned box of the same size would hold
    expect(holeContains(h, { x: 5.9, y: 0 })).toBe(false);
  });

  it('keeps the pieces until the erasure grows', () => {
    const e = circle([0, 0, 10, 0]);
    expect(holesOf(e)).toBe(holesOf(e));
    const before = holesOf(e);
    e.points.push(20, 0);
    expect(holesOf(e)).not.toBe(before);
    expect(holesOf(e)).toHaveLength(2);
  });

  it('gives the pieces of several erasures in order', () => {
    expect(holesOfAll([circle([0, 0, 1, 0]), square([5, 5])])).toHaveLength(2);
  });
});

describe('holeContains', () => {
  const [capsule] = holesOf(circle([0, 0, 10, 0], 3));

  it('holds what is within the radius of the path', () => {
    expect(holeContains(capsule, { x: 5, y: 2.9 })).toBe(true);
    expect(holeContains(capsule, { x: -2.9, y: 0 })).toBe(true);
    expect(holeContains(capsule, { x: 5, y: -2.9 })).toBe(true);
  });

  it('leaves out what is beyond', () => {
    expect(holeContains(capsule, { x: 5, y: 3.1 })).toBe(false);
    expect(holeContains(capsule, { x: -3.1, y: 0 })).toBe(false);
    expect(holeContains(capsule, { x: -2.5, y: 2.5 })).toBe(false);
  });
});

describe('clipOutHoles', () => {
  const recorder = () => {
    const calls: string[] = [];
    const ctx = new Proxy(
      {},
      {
        get:
          (_t, name: string) =>
          (...args: unknown[]) =>
            calls.push(name === 'clip' ? `clip:${args[0]}` : name),
      }
    );
    return { ctx: ctx as never, calls };
  };
  const area = { x: 0, y: 0, width: 100, height: 100 };

  it('makes one even-odd clip of the area and the hole for each hole', () => {
    const { ctx, calls } = recorder();
    const applied = clipOutHoles(
      ctx,
      area,
      holesOf(circle([10, 10, 50, 50, 80, 20]))
    );
    expect(applied).toBe(true);
    expect(calls.filter((c) => c === 'clip:evenodd')).toHaveLength(2);
    expect(calls.filter((c) => c === 'rect')).toHaveLength(2);
    expect(calls.filter((c) => c === 'beginPath')).toHaveLength(2);
  });

  it('does not touch the context for holes that do not reach the area', () => {
    const { ctx, calls } = recorder();
    expect(clipOutHoles(ctx, area, holesOf(circle([500, 500, 600, 600])))).toBe(
      false
    );
    expect(calls).toEqual([]);
  });

  it('applies only the holes that reach it', () => {
    const { ctx, calls } = recorder();
    clipOutHoles(ctx, area, holesOfAll([circle([500, 500]), square([20, 20])]));
    expect(calls.filter((c) => c === 'clip:evenodd')).toHaveLength(1);
  });

  it('draws a square as a closed polygon and a disc as an arc', () => {
    const polygon = recorder();
    clipOutHoles(polygon.ctx, area, holesOf(square([50, 50])));
    expect(polygon.calls).toContain('lineTo');
    expect(polygon.calls).not.toContain('arc');

    const disc = recorder();
    clipOutHoles(disc.ctx, area, holesOf(circle([50, 50])));
    expect(disc.calls).toContain('arc');
  });
});

describe('visibleExtent', () => {
  it('is the whole stroke without holes', () => {
    const r = visibleExtent(geometry(line(10, 90), 4), [], 1);
    expect(r.empty).toBe(false);
    expect(r.bounds).toEqual({ x: 10, y: 50, width: 80, height: 0 });
  });

  it('keeps both ends when the middle is erased', () => {
    const holes = holesOf(circle([50, 50], 10));
    const r = visibleExtent(geometry(line(0, 100), 4), holes, 1);
    expect(r.empty).toBe(false);
    expect(r.bounds!.x).toBe(0);
    expect(r.bounds!.x + r.bounds!.width).toBe(100);
  });

  it('shrinks to what is left when an end is erased', () => {
    const holes = holesOf(circle([0, 50, 60, 50], 10));
    const r = visibleExtent(geometry(line(0, 100), 4), holes, 1);
    expect(r.bounds!.x).toBeGreaterThanOrEqual(65);
    expect(r.bounds!.x).toBeLessThanOrEqual(71);
    expect(r.bounds!.x + r.bounds!.width).toBe(100);
  });

  it('looks between the points of a long straight stretch, not only at them', () => {
    const coarse = geometry(
      [
        { x: 0, y: 50, pressure: 1 },
        { x: 100, y: 50, pressure: 1 },
      ],
      4
    );
    const r = visibleExtent(coarse, holesOf(circle([100, 50], 20)), 0.5);
    // what is within 19.6 of the end is given up: width 4 each side of the centerline
    expect(r.bounds!.x).toBe(0);
    expect(r.bounds!.x + r.bounds!.width).toBeGreaterThan(80);
    expect(r.bounds!.x + r.bounds!.width).toBeLessThan(83);
  });

  it('follows the width of the stroke between two points', () => {
    const tapered = {
      centerline: [
        { x: 0, y: 50, pressure: 1 },
        { x: 100, y: 50, pressure: 1 },
      ],
      halfWidths: [2, 14],
    };
    // a disc on the wide end of radius 10 cannot cover the width there
    const wide = visibleExtent(tapered, holesOf(circle([100, 50], 10)), 0.5);
    expect(wide.bounds!.x + wide.bounds!.width).toBe(100);
  });

  it('is empty when every point is covered', () => {
    const holes = holesOf(circle([-20, 50, 120, 50], 10));
    const r = visibleExtent(geometry(line(0, 100), 4), holes, 1);
    expect(r).toEqual({ empty: true, bounds: null });
  });

  it('is not empty while the side of a broad stroke shows', () => {
    // an eraser of radius 3 down the middle of a stroke 20 wide
    const holes = holesOf(circle([-20, 50, 120, 50], 3));
    const r = visibleExtent(geometry(line(0, 100), 10), holes, 1);
    expect(r.empty).toBe(false);
  });

  it('is empty once several passes cover the whole width of a broad stroke', () => {
    const passes = [
      circle([-20, 44, 120, 44], 8),
      circle([-20, 56, 120, 56], 8),
    ];
    const r = visibleExtent(
      geometry(line(0, 100), 10),
      holesOfAll(passes),
      0.5
    );
    expect(r.empty).toBe(true);
  });

  it('does not give up a point with a sliver of width showing', () => {
    // two passes that leave a gap of 2 between them, in a stroke 20 wide
    const passes = [
      circle([-20, 41, 120, 41], 8),
      circle([-20, 59, 120, 59], 8),
    ];
    const r = visibleExtent(
      geometry(line(0, 100), 10),
      holesOfAll(passes),
      0.5
    );
    expect(r.empty).toBe(false);
  });

  it('works for a single point', () => {
    const one = geometry([{ x: 10, y: 10, pressure: 1 }], 5);
    expect(visibleExtent(one, holesOf(circle([10, 10], 20)), 1).empty).toBe(
      true
    );
    expect(visibleExtent(one, holesOf(circle([60, 10], 20)), 1).empty).toBe(
      false
    );
  });

  it('is empty for no points at all', () => {
    expect(visibleExtent({ centerline: [], halfWidths: [] }, [], 1)).toEqual({
      empty: true,
      bounds: null,
    });
  });

  it('treats a square like a circle for what it covers', () => {
    const holes = holesOf(square([-20, 50, 120, 50], [10, 0, 0, 10]));
    expect(visibleExtent(geometry(line(0, 100), 4), holes, 1).empty).toBe(true);
  });
});

describe('touchesInk', () => {
  const g = geometry(line(0, 100), 4);

  it('is true for a hole on the stroke', () => {
    expect(touchesInk(g, holesOf(circle([50, 50], 3)), 0)).toBe(true);
  });

  it('is true for a hole that only reaches the edge of the ink', () => {
    // centre 7 from the centerline, radius 3: its edge is on the edge of the ink, 4 away
    expect(touchesInk(g, holesOf(circle([50, 57], 3.2)), 0)).toBe(true);
  });

  it('is false for a hole past the ink', () => {
    expect(touchesInk(g, holesOf(circle([50, 60], 3)), 0)).toBe(false);
  });

  it('counts the margin', () => {
    const hole = holesOf(circle([50, 60], 3));
    expect(touchesInk(g, hole, 3)).toBe(true);
  });

  it('looks between the points of a long straight stretch, not only at them', () => {
    // a stroke that was simplified when it was drawn has only its two ends
    const sparse = geometry(
      [
        { x: 0, y: 50, pressure: 1 },
        { x: 500, y: 50, pressure: 1 },
      ],
      4
    );
    expect(touchesInk(sparse, holesOf(circle([250, 50], 6)), 1)).toBe(true);
    expect(touchesInk(sparse, holesOf(circle([250, 57], 3.5)), 1)).toBe(true);
    expect(touchesInk(sparse, holesOf(circle([250, 70], 6)), 1)).toBe(false);
  });

  it('is false for a hole in the box of a diagonal stroke that is far from it', () => {
    const diagonal: WeaveStrokePoint[] = [];
    for (let t = 0; t <= 100; t++) diagonal.push({ x: t, y: t, pressure: 1 });
    const corner = holesOf(circle([95, 5], 4));
    expect(touchesInk(geometry(diagonal, 2), corner, 0.5)).toBe(false);
    expect(
      touchesInk(geometry(diagonal, 2), holesOf(circle([50, 52], 4)), 0.5)
    ).toBe(true);
  });

  it('works for a square', () => {
    // spans y 53 to 59; the ink ends at 54
    const near = holesOf(square([50, 56], [3, 0, 0, 3]));
    expect(touchesInk(g, near, 0)).toBe(true);
    const far = holesOf(square([50, 70], [3, 0, 0, 3]));
    expect(touchesInk(g, far, 0)).toBe(false);
    const inside = holesOf(square([50, 50], [1, 0, 0, 1]));
    expect(touchesInk(g, inside, 0)).toBe(true);
  });

  it('is false without holes or points', () => {
    expect(touchesInk(g, [], 1)).toBe(false);
    expect(
      touchesInk({ centerline: [], halfWidths: [] }, holesOf(circle([0, 0])), 1)
    ).toBe(false);
  });
});

describe('simplifyPoints', () => {
  const deviation = (original: number[], reduced: number[]) => {
    let worst = 0;
    for (let i = 0; i < original.length; i += 2) {
      let best = Infinity;
      for (let j = 2; j < reduced.length; j += 2) {
        const ax = reduced[j - 2];
        const ay = reduced[j - 1];
        const bx = reduced[j];
        const by = reduced[j + 1];
        const dx = bx - ax;
        const dy = by - ay;
        const l = dx * dx + dy * dy;
        const t = l
          ? Math.max(
              0,
              Math.min(
                1,
                ((original[i] - ax) * dx + (original[i + 1] - ay) * dy) / l
              )
            )
          : 0;
        best = Math.min(
          best,
          Math.hypot(original[i] - ax - dx * t, original[i + 1] - ay - dy * t)
        );
      }
      worst = Math.max(worst, best);
    }
    return worst;
  };

  it('keeps the ends of a straight run and nothing in between', () => {
    const pts = [0, 0, 1, 0, 2, 0, 3, 0, 4, 0];
    expect(simplifyPoints(pts, 0.01)).toEqual([0, 0, 4, 0]);
  });

  it('keeps a corner', () => {
    const pts = [0, 0, 5, 0, 10, 0, 10, 5, 10, 10];
    expect(simplifyPoints(pts, 0.1)).toEqual([0, 0, 10, 0, 10, 10]);
  });

  it('keeps every point within the tolerance of the reduced path', () => {
    const pts: number[] = [];
    for (let i = 0; i < 300; i++) {
      pts.push(i, 40 * Math.sin(i / 25) + 3 * Math.sin(i / 3));
    }
    for (const tol of [0.1, 0.5, 2]) {
      const reduced = simplifyPoints(pts, tol);
      expect(reduced.length).toBeLessThan(pts.length);
      expect(deviation(pts, reduced)).toBeLessThanOrEqual(tol + 1e-9);
    }
  });

  it('makes one point of a path that never leaves its place', () => {
    expect(simplifyPoints([5, 7, 5, 7], 0.1)).toEqual([5, 7]);
    expect(simplifyPoints([5, 7, 5, 7, 5, 7], 0.1)).toEqual([5, 7]);
  });

  it('leaves one or two points alone', () => {
    expect(simplifyPoints([1, 2], 1)).toEqual([1, 2]);
    expect(simplifyPoints([1, 2, 3, 4], 1)).toEqual([1, 2, 3, 4]);
  });

  it('does not change what it is given', () => {
    const pts = [0, 0, 1, 0, 2, 0];
    simplifyPoints(pts, 1);
    expect(pts).toEqual([0, 0, 1, 0, 2, 0]);
  });
});

describe('compactErasure', () => {
  it('reduces the path and rounds the numbers', () => {
    const e = compactErasure(
      circle([0, 0, 5.00004, 0.00001, 10, 0], 4.123456),
      0.1
    );
    expect(e).toEqual({
      shape: 'circle',
      radius: 4.123,
      points: [0, 0, 10, 0],
    });
  });

  it('keeps the axes of a square', () => {
    const e = compactErasure(
      square([0, 0, 4, 0], [3.00001, 0, 0, 3.00002]),
      0.1
    );
    expect(e).toEqual({
      shape: 'square',
      axes: [3, 0, 0, 3],
      points: [0, 0, 4, 0],
    });
  });
});

describe('compactErasure of a click', () => {
  it('keeps one point', () => {
    expect(compactErasure(circle([10, 20, 10, 20], 4), 0.1)).toEqual({
      shape: 'circle',
      radius: 4,
      points: [10, 20],
    });
    // and one point is a disc
    const [hole] = holesOf(compactErasure(circle([10, 20, 10, 20], 4), 0.1));
    expect(hole).toMatchObject({ kind: 'capsule', r: 4 });
  });
});

describe('scaleErasure', () => {
  it('scales the path and the radius of a circle by the mean scale', () => {
    expect(scaleErasure(circle([2, 3, 4, 6], 5), 2, 8)).toEqual({
      shape: 'circle',
      radius: 20,
      points: [4, 24, 8, 48],
    });
  });

  it('scales a square exactly, along each axis', () => {
    const scaled = scaleErasure(square([10, 10], [3, 1, -1, 3]), 2, 4);
    expect(scaled).toEqual({
      shape: 'square',
      axes: [6, 4, -2, 12],
      points: [20, 40],
    });
  });

  it('keeps a point inside a square inside it after the scale', () => {
    const original = square([10, 10], [3, 1, -1, 3]);
    const [h] = holesOf(original);
    const [g] = holesOf(scaleErasure(original, 2, 4));
    for (const p of [
      { x: 10, y: 10 },
      { x: 12, y: 11 },
      { x: 9, y: 12 },
      { x: 20, y: 20 },
    ]) {
      expect(holeContains(g, { x: p.x * 2, y: p.y * 4 })).toBe(
        holeContains(h, p)
      );
    }
  });
});
