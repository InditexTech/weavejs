// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type {
  LabPoint,
  LabPressurePoint,
  LabRecordedSample,
  WeaveBrushLabMetrics,
} from './types';

const dist = (a: LabPoint, b: LabPoint) => Math.hypot(a.x - b.x, a.y - b.y);

function distanceToSegment(p: LabPoint, a: LabPoint, b: LabPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = dx * dx + dy * dy;
  const t = l
    ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l))
    : 0;
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

export type StrokeMetricsInput = {
  samples: LabRecordedSample[];
  beforeFinalize: LabPressurePoint[];
  finalPoints: LabPressurePoint[];
  strokeWidth: number;
  drawMs: number;
};

function countDuplicates(real: LabRecordedSample[]): number {
  let count = 0;
  for (let i = 1; i < real.length; i++) {
    if (dist(real[i].raw, real[i - 1].raw) === 0) count++;
  }
  return count;
}

function distanceToPolyline(p: LabPressurePoint, line: LabPressurePoint[]): number {
  if (line.length === 1) return dist(p, line[0]);
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    best = Math.min(best, distanceToSegment(p, line[i - 1], line[i]));
  }
  return best;
}

function measureMovedOnFinish(
  before: LabPressurePoint[],
  final: LabPressurePoint[]
): number {
  if (final.length === 0) return 0;
  let moved = 0;
  for (const p of before) {
    moved = Math.max(moved, distanceToPolyline(p, final));
  }
  return moved;
}

/** Measures a finished stroke from what the brush tool reported. */
export function computeStrokeMetrics(
  input: StrokeMetricsInput
): Omit<WeaveBrushLabMetrics, 'profile' | 'preset' | 'scenario'> {
  const real = input.samples.filter((s) => !s.predicted);

  const droppedDuplicates = countDuplicates(real);

  const spanMs =
    real.length > 1 ? real.at(-1)!.time - real[0].time : 0;
  const effectiveRateHz = spanMs > 0 ? ((real.length - 1) / spanMs) * 1000 : 0;

  const jitters: number[] = [];
  for (let i = 1; i < real.length - 1; i++) {
    jitters.push(
      distanceToSegment(real[i].raw, real[i - 1].raw, real[i + 1].raw)
    );
  }

  const lag = mean(real.map((s) => dist(s.raw, s.stabilized)));

  const movedOnFinish = measureMovedOnFinish(
    input.beforeFinalize,
    input.finalPoints
  );

  const steps: number[] = [];
  for (let i = 1; i < input.finalPoints.length; i++) {
    steps.push(
      Math.abs(
        input.finalPoints[i].pressure - input.finalPoints[i - 1].pressure
      ) * input.strokeWidth
    );
  }

  return {
    samples: real.length,
    points: input.finalPoints.length,
    droppedDuplicates,
    effectiveRateHz,
    jitter: mean(jitters),
    lag,
    movedOnFinish,
    widthRoughness: mean(steps),
    drawMs: input.drawMs,
  };
}
