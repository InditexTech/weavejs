// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { movePointParallelToLine } from '../utils';

describe('stroke-single / utils — movePointParallelToLine', () => {
  it('1.1 moves a point along a horizontal line (unit vector in x direction)', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    const result = movePointParallelToLine(from, to, from, 10);
    expect(result.x).toBeCloseTo(10);
    expect(result.y).toBeCloseTo(0);
  });

  it('1.2 moves a point along a diagonal line', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 3, y: 4 }; // length = 5
    const result = movePointParallelToLine(from, to, from, 5);
    expect(result.x).toBeCloseTo(3); // ux = 3/5, distance = 5
    expect(result.y).toBeCloseTo(4); // uy = 4/5, distance = 5
  });

  it('1.3 throws when fromPoint equals toPoint (zero-length line)', () => {
    expect(() =>
      movePointParallelToLine({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 0, y: 0 }, 1)
    ).toThrow('Defined line length is zero');
  });
});
