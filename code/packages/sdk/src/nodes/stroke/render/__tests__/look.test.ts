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

  describe('a stroke shorter than its tapers', () => {
    const l = () => look({ taperStart: 10, taperEnd: 20 });
    const full = () => halfWidthAt(l(), 20, 0.8, 100, 100);

    it('still reaches its full width, where the two tapers meet', () => {
      // 15 long: the tapers shrink in proportion, to 5 and 10, which meet at 5
      expect(halfWidthAt(l(), 20, 0.8, 5, 10)).toBeCloseTo(full(), 10);
    });

    it('narrows to both ends over the shorter tapers', () => {
      const meet = halfWidthAt(l(), 20, 0.8, 5, 10);
      expect(halfWidthAt(l(), 20, 0.8, 2.5, 12.5)).toBeLessThan(meet);
      expect(halfWidthAt(l(), 20, 0.8, 10, 5)).toBeLessThan(meet);
      expect(halfWidthAt(l(), 20, 0.8, 0, 15)).toBe(MIN_HALF_WIDTH);
      expect(halfWidthAt(l(), 20, 0.8, 15, 0)).toBe(MIN_HALF_WIDTH);
    });

    it('is as wide as a stroke that is long enough, at the point where its taper has been covered', () => {
      const short = halfWidthAt(l(), 20, 0.8, 5, 10);
      const long = halfWidthAt(l(), 20, 0.8, 10, 400);
      expect(short).toBeCloseTo(long, 10);
    });

    it('is drawn as before when the tapers fit', () => {
      // 40 long is exactly the tapers: nothing is shrunk
      const shrunk = halfWidthAt(l(), 20, 0.8, 10, 30);
      const longer = halfWidthAt(l(), 20, 0.8, 10, 300);
      expect(shrunk).toBeCloseTo(longer, 10);
    });

    it('leaves the width of a dot to the minimum', () => {
      expect(halfWidthAt(l(), 20, 0.8, 0, 0)).toBe(
        Math.max(
          halfWidthAt(look({ taperStart: 0, taperEnd: 0 }), 20, 0.8, 0, 0),
          MIN_HALF_WIDTH
        )
      );
    });
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

describe('readStrokeLook fields added after the first release', () => {
  it('leaves them out of a look that does not have them', () => {
    const look = readStrokeLook({ version: 1, outline: 'round' })!;
    expect(look).not.toHaveProperty('ends');
    expect(look).not.toHaveProperty('variance');
    expect(look.width).not.toHaveProperty('easing');
    expect(look.width).not.toHaveProperty('nibAngle');
    expect(look.width).not.toHaveProperty('nibContrast');
  });

  it('reads valid values', () => {
    const look = readStrokeLook({
      version: 1,
      ends: 'flat',
      variance: 0.4,
      width: { easing: 'easeInOut', nibAngle: 30, nibContrast: 0.6 },
    })!;
    expect(look.ends).toBe('flat');
    expect(look.variance).toBe(0.4);
    expect(look.width.easing).toBe('easeInOut');
    expect(look.width.nibAngle).toBe(30);
    expect(look.width.nibContrast).toBe(0.6);
  });

  it('clamps numbers and drops invalid values', () => {
    const look = readStrokeLook({
      version: 1,
      ends: 'pointy',
      variance: 5,
      width: { easing: 'bounce', nibAngle: 900, nibContrast: -2 },
    })!;
    expect(look).not.toHaveProperty('ends');
    expect(look.variance).toBe(1);
    expect(look.width).not.toHaveProperty('easing');
    expect(look.width.nibAngle).toBe(180);
    expect(look.width.nibContrast).toBe(0);
  });

  it('ignores non-numeric values', () => {
    const look = readStrokeLook({ version: 1, variance: 'high' })!;
    expect(look).not.toHaveProperty('variance');
  });
});

describe('halfWidthAt easing, variance and nib', () => {
  const base = { ...WEAVE_STROKE_LEGACY_LOOK };
  const tapered = (extra = {}) => ({
    ...base,
    width: { ...base.width, taperStart: 10, ...extra },
  });
  const at = (look: typeof base, from: number, context?: object) =>
    halfWidthAt(look, 20, 1, from, Infinity, context);

  it('easeOut is the default taper shape', () => {
    expect(at(tapered(), 5)).toBe(at(tapered({ easing: 'easeOut' }), 5));
  });

  it('shapes the taper with the chosen easing', () => {
    const linear = at(tapered({ easing: 'linear' }), 2.5);
    const easeIn = at(tapered({ easing: 'easeIn' }), 2.5);
    const easeOut = at(tapered({ easing: 'easeOut' }), 2.5);
    expect(easeIn).toBeLessThan(linear);
    expect(linear).toBeLessThan(easeOut);
    expect(at(tapered({ easing: 'easeInOut' }), 5)).toBeCloseTo(10 * 0.5, 6);
    for (const easing of ['linear', 'easeIn', 'easeOut', 'easeInOut']) {
      expect(at(tapered({ easing }), 10)).toBeCloseTo(10, 6);
    }
  });

  it('adds nothing at variance 0 or without a context', () => {
    expect(at({ ...base, variance: 0 }, Infinity, { variation: 1 })).toBe(10);
    expect(at({ ...base, variance: 1 }, Infinity)).toBe(10);
  });

  it('widens and narrows with the variation', () => {
    const look = { ...base, variance: 1 };
    expect(at(look, Infinity, { variation: 1 })).toBeCloseTo(15, 6);
    expect(at(look, Infinity, { variation: -1 })).toBeCloseTo(5, 6);
    expect(at({ ...base, variance: 0.5 }, Infinity, { variation: 1 })).toBeCloseTo(12.5, 6);
  });

  it('is widest across the nib and narrowest along it', () => {
    const look = { ...base, width: { ...base.width, nibAngle: 0, nibContrast: 0.6 } };
    const along = at(look, Infinity, { heading: 0 });
    const across = at(look, Infinity, { heading: Math.PI / 2 });
    expect(across).toBeCloseTo(10, 6);
    expect(along).toBeCloseTo(10 * 0.4, 6);
  });

  it('turns the nib with its angle', () => {
    const look = { ...base, width: { ...base.width, nibAngle: 45, nibContrast: 0.5 } };
    expect(at(look, Infinity, { heading: Math.PI / 4 })).toBeCloseTo(5, 6);
    expect(at(look, Infinity, { heading: (3 * Math.PI) / 4 })).toBeCloseTo(10, 6);
  });

  it('ignores the heading without a nib contrast', () => {
    expect(at(base, Infinity, { heading: 1 })).toBe(10);
  });

  it('never goes below the minimum width', () => {
    const look = { ...base, variance: 1, width: { ...base.width, nibContrast: 1 } };
    expect(at(look, Infinity, { variation: -1, heading: 0 })).toBe(MIN_HALF_WIDTH);
  });
});
