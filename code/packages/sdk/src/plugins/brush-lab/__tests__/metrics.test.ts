// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { computeStrokeMetrics } from '../metrics';
import type { LabRecordedSample } from '../types';

const sample = (
  x: number,
  y: number,
  time: number,
  extra: Partial<LabRecordedSample> = {}
): LabRecordedSample => ({
  raw: { x, y },
  stabilized: { x, y },
  pressure: 0.5,
  time,
  predicted: false,
  ...extra,
});

const pp = (x: number, y: number, pressure = 0.5) => ({ x, y, pressure });

describe('computeStrokeMetrics', () => {
  it('counts samples and leaves predicted ones out', () => {
    const m = computeStrokeMetrics({
      samples: [
        sample(0, 0, 0),
        sample(1, 0, 10),
        sample(2, 0, 20, { predicted: true }),
      ],
      beforeFinalize: [],
      finalPoints: [pp(0, 0), pp(1, 0)],
      strokeWidth: 10,
      drawMs: 3,
    });
    expect(m.samples).toBe(2);
    expect(m.points).toBe(2);
    expect(m.drawMs).toBe(3);
  });

  it('counts consecutive samples at the same position as duplicates', () => {
    const m = computeStrokeMetrics({
      samples: [
        sample(0, 0, 0),
        sample(0, 0, 5),
        sample(0, 0, 10),
        sample(3, 0, 15),
      ],
      beforeFinalize: [],
      finalPoints: [],
      strokeWidth: 10,
      drawMs: 0,
    });
    expect(m.droppedDuplicates).toBe(2);
  });

  it('measures the effective rate from the sample times', () => {
    const samples = Array.from({ length: 11 }, (_, i) => sample(i, 0, i * 8));
    const m = computeStrokeMetrics({
      samples,
      beforeFinalize: [],
      finalPoints: [],
      strokeWidth: 1,
      drawMs: 0,
    });
    expect(m.effectiveRateHz).toBeCloseTo(125, 5);
  });

  it('has no jitter on a straight line and some off it', () => {
    const straight = Array.from({ length: 6 }, (_, i) => sample(i * 5, 0, i));
    const noisy = straight.map((s, i) => (i % 2 ? sample(s.raw.x, 2, i) : s));
    const base = {
      beforeFinalize: [],
      finalPoints: [],
      strokeWidth: 1,
      drawMs: 0,
    };
    expect(computeStrokeMetrics({ ...base, samples: straight }).jitter).toBe(0);
    expect(
      computeStrokeMetrics({ ...base, samples: noisy }).jitter
    ).toBeGreaterThan(1);
  });

  it('measures the lag between raw and stabilized positions', () => {
    const samples = [
      sample(0, 0, 0, { stabilized: { x: 0, y: 0 } }),
      sample(10, 0, 1, { stabilized: { x: 6, y: 0 } }),
      sample(20, 0, 2, { stabilized: { x: 14, y: 0 } }),
    ];
    const m = computeStrokeMetrics({
      samples,
      beforeFinalize: [],
      finalPoints: [],
      strokeWidth: 1,
      drawMs: 0,
    });
    expect(m.lag).toBeCloseTo((0 + 4 + 6) / 3, 10);
  });

  it('measures how far finishing moved the points', () => {
    const m = computeStrokeMetrics({
      samples: [],
      beforeFinalize: [pp(0, 0), pp(5, 3), pp(10, 0)],
      finalPoints: [pp(0, 0), pp(10, 0)],
      strokeWidth: 1,
      drawMs: 0,
    });
    expect(m.movedOnFinish).toBeCloseTo(3, 10);
  });

  it('measures width roughness as the mean change of width', () => {
    const m = computeStrokeMetrics({
      samples: [],
      beforeFinalize: [],
      finalPoints: [pp(0, 0, 0.5), pp(1, 0, 1), pp(2, 0, 0.5)],
      strokeWidth: 10,
      drawMs: 0,
    });
    expect(m.widthRoughness).toBeCloseTo(5, 10);
  });

  it('copes with empty input', () => {
    const m = computeStrokeMetrics({
      samples: [],
      beforeFinalize: [],
      finalPoints: [],
      strokeWidth: 1,
      drawMs: 0,
    });
    expect(m).toMatchObject({
      samples: 0,
      points: 0,
      effectiveRateHz: 0,
      jitter: 0,
      lag: 0,
      movedOnFinish: 0,
    });
  });
});
