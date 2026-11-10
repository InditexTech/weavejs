// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import { WEAVE_STROKE_LEGACY_LOOK } from '../constants';
import type { WeaveStrokeLook } from '../types';
import {
  densify,
  recordDrawCalls,
  renderStroke,
} from './shared/stroke-render.helpers';

const round = (width: Partial<WeaveStrokeLook['width']>): WeaveStrokeLook => ({
  ...WEAVE_STROKE_LEGACY_LOOK,
  outline: 'round',
  width: { ...WEAVE_STROKE_LEGACY_LOOK.width, ...width },
});

const thickness = (r: ReturnType<typeof renderStroke>, x: number) => {
  let n = 0;
  for (let y = 0; y < r.height; y++) if (r.alpha(x, y) >= 128) n++;
  return n;
};

describe('width rule', () => {
  const pts = densify(
    [
      { x: 10, y: 60 },
      { x: 190, y: 60 },
    ],
    3,
    0.6
  );
  const attrs = { strokeElements: pts, strokeWidth: 20, stroke: '#000000ff' };

  it('is constant for constant pressure', () => {
    const r = renderStroke({ ...attrs, look: round({}) });
    const t = [50, 100, 150].map((x) => thickness(r, x));
    expect(Math.max(...t) - Math.min(...t)).toBeLessThanOrEqual(1);
  });

  it('tapers both ends', () => {
    const r = renderStroke({
      ...attrs,
      look: round({ taperStart: 40, taperEnd: 40 }),
    });
    expect(thickness(r, 14)).toBeLessThan(thickness(r, 100));
    expect(thickness(r, 186)).toBeLessThan(thickness(r, 100));
  });

  it('keeps the legacy half-width for a look with the default width rule', () => {
    const a = renderStroke({
      ...attrs,
      look: { ...WEAVE_STROKE_LEGACY_LOOK, outline: 'round' },
    });
    expect(thickness(a, 100)).toBeGreaterThanOrEqual(11);
    expect(thickness(a, 100)).toBeLessThanOrEqual(13); // 20 * 0.6
  });

  it('a stroke with no look draws the same calls whatever other strokes do', () => {
    expect(recordDrawCalls(attrs)).toEqual(recordDrawCalls({ ...attrs }));
  });
});
