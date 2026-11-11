// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

import { WEAVE_STROKE_LEGACY_LOOK } from '../constants';
import { WeaveStrokeNode } from '../stroke';
import type { WeaveStrokeLook, WeaveStrokePoint } from '../types';
import { densify, renderStroke } from './shared/stroke-render.helpers';

type Builder = {
  buildLookCenterline: (
    look: WeaveStrokeLook,
    scale: number,
    pts: WeaveStrokePoint[]
  ) => WeaveStrokePoint[];
};
const build = (look: WeaveStrokeLook, scale: number, pts: WeaveStrokePoint[]) =>
  (new WeaveStrokeNode() as unknown as Builder).buildLookCenterline(
    look,
    scale,
    pts
  );

const centripetal: WeaveStrokeLook = {
  ...WEAVE_STROKE_LEGACY_LOOK,
  curve: 'centripetal',
  pressureInterp: 'linear',
  zoomAware: true,
};

describe('centripetal curve', () => {
  it('close-then-far points stay within the envelope of their points', () => {
    const pts: WeaveStrokePoint[] = [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 1, y: 0, pressure: 0.5 },
      { x: 2, y: 1, pressure: 0.5 },
      { x: 60, y: 30, pressure: 0.5 },
      { x: 120, y: 0, pressure: 0.5 },
    ];
    const line = build({ ...centripetal, spacingPx: 0.5 }, 1, pts);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    for (const p of line) {
      expect(p.x).toBeGreaterThanOrEqual(Math.min(...xs) - 3);
      expect(p.x).toBeLessThanOrEqual(Math.max(...xs) + 3);
      expect(p.y).toBeGreaterThanOrEqual(Math.min(...ys) - 3);
      expect(p.y).toBeLessThanOrEqual(Math.max(...ys) + 3);
    }
  });

  it('pressure never exceeds the range of its neighbours with linear interpolation', () => {
    const pts: WeaveStrokePoint[] = [
      { x: 0, y: 0, pressure: 0.2 },
      { x: 10, y: 5, pressure: 0.9 },
      { x: 20, y: 0, pressure: 0.2 },
      { x: 30, y: 5, pressure: 0.9 },
    ];
    for (const p of build(centripetal, 1, pts)) {
      expect(p.pressure).toBeGreaterThanOrEqual(0.2 - 1e-9);
      expect(p.pressure).toBeLessThanOrEqual(0.9 + 1e-9);
    }
  });

  it('has no visible facets at 200% zoom: no facet longer than a pixel bends away from its neighbours', () => {
    const pts: WeaveStrokePoint[] = Array.from({ length: 120 }, (_, i) => ({
      x: i * 1.2,
      y: 20 * Math.sin(i / 10),
      pressure: 0.8,
    }));
    const scale = 2;
    const line = build({ ...centripetal, edgePx: 1 }, scale, pts);
    for (let i = 1; i < line.length - 1; i++) {
      const a = line[i - 1];
      const b = line[i];
      const c = line[i + 1];
      const chord = Math.hypot(c.x - a.x, c.y - a.y) || 1;
      const sagitta =
        Math.abs((c.x - a.x) * (a.y - b.y) - (a.x - b.x) * (c.y - a.y)) / chord;
      expect(sagitta * scale).toBeLessThanOrEqual(0.5);
    }
  });

  it('renders without error at several zoom levels', () => {
    const pts = densify(
      [
        { x: 20, y: 60 },
        { x: 100, y: 20 },
        { x: 180, y: 60 },
      ],
      3,
      0.8
    );
    for (const scale of [0.3, 1, 2]) {
      const r = renderStroke(
        {
          strokeElements: pts,
          strokeWidth: 10,
          stroke: '#000000ff',
          look: centripetal,
        },
        { scale }
      );
      expect(r.covered(100, 20)).toBe(true);
    }
  });
});
