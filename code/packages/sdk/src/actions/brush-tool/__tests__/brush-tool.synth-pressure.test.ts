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
import {
  IDENTITY_ENV,
  type Gesture,
  type GestureStep,
  runGesture,
} from './shared/brush-golden.helpers';
import { createPressureState, smoothPressure } from '../stages/pressure';
import { BRUSH_LEGACY_INPUT_PROFILE } from '../constants';

beforeEach(() =>
  vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0', platform: 'Win32' })
);
afterEach(() => vi.unstubAllGlobals());

const synth = (
  profile: 'mouse' | 'touch' | 'pen.desktop',
  pressure: Record<string, unknown> = {}
): WeaveBrushToolActionParams => ({
  config: {
    input: {
      profiles: {
        [profile]: {
          capture: { source: 'coalesced', clock: 'event' },
          pressure: { synth: 'velocity', filter: 'none', start: 'none', end: 'none', ...pressure },
        },
      },
    },
  },
});

/** A straight stroke of `n` moves, `step` screen px and 10 ms apart. */
const line = (step: number, pointerType = 'mouse', n = 8, pressure = 0.5): Gesture => {
  const steps: GestureStep[] = [
    { type: 'down', t: 0, x: 10, y: 10, pressure, pointerType },
  ];
  for (let i = 1; i <= n; i++) {
    steps.push({ type: 'move', t: i * 10, x: 10 + i * step, y: 10, pressure, pointerType });
  }
  steps.push({ type: 'up', t: n * 10 + 10 });
  return { name: 'line', steps };
};

const pressures = (g: Gesture, params?: WeaveBrushToolActionParams, env = IDENTITY_ENV) =>
  runGesture(g, params, undefined, env).live.map((p) => p.pressure);

describe('velocity-synthesised pressure', () => {
  it('records a lower pressure for a fast stroke than for a slow one', () => {
    const slow = pressures(line(2), synth('mouse'));
    const fast = pressures(line(40), synth('mouse'));
    expect(Math.min(...slow.slice(2))).toBeGreaterThan(Math.max(...fast.slice(2)));
  });

  it('lowers the pressure as the pointer speeds up', () => {
    const steps: GestureStep[] = [
      { type: 'down', t: 0, x: 10, y: 10, pressure: 0.5, pointerType: 'mouse' },
    ];
    let x = 10;
    [2, 2, 2, 30, 30, 30].forEach((d, i) => {
      x += d;
      steps.push({ type: 'move', t: (i + 1) * 10, x, y: 10, pressure: 0.5, pointerType: 'mouse' });
    });
    steps.push({ type: 'up', t: 100 });
    const out = pressures({ name: 'accel', steps }, synth('mouse'));
    expect(out[3]).toBeGreaterThan(out[5]);
  });

  it('is the same at every zoom level', () => {
    const at1 = pressures(line(12), synth('mouse'));
    const at2 = pressures(line(12), synth('mouse'), {
      ...IDENTITY_ENV,
      transform: [2, 0, 0, 2, 0, 0],
      zoom: 2,
    });
    expect(at2).toEqual(at1);
  });

  it('works for a finger', () => {
    const slow = pressures(line(2, 'touch'), synth('touch'));
    const fast = pressures(line(40, 'touch'), synth('touch'));
    expect(Math.min(...slow.slice(2))).toBeGreaterThan(Math.max(...fast.slice(2)));
  });

  it('leaves the pressure of a pen as the pen reports it', () => {
    const withSynth = pressures(line(40, 'pen', 8, 0.7), synth('pen.desktop', { zero: 'keep' }));
    const without = pressures(line(40, 'pen', 8, 0.7), {
      config: {
        input: {
          profiles: {
            'pen.desktop': {
              capture: { source: 'coalesced', clock: 'event' },
              pressure: { filter: 'none', start: 'none', end: 'none', zero: 'keep' },
            },
          },
        },
      },
    });
    expect(withSynth).toEqual(without);
    expect(withSynth.every((p) => p === 0.7)).toBe(true);
  });

  it('records the neutral constant when it is not set', () => {
    const out = pressures(line(40), {
      config: {
        input: {
          profiles: {
            mouse: { capture: { source: 'coalesced' }, pressure: { filter: 'none' } },
          },
        },
      },
    });
    expect(out.every((p) => p === 0.5)).toBe(true);
  });

  it('keeps every value finite and above the floor', () => {
    const out = pressures(line(500), synth('mouse'));
    expect(out.every((p) => Number.isFinite(p) && p >= 0.15 && p <= 1)).toBe(true);
  });
});

describe('smoothPressure with synth', () => {
  const cfg = { ...BRUSH_LEGACY_INPUT_PROFILE.pressure, filter: 'none' as const };

  it('uses the pressure the device reports when synth is off', () => {
    const state = createPressureState();
    expect(smoothPressure(state, cfg, 0.8, 0, 0, 0, 'mouse')).toBe(0.8);
  });

  it('starts from a neutral pressure and ignores a non-finite position', () => {
    const state = createPressureState();
    const c = { ...cfg, synth: 'velocity' as const };
    expect(smoothPressure(state, c, 0.5, 0, 0, 0, 'mouse')).toBe(0.5);
    expect(
      Number.isFinite(smoothPressure(state, c, 0.5, NaN, NaN, 10, 'mouse'))
    ).toBe(true);
  });

  it('assumes a nominal interval when the clock does not advance', () => {
    const state = createPressureState();
    const c = { ...cfg, synth: 'velocity' as const };
    smoothPressure(state, c, 0.5, 0, 0, 100, 'mouse');
    const p = smoothPressure(state, c, 0.5, 10, 0, 100, 'mouse');
    expect(Number.isFinite(p)).toBe(true);
    expect(p).toBeLessThan(1);
  });
});
