// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import {
  createEraseMemo,
  cutStroke,
  segmentToSegment,
  type WeaveEraserCapsule,
  type WeaveEraserStrokeGeometry,
} from '../erase';

/** A horizontal stroke from x=0 to x=100 with a point every 5 units. */
const stroke = (
  opts: {
    h?: number;
    ends?: 'round' | 'flat';
    pressure?: (x: number) => number;
    y?: number;
  } = {}
): WeaveEraserStrokeGeometry => {
  const { h = 2, ends = 'round', pressure = () => 1, y = 0 } = opts;
  const centerline = Array.from({ length: 21 }, (_, i) => ({
    x: i * 5,
    y,
    pressure: pressure(i * 5),
  }));
  return { centerline, halfWidths: centerline.map(() => h), ends };
};

const capsule = (
  a: [number, number],
  b: [number, number],
  r: number
): WeaveEraserCapsule => ({
  a: { x: a[0], y: a[1] },
  b: { x: b[0], y: b[1] },
  r,
});

const xs = (run: { points: { x: number }[] }) => [
  run.points[0].x,
  run.points.at(-1)!.x,
];

describe('segmentToSegment', () => {
  it('is zero for crossing segments', () => {
    expect(
      segmentToSegment(
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: 10, y: 0 }
      )
    ).toBe(0);
  });

  it('measures parallel segments', () => {
    expect(
      segmentToSegment(
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 2, y: 3 },
        { x: 8, y: 3 }
      )
    ).toBeCloseTo(3);
  });
});

describe('cutStroke', () => {
  it('leaves a stroke the eraser does not reach as one whole run', () => {
    const r = cutStroke(stroke(), [capsule([50, 30], [60, 30], 5)]);
    expect(r.erased).toBe(false);
    expect(r.runs).toHaveLength(1);
    expect(r.runs[0].startCut).toBe(false);
    expect(r.runs[0].endCut).toBe(false);
    expect(r.runs[0].points).toHaveLength(21);
  });

  it('with no capsule leaves the stroke whole', () => {
    const r = cutStroke(stroke(), []);
    expect(r.erased).toBe(false);
    expect(r.runs).toHaveLength(1);
  });

  it('splits a stroke the eraser crosses in two', () => {
    const r = cutStroke(stroke(), [capsule([50, -10], [50, 10], 3)]);
    expect(r.erased).toBe(true);
    expect(r.runs).toHaveLength(2);
    // round ends: the cut keeps radius + half-width (3 + 2) clear
    expect(xs(r.runs[0])[0]).toBe(0);
    expect(xs(r.runs[0])[1]).toBeCloseTo(45, 6);
    expect(xs(r.runs[1])[0]).toBeCloseTo(55, 6);
    expect(xs(r.runs[1])[1]).toBe(100);
    expect(r.runs[0]).toMatchObject({ startCut: false, endCut: true });
    expect(r.runs[1]).toMatchObject({ startCut: true, endCut: false });
  });

  it('does not touch a stroke a hair outside the reach', () => {
    const miss = cutStroke(stroke(), [capsule([50, 5.01], [50, 5.01], 3)]);
    expect(miss.erased).toBe(false);
    const hit = cutStroke(stroke(), [capsule([50, 4.9], [50, 4.9], 3)]);
    expect(hit.erased).toBe(true);
    expect(hit.runs).toHaveLength(2);
  });

  it('removes a stroke the eraser covers completely', () => {
    const r = cutStroke(stroke(), [capsule([-20, 0], [120, 0], 20)]);
    expect(r.erased).toBe(true);
    expect(r.runs).toEqual([]);
  });

  it('trims a stroke whose end is inside the eraser', () => {
    const r = cutStroke(stroke(), [capsule([-3, 0], [-3, 0], 3)]);
    expect(r.runs).toHaveLength(1);
    expect(r.runs[0].startCut).toBe(true);
    expect(r.runs[0].endCut).toBe(false);
    expect(xs(r.runs[0])[0]).toBeCloseTo(2, 6);
    expect(xs(r.runs[0])[1]).toBe(100);
  });

  it('trims the end of a stroke', () => {
    const r = cutStroke(stroke(), [capsule([103, 0], [103, 0], 3)]);
    expect(r.runs).toHaveLength(1);
    expect(r.runs[0].endCut).toBe(true);
    expect(xs(r.runs[0])[1]).toBeCloseTo(98, 6);
  });

  it('cuts a thin stroke crossed by a long, fast capsule', () => {
    const r = cutStroke(stroke({ h: 0.5 }), [
      capsule([50, -1000], [50, 1000], 1),
    ]);
    expect(r.runs).toHaveLength(2);
    expect(xs(r.runs[0])[1]).toBeCloseTo(48.5, 6);
    expect(xs(r.runs[1])[0]).toBeCloseTo(51.5, 6);
  });

  it('makes one gap of capsules that overlap, and two of capsules that do not', () => {
    const touching = cutStroke(stroke(), [
      capsule([30, 0], [30, 0], 3),
      capsule([34, 0], [34, 0], 3),
    ]);
    expect(touching.runs).toHaveLength(2);

    const apart = cutStroke(stroke(), [
      capsule([20, 0], [20, 0], 3),
      capsule([70, 0], [70, 0], 3),
    ]);
    expect(apart.runs).toHaveLength(3);
    expect(apart.runs[1].startCut).toBe(true);
    expect(apart.runs[1].endCut).toBe(true);
  });

  it('finds the cut inside a long segment, not only at its points', () => {
    const geometry: WeaveEraserStrokeGeometry = {
      centerline: [
        { x: 0, y: 0, pressure: 1 },
        { x: 100, y: 0, pressure: 1 },
      ],
      halfWidths: [2, 2],
      ends: 'round',
    };
    const r = cutStroke(geometry, [capsule([50, 0], [50, 0], 3)]);
    expect(r.runs).toHaveLength(2);
    expect(xs(r.runs[0])[1]).toBeCloseTo(45, 6);
    expect(xs(r.runs[1])[0]).toBeCloseTo(55, 6);
  });

  it('interpolates pressure at the cut', () => {
    const r = cutStroke(stroke({ pressure: (x) => x / 100 }), [
      capsule([50, -10], [50, 10], 3),
    ]);
    expect(r.runs[0].points.at(-1)!.pressure).toBeCloseTo(0.45, 6);
    expect(r.runs[1].points[0].pressure).toBeCloseTo(0.55, 6);
  });

  it('interpolates the half-width at the cut', () => {
    const geometry = stroke();
    geometry.halfWidths = geometry.centerline.map((p) => 1 + p.x / 100);
    const r = cutStroke(geometry, [capsule([50, 0], [50, 0], 3)]);
    for (const run of r.runs) {
      expect(run.halfWidths).toHaveLength(run.points.length);
    }
    const cutX = r.runs[0].points.at(-1)!.x;
    expect(r.runs[0].halfWidths.at(-1)).toBeCloseTo(1 + cutX / 100, 6);
  });

  it('follows a half-width that changes along the stroke', () => {
    const geometry = stroke();
    geometry.halfWidths = geometry.centerline.map((p) => 1 + p.x / 10);
    // at x=50 the half-width is about 6, so a capsule 8 above reaches it
    const r = cutStroke(geometry, [capsule([50, 8], [50, 8], 3)]);
    expect(r.erased).toBe(true);
    expect(cutStroke(geometry, [capsule([5, 8], [5, 8], 3)]).erased).toBe(
      false
    );
  });

  it('erases a one-point stroke only when the eraser reaches its disc', () => {
    const dot: WeaveEraserStrokeGeometry = {
      centerline: [{ x: 10, y: 10, pressure: 1 }],
      halfWidths: [4],
      ends: 'round',
    };
    expect(cutStroke(dot, [capsule([10, 16], [10, 16], 3)])).toMatchObject({
      erased: true,
      runs: [],
    });
    const miss = cutStroke(dot, [capsule([10, 20], [10, 20], 3)]);
    expect(miss.erased).toBe(false);
    expect(miss.runs).toHaveLength(1);
  });

  it('copes with repeated points', () => {
    const geometry = stroke();
    geometry.centerline.splice(4, 0, { ...geometry.centerline[3] });
    geometry.halfWidths.splice(4, 0, 2);
    const r = cutStroke(geometry, [capsule([50, 0], [50, 0], 3)]);
    expect(r.runs).toHaveLength(2);
  });
});

describe('round and flat ends', () => {
  const cap = capsule([50, -10], [50, 10], 3);

  it('keeps a round piece end clear of the eraser by its half-width', () => {
    const r = cutStroke(stroke({ h: 4 }), [cap]);
    // the end cap has radius 4: the cut must be 3 + 4 away from the capsule
    expect(xs(r.runs[0])[1]).toBeCloseTo(43, 6);
    expect(xs(r.runs[1])[0]).toBeCloseTo(57, 6);
  });

  it('cuts a flat piece where the eraser touches its drawn section', () => {
    const r = cutStroke(stroke({ h: 4, ends: 'flat' }), [cap]);
    expect(xs(r.runs[0])[1]).toBeCloseTo(47, 6);
    expect(xs(r.runs[1])[0]).toBeCloseTo(53, 6);
  });

  it('does not erase a flat stroke the eraser stops short of', () => {
    // 3.5 past the end of the stroke: the round cap would be reached,
    // a square end is not
    const beyond = capsule([103.5, 0], [103.5, 0], 3);
    expect(cutStroke(stroke({ h: 4, ends: 'round' }), [beyond]).erased).toBe(
      true
    );
    expect(cutStroke(stroke({ h: 4, ends: 'flat' }), [beyond]).erased).toBe(
      false
    );
  });

  it('erases a flat stroke the eraser reaches over the side', () => {
    const side = capsule([50, 6.5], [50, 6.5], 3);
    expect(cutStroke(stroke({ h: 4, ends: 'flat' }), [side]).erased).toBe(true);
    expect(
      cutStroke(stroke({ h: 4, ends: 'flat' }), [
        capsule([50, 7.5], [50, 7.5], 3),
      ]).erased
    ).toBe(false);
  });

  it('does not overlap a round piece end with the erased area', () => {
    const r = cutStroke(stroke({ h: 4 }), [cap]);
    const before = r.runs[0].points.at(-1)!;
    const after = r.runs[1].points[0];
    // distance from each cut point to the eraser disc, minus the cap radius
    expect(Math.abs(before.x - 50) - 3).toBeGreaterThanOrEqual(4 - 1e-6);
    expect(Math.abs(after.x - 50) - 3).toBeGreaterThanOrEqual(4 - 1e-6);
  });
});

describe('cutStroke with a memo', () => {
  /** Pseudo-random numbers that are the same on every run. */
  const random = (seed: number) => () =>
    (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

  const manyCapsules = (count: number, seed = 5): WeaveEraserCapsule[] => {
    const rnd = random(seed);
    let x = 10;
    let y = 0;
    return Array.from({ length: count }, () => {
      const a = { x, y };
      x = Math.max(0, Math.min(100, x + (rnd() - 0.5) * 30));
      y = (rnd() - 0.5) * 12;
      return { a, b: { x, y }, r: 1 + rnd() * 3 };
    });
  };

  it('gives what working everything out again gives, as capsules are added', () => {
    for (const ends of ['round', 'flat'] as const) {
      const geometry = stroke({ ends, h: 3 });
      const capsules = manyCapsules(60);
      const memo = createEraseMemo(geometry);
      for (let k = 1; k <= capsules.length; k++) {
        const so = capsules.slice(0, k);
        expect(cutStroke(geometry, so, memo)).toEqual(cutStroke(geometry, so));
      }
    }
  });

  it('works out only the capsules it has not seen', () => {
    const geometry = stroke({ h: 3 });
    let reads = 0;
    const counted = (cap: WeaveEraserCapsule): WeaveEraserCapsule => ({
      get a() {
        reads++;
        return cap.a;
      },
      b: cap.b,
      r: cap.r,
    });
    const capsules = manyCapsules(40).map(counted);
    const memo = createEraseMemo(geometry);

    cutStroke(geometry, capsules.slice(0, 39), memo);
    const afterFirst = reads;
    expect(afterFirst).toBeGreaterThan(0);

    cutStroke(geometry, capsules, memo);
    // one capsule more costs about what one capsule cost, not 40 of them
    expect(reads - afterFirst).toBeLessThan((afterFirst / 39) * 3);

    const before = reads;
    cutStroke(geometry, capsules, memo);
    expect(reads).toBe(before);
  });

  it('starts again when the stroke is drawn differently', () => {
    const capsules = manyCapsules(20);
    const memo = createEraseMemo(stroke({ h: 3 }));
    cutStroke(stroke({ h: 3 }), capsules, memo);

    const other = stroke({ h: 5 });
    expect(cutStroke(other, capsules, memo)).toEqual(
      cutStroke(other, capsules)
    );
    expect(memo.halfWidths).toBe(other.halfWidths);
  });

  it('starts again when the capsules are not a continuation of the ones it has seen', () => {
    const geometry = stroke({ h: 3 });
    const capsules = manyCapsules(20);
    const memo = createEraseMemo(geometry);
    cutStroke(geometry, capsules, memo);

    const replaced = [...capsules.slice(0, 10), ...manyCapsules(5, 99)];
    expect(cutStroke(geometry, replaced, memo)).toEqual(
      cutStroke(geometry, replaced)
    );

    const fewer = capsules.slice(0, 5);
    expect(cutStroke(geometry, fewer, memo)).toEqual(
      cutStroke(geometry, fewer)
    );
  });

  it('costs the same at every step of a long drag that adds capsules one at a time', () => {
    const geometry: WeaveEraserStrokeGeometry = {
      centerline: Array.from({ length: 1500 }, (_, i) => ({
        x: i * 0.7,
        y: 30 * Math.sin(i / 60),
        pressure: 0.7,
      })),
      halfWidths: new Array(1500).fill(3),
      ends: 'round',
    };
    const memo = createEraseMemo(geometry);
    const capsules: WeaveEraserCapsule[] = [];

    // the work is counted, not timed: how long it takes depends on the machine
    let reads = 0;
    const counted = (cap: WeaveEraserCapsule): WeaveEraserCapsule => ({
      get a() {
        reads++;
        return cap.a;
      },
      b: cap.b,
      r: cap.r,
    });

    const cost: number[] = [];
    for (let k = 0; k < 800; k++) {
      const x =
        40 + ((k * 8) % 700 < 350 ? (k * 8) % 700 : 700 - ((k * 8) % 700));
      capsules.push(
        counted({
          a: { x, y: 30 * Math.sin(k / 3) },
          b: { x: x + 8, y: 30 * Math.sin((k + 1) / 3) },
          r: 12,
        })
      );
      const before = reads;
      cutStroke(geometry, capsules, memo);
      cost.push(reads - before);
    }
    expect(cost[0]).toBeGreaterThan(0);
    // working all of them out again at every step would cost 800 times as much at the last
    expect(cost[799]).toBeLessThan(cost[0] * 3);
    expect(Math.max(...cost)).toBeLessThan(cost[0] * 3);
  });
});
