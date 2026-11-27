// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import type Konva from 'konva';
import { WEAVE_STROKE_LEGACY_LOOK } from '../constants';
import type { WeaveStrokeLook } from '../types';
import type { WeaveStrokeErasure } from '../render/erasure';
import {
  densify,
  makeNode,
  recordDrawCalls,
  renderStroke,
  type Rendered,
  type StrokeAttrs,
} from './shared/stroke-render.helpers';

const W = 16;
const line = densify(
  [
    { x: 40, y: 60 },
    { x: 160, y: 60 },
  ],
  2,
  1
);

const disc = (x: number, y: number, radius: number): WeaveStrokeErasure => ({
  shape: 'circle',
  radius,
  points: [x, y],
});

const square = (x: number, y: number, half: number): WeaveStrokeErasure => ({
  shape: 'square',
  axes: [half, 0, 0, half],
  points: [x, y],
});

const looks: Record<string, WeaveStrokeLook | undefined> = {
  'no look': undefined,
  'legacy outline': { ...WEAVE_STROKE_LEGACY_LOOK, caps: 'merged' },
  'round outline': { ...WEAVE_STROKE_LEGACY_LOOK, outline: 'round' },
  'flat round outline': {
    ...WEAVE_STROKE_LEGACY_LOOK,
    outline: 'round',
    ends: 'flat',
  },
};

const attrs = (
  look: WeaveStrokeLook | undefined,
  extra: Partial<StrokeAttrs> = {}
): StrokeAttrs => ({
  strokeElements: line,
  strokeWidth: W,
  stroke: '#000000ff',
  ...(look ? { look } : {}),
  ...extra,
});

/** Every pixel that differs between two renderings, outside a circle. */
const differencesOutside = (
  a: Rendered,
  b: Rendered,
  centre: { x: number; y: number },
  radius: number
) => {
  let differing = 0;
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      if (Math.hypot(x + 0.5 - centre.x, y + 0.5 - centre.y) <= radius)
        continue;
      if (a.alpha(x, y) !== b.alpha(x, y)) differing++;
    }
  }
  return differing;
};

describe.each(Object.entries(looks))('erasures, %s', (_name, look) => {
  it('does not draw what an erasure covers and draws the rest', () => {
    const r = renderStroke(attrs(look, { erasures: [disc(100, 60, 6)] }));
    expect(r.covered(100, 60)).toBe(false);
    expect(r.covered(100, 57)).toBe(false);
    expect(r.covered(60, 60)).toBe(true);
    expect(r.covered(140, 60)).toBe(true);
    // a bite out of the middle leaves the ink around it
    expect(r.covered(100, 52.5)).toBe(true);
    expect(r.covered(100, 67.5)).toBe(true);
  });

  it('draws the stroke in full again without erasures', () => {
    const r = renderStroke(attrs(look, { erasures: undefined }));
    expect(r.covered(100, 60)).toBe(true);
  });

  it('cuts along the edge of a circle, with the corners of the ink left as they are', () => {
    // the eraser is wider than the stroke: the edge of the cut is an arc
    const r = renderStroke(attrs(look, { erasures: [disc(100, 60, 12)] }));
    // where the arc is 13.7 from the centre: ink
    expect(r.covered(88.5, 52.5)).toBe(true);
    expect(r.covered(88.5, 67.5)).toBe(true);
    // 11 from it, 9.9: erased
    expect(r.covered(93, 53)).toBe(false);
    expect(r.covered(93, 67)).toBe(false);
    expect(r.covered(90, 60)).toBe(false);
    // and at the middle of the line the ink reaches the arc
    expect(r.covered(86.5, 60)).toBe(true);
  });

  it('cuts along the sides of a square', () => {
    const r = renderStroke(attrs(look, { erasures: [square(100, 60, 12)] }));
    // the edge is straight: the same at the middle and at the corners of the ink
    for (const y of [52.5, 56, 60, 64, 67.5]) {
      expect(r.covered(86.5, y)).toBe(true);
      expect(r.covered(89.5, y)).toBe(false);
      expect(r.covered(110.5, y)).toBe(false);
      expect(r.covered(113.5, y)).toBe(true);
    }
  });

  it('follows the path the eraser took', () => {
    const swept: WeaveStrokeErasure = {
      shape: 'circle',
      radius: 12,
      points: [70, 60, 130, 60],
    };
    const r = renderStroke(attrs(look, { erasures: [swept] }));
    for (const x of [75, 100, 125]) expect(r.covered(x, 60)).toBe(false);
    expect(r.covered(55, 60)).toBe(true);
    expect(r.covered(145, 60)).toBe(true);
  });

  it('applies what was saved and what is still being dragged', () => {
    const r = renderStroke(
      attrs(look, {
        erasures: [disc(60, 60, 12)],
        eraseMask: [disc(140, 60, 12)],
      })
    );
    expect(r.covered(60, 60)).toBe(false);
    expect(r.covered(140, 60)).toBe(false);
    expect(r.covered(100, 60)).toBe(true);
  });

  it('draws exactly as before when no erasure reaches the stroke', () => {
    expect(
      recordDrawCalls(attrs(look, { erasures: [disc(100, 5, 3)] }))
    ).toEqual(recordDrawCalls(attrs(look)));
  });

  it('draws the stroke in full when the erasures are not well formed', () => {
    const bad = [
      { shape: 'circle' },
      'x',
      null,
      { shape: 'square', points: [1] },
    ];
    expect(recordDrawCalls(attrs(look, { erasures: bad }))).toEqual(
      recordDrawCalls(attrs(look))
    );
  });

  it.each([
    ['opaque', '#000000ff'],
    ['translucent', '#00000080'],
  ])(
    'leaves everything else exactly as it was, with a %s colour',
    (_colour, stroke) => {
      const plain = renderStroke(attrs(look, { stroke }));
      const erased = renderStroke(
        attrs(look, { stroke, erasures: [disc(100, 60, 10)] })
      );
      // not one pixel outside the eraser, the edge of the cut included, differs
      expect(differencesOutside(erased, plain, { x: 100, y: 60 }, 11)).toBe(0);
    }
  );

  it('leaves everything else exactly as it was, for a square', () => {
    const plain = renderStroke(attrs(look));
    const erased = renderStroke(
      attrs(look, { erasures: [square(100, 60, 10)] })
    );
    let differing = 0;
    for (let y = 0; y < plain.height; y++) {
      for (let x = 0; x < plain.width; x++) {
        const inside =
          Math.abs(x + 0.5 - 100) <= 11 && Math.abs(y + 0.5 - 60) <= 11;
        if (!inside && plain.alpha(x, y) !== erased.alpha(x, y)) differing++;
      }
    }
    expect(differing).toBe(0);
  });
});

describe('erasures at a zoom', () => {
  it.each([0.5, 2])('cut the same way at a scale of %s', (scale) => {
    const r = renderStroke(
      attrs(looks['round outline'], { erasures: [disc(100, 60, 12)] }),
      { scale }
    );
    expect(r.covered(88.5, 52.5)).toBe(true);
    expect(r.covered(93, 53)).toBe(false);
  });
});

describe('what is left to see of a stroke', () => {
  const shapeOf = (a: StrokeAttrs) =>
    ({
      getAttrs: () => a,
      getAbsoluteScale: () => ({ x: 1, y: 1 }),
    } as unknown as Konva.Node);

  it('is the box of the centerline when nothing is erased', () => {
    const extent = makeNode().getVisibleExtent(shapeOf(attrs(undefined)));
    expect(extent!.empty).toBe(false);
    expect(extent!.bounds!.x).toBeCloseTo(40, 6);
    expect(extent!.bounds!.x + extent!.bounds!.width).toBeCloseTo(160, 6);
  });

  it('follows what is erased', () => {
    const a = attrs(undefined, { erasures: [disc(40, 60, 30)] });
    const extent = makeNode().getVisibleExtent(shapeOf(a));
    expect(extent!.bounds!.x).toBeGreaterThan(60);
    expect(extent!.bounds!.x + extent!.bounds!.width).toBeCloseTo(160, 6);
  });

  it('counts erasures it is given as well as the saved ones', () => {
    const a = attrs(undefined, { erasures: [disc(40, 60, 30)] });
    const extent = makeNode().getVisibleExtent(shapeOf(a), [disc(160, 60, 30)]);
    expect(extent!.bounds!.x + extent!.bounds!.width).toBeLessThan(140);
  });

  it('is empty once everything is erased', () => {
    const wipe: WeaveStrokeErasure = {
      shape: 'circle',
      radius: 20,
      points: [20, 60, 180, 60],
    };
    const extent = makeNode().getVisibleExtent(shapeOf(attrs(undefined)), [
      wipe,
    ]);
    expect(extent).toEqual({ empty: true, bounds: null });
  });

  it('is nothing for a stroke without points', () => {
    expect(
      makeNode().getVisibleExtent(
        shapeOf(attrs(undefined, { strokeElements: [] }))
      )
    ).toBeNull();
  });
});
