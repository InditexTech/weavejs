// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import { WEAVE_STROKE_LEGACY_LOOK } from '../constants';
import type { WeaveStrokeLook } from '../types';
import {
  compareWithIdeal,
  densify,
  distanceToPolyline,
  recordDrawCalls,
  renderStroke,
} from './shared/stroke-render.helpers';

const round: WeaveStrokeLook = {
  ...WEAVE_STROKE_LEGACY_LOOK,
  outline: 'round',
};
const W = 18; // stroke width: radius 9 at full pressure
const R = W / 2;

const draw = (
  pts: ReturnType<typeof densify>,
  look?: WeaveStrokeLook,
  extra = {}
) =>
  renderStroke({
    strokeElements: pts,
    strokeWidth: W,
    stroke: '#000000ff',
    look,
    ...extra,
  });

describe('round outline', () => {
  describe('a stroke that turns back on itself, like the stem of an "n"', () => {
    const path = [
      { x: 50, y: 100 },
      { x: 50, y: 30 },
      { x: 54, y: 100 },
    ];
    const pts = densify(path, 2, 1);

    it('is filled right up to the turn, with no spike or notch', () => {
      const c = compareWithIdeal(draw(pts, round), pts, R);
      expect(c.outside).toBeLessThan(0.005);
      expect(c.missing).toBeLessThan(0.012);
    });

    it('is much better than the legacy ribbon, which leaves a notch there', () => {
      const legacy = compareWithIdeal(draw(pts), pts, R);
      const rounded = compareWithIdeal(draw(pts, round), pts, R);
      expect(legacy.missing).toBeGreaterThan(0.04);
      expect(rounded.missing).toBeLessThan(legacy.missing / 4);
    });

    it('has a round tip at the turn', () => {
      const r = draw(pts, round);
      // the cap reaches R above the turning point, and is round: the corner is empty
      expect(r.covered(52, 30 - R + 2)).toBe(true);
      expect(r.covered(52 + R * 0.9, 30 - R * 0.9)).toBe(false);
      expect(r.covered(52 - R * 0.9, 30 - R * 0.9)).toBe(false);
    });
  });

  describe('a sharp point, like the bottom of a "v"', () => {
    const path = [
      { x: 30, y: 20 },
      { x: 60, y: 100 },
      { x: 90, y: 20 },
    ];
    // spaced beyond the minimum control-point spacing, so no point is dropped
    const pts = densify(path, 3, 1);

    it('is no worse than the legacy ribbon and stays inside the ideal shape', () => {
      const legacy = compareWithIdeal(draw(pts), pts, R);
      const rounded = compareWithIdeal(draw(pts, round), pts, R);
      expect(rounded.outside).toBeLessThan(0.005);
      expect(rounded.missing).toBeLessThan(0.015);
      expect(rounded.missing).toBeLessThanOrEqual(legacy.missing + 0.01);
    });

    it('is as wide as the stroke at the point', () => {
      const r = draw(pts, round);
      // the point is covered out to the stroke width in every direction
      for (const [dx, dy] of [
        [0, 1],
        [1, 0],
        [-1, 0],
      ]) {
        expect(r.covered(60 + dx * (R - 2), 100 + dy * (R - 2))).toBe(true);
        expect(r.covered(60 + dx * (R + 3), 100 + dy * (R + 3))).toBe(false);
      }
    });
  });

  describe('a stroke whose pressure changes', () => {
    // pressure rises from 0.3 to 1: the width grows along the stroke
    const pts = densify(
      [
        { x: 20, y: 60 },
        { x: 180, y: 60 },
      ],
      2,
      1
    ).map((p, i, a) => ({
      ...p,
      pressure: 0.3 + (0.7 * i) / (a.length - 1),
    }));

    it('never exceeds the wider of two neighbouring widths and has no gaps', () => {
      const r = draw(pts, round);
      let outside = 0;
      let missing = 0;
      for (let y = 0; y < r.height; y++) {
        for (let x = 0; x < r.width; x++) {
          // ideal radius at this pixel: that of the nearest sample
          let best = Infinity;
          let radius = 0;
          for (const p of pts) {
            const d =
              Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) - (W * p.pressure) / 2;
            if (d < best) {
              best = d;
              radius = (W * p.pressure) / 2;
            }
          }
          void radius;
          if (best > 1.5 && r.covered(x, y)) outside++;
          if (best < -1.5 && r.alpha(x, y) < 128) missing++;
        }
      }
      expect(outside).toBe(0);
      expect(missing).toBe(0);
    });

    it('is narrower at the light end than at the firm end', () => {
      const r = draw(pts, round);
      const thickness = (x: number) => {
        let n = 0;
        for (let y = 0; y < r.height; y++) if (r.alpha(x, y) >= 128) n++;
        return n;
      };
      expect(thickness(40)).toBeLessThan(thickness(160));
    });
  });

  it('draws dashes as separate runs with round ends', () => {
    const pts = densify(
      [
        { x: 10, y: 60 },
        { x: 190, y: 60 },
      ],
      2,
      1
    );
    const r = draw(pts, round, { dash: [30, 20], strokeWidth: 10 });
    // runs: 10-40, 60-90, 110-140, 160-190
    for (const x of [25, 75, 125, 175])
      expect(r.covered(x, 60), `dash at ${x}`).toBe(true);
    for (const x of [50, 100, 150])
      expect(r.covered(x, 60), `gap at ${x}`).toBe(false);
    // the run is capped round: past its end the corner is empty
    expect(r.covered(40 + 4, 60 - 4)).toBe(false);
    expect(r.covered(40 + 3, 60)).toBe(true);
  });

  it('draws a two-point stroke as a capsule and a single point as a disc', () => {
    const two = [
      { x: 40, y: 60, pressure: 1 },
      { x: 100, y: 60, pressure: 1 },
    ];
    const r = draw(two, round);
    expect(r.covered(70, 60)).toBe(true);
    expect(r.covered(40 - R + 2, 60)).toBe(true);
    expect(r.covered(40 - R - 3, 60)).toBe(false);

    const dot = draw([{ x: 50, y: 50, pressure: 1 }], round);
    expect(dot.covered(50, 50)).toBe(true);
    expect(dot.covered(50 + R + 3, 50)).toBe(false);
  });

  it('keeps the vertex count in check on long strokes', () => {
    const long = densify(
      [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
      ],
      1,
      1
    );
    const calls = recordDrawCalls({
      strokeElements: long,
      strokeWidth: 20,
      stroke: '#000000ff',
      look: round,
    });
    const arcs = calls.filter((c) => (c as unknown[])[0] === 'arc').length;
    expect(arcs).toBeLessThan(long.length / 2);
  });

  it('draws freehand as round until it has an outline of its own', () => {
    const pts = densify(
      [
        { x: 20, y: 60 },
        { x: 100, y: 20 },
        { x: 180, y: 60 },
      ],
      2,
      0.8
    );
    const a = recordDrawCalls({
      strokeElements: pts,
      strokeWidth: W,
      stroke: '#000000ff',
      look: round,
    });
    const b = recordDrawCalls({
      strokeElements: pts,
      strokeWidth: W,
      stroke: '#000000ff',
      look: { ...round, outline: 'freehand' },
    });
    expect(b).toEqual(a);
    void distanceToPolyline;
  });
});
