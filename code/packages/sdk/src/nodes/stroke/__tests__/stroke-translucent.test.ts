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
  distanceToPolyline,
  renderStroke,
} from './shared/stroke-render.helpers';

const W = 16;
const R = W / 2;
const COLOR = '#2563eb80'; // 50% opaque

const look = (patch: Partial<WeaveStrokeLook>): WeaveStrokeLook => ({
  ...WEAVE_STROKE_LEGACY_LOOK,
  ...patch,
});

/** Alphas of the pixels well inside the stroke (not on its anti-aliased edge). */
function interiorAlphas(
  pts: ReturnType<typeof densify>,
  attrs: object,
  keepX: (x: number) => boolean = () => true
) {
  const r = renderStroke(
    { strokeElements: pts, strokeWidth: W, stroke: COLOR, ...attrs },
    { width: 220, height: 140 }
  );
  const alphas: number[] = [];
  for (let y = 0; y < r.height; y++) {
    for (let x = 0; x < r.width; x++) {
      if (
        keepX(x + 0.5) &&
        distanceToPolyline({ x: x + 0.5, y: y + 0.5 }, pts) <= R - 2
      ) {
        alphas.push(r.alpha(x, y));
      }
    }
  }
  return alphas;
}

const inDash = (x: number) =>
  [
    [20, 60],
    [80, 120],
    [140, 180],
  ].some(([a, b]) => x >= a && x <= b);
const spread = (a: number[]) => Math.max(...a) - Math.min(...a);

// a figure of eight: the stroke crosses itself
const eight = densify(
  Array.from({ length: 61 }, (_, i) => {
    const t = (i / 60) * 2 * Math.PI;
    return { x: 110 + 70 * Math.sin(t), y: 70 + 40 * Math.sin(2 * t) };
  }),
  3,
  1
);
const line = densify(
  [
    { x: 20, y: 60 },
    { x: 200, y: 60 },
  ],
  3,
  1
);

describe('translucent colours', () => {
  it('are uniform across a round stroke, its ends and where it crosses itself', () => {
    const alphas = interiorAlphas(eight, { look: look({ outline: 'round' }) });
    expect(alphas.length).toBeGreaterThan(1000);
    expect(spread(alphas)).toBeLessThanOrEqual(1);
    expect(Math.max(...alphas)).toBeLessThanOrEqual(129); // about 50%, never doubled
  });

  it('are uniform across a legacy-outline stroke whose ends are merged into the fill', () => {
    const alphas = interiorAlphas(line, {
      look: look({ outline: 'legacy', caps: 'merged' }),
    });
    expect(alphas.length).toBeGreaterThan(500);
    expect(spread(alphas)).toBeLessThanOrEqual(1);
  });

  it('are darker at the ends when the caps are separate, as in earlier releases', () => {
    const separate = interiorAlphas(line, {});
    expect(spread(separate)).toBeGreaterThan(40);
    expect(Math.max(...separate)).toBeGreaterThan(160);
  });

  it('are uniform in every dash of a round stroke', () => {
    const alphas = interiorAlphas(
      line,
      { dash: [40, 20], look: look({ outline: 'round' }) },
      inDash
    );
    expect(alphas.length).toBeGreaterThan(300);
    expect(spread(alphas)).toBeLessThanOrEqual(1);
  });

  it('are uniform in every dash of a merged legacy-outline stroke', () => {
    const alphas = interiorAlphas(
      line,
      { dash: [40, 20], look: look({ outline: 'legacy', caps: 'merged' }) },
      inDash
    );
    expect(spread(alphas)).toBeLessThanOrEqual(1);
  });

  it('are as opaque as the colour says', () => {
    const alphas = interiorAlphas(line, { look: look({ outline: 'round' }) });
    expect(alphas[0]).toBeGreaterThanOrEqual(127);
    expect(alphas[0]).toBeLessThanOrEqual(129);
  });
});
