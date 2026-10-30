// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('konva', () => ({ default: {} }));

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import type { WeaveBrushToolActionParams } from '../types';
import { type Gesture, type GestureStep, runGesture } from './shared/brush-golden.helpers';

type Pressure = Record<string, unknown>;

/** A pen.desktop profile that records readings as they are, plus overrides. */
const pen = (pressure: Pressure = {}): WeaveBrushToolActionParams => ({
  config: {
    input: {
      profiles: {
        'pen.desktop': {
          capture: { source: 'coalesced', clock: 'event' },
          pressure: { filter: 'none', start: 'none', end: 'none', zero: 'keep', ...pressure },
        },
      },
    },
  },
});

beforeEach(() =>
  vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0', platform: 'Win32' })
);
afterEach(() => vi.unstubAllGlobals());

/**
 * A pen stroke whose readings are `pressures`, 5 ms apart. With `still` the pen
 * does not move, which keeps the legacy filter's speed-dependent factor at its
 * minimum.
 */
const stroke = (
  pressures: number[],
  pointerType = 'pen',
  still = false
): Gesture => {
  const steps: GestureStep[] = [
    { type: 'down', t: 0, x: 10, y: 10, pressure: pressures[0], pointerType },
  ];
  pressures.slice(1).forEach((pressure, i) =>
    steps.push({
      type: 'move',
      t: (i + 1) * 5,
      x: still ? 10 : 10 + (i + 1) * 8,
      y: still ? 10 : 10 + ((i + 1) % 2 ? 9 : -9),
      pressure,
      pointerType,
    })
  );
  steps.push({ type: 'up', t: pressures.length * 5 + 5 });
  return { name: 'pressure', steps };
};

const live = (g: Gesture, pressure: Pressure = {}) =>
  runGesture(g, pen(pressure)).live.map((p) => p.pressure);

describe('zero pressure', () => {
  const lift = [0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0];

  it('keep records the fall towards the floor without rising to 0.5', () => {
    const out = live(stroke(lift), { zero: 'keep' });
    expect(out).toEqual([0.6, 0.5, 0.4, 0.3, 0.2, 0.15, 0.15]);
    for (let i = 1; i < out.length; i++) expect(out[i]).toBeLessThanOrEqual(out[i - 1]);
  });

  it('legacy replaces 0 with 0.5', () => {
    const out = live(stroke(lift), { zero: 'legacy' });
    expect(out[out.length - 1]).toBe(0.5);
  });

  it('holdLast repeats the last non-zero reading', () => {
    const out = live(stroke([0.6, 0.5, 0.4, 0, 0]), { zero: 'holdLast' });
    expect(out).toEqual([0.6, 0.5, 0.4, 0.4, 0.4]);
  });

  it('holdLast falls back to 0.5 when there is no earlier reading', () => {
    const out = live(stroke([0, 0, 0.3]), { zero: 'holdLast' });
    expect(out).toEqual([0.5, 0.5, 0.3]);
  });

  it('a mouse always records the neutral pressure', () => {
    const params: WeaveBrushToolActionParams = {
      config: { input: { profiles: { mouse: { capture: { source: 'coalesced' }, pressure: { zero: 'keep', filter: 'none' } } } } },
    };
    const out = runGesture(stroke([0, 0, 0.9, 0], 'mouse'), params).live;
    expect(out.every((p) => p.pressure === 0.5)).toBe(true);
  });
});

describe('pressure filters', () => {
  it('none records readings subject only to the floor', () => {
    expect(live(stroke([0.9, 0.1, 0.8, 0.05, 0.7]))).toEqual([0.9, 0.15, 0.8, 0.15, 0.7]);
  });

  it('keep every filter finite on invalid readings', () => {
    const readings = [0.5, NaN, 0.6, Infinity, 0.4, -Infinity, 0.5];
    for (const filter of ['legacy', 'timeEma', 'oneEuro', 'none']) {
      const out = live(stroke(readings), { filter });
      expect(out.every((p) => Number.isFinite(p) && p >= 0.15), filter).toBe(true);
    }
  });

  it('does not let a stroke start from the previous stroke', () => {
    const heavy = stroke([0.9, 0.9, 0.9, 0.9, 0.9]);
    const light = stroke([0.2, 0.2, 0.2, 0.2, 0.2]);
    const both: Gesture = {
      name: 'two',
      steps: [...heavy.steps, ...light.steps.map((s) => (s.type === 'up' ? { ...s, t: s.t + 1000 } : s.type === 'pinch' ? s : { ...s, t: s.t + 1000 }))] as GestureStep[],
    };
    for (const filter of ['legacy', 'timeEma', 'oneEuro']) {
      const alone = runGesture(light, pen({ filter }));
      const second = runGesture(both, pen({ filter }));
      expect(second.persisted!.strokeElements.map((p) => p.pressure), filter).toEqual(
        alone.persisted!.strokeElements.map((p) => p.pressure)
      );
    }
  });

  describe('report rate', () => {
    const signal = (t: number) => 0.5 + 0.3 * Math.sin((2 * Math.PI * 2 * t) / 1000);

    /** Filtered pressures of the same signal sampled at `hz`, as [time, value]. */
    const sampled = (hz: number, filter: string): [number, number][] => {
      const step = 1000 / hz;
      const times: number[] = [];
      for (let t = 0; t <= 1000; t += step) times.push(t);
      const g = stroke(times.map(signal), 'pen', true);
      // re-time the steps to the real sample times
      g.steps.forEach((s, i) => {
        if (s.type === 'down' || s.type === 'move') (s as { t: number }).t = times[i];
      });
      const out = live(g, { filter, timeConstantMs: 40, oneEuro: { minCutoff: 1.5, beta: 0.02 } });
      return out.map((v, i) => [times[i], v]);
    };

    const at = (curve: [number, number][], t: number) => {
      for (let i = 1; i < curve.length; i++) {
        if (curve[i][0] >= t) {
          const [t0, v0] = curve[i - 1];
          const [t1, v1] = curve[i];
          return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
        }
      }
      return curve[curve.length - 1][1];
    };

    const worstGap = (a: [number, number][], b: [number, number][]) =>
      Math.max(...a.filter(([t]) => t > 100).map(([t, v]) => Math.abs(v - at(b, t))));

    it.each(['timeEma', 'oneEuro'])('%s agrees at 133 Hz and 240 Hz', (filter) => {
      expect(worstGap(sampled(133, filter), sampled(240, filter))).toBeLessThan(0.03);
    });

    it('the legacy filter, which depends on the report rate, does not', () => {
      const legacy = worstGap(sampled(133, 'legacy'), sampled(240, 'legacy'));
      const timeEma = worstGap(sampled(133, 'timeEma'), sampled(240, 'timeEma'));
      expect(legacy).toBeGreaterThan(timeEma * 3);
    });
  });

  it('timeEma follows a step with the configured time constant', () => {
    // The first movement reading seeds every filter (the pointer-down reading
    // never does), so the step comes after it: 0.2 for 6 samples, then 0.8.
    const readings = [0.9, ...Array.from({ length: 6 }, () => 0.2), ...Array.from({ length: 40 }, () => 0.8)];
    const out = live(stroke(readings), { filter: 'timeEma', timeConstantMs: 40 });

    expect(out.slice(1, 7)).toEqual(Array.from({ length: 6 }, () => 0.2));
    // the step sample is 5 ms after the last 0.2; 8 samples in, 40 ms = one time constant
    const afterTau = out[7 + 7];
    expect(afterTau).toBeGreaterThan(0.2 + 0.6 * 0.58);
    expect(afterTau).toBeLessThan(0.2 + 0.6 * 0.68);
    expect(out[out.length - 1]).toBeCloseTo(0.8, 2);
  });

  it('oneEuro smooths slow changes more than fast ones', () => {
    const noisy = Array.from({ length: 40 }, (_, i) => 0.5 + (i % 2 ? 0.05 : -0.05));
    const out = live(stroke(noisy), { filter: 'oneEuro', oneEuro: { minCutoff: 1, beta: 0 } });
    const spread = (a: number[]) => Math.max(...a) - Math.min(...a);
    expect(spread(out.slice(10))).toBeLessThan(spread(noisy.slice(10)) * 0.4);
  });
});

describe('start policy', () => {
  const spike = [0.9, 0.3, 0.4, 0.5, 0.6];

  it('backfill takes the first movement reading', () => {
    expect(live(stroke(spike), { start: 'backfill' })[0]).toBeCloseTo(0.3, 5);
  });

  it('average takes the mean of the first movement readings', () => {
    expect(live(stroke(spike), { start: 'average', startSamples: 3 })[0]).toBeCloseTo(0.4, 5);
  });

  it('average refines as readings arrive and stops after the configured count', () => {
    expect(live(stroke([0.9, 0.3, 0.4]), { start: 'average', startSamples: 3 })[0]).toBeCloseTo(0.35, 5);
    expect(live(stroke([0.9, 0.3, 0.4, 0.5, 0.9]), { start: 'average', startSamples: 3 })[0]).toBeCloseTo(0.4, 5);
  });

  it('none keeps the contact reading', () => {
    expect(live(stroke(spike), { start: 'none' })[0]).toBe(0.9);
  });

  it('is not changed by a predicted sample', () => {
    const g: Gesture = {
      name: 'predicted',
      steps: [
        { type: 'down', t: 0, x: 10, y: 10, pressure: 0.9, pointerType: 'pen' },
        {
          type: 'move', t: 16, x: 20, y: 12, pressure: 0.3, pointerType: 'pen',
          predicted: [{ x: 400, y: 400, pressure: 0.1 }],
          coalesced: [{ x: 15, y: 11, pressure: 0.3 }, { x: 20, y: 12, pressure: 0.3 }],
        },
        { type: 'up', t: 32 },
      ],
    };
    const first = runGesture(g, pen({ start: 'average', startSamples: 3 })).live[0];
    expect(first.pressure).toBeCloseTo(0.3, 5);
  });
});

describe('end policy', () => {
  const spikeEnd = [0.3, 0.3, 0.3, 0.3, 0.8];

  it('backfill gives the last point the previous pressure', () => {
    const out = runGesture(stroke(spikeEnd), pen({ end: 'backfill' })).persisted!.strokeElements;
    expect(out[out.length - 1].pressure).toBeCloseTo(0.3, 5);
  });

  it('none keeps the lift-off reading', () => {
    const out = runGesture(stroke(spikeEnd), pen({ end: 'none' })).persisted!.strokeElements;
    expect(out[out.length - 1].pressure).toBeCloseTo(0.8, 5);
  });
});
