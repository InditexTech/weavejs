// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import { WEAVE_STROKE_LEGACY_LOOK } from '../constants';
import type { WeaveStrokeLook } from '../types';
import { densify, renderStroke } from './shared/stroke-render.helpers';

const W = 18;
const base: WeaveStrokeLook = { ...WEAVE_STROKE_LEGACY_LOOK, outline: 'round' };
const flat: WeaveStrokeLook = { ...base, ends: 'flat' };

const line = densify(
  [
    { x: 50, y: 60 },
    { x: 150, y: 60 },
  ],
  2,
  1
);

const draw = (pts: ReturnType<typeof densify>, look: WeaveStrokeLook, extra = {}) =>
  renderStroke({
    strokeElements: pts,
    strokeWidth: W,
    stroke: '#000000ff',
    look,
    ...extra,
  });

describe('flat ends of a round outline', () => {
  it('round ends reach past the first and last point', () => {
    const r = draw(line, base);
    expect(r.covered(45, 60)).toBe(true);
    expect(r.covered(155, 60)).toBe(true);
  });

  it('flat ends stop at the first and last point', () => {
    const r = draw(line, flat);
    expect(r.covered(45, 60)).toBe(false);
    expect(r.covered(155, 60)).toBe(false);
    expect(r.covered(52, 60)).toBe(true);
    expect(r.covered(148, 60)).toBe(true);
  });

  it('flat ends are square at the corners', () => {
    const r = draw(line, flat);
    expect(r.covered(52, 53)).toBe(true);
    expect(r.covered(52, 67)).toBe(true);
    expect(r.covered(45, 53)).toBe(false);
    expect(draw(line, base).covered(45, 53)).toBe(true);
  });

  it('keeps turns round inside the stroke', () => {
    const turn = densify(
      [
        { x: 40, y: 100 },
        { x: 100, y: 30 },
        { x: 160, y: 100 },
      ],
      2,
      1
    );
    const r = draw(turn, flat);
    expect(r.covered(100, 25)).toBe(true);
  });

  it('draws a one-point stroke as a disc', () => {
    const r = draw([{ x: 100, y: 60, pressure: 1 }], flat);
    expect(r.covered(100, 60)).toBe(true);
    expect(r.covered(106, 60)).toBe(true);
  });

  it('draws a two-point stroke with a flat start and end', () => {
    const r = draw(
      [
        { x: 50, y: 60, pressure: 1 },
        { x: 100, y: 60, pressure: 1 },
      ],
      flat
    );
    expect(r.covered(75, 60)).toBe(true);
    expect(r.covered(45, 60)).toBe(false);
  });

  it('cuts every dash flat', () => {
    const r = draw(line, flat, { dash: [20, 20] });
    expect(r.covered(60, 60)).toBe(true);
    expect(r.covered(75, 60)).toBe(false);
  });

  it('a look without ends draws round ends', () => {
    expect(draw(line, base).covered(45, 60)).toBe(
      draw(line, { ...base, ends: 'round' }).covered(45, 60)
    );
  });
});
