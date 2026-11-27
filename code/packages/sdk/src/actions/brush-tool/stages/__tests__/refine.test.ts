// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import type Konva from 'konva';
import { WeaveStrokeNode } from '@/nodes/stroke/stroke';
import type { WeaveStrokePoint } from '@/nodes/stroke/types';
import type { WeaveBrushFinalizeConfig } from '../../types';
import { finalizePoints } from '../finalize';
import {
  finalizeWithinDeviation as refine,
  renderedDeviation,
  type GeometryOf,
  type RenderedLine,
} from '../refine';
import { createBrushInstruments } from '../../tunables/presets';

/**
 * With no time limit unless a test gives one: how long the machine takes, which
 * depends on what else it is doing, must not change what is saved.
 */
const finalizeWithinDeviation: typeof refine = (input) =>
  refine({ deadline: Infinity, ...input });

const node = new WeaveStrokeNode();
const look = createBrushInstruments(6).find((i) => i.id === 'pen')!.look;

/** A hairline, so the bound is the one asked for: a broad stroke is allowed more. */
const HAIRLINE = 2;

const geometryFor =
  (lookOf: unknown, zoom = 1, strokeWidth = HAIRLINE): GeometryOf =>
  (points) =>
    node.getRenderedGeometry(
      {
        getAttrs: () => ({
          id: 'refine',
          strokeWidth,
          ...(lookOf ? { look: lookOf } : {}),
        }),
        getAbsoluteScale: () => ({ x: zoom, y: zoom }),
      } as unknown as Konva.Node,
      { points }
    );

/** Pseudo-random numbers that are the same on every run. */
const random = (seed: number) => () =>
  (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

/** A hand-like stroke: it turns, wobbles, reverses and changes speed and pressure. */
function handStroke(
  kind: number,
  seed = 7 + kind,
  jitter = 0.6,
  pressureNoise = 0.15
): WeaveStrokePoint[] {
  const rnd = random(seed);
  const turn = [0.01, 0.05, 0.12, 0.3][kind % 4];
  const reverses = kind % 3 === 0;
  const points: WeaveStrokePoint[] = [];
  let x = 100;
  let y = 300;
  let a = rnd() * 6.28;
  let speed = 1 + rnd() * 3;
  const count = 300 + Math.floor(rnd() * 500);
  for (let i = 0; i < count; i++) {
    a += (rnd() - 0.5) * turn * 2;
    if (reverses && i > 0 && i % 140 === 0) a += Math.PI * (0.6 + rnd() * 0.8);
    speed = Math.max(0.4, Math.min(7, speed + (rnd() - 0.5) * 0.4));
    x += Math.cos(a) * speed;
    y += Math.sin(a) * speed;
    points.push({
      x: x + (rnd() - 0.5) * jitter,
      y: y + (rnd() - 0.5) * jitter,
      pressure: Math.min(
        1,
        Math.max(
          0.05,
          0.5 + 0.4 * Math.sin(i / 60) + (rnd() - 0.5) * pressureNoise
        )
      ),
    });
  }
  return points;
}

const BEZIER: WeaveBrushFinalizeConfig = {
  mode: 'bezierFit',
  toleranceUnit: 'screen',
  tolerance: 1.5,
  pressureWeight: 20,
  resampleSpacingPx: 6,
};
const DP_PRESSURE: WeaveBrushFinalizeConfig = {
  mode: 'dpPressure',
  toleranceUnit: 'screen',
  tolerance: 0.8,
  pressureWeight: 20,
  resampleSpacingPx: 6,
};

const deviationOf = (
  drawn: WeaveStrokePoint[],
  saved: WeaveStrokePoint[],
  geometryOf: GeometryOf
) =>
  renderedDeviation(
    geometryOf(drawn) as RenderedLine,
    geometryOf(saved) as RenderedLine
  );

const run = (
  points: WeaveStrokePoint[],
  finalize: WeaveBrushFinalizeConfig,
  maxDeviationPx: number,
  zoom = 1
) => {
  const geometryOf = geometryFor(look, zoom);
  const candidate = finalizePoints(points, finalize, 0.5, zoom);
  return {
    candidate,
    geometryOf,
    ...finalizeWithinDeviation({
      points,
      candidate,
      finalize,
      toolTolerance: 0.5,
      zoom,
      maxDeviationPx,
      geometryOf,
    }),
  };
};

describe('renderedDeviation', () => {
  const line = (xs: number[], width = 3): RenderedLine => ({
    centerline: xs.map((x) => ({ x, y: 0, pressure: 1 })),
    halfWidths: xs.map(() => width),
  });

  it('is zero for the same line', () => {
    expect(renderedDeviation(line([0, 5, 10]), line([0, 5, 10]))).toBeCloseTo(
      0
    );
  });

  it('is zero for the same line sampled differently', () => {
    expect(
      renderedDeviation(line([0, 10]), line([0, 2, 4, 6, 8, 10]))
    ).toBeCloseTo(0);
  });

  it('measures a line that has moved', () => {
    const moved = line([0, 5, 10]);
    moved.centerline.forEach((p) => (p.y = 2));
    expect(renderedDeviation(line([0, 5, 10]), moved)).toBeCloseTo(2);
  });

  it('measures a width that has changed', () => {
    expect(
      renderedDeviation(line([0, 5, 10], 3), line([0, 5, 10], 4.5))
    ).toBeCloseTo(1.5);
  });

  it('sees detail that the other line has cut off, in either direction', () => {
    const detail: RenderedLine = {
      centerline: [
        { x: 0, y: 0, pressure: 1 },
        { x: 5, y: 4, pressure: 1 },
        { x: 10, y: 0, pressure: 1 },
      ],
      halfWidths: [3, 3, 3],
    };
    expect(renderedDeviation(detail, line([0, 10]))).toBeGreaterThan(3);
    expect(renderedDeviation(line([0, 10]), detail)).toBeGreaterThan(3);
  });

  it('follows a stroke that comes back near itself', () => {
    const there = Array.from({ length: 60 }, (_, i) => ({
      x: i,
      y: 0,
      pressure: 1,
    }));
    const back = Array.from({ length: 60 }, (_, i) => ({
      x: 59 - i,
      y: 1,
      pressure: 1,
    }));
    const loop: RenderedLine = {
      centerline: [...there, ...back],
      halfWidths: new Array(120).fill(2),
    };
    expect(renderedDeviation(loop, loop)).toBeCloseTo(0);
  });

  it('copes with a line of one point', () => {
    const dot: RenderedLine = {
      centerline: [{ x: 0, y: 0, pressure: 1 }],
      halfWidths: [2],
    };
    expect(renderedDeviation(dot, line([3, 4]))).toBeGreaterThan(0);
    expect(renderedDeviation(dot, dot)).toBe(0);
  });
});

describe('finalizeWithinDeviation', () => {
  it('leaves the result of the finishing step alone when the bound is off', () => {
    const points = handStroke(1);
    const candidate = finalizePoints(points, BEZIER, 0.5, 1);
    for (const maxDeviationPx of [0, -1, NaN]) {
      const out = finalizeWithinDeviation({
        points,
        candidate,
        finalize: BEZIER,
        toolTolerance: 0.5,
        zoom: 1,
        maxDeviationPx,
        geometryOf: geometryFor(look),
      });
      expect(out.points).toBe(candidate);
      expect(out.tightened).toBe(false);
    }
  });

  it('leaves it alone when it is already within the bound', () => {
    const points = handStroke(2);
    const geometryOf = geometryFor(look);
    const out = finalizeWithinDeviation({
      points,
      candidate: points,
      finalize: BEZIER,
      toolTolerance: 0.5,
      zoom: 1,
      maxDeviationPx: 0.35,
      geometryOf,
    });
    expect(out.points).toBe(points);
    expect(out.tightened).toBe(false);
    expect(out.deviationPx).toBeCloseTo(0);
  });

  it('keeps tiny strokes as they are', () => {
    const two = [
      { x: 0, y: 0, pressure: 1 },
      { x: 5, y: 5, pressure: 1 },
    ];
    const out = finalizeWithinDeviation({
      points: two,
      candidate: two,
      finalize: BEZIER,
      toolTolerance: 0.5,
      zoom: 1,
      maxDeviationPx: 0.35,
      geometryOf: geometryFor(look),
    });
    expect(out.points).toBe(two);
  });

  it.each([
    ['bezierFit 1.5 px', BEZIER],
    ['dpPressure 0.8 px', DP_PRESSURE],
  ])('keeps a saved stroke within the bound (%s)', (_name, finalize) => {
    for (let kind = 0; kind < 24; kind++) {
      const points = handStroke(kind);
      const { points: saved, geometryOf } = run(points, finalize, 0.35);
      expect(deviationOf(points, saved, geometryOf)).toBeLessThanOrEqual(
        0.35 + 1e-6
      );
    }
  });

  it('does not move a line the way the plain finishing step does', () => {
    let plain = 0;
    let bounded = 0;
    for (let kind = 0; kind < 12; kind++) {
      const points = handStroke(kind);
      const r = run(points, BEZIER, 0.35);
      plain = Math.max(plain, deviationOf(points, r.candidate, r.geometryOf));
      bounded = Math.max(bounded, deviationOf(points, r.points, r.geometryOf));
    }
    expect(plain).toBeGreaterThan(0.9);
    expect(bounded).toBeLessThanOrEqual(0.35 + 1e-6);
  });

  it('never saves more points than were drawn, and still drops most of a smooth stroke', () => {
    const smooth = handStroke(4, 12, 0, 0);
    const { points: saved } = run(smooth, BEZIER, 0.35);
    expect(saved.length).toBeLessThanOrEqual(smooth.length);
    expect(saved.length).toBeLessThan(smooth.length * 0.6);

    // a jittery stroke keeps what the jitter needs, but never more than was drawn
    const jittery = handStroke(5);
    expect(run(jittery, BEZIER, 0.35).points.length).toBeLessThanOrEqual(
      jittery.length
    );
  });

  it('keeps the first and last point of the stroke', () => {
    const points = handStroke(4);
    const { points: saved } = run(points, BEZIER, 0.35);
    expect(saved[0]).toMatchObject({ x: points[0].x, y: points[0].y });
    expect(saved.at(-1)).toMatchObject({
      x: points.at(-1)!.x,
      y: points.at(-1)!.y,
    });
  });

  it('replaces a fit that overshoots the drawn line', () => {
    const points = handStroke(2);
    const candidate = finalizePoints(points, BEZIER, 0.5, 1);
    const spiked = candidate.map((p, i) =>
      i === Math.floor(candidate.length / 2)
        ? { ...p, x: p.x + 40, y: p.y - 40 }
        : p
    );
    const geometryOf = geometryFor(look);
    expect(deviationOf(points, spiked, geometryOf)).toBeGreaterThan(20);

    const out = finalizeWithinDeviation({
      points,
      candidate: spiked,
      finalize: BEZIER,
      toolTolerance: 0.5,
      zoom: 1,
      maxDeviationPx: 0.35,
      geometryOf,
    });
    expect(out.tightened).toBe(true);
    expect(deviationOf(points, out.points, geometryOf)).toBeLessThanOrEqual(
      0.35 + 1e-6
    );
  });

  it('keeps every drawn point when no simplification matches', () => {
    const points = handStroke(3);
    const candidate = finalizePoints(points, BEZIER, 0.5, 1);
    const real = geometryFor(look);
    // a renderer that sees any saved set of points other than the drawn one as far off
    const strict: GeometryOf = (p) => {
      const line = real(p);
      return line && p !== points
        ? { ...line, halfWidths: line.halfWidths.map((w) => w + 100) }
        : line;
    };
    const out = finalizeWithinDeviation({
      points,
      candidate,
      finalize: BEZIER,
      toolTolerance: 0.5,
      zoom: 1,
      maxDeviationPx: 0.35,
      geometryOf: strict,
    });
    expect(out.points).toBe(points);
    expect(out.deviationPx).toBe(0);
  });

  it('measures the bound in screen pixels, at the zoom of the commit', () => {
    const points = handStroke(1);
    const zoomedOut = run(points, DP_PRESSURE, 0.35, 0.25);
    const zoomedIn = run(points, DP_PRESSURE, 0.35, 4);
    // 0.35 screen px is 1.4 canvas units zoomed out and 0.0875 zoomed in
    expect(zoomedOut.points.length).toBeLessThan(zoomedIn.points.length);
    expect(
      deviationOf(points, zoomedOut.points, zoomedOut.geometryOf)
    ).toBeLessThanOrEqual(0.35 / 0.25 + 1e-6);
    expect(
      deviationOf(points, zoomedIn.points, zoomedIn.geometryOf)
    ).toBeLessThanOrEqual(0.35 / 4 + 1e-6);
  });

  it('works for a stroke with no look, drawn as a legacy ribbon', () => {
    const points = handStroke(6);
    const geometryOf = geometryFor(undefined);
    const candidate = finalizePoints(points, DP_PRESSURE, 0.5, 1);
    const out = finalizeWithinDeviation({
      points,
      candidate,
      finalize: DP_PRESSURE,
      toolTolerance: 0.5,
      zoom: 1,
      maxDeviationPx: 0.35,
      geometryOf,
    });
    expect(deviationOf(points, out.points, geometryOf)).toBeLessThanOrEqual(
      0.35 + 1e-6
    );
  });

  it('converges on strokes with sharp reversals, within a tight bound', () => {
    for (const kind of [0, 3, 6, 9]) {
      const points = handStroke(kind, 21 + kind, 0.1, 0.02);
      const { points: saved, geometryOf } = run(points, BEZIER, 0.25);
      expect(deviationOf(points, saved, geometryOf)).toBeLessThanOrEqual(
        0.25 + 1e-6
      );
      expect(saved.length).toBeLessThanOrEqual(points.length);
    }
  });

  it('keeps a smooth stroke small even with a tight bound', () => {
    const smooth = handStroke(4, 12, 0, 0);
    const { points: saved, geometryOf } = run(smooth, BEZIER, 0.25);
    expect(deviationOf(smooth, saved, geometryOf)).toBeLessThanOrEqual(
      0.25 + 1e-6
    );
    expect(saved.length).toBeLessThan(smooth.length * 0.5);
  });

  it('adds points only where the saved line departs from the drawn one', () => {
    const smooth = handStroke(4, 12, 0, 0);
    const tight = run(smooth, BEZIER, 0.1);
    expect(
      deviationOf(smooth, tight.points, tight.geometryOf)
    ).toBeLessThanOrEqual(0.1 + 1e-6);
    // a smooth line needs few points however tight the bound, so it is not
    // simply every point, nor the fitted curve's regular spacing
    expect(tight.points.length).toBeLessThan(smooth.length * 0.2);
    expect(tight.points.length).toBeLessThan(tight.candidate.length);
  });

  describe('on a broad stroke', () => {
    const wide = 24;
    const strokeWith = (strokeWidth: number, maxDeviationPx: number) => {
      const points = handStroke(1, 31, 0.3, 0.02);
      const geometryOf = geometryFor(look, 1, strokeWidth);
      const candidate = finalizePoints(points, BEZIER, 0.5, 1);
      const out = finalizeWithinDeviation({
        points,
        candidate,
        finalize: BEZIER,
        toolTolerance: 0.5,
        zoom: 1,
        maxDeviationPx,
        geometryOf,
      });
      return {
        points,
        saved: out.points,
        deviation: deviationOf(points, out.points, geometryOf),
      };
    };

    it('lets the line move more than on a hairline, and keeps fewer points', () => {
      const thin = strokeWith(HAIRLINE, 0.25);
      const broad = strokeWith(wide, 0.25);
      expect(broad.saved.length).toBeLessThan(thin.saved.length);
      expect(broad.deviation).toBeGreaterThan(thin.deviation);
    });

    it('keeps the line within a share of its width, never more than four times the bound', () => {
      const broad = strokeWith(wide, 0.25);
      expect(broad.deviation).toBeLessThanOrEqual(0.25 * 4 + 1e-6);

      // a very broad stroke is held to four times the bound, not to its width
      const huge = strokeWith(200, 0.25);
      expect(huge.deviation).toBeLessThanOrEqual(0.25 * 4 + 1e-6);
    });

    it('never moves the line less than the bound asked for', () => {
      const broad = strokeWith(wide, 3);
      expect(broad.deviation).toBeLessThanOrEqual(3 + 1e-6);
    });
  });

  it('stops at a deadline it is given', () => {
    const points = handStroke(1);
    const candidate = finalizePoints(points, BEZIER, 0.5, 1);
    const out = finalizeWithinDeviation({
      points,
      candidate,
      finalize: BEZIER,
      toolTolerance: 0.5,
      zoom: 1,
      maxDeviationPx: 0.05,
      geometryOf: geometryFor(look),
      deadline: -1,
    });
    // by default what is kept is every drawn point
    expect(out.points).toBe(points);
  });

  it('keeps every drawn point rather than hold up the release when it takes too long', () => {
    const points = handStroke(1);
    const candidate = finalizePoints(points, BEZIER, 0.5, 1);
    let clock = 0;
    const now = vi
      .spyOn(performance, 'now')
      .mockImplementation(() => (clock += 500));
    try {
      const out = finalizeWithinDeviation({
        points,
        candidate,
        finalize: BEZIER,
        toolTolerance: 0.5,
        zoom: 1,
        maxDeviationPx: 0.1,
        geometryOf: geometryFor(look),
        // the limit it has when it is not given one
        deadline: undefined,
      });
      expect(out.points).toBe(points);
      expect(out.deviationPx).toBe(0);
    } finally {
      now.mockRestore();
    }
  });

  it('does a bounded amount of work, however long the stroke', () => {
    const points = Array.from({ length: 3000 }, (_, i) => ({
      x: 10 + i * 1.5,
      y: 300 + 60 * Math.sin(i / 40) + 8 * Math.sin(i / 5),
      pressure: 0.3 + 0.5 * Math.abs(Math.sin(i / 90)),
    }));
    const measure = geometryFor(look);
    let measured = 0;
    finalizeWithinDeviation({
      points,
      candidate: finalizePoints(points, BEZIER, 0.5, 1),
      finalize: BEZIER,
      toolTolerance: 0.5,
      zoom: 1,
      maxDeviationPx: 0.35,
      geometryOf: (p) => {
        measured++;
        return measure(p);
      },
    });
    // the stroke as drawn, what the finishing step left, and one line for each pass
    expect(measured).toBeLessThanOrEqual(30);
  });
});
