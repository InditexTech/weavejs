// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createCanvas } from 'canvas';
import { WeaveStrokeNode } from '../../stroke';
import type { WeaveStrokePoint } from '../../types';

export type StrokeAttrs = {
  strokeElements: WeaveStrokePoint[];
  strokeWidth?: number;
  stroke?: string;
  dash?: number[];
  look?: unknown;
};

/** A shape as the stroke node sees it: attributes and the absolute scale. */
const fakeShape = (attrs: StrokeAttrs, scale: number) => ({
  getAttrs: () => attrs,
  getAbsoluteScale: () => ({ x: scale, y: scale }),
});

type Drawable = { drawShape: (ctx: unknown, shape: unknown) => void };

/** The node, as the private drawing entry point. */
export const makeNode = () => new WeaveStrokeNode();
const draw = (node: WeaveStrokeNode) => node as unknown as Drawable;

const round = (n: number) => Math.round(n * 1e4) / 1e4;

/** Records every call and property write a stroke makes on its context. */
export function recordDrawCalls(
  attrs: StrokeAttrs,
  node = makeNode(),
  scale = 1
): unknown[] {
  const log: unknown[] = [];
  const ctx = new Proxy(
    {},
    {
      get:
        (_t, name: string) =>
        (...args: unknown[]) =>
          log.push([
            name,
            ...args.map((a) => (typeof a === 'number' ? round(a) : a)),
          ]),
      set: (_t, name: string, value: unknown) => {
        log.push(['set', name, value]);
        return true;
      },
    }
  );
  draw(node).drawShape(ctx, fakeShape(attrs, scale));
  return log;
}

export type Rendered = {
  width: number;
  height: number;
  /** Alpha of a pixel, 0-255. */
  alpha: (x: number, y: number) => number;
  /** Whether a pixel is solidly covered (not just an anti-aliased fringe). */
  covered: (x: number, y: number) => boolean;
};

/** Draws a stroke on a real canvas and reads the pixels back. */
export function renderStroke(
  attrs: StrokeAttrs,
  opts: {
    width?: number;
    height?: number;
    scale?: number;
    node?: WeaveStrokeNode;
  } = {}
): Rendered {
  const width = opts.width ?? 200;
  const height = opts.height ?? 120;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  draw(opts.node ?? makeNode()).drawShape(
    ctx,
    fakeShape(attrs, opts.scale ?? 1)
  );
  const data = ctx.getImageData(0, 0, width, height).data;
  const alpha = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height
      ? 0
      : data[(Math.floor(y) * width + Math.floor(x)) * 4 + 3];
  return { width, height, alpha, covered: (x, y) => alpha(x, y) >= 128 };
}

type P = { x: number; y: number };

/** Distance from a point to a polyline. */
export function distanceToPolyline(p: P, poly: P[]): number {
  let best = Infinity;
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1];
    const b = poly[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = dx * dx + dy * dy;
    const t = l
      ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l))
      : 0;
    best = Math.min(
      best,
      Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t))
    );
  }
  return best;
}

/**
 * Compares a rendering with the ideal shape: everything within `radius` of the
 * path. Returns the share of pixels that are covered but lie more than `slack`
 * outside it (spikes), and the share inside it that are not covered (notches).
 */
export function compareWithIdeal(
  r: Rendered,
  path: P[],
  radius: number,
  slack = 1.2
): { outside: number; missing: number } {
  let outside = 0;
  let missing = 0;
  let ideal = 0;
  for (let y = 0; y < r.height; y++) {
    for (let x = 0; x < r.width; x++) {
      const d = distanceToPolyline({ x: x + 0.5, y: y + 0.5 }, path);
      if (d <= radius - slack) {
        ideal++;
        if (r.alpha(x, y) < 128) missing++;
      } else if (d > radius + slack && r.covered(x, y)) {
        outside++;
      }
    }
  }
  return {
    outside: outside / Math.max(ideal, 1),
    missing: missing / Math.max(ideal, 1),
  };
}

/** Points along a polyline at a fixed spacing, all with one pressure. */
export function densify(
  poly: P[],
  step: number,
  pressure = 0.8
): WeaveStrokePoint[] {
  const out: WeaveStrokePoint[] = [];
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1];
    const b = poly[i];
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 0; k < n; k++) {
      out.push({
        x: a.x + ((b.x - a.x) * k) / n,
        y: a.y + ((b.y - a.y) * k) / n,
        pressure,
      });
    }
  }
  out.push({ ...poly[poly.length - 1], pressure });
  return out;
}
