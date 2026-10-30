// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import { densify, recordDrawCalls } from './shared/stroke-render.helpers';
import { WEAVE_STROKE_LEGACY_LOOK } from '../constants';

/**
 * Golden draw-call logs of strokes that have no look. They were recorded from
 * the renderer before looks existed and pin it: a stroke without a look must
 * keep issuing exactly these calls.
 */
const curve = Array.from({ length: 40 }, (_, i) => ({
  x: 10 + i * 4,
  y: 40 + 18 * Math.sin(i / 4),
  pressure: 0.3 + 0.5 * Math.abs(Math.sin(i / 7)),
}));

const cases: Record<string, Parameters<typeof recordDrawCalls>[0]> = {
  'two points': {
    strokeElements: [
      { x: 5, y: 5, pressure: 0.6 },
      { x: 60, y: 20, pressure: 0.9 },
    ],
    strokeWidth: 6,
    stroke: '#112233ff',
  },
  'one point': {
    strokeElements: [{ x: 5, y: 5, pressure: 0.6 }],
    strokeWidth: 8,
    stroke: '#112233ff',
  },
  'curved with pressure': {
    strokeElements: curve,
    strokeWidth: 10,
    stroke: '#ff0000ff',
  },
  dashed: {
    strokeElements: densify(
      [
        { x: 0, y: 10 },
        { x: 80, y: 10 },
        { x: 80, y: 60 },
      ],
      3,
      0.7
    ),
    strokeWidth: 5,
    stroke: '#000000ff',
    dash: [12, 6],
  },
  translucent: { strokeElements: curve, strokeWidth: 9, stroke: '#2563eb80' },
};

describe('strokes without a look keep their draw calls', () => {
  for (const [name, attrs] of Object.entries(cases)) {
    it(name, () => {
      expect(recordDrawCalls(attrs)).toMatchSnapshot();
    });
  }

  it('an unknown look version is drawn as a stroke without a look', () => {
    for (const attrs of Object.values(cases)) {
      const plain = recordDrawCalls(attrs);
      expect(
        recordDrawCalls({
          ...attrs,
          look: { ...WEAVE_STROKE_LEGACY_LOOK, version: 2, outline: 'round' },
        })
      ).toEqual(plain);
      expect(recordDrawCalls({ ...attrs, look: 'nonsense' })).toEqual(plain);
      expect(recordDrawCalls({ ...attrs, look: null })).toEqual(plain);
    }
  });
});
