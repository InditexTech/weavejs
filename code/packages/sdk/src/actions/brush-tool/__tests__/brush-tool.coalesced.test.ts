// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, afterEach } from 'vitest';

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
  type Gesture,
  type GestureStep,
  type StageEnv,
  composeTransforms,
  runGesture,
} from './shared/brush-golden.helpers';

const coalescedConfig = (
  capture: Record<string, unknown> = {}
): WeaveBrushToolActionParams => ({
  config: {
    input: {
      profiles: {
        'pen.desktop': { capture: { source: 'coalesced', ...capture } },
      },
    },
  },
});

type P = { x: number; y: number; pressure: number };

/** A pen gesture: down, then frames that each report `perFrame` distinct samples. */
function penGesture(
  frames: number,
  perFrame: number,
  opts: { predicted?: boolean; start?: P } = {}
): { gesture: Gesture; samples: P[]; down: P } {
  const start = opts.start ?? { x: 300, y: 200, pressure: 0.4 };
  const samples: P[] = [];
  const steps: GestureStep[] = [
    { type: 'down', t: 0, ...start, pointerType: 'pen' },
  ];
  let k = 0;
  for (let f = 0; f < frames; f++) {
    const co: P[] = [];
    for (let j = 0; j < perFrame; j++) {
      k++;
      // a zigzag keeps every point after simplification
      co.push({ x: start.x + k * 7, y: start.y + (k % 2 ? 9 : -9), pressure: 0.3 + 0.01 * k });
    }
    samples.push(...co);
    const last = co[co.length - 1];
    steps.push({
      type: 'move',
      t: (f + 1) * 16.67,
      ...last,
      pointerType: 'pen',
      coalesced: co,
      predicted: opts.predicted
        ? [{ x: last.x + 500, y: last.y + 500, pressure: last.pressure }]
        : undefined,
    });
  }
  steps.push({ type: 'up', t: (frames + 1) * 16.67 });
  return { gesture: { name: 'pen', steps }, samples, down: start };
}

const platform = () =>
  vi.stubGlobal('navigator', {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
    platform: 'Win32',
  });

afterEach(() => vi.unstubAllGlobals());

describe('coalesced capture', () => {
  it('records every distinct sample position in the order reported', () => {
    platform();
    const { gesture, samples, down } = penGesture(10, 4);
    const result = runGesture(gesture, coalescedConfig());

    expect(result.profileKey).toBe('pen.desktop');
    expect(result.live.map((p) => [p.x, p.y])).toEqual([
      [down.x, down.y],
      ...samples.map((s) => [s.x, s.y]),
    ]);
  });

  it('never records two consecutive samples at one position when they differ', () => {
    platform();
    const { gesture } = penGesture(12, 3);
    const { live } = runGesture(gesture, coalescedConfig());
    for (let i = 1; i < live.length; i++) {
      expect([live[i].x, live[i].y]).not.toEqual([live[i - 1].x, live[i - 1].y]);
    }
  });

  it('keeps the legacy behaviour of one position per event when not selected', () => {
    platform();
    const { gesture, samples } = penGesture(10, 4);
    const legacy = runGesture(gesture);
    const distinct = new Set(legacy.live.map((p) => `${p.x},${p.y}`)).size;
    expect(distinct).toBeLessThan(samples.length / 2);
  });

  it('does not write the stage pointer position', () => {
    platform();
    const { gesture } = penGesture(6, 3, { predicted: true });
    expect(runGesture(gesture, coalescedConfig()).stagePointerWrites).toBe(0);
    expect(runGesture(gesture).stagePointerWrites).toBeGreaterThan(0);
  });

  it('smooths the pressure of every sample and respects the floor', () => {
    platform();
    const { gesture } = penGesture(8, 3);
    const { live } = runGesture(gesture, coalescedConfig());
    expect(live.every((p) => Number.isFinite(p.pressure) && p.pressure >= 0.15)).toBe(true);
  });

  describe('positions on scaled, translated and nested stages', () => {
    // stage content shown at twice its CSS size, offset by (100, 50)
    const rect = { left: 100, top: 50, width: 1000, height: 600 };
    const stage: StageEnv['transform'] = [0.5, 0, 0, 0.5, 30, 10]; // zoom 50%, panned
    const frame: StageEnv['transform'] = [2, 0, 0, 2, -5, 7]; // container nested in a frame
    const env: StageEnv = {
      rect,
      clientWidth: 500,
      clientHeight: 300,
      transform: composeTransforms(stage, frame),
    };

    // expected container position, derived by hand from the geometry above
    const expected = (cx: number, cy: number) => {
      const sx = (cx - rect.left) / 2;
      const sy = (cy - rect.top) / 2;
      const a = 0.5 * 2; // combined scale
      const e = 0.5 * -5 + 30;
      const f = 0.5 * 7 + 10;
      return [(sx - e) / a, (sy - f) / a];
    };

    it('maps every sample like the stage maps its own pointer', () => {
      platform();
      const { gesture, samples, down } = penGesture(8, 3);
      const { live } = runGesture(gesture, coalescedConfig(), undefined, env);

      const want = [down, ...samples].map((s) => expected(s.x, s.y));
      expect(live).toHaveLength(want.length);
      live.forEach((p, i) => {
        expect(p.x).toBeCloseTo(want[i][0], 3);
        expect(p.y).toBeCloseTo(want[i][1], 3);
      });
    });

    it('keeps distinct samples distinct on a scaled stage', () => {
      platform();
      const { gesture } = penGesture(8, 4);
      const { live } = runGesture(gesture, coalescedConfig(), undefined, env);
      expect(new Set(live.map((p) => `${p.x},${p.y}`)).size).toBe(live.length);
    });
  });

  describe('predicted samples', () => {
    it('stay provisional: replaced by the next real samples and removed at the end', () => {
      platform();
      const { gesture, samples } = penGesture(6, 3, { predicted: true });
      const { live, persisted } = runGesture(gesture, coalescedConfig());

      // while drawing: down + all real samples + exactly one predicted tail
      expect(live).toHaveLength(1 + samples.length + 1);
      const tail = live[live.length - 1];
      expect(tail.x).toBe(samples[samples.length - 1].x + 500);

      // once finished no predicted point remains
      expect(persisted!.strokeElements.some((p) => p.x > 1000)).toBe(false);
    });

    it('can be switched off', () => {
      platform();
      const { gesture, samples } = penGesture(6, 3, { predicted: true });
      const { live } = runGesture(gesture, coalescedConfig({ predicted: 'off' }));
      expect(live).toHaveLength(1 + samples.length);
    });
  });

  describe('events without a batch', () => {
    it('uses the event itself as one sample at its client position', () => {
      platform();
      const gesture: Gesture = {
        name: 'single',
        steps: [
          { type: 'down', t: 0, x: 50, y: 50, pressure: 0.4, pointerType: 'pen' },
          { type: 'move', t: 16, x: 60, y: 55, pressure: 0.4, pointerType: 'pen' },
          { type: 'move', t: 32, x: 75, y: 70, pressure: 0.4, pointerType: 'pen' },
          { type: 'up', t: 48 },
        ],
      };
      const { live } = runGesture(gesture, coalescedConfig());
      expect(live.map((p) => [p.x, p.y])).toEqual([[50, 50], [60, 55], [75, 70]]);
    });
  });

  describe('minimum movement', () => {
    it('skips samples closer than the threshold to the last recorded one', () => {
      platform();
      const gesture: Gesture = {
        name: 'dense',
        steps: [
          { type: 'down', t: 0, x: 0, y: 0, pressure: 0.4, pointerType: 'pen' },
          {
            type: 'move', t: 16, x: 10, y: 0, pressure: 0.4, pointerType: 'pen',
            coalesced: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((x) => ({ x, y: 0, pressure: 0.4 })),
          },
          { type: 'up', t: 32 },
        ],
      };
      const { live } = runGesture(gesture, coalescedConfig({ minMovePx: 3 }));
      expect(live.map((p) => p.x)).toEqual([0, 3, 6, 9]);
    });
  });
});
