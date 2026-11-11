// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { WEAVE_STROKE_LEGACY_LOOK } from '../../constants';
import { MIN_HALF_WIDTH, halfWidthAt, readStrokeLook } from '../look';

describe('readStrokeLook', () => {
  it('returns null for no look, a non-object, or a version it does not know', () => {
    expect(readStrokeLook(undefined)).toBeNull();
    expect(readStrokeLook(null)).toBeNull();
    expect(readStrokeLook('round')).toBeNull();
    expect(readStrokeLook([1])).toBeNull();
    expect(readStrokeLook({ outline: 'round' })).toBeNull();
    expect(
      readStrokeLook({ ...WEAVE_STROKE_LEGACY_LOOK, version: 2 })
    ).toBeNull();
  });

  it('reads a complete look unchanged', () => {
    const look = {
      version: 1,
      outline: 'round',
      curve: 'centripetal',
      pressureInterp: 'linear',
      zoomAware: true,
      spacingPx: 3,
      edgePx: 0.5,
      caps: 'merged',
      width: { min: 0.2, max: 0.9, gamma: 0.8, taperStart: 10, taperEnd: 20 },
    };
    expect(readStrokeLook(look)).toEqual(look);
  });

  it('fills missing fields from the legacy look', () => {
    expect(readStrokeLook({ version: 1, outline: 'round' })).toEqual({
      ...WEAVE_STROKE_LEGACY_LOOK,
      outline: 'round',
    });
  });

  it('replaces invalid values with the legacy ones', () => {
    const look = readStrokeLook({
      version: 1,
      outline: 'magic',
      curve: 7,
      zoomAware: 'yes',
      spacingPx: NaN,
      width: { min: 'wide', gamma: Infinity },
    })!;
    expect(look).toEqual(WEAVE_STROKE_LEGACY_LOOK);
  });

  it('clamps out-of-range numbers so a stored look cannot misbehave', () => {
    const look = readStrokeLook({
      version: 1,
      spacingPx: 0.0001,
      edgePx: 9999,
      width: { min: -5, max: 5, gamma: 100, taperStart: 1e9, taperEnd: -1 },
    })!;
    expect(look.spacingPx).toBe(0.5);
    expect(look.edgePx).toBe(5);
    expect(look.width).toEqual({
      min: 0,
      max: 1,
      gamma: 3,
      taperStart: 200,
      taperEnd: 0,
    });
  });
});

describe('halfWidthAt', () => {
  const legacy = (w: number, p: number) => Math.max((w * p) / 2, 0.5);

  it('is the legacy half-width for the default width rule', () => {
    for (const w of [1, 3, 12, 50]) {
      for (const p of [0.15, 0.3, 0.5, 0.8, 1]) {
        expect(
          halfWidthAt(WEAVE_STROKE_LEGACY_LOOK, w, p, 100, 100)
        ).toBeCloseTo(legacy(w, p), 10);
      }
    }
  });

  const look = (width: Partial<typeof WEAVE_STROKE_LEGACY_LOOK.width>) => ({
    ...WEAVE_STROKE_LEGACY_LOOK,
    width: { ...WEAVE_STROKE_LEGACY_LOOK.width, ...width },
  });

  it('is constant for constant pressure and inside the range', () => {
    const l = look({ min: 0.2, max: 0.8 });
    const widths = [0, 10, 50, 90].map((s) =>
      halfWidthAt(l, 20, 0.5, s, 90 - s + 100)
    );
    expect(new Set(widths).size).toBe(1);
    expect(widths[0]).toBeGreaterThanOrEqual((20 * 0.2) / 2);
    expect(widths[0]).toBeLessThanOrEqual((20 * 0.8) / 2);
  });

  it('maps pressure 0 to the minimum and pressure 1 to the maximum', () => {
    const l = look({ min: 0.3, max: 0.9 });
    expect(halfWidthAt(l, 20, 0, 100, 100)).toBeCloseTo(3, 10);
    expect(halfWidthAt(l, 20, 1, 100, 100)).toBeCloseTo(9, 10);
  });

  it('reacts faster to light pressure below gamma 1 and slower above it', () => {
    const light = halfWidthAt(look({ gamma: 0.5 }), 20, 0.25, 100, 100);
    const linear = halfWidthAt(look({ gamma: 1 }), 20, 0.25, 100, 100);
    const firm = halfWidthAt(look({ gamma: 2 }), 20, 0.25, 100, 100);
    expect(light).toBeGreaterThan(linear);
    expect(firm).toBeLessThan(linear);
  });

  it('narrows towards both ends over the taper distances', () => {
    const l = look({ taperStart: 20, taperEnd: 20 });
    const mid = halfWidthAt(l, 20, 0.8, 100, 100);
    const nearStart = halfWidthAt(l, 20, 0.8, 5, 200);
    const nearEnd = halfWidthAt(l, 20, 0.8, 200, 5);
    const tip = halfWidthAt(l, 20, 0.8, 0, 200);
    expect(nearStart).toBeLessThan(mid);
    expect(nearEnd).toBeLessThan(mid);
    expect(tip).toBe(MIN_HALF_WIDTH);
    expect(halfWidthAt(l, 20, 0.8, 20, 200)).toBeCloseTo(mid, 10);
  });

  it('never goes below the minimum half-width and tolerates a bad pressure', () => {
    expect(halfWidthAt(look({ min: 0, max: 0 }), 20, 0.5, 100, 100)).toBe(
      MIN_HALF_WIDTH
    );
    expect(
      Number.isFinite(halfWidthAt(WEAVE_STROKE_LEGACY_LOOK, 20, NaN, 100, 100))
    ).toBe(true);
    expect(halfWidthAt(WEAVE_STROKE_LEGACY_LOOK, 20, 5, 100, 100)).toBeCloseTo(
      10,
      10
    );
  });
});
