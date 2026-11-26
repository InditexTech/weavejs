// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import { WEAVE_STROKE_LEGACY_LOOK } from '../constants';
import type { WeaveStrokeLook } from '../types';
import {
  densify,
  makeNode,
  recordDrawCalls,
  type StrokeAttrs,
} from './shared/stroke-render.helpers';

const round: WeaveStrokeLook = { ...WEAVE_STROKE_LEGACY_LOOK, outline: 'round' };
const points = densify(
  [
    { x: 10, y: 60 },
    { x: 100, y: 30 },
    { x: 190, y: 70 },
  ],
  3,
  0.8
);

type WithId = StrokeAttrs & { id?: string };
const attrs = (look: WeaveStrokeLook, extra: Partial<WithId> = {}): WithId => ({
  strokeElements: points,
  strokeWidth: 12,
  stroke: '#000000ff',
  look,
  ...extra,
});

describe('variance', () => {
  const varied: WeaveStrokeLook = { ...round, variance: 0.8 };

  it('a variance of 0 draws as a look without it', () => {
    expect(recordDrawCalls(attrs({ ...round, variance: 0 }))).toEqual(
      recordDrawCalls(attrs(round))
    );
  });

  it('changes the outline', () => {
    expect(recordDrawCalls(attrs(varied, { id: 'a' }))).not.toEqual(
      recordDrawCalls(attrs(round, { id: 'a' }))
    );
  });

  it('is the same on every viewer and redraw', () => {
    const first = recordDrawCalls(attrs(varied, { id: 'stroke-1' }));
    expect(recordDrawCalls(attrs(varied, { id: 'stroke-1' }))).toEqual(first);
    expect(recordDrawCalls(attrs(varied, { id: 'stroke-1' }), makeNode())).toEqual(first);
  });

  it('is the same for the preview of a finished stroke', () => {
    expect(recordDrawCalls(attrs(varied, { id: 'stroke-1--preview' }))).toEqual(
      recordDrawCalls(attrs(varied, { id: 'stroke-1' }))
    );
  });

  it('is different for another stroke', () => {
    expect(recordDrawCalls(attrs(varied, { id: 'stroke-1' }))).not.toEqual(
      recordDrawCalls(attrs(varied, { id: 'stroke-2' }))
    );
  });

  it('does not change when the stroke is zoomed', () => {
    const widths = (scale: number) =>
      (
        makeNode() as unknown as {
          lookGeometry: (
            shape: unknown,
            look: WeaveStrokeLook,
            pts: typeof points,
            baseW: number,
            scale: number
          ) => { halfWidths: number[] };
        }
      ).lookGeometry({ getAttrs: () => ({ id: 'z' }) }, varied, points, 12, scale)
        .halfWidths;
    expect(widths(3)).toEqual(widths(1));
  });

  it('also varies the legacy ribbon', () => {
    const legacy = { ...WEAVE_STROKE_LEGACY_LOOK, variance: 0.8 };
    expect(recordDrawCalls(attrs(legacy, { id: 'a' }))).not.toEqual(
      recordDrawCalls(attrs(WEAVE_STROKE_LEGACY_LOOK, { id: 'a' }))
    );
  });

  it('draws a one-point stroke with a finite width', () => {
    const log = recordDrawCalls({
      strokeElements: [{ x: 5, y: 5, pressure: 1 }],
      strokeWidth: 10,
      stroke: '#000000ff',
      look: varied,
      id: 'a',
    } as WithId) as [string, ...number[]][];
    const arc = log.find((c) => c[0] === 'arc')!;
    expect(Number.isFinite(arc[3])).toBe(true);
    expect(arc[3]).toBeGreaterThan(0);
  });
});

describe('stored width easing', () => {
  it('easeOut draws as a look without easing', () => {
    const tapered = {
      ...round,
      width: { ...round.width, taperStart: 20, taperEnd: 20 },
    };
    expect(
      recordDrawCalls(
        attrs({ ...tapered, width: { ...tapered.width, easing: 'easeOut' } })
      )
    ).toEqual(recordDrawCalls(attrs(tapered)));
  });

  it('another easing changes the outline', () => {
    const tapered = {
      ...round,
      width: { ...round.width, taperStart: 20, taperEnd: 20 },
    };
    expect(
      recordDrawCalls(
        attrs({ ...tapered, width: { ...tapered.width, easing: 'linear' } })
      )
    ).not.toEqual(recordDrawCalls(attrs(tapered)));
  });
});

describe('width cache', () => {
  const spy = () => {
    const node = makeNode();
    const build = vi.spyOn(
      node as unknown as { buildLookCenterline: () => unknown },
      'buildLookCenterline'
    );
    return { node, build };
  };

  it('builds a stroke once and reuses it on redraw', () => {
    const { node, build } = spy();
    const a = attrs(round, { id: 'c' });
    recordDrawCalls(a, node);
    recordDrawCalls(a, node);
    recordDrawCalls(a, node);
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('gives the same draw calls from the cache', () => {
    const { node } = spy();
    const a = attrs({ ...round, variance: 0.5 }, { id: 'c' });
    expect(recordDrawCalls(a, node)).toEqual(recordDrawCalls(a, node));
  });

  it('reuses it when the stroke is panned or zoomed and the look ignores the zoom', () => {
    const { node, build } = spy();
    const a = attrs(round, { id: 'c' });
    recordDrawCalls(a, node, 1);
    recordDrawCalls(a, node, 2);
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('rebuilds it at another zoom when the look follows the zoom', () => {
    const { node, build } = spy();
    const a = attrs({ ...round, zoomAware: true }, { id: 'c' });
    recordDrawCalls(a, node, 1);
    recordDrawCalls(a, node, 2);
    expect(build).toHaveBeenCalledTimes(2);
  });

  it('rebuilds it when the look changes', () => {
    const { node, build } = spy();
    recordDrawCalls(attrs(round, { id: 'c' }), node);
    const changed = { ...attrs({ ...round, curve: 'none' }, { id: 'c' }) };
    changed.strokeElements = points;
    recordDrawCalls(changed, node);
    expect(build).toHaveBeenCalledTimes(2);
  });

  it('rebuilds it when the points change', () => {
    const { node, build } = spy();
    recordDrawCalls(attrs(round, { id: 'c' }), node);
    recordDrawCalls(
      attrs(round, { id: 'c', strokeElements: [...points, { x: 200, y: 80, pressure: 1 }] }),
      node
    );
    expect(build).toHaveBeenCalledTimes(2);
  });

  it('rebuilds it for another stroke width', () => {
    const { node, build } = spy();
    recordDrawCalls(attrs(round, { id: 'c' }), node);
    recordDrawCalls(attrs(round, { id: 'c', strokeWidth: 20 }), node);
    expect(build).toHaveBeenCalledTimes(2);
  });
});
