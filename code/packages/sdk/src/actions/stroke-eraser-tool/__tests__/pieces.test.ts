// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import type Konva from 'konva';
import type { WeaveEraserRun } from '@/nodes/stroke/render/erase';
import { WeaveStrokeNode } from '@/nodes/stroke/stroke';
import { renderedDeviation } from '../../brush-tool/stages/refine';
import { createBrushInstruments } from '../../brush-tool/tunables/presets';
import { STROKE_ERASER_DEFAULT_FINALIZE } from '../constants';
import { buildStrokePieces, pieceLook } from '../pieces';

const dense = (x0: number, x1: number, y = 50, step = 0.5) => {
  const points = [];
  for (let x = x0; x <= x1; x += step) {
    points.push({ x, y: y + Math.sin(x / 20) * 0.3, pressure: 0.5 + x / 1000 });
  }
  return points;
};

const run = (
  points: ReturnType<typeof dense>,
  cut: { start?: boolean; end?: boolean } = {}
): WeaveEraserRun => ({
  points,
  halfWidths: points.map(() => 4),
  startCut: cut.start ?? false,
  endCut: cut.end ?? false,
});

const base = {
  strokeWidth: 8,
  look: undefined as unknown,
  finalize: STROKE_ERASER_DEFAULT_FINALIZE,
  zoom: 1,
  minLength: 2,
  // no time limit unless a test gives one: how long the machine takes, which
  // depends on what else it is doing, must not change what is saved
  deadline: Infinity,
};

describe('pieceLook', () => {
  const look = {
    version: 1,
    outline: 'round',
    width: { min: 0.2, max: 1, taperStart: 12, taperEnd: 20 },
  };

  it('removes the taper of a cut start', () => {
    expect(pieceLook(look, { start: true, end: false })).toEqual({
      ...look,
      width: { ...look.width, taperStart: 0 },
    });
  });

  it('removes the taper of a cut end', () => {
    expect(pieceLook(look, { start: false, end: true })).toEqual({
      ...look,
      width: { ...look.width, taperEnd: 0 },
    });
  });

  it('removes both tapers of a piece cut at both ends', () => {
    expect(pieceLook(look, { start: true, end: true })).toEqual({
      ...look,
      width: { ...look.width, taperStart: 0, taperEnd: 0 },
    });
  });

  it('keeps the taper of an end that is still the original', () => {
    expect(pieceLook(look, { start: false, end: false })).toBe(look);
  });

  it('does not change the look it was given', () => {
    const copy = structuredClone(look);
    pieceLook(look, { start: true, end: true });
    expect(look).toEqual(copy);
  });

  it('adds no field a look did not have', () => {
    const plain = { version: 1, width: { min: 0, max: 1 } };
    expect(pieceLook(plain, { start: true, end: true })).toBe(plain);
    expect(pieceLook(undefined, { start: true, end: true })).toBeUndefined();
    expect(pieceLook({ version: 1 }, { start: true, end: true })).toEqual({
      version: 1,
    });
  });

  it('leaves a taper of 0 alone', () => {
    const none = { width: { taperStart: 0, taperEnd: 0 } };
    expect(pieceLook(none, { start: true, end: true })).toBe(none);
  });
});

describe('buildStrokePieces', () => {
  it('drops a piece shorter than the minimum', () => {
    const pieces = buildStrokePieces({
      ...base,
      runs: [run(dense(10, 11)), run(dense(30, 60))],
    });
    expect(pieces).toHaveLength(1);
    expect(pieces[0].box.x).toBeGreaterThan(20);
  });

  it('keeps a piece that is long enough', () => {
    const pieces = buildStrokePieces({
      ...base,
      runs: [run(dense(10, 13))],
      minLength: 2,
    });
    expect(pieces).toHaveLength(1);
  });

  it('reduces the points with the finalize stage and keeps both ends exactly', () => {
    const points = dense(10, 90);
    const [piece] = buildStrokePieces({ ...base, runs: [run(points)] });
    expect(piece.points.length).toBeLessThan(points.length / 4);

    const { x, y } = piece.box;
    expect(piece.points[0].x + x).toBeCloseTo(points[0].x, 9);
    expect(piece.points[0].y + y).toBeCloseTo(points[0].y, 9);
    expect(piece.points.at(-1)!.x + x).toBeCloseTo(points.at(-1)!.x, 9);
    expect(piece.points.at(-1)!.pressure).toBe(points.at(-1)!.pressure);
  });

  it('uses the finalize configuration it is given', () => {
    const points = dense(10, 90);
    const [kept] = buildStrokePieces({
      ...base,
      runs: [run(points)],
      finalize: { ...STROKE_ERASER_DEFAULT_FINALIZE, mode: 'none' },
    });
    expect(kept.points).toHaveLength(points.length);

    const [loose] = buildStrokePieces({
      ...base,
      runs: [run(points)],
      finalize: { ...STROKE_ERASER_DEFAULT_FINALIZE, tolerance: 50 },
    });
    expect(loose.points.length).toBeLessThan(10);
  });

  it('measures the tolerance in screen pixels at the zoom of the commit', () => {
    const points = dense(10, 90, 50, 0.25).map((p, i) => ({
      ...p,
      y: p.y + (i % 2 ? 0.4 : 0),
    }));
    const finalize = { ...STROKE_ERASER_DEFAULT_FINALIZE, tolerance: 0.5 };
    const zoomedOut = buildStrokePieces({
      ...base,
      runs: [run(points)],
      finalize,
      zoom: 0.25,
    })[0];
    const zoomedIn = buildStrokePieces({
      ...base,
      runs: [run(points)],
      finalize,
      zoom: 4,
    })[0];
    // 0.5 screen px is 2 canvas units zoomed out, 0.125 zoomed in
    expect(zoomedOut.points.length).toBeLessThan(zoomedIn.points.length);
  });

  it('stores the points relative to the corner of the box', () => {
    const [piece] = buildStrokePieces({
      ...base,
      runs: [run(dense(40, 80, 30))],
    });
    expect(piece.box.x).toBeCloseTo(40, 6);
    expect(Math.min(...piece.points.map((p) => p.x))).toBeGreaterThanOrEqual(0);
    expect(Math.min(...piece.points.map((p) => p.y))).toBeGreaterThanOrEqual(0);
  });

  it('boxes a piece at least as wide and high as the stroke, centred on it', () => {
    const horizontal = buildStrokePieces({
      ...base,
      strokeWidth: 12,
      runs: [
        run(
          [
            { x: 10, y: 50, pressure: 1 },
            { x: 60, y: 50, pressure: 1 },
          ],
          {}
        ),
      ],
    })[0];
    expect(horizontal.box.width).toBeCloseTo(50, 6);
    expect(horizontal.box.height).toBeCloseTo(12, 6);
    expect(horizontal.box.y).toBeCloseTo(44, 6);
    expect(horizontal.points[0].y).toBeCloseTo(6, 6);
  });

  it('gives a piece a look with no taper at its cut ends', () => {
    const look = { width: { taperStart: 10, taperEnd: 10 } };
    const pieces = buildStrokePieces({
      ...base,
      look,
      runs: [
        run(dense(0, 30), { end: true }),
        run(dense(50, 70), { start: true, end: true }),
        run(dense(90, 120), { start: true }),
      ],
    });
    expect(pieces.map((p) => p.look)).toEqual([
      { width: { taperStart: 10, taperEnd: 0 } },
      { width: { taperStart: 0, taperEnd: 0 } },
      { width: { taperStart: 0, taperEnd: 10 } },
    ]);
  });
});

describe('buildStrokePieces keeping a piece faithful', () => {
  const node = new WeaveStrokeNode();
  const penLook = createBrushInstruments(2).find((i) => i.id === 'pen')!.look;

  /** The line a stroke with a look is drawn with, a hairline so the bound is as asked. */
  const geometryOf = (look: unknown, points: ReturnType<typeof dense>) =>
    node.getRenderedGeometry(
      {
        getAttrs: () => ({
          id: 'piece',
          strokeWidth: 2,
          ...(look ? { look } : {}),
        }),
        getAbsoluteScale: () => ({ x: 1, y: 1 }),
      } as unknown as Konva.Node,
      { points }
    );

  const wavy = () =>
    Array.from({ length: 300 }, (_, i) => ({
      x: i,
      y: 40 + 5 * Math.sin(i / 11) + 2 * Math.sin(i / 3.1),
      pressure: 0.5 + 0.3 * Math.sin(i / 30),
    }));

  const shiftOf = (
    points: ReturnType<typeof dense>,
    saved: ReturnType<typeof dense>,
    look: unknown
  ) => {
    const reference = geometryOf(look, points)!;
    const line = geometryOf(look, saved)!;
    return renderedDeviation(reference, line);
  };

  it('keeps a piece within the bound of the line it was cut from', () => {
    const points = wavy();
    const [piece] = buildStrokePieces({
      ...base,
      look: penLook,
      runs: [run(points)],
      finalize: { ...STROKE_ERASER_DEFAULT_FINALIZE, maxDeviationPx: 0.2 },
      geometryOf,
    });
    const saved = piece.points.map((p) => ({
      ...p,
      x: p.x + piece.box.x,
      y: p.y + piece.box.y,
    }));
    expect(shiftOf(points, saved, piece.look)).toBeLessThanOrEqual(0.2 + 1e-6);
  });

  it('moves the line more without it, and keeps fewer points', () => {
    const points = wavy();
    const withBound = buildStrokePieces({
      ...base,
      look: penLook,
      runs: [run(points)],
      finalize: { ...STROKE_ERASER_DEFAULT_FINALIZE, maxDeviationPx: 0.2 },
      geometryOf,
    })[0];
    const without = buildStrokePieces({
      ...base,
      look: penLook,
      runs: [run(points)],
      finalize: { ...STROKE_ERASER_DEFAULT_FINALIZE, maxDeviationPx: 0 },
      geometryOf,
    })[0];
    const absolute = (p: typeof withBound) =>
      p.points.map((q) => ({ ...q, x: q.x + p.box.x, y: q.y + p.box.y }));
    expect(shiftOf(points, absolute(without), without.look)).toBeGreaterThan(
      0.2
    );
    expect(withBound.points.length).toBeGreaterThan(without.points.length);
  });

  it('measures a piece with the look it will be drawn with: no taper at a cut end', () => {
    const looks: unknown[] = [];
    const points = wavy();
    const tapered = {
      ...(penLook as object),
      width: {
        ...(penLook as { width: object }).width,
        taperStart: 30,
        taperEnd: 30,
      },
    };
    buildStrokePieces({
      ...base,
      look: tapered,
      runs: [run(points, { start: true, end: false })],
      finalize: { ...STROKE_ERASER_DEFAULT_FINALIZE, maxDeviationPx: 0.2 },
      geometryOf: (look, pts) => {
        looks.push(look);
        return geometryOf(look, pts);
      },
    });
    expect(looks.length).toBeGreaterThan(0);
    for (const look of looks) {
      const width = (
        look as { width: { taperStart: number; taperEnd: number } }
      ).width;
      expect(width.taperStart).toBe(0);
      expect(width.taperEnd).toBe(30);
    }
  });

  it('saves the result of the finishing step when the deadline has passed', () => {
    const points = wavy();
    const plain = buildStrokePieces({
      ...base,
      look: penLook,
      runs: [run(points)],
      finalize: { ...STROKE_ERASER_DEFAULT_FINALIZE, maxDeviationPx: 0 },
    })[0];
    const late = buildStrokePieces({
      ...base,
      look: penLook,
      runs: [run(points)],
      finalize: { ...STROKE_ERASER_DEFAULT_FINALIZE, maxDeviationPx: 0.2 },
      geometryOf,
      deadline: -1,
    })[0];
    expect(late.points).toEqual(plain.points);
  });

  it('does nothing extra without a way to measure, or with the finishing step off', () => {
    const points = wavy();
    const plain = buildStrokePieces({
      ...base,
      runs: [run(points)],
      finalize: { ...STROKE_ERASER_DEFAULT_FINALIZE, maxDeviationPx: 0.2 },
    })[0];
    expect(plain.points.length).toBeLessThan(points.length);

    const measured = vi.fn(() => null);
    const kept = buildStrokePieces({
      ...base,
      runs: [run(points)],
      finalize: {
        ...STROKE_ERASER_DEFAULT_FINALIZE,
        mode: 'none',
        maxDeviationPx: 0.2,
      },
      geometryOf: measured,
    })[0];
    expect(kept.points).toHaveLength(points.length);
    expect(measured).not.toHaveBeenCalled();
  });
});
