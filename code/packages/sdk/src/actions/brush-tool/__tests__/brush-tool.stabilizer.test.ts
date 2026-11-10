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
import { type Gesture, type GestureStep, type StageEnv, runGesture } from './shared/brush-golden.helpers';

type Stabilizer = Record<string, unknown>;

const config = (stabilizer: Stabilizer): WeaveBrushToolActionParams => ({
  config: {
    input: {
      profiles: {
        'pen.desktop': {
          capture: { source: 'coalesced', clock: 'event' },
          pressure: { filter: 'none', start: 'none', end: 'none', zero: 'keep' },
          stabilizer,
        },
      },
    },
  },
});

beforeEach(() =>
  vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0', platform: 'Win32' })
);
afterEach(() => vi.unstubAllGlobals());

const N = 120;
const START_X = 100;
const LINE_Y = 100;

/** Deterministic jitter in [-1, 1]. */
const jitter = (i: number) => ((i * 7919) % 13) / 6 - 1;

/** A straight pen line at 200 Hz with 1 screen-pixel jitter across it. */
function jittery(speed = 2): Gesture {
  const steps: GestureStep[] = [
    { type: 'down', t: 0, x: START_X, y: LINE_Y, pressure: 0.5, pointerType: 'pen' },
  ];
  for (let i = 1; i <= N; i++) {
    steps.push({
      type: 'move',
      t: i * 5,
      x: START_X + i * speed,
      y: LINE_Y + jitter(i),
      pressure: 0.5,
      pointerType: 'pen',
    });
  }
  steps.push({ type: 'up', t: N * 5 + 5 });
  return { name: 'jittery-line', steps };
}

const rms = (values: number[]) =>
  Math.sqrt(values.reduce((s, v) => s + v * v, 0) / values.length);

/** RMS distance of the recorded points from the straight line, after warm-up. */
const deviation = (g: Gesture, stabilizer: Stabilizer, env?: StageEnv) => {
  const { live } = runGesture(g, config(stabilizer), undefined, env);
  return rms(live.slice(30).map((p) => p.y - LINE_Y / (env?.zoom ?? 1)));
};

const raw = deviation(jittery(), { type: 'none' });

describe('stabilizer off', () => {
  it('records the reported positions', () => {
    const { live } = runGesture(jittery(), config({ type: 'none' }));
    expect(live.map((p) => [p.x, p.y])).toEqual([
      [START_X, LINE_Y],
      ...Array.from({ length: N }, (_, k) => [
        START_X + (k + 1) * 2,
        Math.round((LINE_Y + jitter(k + 1)) * 1e4) / 1e4,
      ]),
    ]);
  });

  it('shows the raw jitter the stabilizers must remove', () => {
    expect(raw).toBeGreaterThan(0.5);
  });
});

// The pen moves at 400 px/s. Each filter lags by about speed x time constant:
// One Euro at 1 Hz: 400 / (2 pi) = 64 px; streamline at amount 0.5: 400 x 0.04 s
// = 16 px; the pulled string trails by its leash, 4 px.
describe.each([
  ['oneEuro', { type: 'oneEuro', minCutoff: 1, beta: 0, zoomAware: false }, 70],
  ['pulledString', { type: 'pulledString', radiusPx: 4, zoomAware: false }, 6],
  ['streamline', { type: 'streamline', amount: 0.5, zoomAware: false }, 20],
])('%s', (_name, stabilizer, maxLag) => {
  it('reduces hand shake around a straight path', () => {
    expect(deviation(jittery(), stabilizer)).toBeLessThan(raw * 0.6);
  });

  it('keeps following the pen along the path', () => {
    const { live } = runGesture(jittery(), config(stabilizer));
    const lastX = live[live.length - 1].x;
    // lags by no more than the filter's own time constant allows
    expect(lastX).toBeGreaterThan(START_X + N * 2 - maxLag);
    expect(lastX).toBeLessThanOrEqual(START_X + N * 2);
    for (let i = 1; i < live.length; i++) {
      expect(live[i].x).toBeGreaterThanOrEqual(live[i - 1].x - 1e-6);
    }
  });

  it('is deterministic', () => {
    expect(runGesture(jittery(), config(stabilizer)).live).toEqual(
      runGesture(jittery(), config(stabilizer)).live
    );
  });

  it('starts from the pointer-down position', () => {
    const { live } = runGesture(jittery(), config(stabilizer));
    expect(live[0]).toMatchObject({ x: START_X, y: LINE_Y });
    // the first stabilized point is near the start, not at the first raw sample
    expect(Math.abs(live[1].x - START_X)).toBeLessThanOrEqual(2 + 1e-6);
  });
});

describe('completing the stroke where the pen was lifted', () => {
  const lagging = { type: 'streamline', amount: 1, zoomAware: false };
  const endX = START_X + N * 2;

  const lastAbsolute = (stabilizer: Stabilizer) => {
    const { persisted } = runGesture(jittery(), config(stabilizer));
    const last = persisted!.strokeElements[persisted!.strokeElements.length - 1];
    return { x: persisted!.x + last.x, y: persisted!.y + last.y };
  };

  it('ends at the release position', () => {
    const last = lastAbsolute({ ...lagging, catchUpOnEnd: true });
    expect(last.x).toBeCloseTo(endX, 3);
    expect(last.y).toBeCloseTo(LINE_Y + jitter(N), 3);
  });

  it('would otherwise stop short of it', () => {
    const last = lastAbsolute({ ...lagging, catchUpOnEnd: false });
    expect(endX - last.x).toBeGreaterThan(5);
  });

  it('adds no point when the stroke already ends there', () => {
    const a = runGesture(jittery(), config({ type: 'streamline', amount: 0, catchUpOnEnd: true }));
    const b = runGesture(jittery(), config({ type: 'streamline', amount: 0, catchUpOnEnd: false }));
    expect(a.persisted).toEqual(b.persisted);
  });
});

describe('zoom', () => {
  const euro = (zoomAware: boolean) => ({
    type: 'oneEuro',
    minCutoff: 1.5,
    beta: 0.05,
    zoomAware,
  });

  /** Same on-screen path and jitter, at a given zoom. */
  const onScreenDeviation = (zoom: number, zoomAware: boolean) => {
    const env: StageEnv = {
      rect: { left: 0, top: 0, width: 100, height: 100 },
      clientWidth: 100,
      clientHeight: 100,
      transform: [zoom, 0, 0, zoom, 0, 0],
      zoom,
    };
    const { live } = runGesture(jittery(4), config(euro(zoomAware)), undefined, env);
    // container units -> screen pixels
    return rms(live.slice(30).map((p) => p.y * zoom - LINE_Y));
  };

  it('zoom-aware distances give the same effect on screen at any zoom', () => {
    const far = onScreenDeviation(0.5, true);
    const near = onScreenDeviation(2, true);
    expect(Math.abs(far - near) / near).toBeLessThan(0.05);
  });

  it('canvas-unit distances do not', () => {
    const far = onScreenDeviation(0.5, false);
    const near = onScreenDeviation(2, false);
    expect(Math.abs(far - near) / near).toBeGreaterThan(0.2);
  });
});
