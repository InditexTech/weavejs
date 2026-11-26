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
  makeNode,
  recordDrawCalls,
  renderStroke,
} from './shared/stroke-render.helpers';

const W = 20;

const nib = (
  outline: WeaveStrokeLook['outline'],
  nibAngle: number,
  nibContrast: number
): WeaveStrokeLook => ({
  ...WEAVE_STROKE_LEGACY_LOOK,
  outline,
  width: { ...WEAVE_STROKE_LEGACY_LOOK.width, nibAngle, nibContrast },
});

const horizontal = densify(
  [
    { x: 30, y: 60 },
    { x: 170, y: 60 },
  ],
  2,
  1
);
const vertical = densify(
  [
    { x: 100, y: 10 },
    { x: 100, y: 110 },
  ],
  2,
  1
);

/** Thickness, in pixels, of a stroke at the middle of its path. */
const thickness = (
  pts: ReturnType<typeof densify>,
  look: WeaveStrokeLook,
  across: 'column' | 'row'
) => {
  const r = renderStroke({
    strokeElements: pts,
    strokeWidth: W,
    stroke: '#000000ff',
    look,
  });
  let n = 0;
  for (let i = 0; i < 120; i++) {
    if (across === 'column' ? r.covered(100, i) : r.covered(i, 60)) n++;
  }
  return n;
};

describe.each(['round', 'legacy'] as const)('nib width, %s outline', (outline) => {
  it('is thin travelling along the nib and wide travelling across it', () => {
    const look = nib(outline, 0, 0.7);
    const along = thickness(horizontal, look, 'column');
    const across = thickness(vertical, look, 'row');
    expect(across).toBeGreaterThanOrEqual(W - 2);
    expect(along).toBeLessThanOrEqual(W * 0.3 + 2);
    expect(across).toBeGreaterThan(along * 2.5);
  });

  it('turns with the nib angle', () => {
    const look = nib(outline, 90, 0.7);
    expect(thickness(horizontal, look, 'column')).toBeGreaterThanOrEqual(W - 2);
    expect(thickness(vertical, look, 'row')).toBeLessThanOrEqual(W * 0.3 + 2);
  });

  it('is a plain width without a contrast', () => {
    const plain = recordDrawCalls({
      strokeElements: horizontal,
      strokeWidth: W,
      stroke: '#000000ff',
      look: nib(outline, 0, 0),
    });
    const none = recordDrawCalls({
      strokeElements: horizontal,
      strokeWidth: W,
      stroke: '#000000ff',
      look: { ...WEAVE_STROKE_LEGACY_LOOK, outline },
    });
    expect(plain).toEqual(none);
  });

  it('changes smoothly through a curve', () => {
    const arc = densify(
      Array.from({ length: 25 }, (_, i) => ({
        x: 100 + 50 * Math.cos((i / 24) * Math.PI),
        y: 60 - 50 * Math.sin((i / 24) * Math.PI),
      })),
      2,
      1
    );
    const { halfWidths } = (
      makeNode() as unknown as {
        lookGeometry: (
          shape: unknown,
          look: WeaveStrokeLook,
          pts: typeof arc,
          baseW: number,
          scale: number
        ) => { halfWidths: number[] };
      }
    ).lookGeometry({ getAttrs: () => ({}) }, nib(outline, 0, 0.7), arc, W, 1);
    const steps = halfWidths.slice(1).map((w, i) => Math.abs(w - halfWidths[i]));
    expect(Math.max(...steps)).toBeLessThan(0.5);
    expect(Math.max(...halfWidths) - Math.min(...halfWidths)).toBeGreaterThan(3);
  });
});
