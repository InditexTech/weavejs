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

const config = (finalize: Record<string, unknown>): WeaveBrushToolActionParams => ({
  config: {
    input: {
      profiles: {
        'pen.desktop': {
          capture: { source: 'coalesced', clock: 'event' },
          pressure: { filter: 'none', start: 'none', end: 'none', zero: 'keep' },
          finalize,
        },
      },
    },
  },
});

beforeEach(() =>
  vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0', platform: 'Win32' })
);
afterEach(() => vi.unstubAllGlobals());

type P = { x: number; y: number; pressure: number };

/** Cursive loops written on screen at 200 Hz. */
function loops(pressureAt: (i: number) => number = () => 0.5): Gesture {
  const n = 300;
  const at = (i: number) => {
    const th = (i / n) * 4 * 2 * Math.PI;
    return { x: 120 + 4 * th - 8 * Math.sin(th), y: 200 - 8 * Math.cos(th) };
  };
  const steps: GestureStep[] = [
    { type: 'down', t: 0, ...at(0), pressure: pressureAt(0), pointerType: 'pen' },
  ];
  for (let i = 1; i <= n; i++) {
    steps.push({ type: 'move', t: i * 5, ...at(i), pressure: pressureAt(i), pointerType: 'pen' });
  }
  steps.push({ type: 'up', t: n * 5 + 5 });
  return { name: 'loops', steps };
}

const envAt = (zoom: number): StageEnv => ({
  rect: { left: 0, top: 0, width: 100, height: 100 },
  clientWidth: 100,
  clientHeight: 100,
  transform: [zoom, 0, 0, zoom, 0, 0],
  zoom,
});

const absolute = (r: ReturnType<typeof runGesture>): P[] =>
  r.persisted!.strokeElements.map((p) => ({ ...p, x: r.persisted!.x + p.x, y: r.persisted!.y + p.y }));

function distanceToPolyline(p: P, poly: P[]) {
  let best = Infinity;
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1];
    const b = poly[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = dx * dx + dy * dy;
    const t = l ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)) : 0;
    best = Math.min(best, Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)));
  }
  return best;
}

describe('finalize modes through the brush tool', () => {
  it('none keeps every recorded point', () => {
    const r = runGesture(loops(), config({ mode: 'none' }));
    expect(r.persisted!.strokeElements).toHaveLength(r.live.length);
  });

  it('dp reduces the stroke', () => {
    const r = runGesture(loops(), config({ mode: 'dp' }));
    expect(r.persisted!.strokeElements.length).toBeLessThan(r.live.length);
  });

  for (const mode of ['dp', 'dpPressure', 'bezierFit']) {
    it(`${mode} with a pixel tolerance keeps the same on-screen fidelity at 30% and 200% zoom`, () => {
      const worst = [0.3, 2].map((zoom) => {
        const r = runGesture(
          loops(),
          config({ mode, tolerance: 1, toleranceUnit: 'screen', pressureWeight: 0 }),
          undefined,
          envAt(zoom)
        );
        const saved = absolute(r);
        // the container is screen / zoom, so on-screen distance = canvas distance x zoom
        const deviation = Math.max(
          ...r.live.map((p) => distanceToPolyline({ ...p, x: p.x + 0, y: p.y + 0 }, saved))
        );
        expect(saved.length, `${mode} @${zoom}`).toBeLessThan(r.live.length * 0.5);
        return deviation * zoom;
      });
      const limit = mode === 'bezierFit' ? 1.5 : 1 + 1e-6;
      expect(worst[0]).toBeLessThanOrEqual(limit);
      expect(worst[1]).toBeLessThanOrEqual(limit);
    });
  }

  it('a canvas-unit tolerance does not', () => {
    const [far, near] = [0.3, 2].map((zoom) => {
      const r = runGesture(loops(), config({ mode: 'dp', tolerance: 1, toleranceUnit: 'canvas' }), undefined, envAt(zoom));
      const saved = absolute(r);
      return Math.max(...r.live.map((p) => distanceToPolyline(p, saved))) * zoom;
    });
    expect(near / far).toBeGreaterThan(3);
  });

  it('bezierFit keeps the first and last points exactly', () => {
    const r = runGesture(loops(), config({ mode: 'bezierFit', tolerance: 1, toleranceUnit: 'screen' }));
    const saved = absolute(r);
    expect(saved[0].x).toBeCloseTo(r.live[0].x, 3);
    expect(saved[0].y).toBeCloseTo(r.live[0].y, 3);
    expect(saved[saved.length - 1].x).toBeCloseTo(r.live[r.live.length - 1].x, 3);
    expect(saved[saved.length - 1].y).toBeCloseTo(r.live[r.live.length - 1].y, 3);
  });

  it('dpPressure keeps points where pressure changes, unlike dp', () => {
    // a straight line whose pressure steps from 0.3 to 0.9 halfway
    const steps: GestureStep[] = [
      { type: 'down', t: 0, x: 0, y: 50, pressure: 0.3, pointerType: 'pen' },
      ...Array.from({ length: 100 }, (_, i): GestureStep => ({
        type: 'move', t: (i + 1) * 5, x: (i + 1) * 3, y: 50, pressure: i < 50 ? 0.3 : 0.9, pointerType: 'pen',
      })),
      { type: 'up', t: 600 },
    ];
    const g: Gesture = { name: 'step', steps };
    const dp = runGesture(g, config({ mode: 'dp', tolerance: 0.5 })).persisted!.strokeElements;
    const withPressure = runGesture(g, config({ mode: 'dpPressure', tolerance: 0.5, pressureWeight: 20 })).persisted!.strokeElements;
    expect(dp).toHaveLength(2);
    expect(withPressure.length).toBeGreaterThan(2);
  });

  it('leaves a single tap alone', () => {
    const tap: Gesture = {
      name: 'tap',
      steps: [
        { type: 'down', t: 0, x: 40, y: 40, pressure: 0.5, pointerType: 'pen' },
        { type: 'up', t: 60 },
      ],
    };
    for (const mode of ['dp', 'dpPressure', 'bezierFit', 'none']) {
      const r = runGesture(tap, config({ mode, tolerance: 1, toleranceUnit: 'screen' }));
      expect(r.persisted!.strokeElements.length, mode).toBe(1);
    }
  });
});
