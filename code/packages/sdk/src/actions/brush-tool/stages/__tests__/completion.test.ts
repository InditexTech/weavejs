// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { completionTail, type CompletionPoint } from '../completion';

const distanceToChord = (
  p: CompletionPoint,
  a: CompletionPoint,
  b: CompletionPoint
) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / length;
};

/** The pen goes right along y = 0, then turns up. */
const turning: CompletionPoint[] = [
  { x: 0, y: 0 },
  { x: 5, y: 0 },
  { x: 10, y: 0 },
  { x: 15, y: 0 },
  { x: 20, y: 0 },
  { x: 24, y: 4 },
  { x: 27, y: 9 },
  { x: 29, y: 15 },
];

describe('completionTail', () => {
  it('has nothing to add where the line already ends', () => {
    expect(completionTail({ x: 29, y: 15 }, turning)).toEqual([]);
    expect(completionTail({ x: 1, y: 1 }, [])).toEqual([]);
  });

  it('ends exactly where the pen was lifted', () => {
    const tail = completionTail({ x: 15, y: 0.5 }, turning);
    expect(tail.at(-1)).toEqual({ x: 29, y: 15 });
  });

  it('goes on along the way the pen went, not along a straight segment', () => {
    // the line stopped at x = 15, and the pen went on, turning up
    const tip = { x: 15, y: 0 };
    const tail = completionTail(tip, turning);
    const end = turning.at(-1)!;

    // more than the one segment to the end
    expect(tail.length).toBeGreaterThan(1);
    // and off that segment, where the pen turned
    const off = Math.max(
      ...tail.slice(0, -1).map((p) => distanceToChord(p, tip, end))
    );
    expect(off).toBeGreaterThan(2);
  });

  it('is continuous with the end of the line', () => {
    const tip = { x: 15, y: 0 };
    const [first] = completionTail(tip, turning);
    // the first point is the next sample of the way, not a jump from the line
    expect(Math.hypot(first.x - tip.x, first.y - tip.y)).toBeLessThan(8);
  });

  it('moves the way by what the line is off it, less and less, so the end is exact', () => {
    // the line is 3 px above the way
    const tip = { x: 15, y: 3 };
    const tail = completionTail(tip, turning, { minStep: 0 });
    const way = turning.slice(4); // the samples after the one nearest to the tip
    // off the way by less and less
    const offsets = tail.map((p, i) =>
      Math.hypot(p.x - way[i].x, p.y - way[i].y)
    );
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]).toBeLessThanOrEqual(offsets[i - 1] + 1e-9);
    }
    expect(offsets.at(-1)).toBe(0);
    expect(offsets[0]).toBeGreaterThan(0);
  });

  it('skips samples closer than the step to the one before, and keeps the last', () => {
    const dense = Array.from({ length: 40 }, (_, i) => ({ x: i * 0.25, y: 0 }));
    const tail = completionTail({ x: 0, y: 0 }, dense, { minStep: 1 });
    expect(tail.length).toBeLessThan(dense.length / 2);
    expect(tail.at(-1)).toEqual({ x: 9.75, y: 0 });
    for (let i = 1; i < tail.length - 1; i++) {
      expect(
        Math.hypot(tail[i].x - tail[i - 1].x, tail[i].y - tail[i - 1].y)
      ).toBeGreaterThanOrEqual(1 - 1e-9);
    }
  });

  it('is the straight segment when the pen has not gone on from where the line is', () => {
    // the line is already at the last sample but one is the end
    const tail = completionTail({ x: 29, y: 15.2 }, turning);
    expect(tail).toEqual([{ x: 29, y: 15 }]);
  });

  it('is the straight segment when the trail does not reach back to the line', () => {
    const farTip = { x: -100, y: 0 };
    const tail = completionTail(farTip, turning, { maxOffset: 10 });
    expect(tail).toEqual([{ x: 29, y: 15 }]);
  });

  it('follows the trail from its newest sample when two are as near the line', () => {
    const loop = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 1 },
    ];
    // the pen went round and came back to where the line is: it is there, not at the start of the loop
    const tail = completionTail({ x: 0, y: 0.5 }, loop, { minStep: 0 });
    expect(tail).toEqual([{ x: 0, y: 1 }]);
  });
});
