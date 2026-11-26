// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import { recordDrawCalls } from './shared/stroke-render.helpers';
import { WEAVE_STROKE_LEGACY_LOOK } from '../constants';
import type { WeaveStrokeLook } from '../types';

/**
 * Golden draw-call logs of strokes drawn with each outline of a look. They pin
 * the renderer: looks that set none of the later optional fields must keep
 * issuing exactly these calls.
 */
const curve = Array.from({ length: 40 }, (_, i) => ({
  x: 10 + i * 4,
  y: 40 + 18 * Math.sin(i / 4),
  pressure: 0.3 + 0.5 * Math.abs(Math.sin(i / 7)),
}));

const look = (patch: Partial<WeaveStrokeLook>): WeaveStrokeLook => ({
  ...WEAVE_STROKE_LEGACY_LOOK,
  ...patch,
});

const looks: Record<string, WeaveStrokeLook> = {
  'legacy outline': look({}),
  round: look({ outline: 'round' }),
  freehand: look({ outline: 'freehand' }),
  'round centripetal zoom aware': look({
    outline: 'round',
    curve: 'centripetal',
    zoomAware: true,
  }),
  'round merged caps tapered': look({
    outline: 'round',
    caps: 'merged',
    width: { min: 0.2, max: 1, gamma: 1.4, taperStart: 20, taperEnd: 30 },
  }),
};

describe('strokes with a look keep their draw calls', () => {
  for (const [name, l] of Object.entries(looks)) {
    it(name, () => {
      expect(
        recordDrawCalls({
          strokeElements: curve,
          strokeWidth: 10,
          stroke: '#ff0000ff',
          look: l,
        })
      ).toMatchSnapshot();
    });
  }

  it('a one-point stroke', () => {
    expect(
      recordDrawCalls({
        strokeElements: [{ x: 5, y: 5, pressure: 0.6 }],
        strokeWidth: 8,
        stroke: '#112233ff',
        look: looks['round'],
      })
    ).toMatchSnapshot();
  });
});
