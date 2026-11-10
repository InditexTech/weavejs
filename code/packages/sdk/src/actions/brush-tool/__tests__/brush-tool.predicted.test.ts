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

import {
  type Gesture,
  IDENTITY_ENV,
  runGesture,
} from './shared/brush-golden.helpers';

const sample = (x: number, y: number) => ({ x, y, pressure: 0.5 });

const gesture = (withPredicted: boolean): Gesture => ({
  name: 'predicted',
  steps: [
    { type: 'down', t: 0, x: 10, y: 10, pressure: 0.5, pointerType: 'pen' },
    ...Array.from({ length: 20 }, (_, i) => ({
      type: 'move' as const,
      t: (i + 1) * 8,
      x: 10 + (i + 1) * 6,
      y: 10 + Math.sin((i + 1) / 3) * 12,
      pressure: 0.5,
      pointerType: 'pen',
      // a guess 14 px further on, as a browser predicts
      ...(withPredicted
        ? {
            predicted: [
              sample(
                10 + (i + 1) * 6 + 14,
                10 + Math.sin((i + 1) / 3) * 12 + 9
              ),
            ],
          }
        : {}),
    })),
    { type: 'up', t: 200 },
  ],
});

const draw = (withPredicted: boolean, scenario: string) =>
  runGesture(
    gesture(withPredicted),
    undefined,
    (action, index) => index === 0 && action.applyScenario(scenario),
    IDENTITY_ENV,
    {}
  ).persisted?.strokeElements;

beforeEach(() =>
  vi.stubGlobal('navigator', {
    userAgent: 'Windows NT 10.0',
    platform: 'Win32',
  })
);
afterEach(() => vi.unstubAllGlobals());

describe('predicted samples', () => {
  it('do not bend a stabilized stroke', () => {
    for (const scenario of ['C', 'F']) {
      const without = draw(false, scenario);
      const withIt = draw(true, scenario);
      expect(without?.length).toBeGreaterThan(5);
      expect(withIt).toEqual(without);
    }
  });

  it('are still used by a brush without a stabilizer (legacy keeps its behaviour)', () => {
    // the legacy stroke is finished without them, so the saved points agree
    expect(draw(true, 'A')).toEqual(draw(false, 'A'));
  });
});
