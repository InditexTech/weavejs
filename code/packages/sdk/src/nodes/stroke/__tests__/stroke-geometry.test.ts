// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import type Konva from 'konva';
import { WEAVE_STROKE_LEGACY_LOOK } from '../constants';
import type { WeaveStrokeLook } from '../types';
import {
  densify,
  makeNode,
  renderStroke,
  type StrokeAttrs,
} from './shared/stroke-render.helpers';

const W = 16;
const line = densify(
  [
    { x: 40, y: 60 },
    { x: 160, y: 60 },
  ],
  2,
  0.8
);

const shapeOf = (attrs: StrokeAttrs, scale = 1) =>
  ({
    getAttrs: () => attrs,
    getAbsoluteScale: () => ({ x: scale, y: scale }),
  } as unknown as Konva.Node);

const attrsOf = (look?: WeaveStrokeLook): StrokeAttrs => ({
  strokeElements: line,
  strokeWidth: W,
  stroke: '#000000ff',
  ...(look ? { look } : {}),
});

const roundLook: WeaveStrokeLook = {
  ...WEAVE_STROKE_LEGACY_LOOK,
  outline: 'round',
  zoomAware: true,
  curve: 'centripetal',
};

describe('rendered stroke geometry', () => {
  it('is null for a stroke with no points', () => {
    expect(
      makeNode().getRenderedGeometry(shapeOf({ strokeElements: [] }))
    ).toBeNull();
  });

  it.each([
    ['a stroke with no look', undefined],
    ['a legacy-outline look', { ...WEAVE_STROKE_LEGACY_LOOK }],
    ['a round-outline look', roundLook],
  ])('equals what is drawn for %s', (_name, look) => {
    const attrs = attrsOf(look);
    const g = makeNode().getRenderedGeometry(shapeOf(attrs))!;
    const drawn = renderStroke(attrs);

    expect(g.centerline).toHaveLength(g.halfWidths.length);
    for (let i = 5; i < g.centerline.length - 5; i += 7) {
      const p = g.centerline[i];
      const r = g.halfWidths[i];
      expect(drawn.covered(p.x, p.y + r - 2)).toBe(true);
      expect(drawn.covered(p.x, p.y - r + 2)).toBe(true);
      expect(drawn.covered(p.x, p.y + r + 3)).toBe(false);
      expect(drawn.covered(p.x, p.y - r - 3)).toBe(false);
    }
  });

  it('follows the zoom for a zoom-aware look', () => {
    const node = makeNode();
    const curved = Array.from({ length: 40 }, (_, i) => ({
      x: 10 + i * 4,
      y: 60 + 18 * Math.sin(i / 4),
      pressure: 0.7,
    }));
    const attrs = { ...attrsOf(roundLook), strokeElements: curved };
    const near = node.getRenderedGeometry(shapeOf(attrs, 8))!;
    const far = node.getRenderedGeometry(shapeOf(attrs, 0.25))!;
    expect(near.centerline).not.toHaveLength(far.centerline.length);
  });

  it('reports the ends of the look', () => {
    const node = makeNode();
    const ends = (look: WeaveStrokeLook) =>
      node.getRenderedGeometry(shapeOf(attrsOf(look)))!.ends;
    expect(ends(roundLook)).toBe('round');
    expect(ends({ ...roundLook, ends: 'flat' })).toBe('flat');
    expect(
      ends({ ...WEAVE_STROKE_LEGACY_LOOK, ends: 'flat' } as WeaveStrokeLook)
    ).toBe('round');
    expect(node.getRenderedGeometry(shapeOf(attrsOf()))!.ends).toBe('round');
  });

  it('gives a disc for a one-point stroke', () => {
    const g = makeNode().getRenderedGeometry(
      shapeOf({
        strokeElements: [{ x: 5, y: 5, pressure: 0.5 }],
        strokeWidth: 10,
        look: roundLook,
      })
    )!;
    expect(g.centerline).toHaveLength(1);
    expect(g.halfWidths[0]).toBeGreaterThan(0);
  });

  it.each([
    ['a stroke with no look', undefined],
    ['a legacy-outline look', { ...WEAVE_STROKE_LEGACY_LOOK }],
    ['a round-outline look', roundLook],
  ])('reaches the last point of a dense stroke, %s', (_name, look) => {
    // points closer together than the minimum spacing of the look, the way a
    // stroke is while it is being drawn
    const dense = densify(
      [
        { x: 40, y: 60 },
        { x: 160, y: 60 },
      ],
      0.4,
      0.8
    );
    const g = makeNode().getRenderedGeometry(
      shapeOf({ ...attrsOf(look), strokeElements: dense })
    )!;
    expect(g.centerline[0]).toMatchObject({ x: 40, y: 60 });
    expect(g.centerline.at(-1)).toMatchObject({ x: 160, y: 60 });
  });

  it('draws the end of a stroke where its points end, dense or sparse', () => {
    const sparse = densify(
      [
        { x: 40, y: 60 },
        { x: 160, y: 60 },
      ],
      30,
      0.8
    );
    const dense = densify(
      [
        { x: 40, y: 60 },
        { x: 160, y: 60 },
      ],
      0.4,
      0.8
    );
    for (const look of [undefined, roundLook]) {
      const end = (points: typeof sparse) =>
        makeNode()
          .getRenderedGeometry(
            shapeOf({ ...attrsOf(look), strokeElements: points })
          )!
          .centerline.at(-1)!;
      expect(end(dense).x).toBeCloseTo(end(sparse).x, 9);
      expect(end(dense).y).toBeCloseTo(end(sparse).y, 9);
    }
  });
});
