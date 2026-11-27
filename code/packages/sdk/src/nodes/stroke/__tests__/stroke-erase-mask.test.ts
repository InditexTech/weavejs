// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import type Konva from 'konva';
import { WEAVE_STROKE_LEGACY_LOOK } from '../constants';
import type { WeaveStrokeLook } from '../types';
import { cutStroke, type WeaveEraseMask } from '../render/erase';
import {
  densify,
  makeNode,
  recordDrawCalls,
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

const maskAt = (x: number, r = 6): WeaveEraseMask => [
  { a: { x, y: 40 }, b: { x, y: 80 }, r },
];

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

describe.each(Object.entries(looks))('erase mask, %s', (_name, look) => {
  it('does not draw what the mask covers and draws the rest', () => {
    const r = renderStroke(attrs(look, { eraseMask: maskAt(100) }));
    expect(r.covered(100, 60)).toBe(false);
    expect(r.covered(100, 66)).toBe(false);
    expect(r.covered(60, 60)).toBe(true);
    expect(r.covered(140, 60)).toBe(true);
  });

  it('draws the stroke in full again without a mask', () => {
    const r = renderStroke(attrs(look, { eraseMask: undefined }));
    expect(r.covered(100, 60)).toBe(true);
  });

  it('draws exactly as before when the mask reaches nothing', () => {
    const away: WeaveEraseMask = [
      { a: { x: 100, y: 5 }, b: { x: 100, y: 5 }, r: 3 },
    ];
    expect(recordDrawCalls(attrs(look, { eraseMask: away }))).toEqual(
      recordDrawCalls(attrs(look))
    );
  });

  it('draws what the cut leaves, no more and no less', () => {
    const mask = maskAt(100);
    const g = makeNode().getRenderedGeometry({
      getAttrs: () => attrs(look),
      getAbsoluteScale: () => ({ x: 1, y: 1 }),
    } as unknown as Konva.Node)!;
    const { runs } = cutStroke(g, mask);
    const r = renderStroke(attrs(look, { eraseMask: mask }));

    for (const x of [45, 60, 75, 125, 140, 155]) {
      const inRun = runs.some(
        (run) => x >= run.points[0].x && x <= run.points.at(-1)!.x
      );
      expect(inRun).toBe(true);
      expect(r.covered(x, 60)).toBe(true);
    }
    for (const x of [96, 100, 104]) {
      expect(r.covered(x, 60)).toBe(false);
    }
  });
});

describe('erase mask and translucent colour', () => {
  const alphaAt = (look: WeaveStrokeLook, x: number, mask?: WeaveEraseMask) =>
    renderStroke(attrs(look, { stroke: '#00000080', eraseMask: mask })).alpha(
      x,
      60
    );

  it.each([
    ['round outline', looks['round outline']!],
    ['legacy outline with merged caps', looks['legacy outline']!],
  ])('keeps one opacity along each run of a %s', (_name, look) => {
    const whole = alphaAt(look, 60);
    expect(alphaAt(look, 60, maskAt(100))).toBe(whole);
    expect(alphaAt(look, 140, maskAt(100))).toBe(whole);
    // right next to the cut, where the end of a run is drawn
    expect(alphaAt(look, 85, maskAt(100))).toBe(whole);
  });
});

describe('erase mask on the node', () => {
  it('is not serialized', () => {
    const node = makeNode();
    const instance = {
      getAttrs: () => ({
        id: 's1',
        nodeType: 'stroke',
        strokeElements: line,
        eraseMask: maskAt(100),
        mutexLocked: true,
      }),
    };
    const out = node.serialize(instance as never);
    expect(out.props).not.toHaveProperty('eraseMask');
    expect(out.props.strokeElements).toBe(line);
  });

  it('is set and cleared on a node and redraws its layer', () => {
    const node = makeNode();
    const batchDraw = vi.fn();
    let stored: unknown;
    const shape = {
      setAttr: (_k: string, v: unknown) => (stored = v),
      getAttrs: () => ({ eraseMask: stored }),
      getLayer: () => ({ batchDraw }),
    } as unknown as Konva.Node;

    node.setEraseMask(shape, maskAt(100));
    expect(node.getEraseMask(shape)).toEqual(maskAt(100));
    node.setEraseMask(shape, null);
    expect(node.getEraseMask(shape)).toBeNull();
    node.setEraseMask(shape, []);
    expect(node.getEraseMask(shape)).toBeNull();
    expect(batchDraw).toHaveBeenCalledTimes(3);
  });

  it('does not rebuild the look geometry of a stroke because of the mask', () => {
    const node = makeNode();
    const build = vi.spyOn(
      node as unknown as { buildLookCenterline: () => unknown },
      'buildLookCenterline'
    );
    const base = attrs(looks['round outline']);
    renderStroke(base, { node });
    renderStroke({ ...base, eraseMask: maskAt(100) }, { node });
    renderStroke({ ...base, eraseMask: maskAt(60) }, { node });
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('cuts a stroke with a mask, and keeps what it worked out for the stroke', () => {
    const node = makeNode();
    const shape = {
      getAttrs: () => attrs(looks['round outline']),
      getAbsoluteScale: () => ({ x: 1, y: 1 }),
    } as unknown as Konva.Node;
    const mask = maskAt(100);
    const memoFor = node as unknown as { eraseMemos: WeakMap<object, unknown> };

    const first = node.cutStrokeWithMask(shape, mask)!;
    expect(first.erased).toBe(true);
    expect(first.runs).toHaveLength(2);
    expect(first.ends).toBe('round');
    expect(memoFor.eraseMemos.has(shape)).toBe(true);

    const grown = [...mask, ...maskAt(60)];
    const second = node.cutStrokeWithMask(shape, grown)!;
    expect(second.runs).toHaveLength(3);
  });

  it('reports no cut for a stroke with no points', () => {
    const shape = {
      getAttrs: () => ({ strokeElements: [] }),
      getAbsoluteScale: () => ({ x: 1, y: 1 }),
    } as unknown as Konva.Node;
    expect(makeNode().cutStrokeWithMask(shape, maskAt(10))).toBeNull();
  });

  it.each([
    ['no look', undefined],
    ['a round outline', looks['round outline']],
  ])(
    'keeps the geometry of a stroke with %s while its points are the same',
    (_n, look) => {
      const node = makeNode();
      const build = vi.spyOn(
        node as unknown as {
          buildLegacyCenterline: () => unknown;
          buildLookCenterline: () => unknown;
        },
        look ? 'buildLookCenterline' : 'buildLegacyCenterline'
      );
      const a = attrs(look);
      const shape = {
        getAttrs: () => a,
        getAbsoluteScale: () => ({ x: 1, y: 1 }),
      } as unknown as Konva.Node;

      const g1 = node.getRenderedGeometry(shape)!;
      const g2 = node.getRenderedGeometry(shape)!;
      renderStroke(a, { node });
      expect(build).toHaveBeenCalledTimes(1);
      expect(g2.centerline).toBe(g1.centerline);
      expect(g2.halfWidths).toBe(g1.halfWidths);
    }
  );

  it('builds the geometry again when the width or the points change', () => {
    const node = makeNode();
    const build = vi.spyOn(
      node as unknown as { buildLegacyCenterline: () => unknown },
      'buildLegacyCenterline'
    );
    const shapeFor = (a: Record<string, unknown>) =>
      ({
        getAttrs: () => a,
        getAbsoluteScale: () => ({ x: 1, y: 1 }),
      } as unknown as Konva.Node);

    const a = attrs(undefined);
    node.getRenderedGeometry(shapeFor(a));
    node.getRenderedGeometry(shapeFor({ ...a, strokeWidth: W + 4 }));
    node.getRenderedGeometry(shapeFor({ ...a, strokeElements: [...line] }));
    node.getRenderedGeometry(
      shapeFor({ ...a, strokeElements: line.slice(0, -2) })
    );
    expect(build).toHaveBeenCalledTimes(4);
  });

  it('can be asked for the geometry another look would give', () => {
    const node = makeNode();
    const shape = {
      getAttrs: () => attrs(looks['round outline']),
      getAbsoluteScale: () => ({ x: 1, y: 1 }),
    } as unknown as Konva.Node;

    expect(node.getRenderedGeometry(shape)!.ends).toBe('round');
    expect(
      node.getRenderedGeometry(shape, { look: looks['flat round outline'] })!
        .ends
    ).toBe('flat');
    // `null` is the legacy ribbon, which has round ends and no look
    expect(node.getRenderedGeometry(shape, { look: null })!.ends).toBe('round');
    expect(
      node
        .getRenderedGeometry(shape, { points: line.slice(0, 10) })!
        .centerline.at(-1)
    ).toMatchObject({ x: line[9].x });
  });
});
