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

beforeEach(() =>
  vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0', platform: 'Win32' })
);
afterEach(() => vi.unstubAllGlobals());

const enabled = (
  extra: Partial<WeaveBrushToolActionParams['config']> = {}
): WeaveBrushToolActionParams => ({
  config: {
    ...extra,
    input: {
      profiles: {
        mouse: { capture: { shiftLock: true } },
        touch: { capture: { shiftLock: true } },
        'pen.desktop': { capture: { shiftLock: true } },
      },
    },
  },
});

type Move = { x: number; y: number; shift?: boolean; predicted?: { x: number; y: number }[] };

const stroke = (
  moves: Move[],
  pointerType = 'mouse',
  down: { x: number; y: number; shift?: boolean } = { x: 10, y: 10 }
): Gesture => {
  const steps: GestureStep[] = [
    {
      type: 'down',
      t: 0,
      x: down.x,
      y: down.y,
      pressure: 0.5,
      pointerType,
      shiftKey: down.shift,
    },
  ];
  moves.forEach((m, i) =>
    steps.push({
      type: 'move',
      t: (i + 1) * 10,
      x: m.x,
      y: m.y,
      pressure: 0.5,
      pointerType,
      shiftKey: m.shift,
      predicted: m.predicted?.map((p) => ({ ...p, pressure: 0.5 })),
    })
  );
  steps.push({ type: 'up', t: moves.length * 10 + 10 });
  return { name: 'shift', steps };
};

const live = (g: Gesture, params?: WeaveBrushToolActionParams, env = IDENTITY_ENV) =>
  runGesture(g, params, undefined, env).live;

// A stroke that wanders: with Shift it is a horizontal line from the start.
const wander: Move[] = [
  { x: 14, y: 11, shift: true },
  { x: 40, y: 17, shift: true },
  { x: 70, y: 9, shift: true },
  { x: 100, y: 25, shift: true },
];

describe('Shift lock', () => {
  it('is off by default: the stroke follows the pointer', () => {
    const out = live(stroke(wander));
    expect(out.map((p) => p.y)).toEqual([10, 11, 17, 9, 25]);
  });

  it('follows the pointer without Shift even when enabled', () => {
    const out = live(
      stroke(wander.map((m) => ({ ...m, shift: false }))),
      enabled()
    );
    expect(out.map((p) => p.y)).toEqual([10, 11, 17, 9, 25]);
  });

  it('locks to the heading chosen 16 px from where Shift went down', () => {
    const out = live(stroke(wander), enabled());
    // 4 px away: not locked yet; from 30 px away on, on the 0 degree line
    expect(out[1].y).toBe(11);
    expect(out.slice(2).map((p) => p.y)).toEqual([10, 10, 10]);
    expect(out.slice(2).map((p) => p.x)).toEqual([40, 70, 100]);
  });

  it('locks to a diagonal heading', () => {
    const out = live(
      stroke([
        { x: 12, y: 12, shift: true },
        { x: 40, y: 38, shift: true },
        { x: 60, y: 70, shift: true },
      ]),
      enabled()
    );
    const [, , p2, p3] = out;
    expect(p2.x - 10).toBeCloseTo(p2.y - 10, 2);
    expect(p3.x - 10).toBeCloseTo(p3.y - 10, 2);
  });

  it('stops locking when Shift is released during the stroke', () => {
    const out = live(
      stroke([
        { x: 14, y: 11, shift: true },
        { x: 40, y: 17, shift: true },
        { x: 70, y: 30, shift: false },
        { x: 80, y: 40, shift: false },
      ]),
      enabled()
    );
    expect(out[2].y).toBe(10);
    expect(out[3].y).toBe(30);
    expect(out[4].y).toBe(40);
  });

  it('locks again, from a new anchor, when Shift is pressed again', () => {
    const out = live(
      stroke([
        { x: 14, y: 11, shift: true },
        { x: 40, y: 17, shift: true },
        { x: 50, y: 40, shift: false },
        { x: 52, y: 42, shift: true },
        { x: 52, y: 80, shift: true },
      ]),
      enabled()
    );
    // the second lock starts at the last point before Shift went down again
    expect(out[5].x).toBeCloseTo(50, 2);
  });

  it('works when Shift is already down at pointer down', () => {
    const out = live(
      stroke(
        [
          { x: 50, y: 14, shift: true },
          { x: 90, y: 22, shift: true },
        ],
        'mouse',
        { x: 10, y: 10, shift: true }
      ),
      enabled()
    );
    expect(out[0]).toMatchObject({ x: 10, y: 10 });
    expect(out[2].y).toBe(10);
  });

  it('measures the threshold in screen pixels at every zoom level', () => {
    const zoomed = { ...IDENTITY_ENV, transform: [2, 0, 0, 2, 0, 0] as [number, number, number, number, number, number], zoom: 2 };
    for (const env of [IDENTITY_ENV, zoomed]) {
      const below = live(
        stroke([{ x: 10 + 12, y: 14, shift: true }]),
        enabled(),
        env
      );
      const above = live(
        stroke([{ x: 10 + 20, y: 14, shift: true }]),
        enabled(),
        env
      );
      // below 16 screen px the stroke follows the pointer; above it is locked
      expect(below[1].y).not.toBe(below[0].y);
      expect(above[1].y).toBe(above[0].y);
    }
  });

  it('puts a predicted point on the locked line without changing the lock', () => {
    const out = live(
      stroke([
        { x: 14, y: 11, shift: true },
        { x: 40, y: 17, shift: true, predicted: [{ x: 60, y: 40 }] },
      ]),
      enabled()
    );
    const last = out.at(-1)!;
    expect(last.y).toBe(10);
  });

  it('never locks a touch stroke', () => {
    const out = live(stroke(wander, 'touch'), enabled());
    expect(out.map((p) => p.y)).toEqual([10, 11, 17, 9, 25]);
  });

  it('never locks a pen stroke', () => {
    const out = live(stroke(wander, 'pen'), enabled());
    expect(out.map((p) => p.y)).toEqual([10, 11, 17, 9, 25]);
  });

  it('completes a locked stroke on the line', () => {
    const { persisted } = runGesture(stroke(wander), enabled());
    // points are relative to the node's origin
    const points = persisted!.strokeElements.map((p) => ({
      x: p.x + persisted!.x,
      y: p.y + persisted!.y,
    }));
    const locked = points.filter((p) => p.x >= 40);
    expect(locked.every((p) => p.y === 10)).toBe(true);
    expect(points.at(-1)).toEqual({ x: 100, y: 10 });
  });

  it('keeps a stabilized stroke on the line', () => {
    const out = live(
      stroke(wander),
      enabled({
        input: {
          profiles: {
            mouse: {
              capture: { shiftLock: true },
              stabilizer: { type: 'oneEuro', minCutoff: 3, beta: 0.01 },
            },
          },
        },
      })
    );
    const locked = out.slice(2);
    expect(locked.every((p) => Math.abs(p.y - locked[0].y) < 3)).toBe(true);
  });

  it('does not carry a lock into the next stroke', () => {
    const first = stroke(wander);
    const second = stroke(
      [
        { x: 14, y: 11 },
        { x: 40, y: 17 },
      ],
      'mouse',
      { x: 10, y: 10 }
    );
    const both: Gesture = {
      name: 'two',
      steps: [
        ...first.steps,
        ...(second.steps.map((s) =>
          'type' in s && s.type !== 'pinch' ? { ...s, t: s.t + 1000 } : s
        ) as GestureStep[]),
      ],
    };
    const out = runGesture(both, enabled()).live;
    expect(out.map((p) => p.y)).toEqual([10, 11, 17]);
  });
});
