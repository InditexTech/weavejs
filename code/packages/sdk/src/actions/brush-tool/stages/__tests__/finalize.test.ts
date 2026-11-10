// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { BRUSH_LEGACY_INPUT_PROFILE } from '../../constants';
import type { WeaveBrushFinalizeConfig } from '../../types';
import {
  finalizePoints,
  fitAndResample,
  resolveFinalizeTolerance,
  simplifyWithPressure,
} from '../finalize';

type P = { x: number; y: number; pressure: number };

const finalize = (patch: Partial<WeaveBrushFinalizeConfig>): WeaveBrushFinalizeConfig => ({
  ...BRUSH_LEGACY_INPUT_PROFILE.finalize,
  ...patch,
});

/** Dense cursive loops drawn on screen, in screen pixels. */
function cursive(n = 400): P[] {
  return Array.from({ length: n }, (_, i) => {
    const th = (i / (n - 1)) * 4 * 2 * Math.PI;
    return {
      x: 4 * th - 8 * Math.sin(th),
      y: -8 * Math.cos(th),
      pressure: 0.35 + 0.2 * Math.sin(th / 2),
    };
  });
}

/** The same on-screen path at a zoom level: canvas = screen / zoom. */
const atZoom = (pts: P[], zoom: number): P[] =>
  pts.map((p) => ({ ...p, x: p.x / zoom, y: p.y / zoom }));

function distanceToSegment(p: P, a: P, b: P) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = dx * dx + dy * dy;
  const t = l ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)) : 0;
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/** Largest distance of any original point from the reduced polyline. */
function maxDeviation(original: P[], reduced: P[]) {
  let worst = 0;
  for (const p of original) {
    let best = Infinity;
    for (let i = 1; i < reduced.length; i++) {
      best = Math.min(best, distanceToSegment(p, reduced[i - 1], reduced[i]));
    }
    worst = Math.max(worst, best);
  }
  return worst;
}

describe('resolveFinalizeTolerance', () => {
  it('uses the tool-level tolerance in canvas units by default', () => {
    expect(resolveFinalizeTolerance(finalize({}), 0.5)).toBe(0.5);
    expect(resolveFinalizeTolerance(finalize({}), 0.5, 3)).toBe(0.5);
  });

  it('prefers the profile tolerance', () => {
    expect(resolveFinalizeTolerance(finalize({ tolerance: 2 }), 0.5)).toBe(2);
  });

  it('converts screen pixels to canvas units with the zoom', () => {
    const cfg = finalize({ tolerance: 1, toleranceUnit: 'screen' });
    expect(resolveFinalizeTolerance(cfg, 0.5, 0.5)).toBeCloseTo(2);
    expect(resolveFinalizeTolerance(cfg, 0.5, 2)).toBeCloseTo(0.5);
    expect(resolveFinalizeTolerance(cfg, 0.5, 0)).toBe(1);
  });
});

describe('finalize mode none', () => {
  it('keeps every point', () => {
    const pts = cursive(50);
    expect(finalizePoints(pts, finalize({ mode: 'none' }), 0.5)).toEqual(pts);
  });
});

describe('the same pixel tolerance at any zoom', () => {
  const screen = cursive();
  const TOL = 1;

  for (const mode of ['dp', 'dpPressure', 'bezierFit'] as const) {
    it(`${mode}: on-screen deviation stays within the tolerance at 30% and 200%`, () => {
      const deviations = [0.3, 2].map((zoom) => {
        const canvas = atZoom(screen, zoom);
        const reduced = finalizePoints(
          canvas,
          finalize({ mode, tolerance: TOL, toleranceUnit: 'screen', pressureWeight: 0 }),
          0.5,
          zoom
        );
        expect(reduced.length, `${mode} @${zoom}`).toBeLessThan(canvas.length * 0.5);
        return maxDeviation(canvas, reduced) * zoom; // back to screen pixels
      });
      const limit = mode === 'bezierFit' ? TOL * 1.5 : TOL + 1e-6;
      expect(deviations[0]).toBeLessThanOrEqual(limit);
      expect(deviations[1]).toBeLessThanOrEqual(limit);
      // and the tolerance is actually used, not just trivially satisfied
      expect(Math.min(...deviations)).toBeGreaterThan(TOL * 0.2);
    });
  }

  it('a tolerance in canvas units gives very different on-screen fidelity', () => {
    const onScreen = [0.3, 2].map((zoom) => {
      const canvas = atZoom(screen, zoom);
      const reduced = finalizePoints(
        canvas,
        finalize({ mode: 'dp', tolerance: TOL, toleranceUnit: 'canvas' }),
        0.5,
        zoom
      );
      return maxDeviation(canvas, reduced) * zoom;
    });
    expect(onScreen[1] / onScreen[0]).toBeGreaterThan(3);
  });
});

describe('simplifyWithPressure', () => {
  const line = (n: number, pressureAt: (i: number) => number): P[] =>
    Array.from({ length: n }, (_, i) => ({ x: i * 4, y: 0, pressure: pressureAt(i) }));

  it('drops a straight, constant-pressure path to its ends', () => {
    expect(simplifyWithPressure(line(100, () => 0.5), 0.5, 20)).toHaveLength(2);
  });

  it('keeps the points where pressure changes along a straight path', () => {
    const pts = line(100, (i) => (i < 50 ? 0.3 : 0.9));
    expect(simplifyWithPressure(pts, 0.5, 0)).toHaveLength(2); // position only
    const kept = simplifyWithPressure(pts, 0.5, 20);
    expect(kept.length).toBeGreaterThan(2);

    // no original pressure is more than tolerance / weight from the reduced curve
    let worst = 0;
    for (const p of pts) {
      let upper = kept.findIndex((k) => k.x >= p.x);
      if (upper <= 0) upper = Math.max(1, upper);
      const a = kept[upper - 1];
      const b = kept[upper];
      const t = b.x === a.x ? 0 : (p.x - a.x) / (b.x - a.x);
      worst = Math.max(worst, Math.abs(p.pressure - (a.pressure + (b.pressure - a.pressure) * t)));
    }
    expect(worst).toBeLessThanOrEqual(0.5 / 20 + 1e-9);
  });

  it('keeps the first and last points', () => {
    const pts = cursive(100);
    const out = simplifyWithPressure(pts, 1, 20);
    expect(out[0]).toBe(pts[0]);
    expect(out[out.length - 1]).toBe(pts[pts.length - 1]);
  });

  it('returns short strokes unchanged', () => {
    const two = line(2, () => 0.5);
    expect(simplifyWithPressure(two, 1, 20)).toBe(two);
  });
});

describe('fitAndResample', () => {
  const pts = cursive();

  it('follows the stroke within the tolerance with far fewer points', () => {
    const out = fitAndResample(pts, 1, 2);
    expect(maxDeviation(pts, out)).toBeLessThanOrEqual(1.5);
    expect(out.length).toBeLessThan(pts.length * 0.35);
  });

  it('keeps the first and last points exactly', () => {
    const out = fitAndResample(pts, 1, 2);
    expect(out[0]).toEqual(pts[0]);
    expect(out[out.length - 1]).toEqual(pts[pts.length - 1]);
  });

  it('keeps pressure inside the range of the input', () => {
    const out = fitAndResample(pts, 1, 2);
    const lo = Math.min(...pts.map((p) => p.pressure));
    const hi = Math.max(...pts.map((p) => p.pressure));
    for (const p of out) {
      expect(p.pressure).toBeGreaterThanOrEqual(lo - 1e-9);
      expect(p.pressure).toBeLessThanOrEqual(hi + 1e-9);
    }
  });

  /** Turning angle between consecutive edges. */
  const turns = (o: P[]) => {
    const out: number[] = [];
    for (let i = 2; i < o.length; i++) {
      const a = Math.atan2(o[i - 1].y - o[i - 2].y, o[i - 1].x - o[i - 2].x);
      const b = Math.atan2(o[i].y - o[i - 1].y, o[i].x - o[i - 1].x);
      const d = Math.abs(b - a);
      out.push(d > Math.PI ? 2 * Math.PI - d : d);
    }
    return out;
  };

  /** The true path resampled every `spacing` along its length. */
  const resampledByArc = (path: P[], spacing: number) => {
    const out = [path[0]];
    let travelled = 0;
    for (let i = 1; i < path.length; i++) {
      travelled += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
      if (travelled >= spacing) {
        out.push(path[i]);
        travelled = 0;
      }
    }
    return out;
  };

  it('turns no more sharply than the path itself, with no kinks at the joins', () => {
    // The loops are tight, so the path itself turns sharply between samples; a
    // kink at a join would turn more than the path does.
    const fitted = Math.max(...turns(fitAndResample(pts, 1, 2)));
    const reference = Math.max(...turns(resampledByArc(pts, 2)));
    expect(fitted).toBeLessThanOrEqual(reference * 1.05);
  });

  it('smooths hand shake on a straight line, staying within the tolerance', () => {
    const jittery: P[] = Array.from({ length: 120 }, (_, i) => ({
      x: i * 2,
      y: ((i * 7919) % 13) / 6 - 1,
      pressure: 0.5,
    }));
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    const out = fitAndResample(jittery, 2, 2);

    // far less direction change from edge to edge than the raw zigzag
    expect(mean(turns(out))).toBeLessThan(mean(turns(jittery)) * 0.2);
    expect(maxDeviation(jittery, out)).toBeLessThanOrEqual(2 * 1.5);
  });

  it('keeps sharp corners instead of rounding them off', () => {
    const corner: P[] = [
      ...Array.from({ length: 30 }, (_, i) => ({ x: i * 2, y: 0, pressure: 0.5 })),
      ...Array.from({ length: 30 }, (_, i) => ({ x: 58, y: (i + 1) * 2, pressure: 0.5 })),
    ];
    const out = fitAndResample(corner, 0.5, 2);
    expect(maxDeviation(corner, out)).toBeLessThanOrEqual(0.75);
    expect(out.some((p) => Math.hypot(p.x - 58, p.y) < 1.5)).toBe(true);
  });

  describe('degenerate input', () => {
    it('returns strokes of fewer than three points unchanged', () => {
      expect(fitAndResample([], 1, 2)).toEqual([]);
      const one = [{ x: 1, y: 1, pressure: 0.5 }];
      expect(fitAndResample(one, 1, 2)).toBe(one);
      const two = [{ x: 0, y: 0, pressure: 0.5 }, { x: 5, y: 5, pressure: 0.6 }];
      expect(fitAndResample(two, 1, 2)).toBe(two);
    });

    it('returns the input for a zero tolerance', () => {
      expect(fitAndResample(pts, 0, 2)).toBe(pts);
    });

    it('survives repeated and identical points', () => {
      const same = Array.from({ length: 10 }, () => ({ x: 3, y: 3, pressure: 0.5 }));
      expect(fitAndResample(same, 1, 2)).toBe(same);

      const repeated = [...pts.slice(0, 50).flatMap((p) => [p, p]), ...pts.slice(50, 120)];
      const out = fitAndResample(repeated, 1, 2);
      expect(out.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.pressure))).toBe(true);
    });

    it('survives a hairpin turn without producing invalid points', () => {
      const hairpin: P[] = [
        ...Array.from({ length: 20 }, (_, i) => ({ x: i * 3, y: 0, pressure: 0.5 })),
        ...Array.from({ length: 20 }, (_, i) => ({ x: 57 - i * 3, y: 0.2, pressure: 0.5 })),
      ];
      const out = fitAndResample(hairpin, 0.5, 2);
      expect(out.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    });
  });
});
