// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { getShapeDragBounds } from '../shape-geometry';

describe('getShapeDragBounds', () => {
  it('normalizes a drag from either direction', () => {
    expect(getShapeDragBounds({ x: 100, y: 100 }, { x: 40, y: 70 })).toEqual({
      x: 40,
      y: 70,
      width: 60,
      height: 30,
    });
  });

  it('constrains a drag to a square', () => {
    expect(
      getShapeDragBounds(
        { x: 10, y: 20 },
        { x: 70, y: 60 },
        { constrained: true }
      )
    ).toEqual({ x: 10, y: 20, width: 60, height: 60 });
  });

  it('keeps the drag direction when constraining a reverse drag', () => {
    expect(
      getShapeDragBounds(
        { x: 100, y: 100 },
        { x: 40, y: 70 },
        { constrained: true }
      )
    ).toEqual({ x: 40, y: 40, width: 60, height: 60 });
  });

  it('constrains a drag to a preset aspect ratio', () => {
    expect(
      getShapeDragBounds(
        { x: 10, y: 20 },
        { x: 70, y: 60 },
        { constrained: true, aspectRatio: 2 }
      )
    ).toEqual({ x: 10, y: 20, width: 80, height: 40 });
  });

  it('draws outward from the anchor when centered', () => {
    expect(
      getShapeDragBounds({ x: 50, y: 50 }, { x: 80, y: 70 }, { centered: true })
    ).toEqual({ x: 20, y: 30, width: 60, height: 40 });
  });

  it('keeps unconstrained drag bounds at least one unit in each dimension', () => {
    expect(getShapeDragBounds({ x: 10, y: 20 }, { x: 110, y: 20 })).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 1,
    });
    expect(getShapeDragBounds({ x: 10, y: 20 }, { x: 10, y: 120 })).toEqual({
      x: 10,
      y: 20,
      width: 1,
      height: 100,
    });
  });

  it('keeps the constrained aspect ratio when scaling a tiny drag to the minimum size', () => {
    const bounds = getShapeDragBounds(
      { x: 10, y: 20 },
      { x: 10.2, y: 20.1 },
      { constrained: true, aspectRatio: 2 }
    );

    expect(bounds.width).toBeGreaterThanOrEqual(1);
    expect(bounds.height).toBeGreaterThanOrEqual(1);
    expect(bounds.width / bounds.height).toBeCloseTo(2);
  });

  it('combines centering and proportion constraints', () => {
    expect(
      getShapeDragBounds(
        { x: 50, y: 50 },
        { x: 80, y: 70 },
        { centered: true, constrained: true }
      )
    ).toEqual({ x: 20, y: 20, width: 60, height: 60 });
  });
});
