// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WEAVE_STROKE_LEGACY_LOOK } from '../constants';
import type { WeaveStrokeLook } from '../types';

const OUTLINES = ['legacy', 'round', 'freehand'] as const;
const CURVES = ['uniform', 'centripetal', 'none'] as const;
const PRESSURE_INTERPS = ['catmullRom', 'linear'] as const;
const CAPS = ['separate', 'merged'] as const;

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const pick = <T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T
): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;

/** A finite number clamped to a range, or the fallback. */
const num = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.min(max, Math.max(min, v))
    : fallback;

/**
 * Reads the look saved on a stroke. Returns `null` when the stroke has none or
 * its look is of a version this release does not understand, so the stroke is
 * drawn as in releases that did not know looks. Missing or invalid fields fall
 * back to the legacy values and out-of-range numbers are clamped, so a stored
 * look can never make the renderer misbehave.
 */
export function readStrokeLook(raw: unknown): WeaveStrokeLook | null {
  if (!isObject(raw) || raw['version'] !== WEAVE_STROKE_LEGACY_LOOK.version) {
    return null;
  }

  const base = WEAVE_STROKE_LEGACY_LOOK;
  const width = isObject(raw['width']) ? raw['width'] : {};

  return {
    version: 1,
    outline: pick(raw['outline'], OUTLINES, base.outline),
    curve: pick(raw['curve'], CURVES, base.curve),
    pressureInterp: pick(
      raw['pressureInterp'],
      PRESSURE_INTERPS,
      base.pressureInterp
    ),
    zoomAware:
      typeof raw['zoomAware'] === 'boolean' ? raw['zoomAware'] : base.zoomAware,
    spacingPx: num(raw['spacingPx'], 0.5, 10, base.spacingPx),
    edgePx: num(raw['edgePx'], 0.25, 5, base.edgePx),
    caps: pick(raw['caps'], CAPS, base.caps),
    width: {
      min: num(width['min'], 0, 1, base.width.min),
      max: num(width['max'], 0, 1, base.width.max),
      gamma: num(width['gamma'], 0.2, 3, base.width.gamma),
      taperStart: num(width['taperStart'], 0, 200, base.width.taperStart),
      taperEnd: num(width['taperEnd'], 0, 200, base.width.taperEnd),
    },
  };
}

/** Quadratic ease-out: 0 at the tip, 1 once the taper distance is covered. */
const easeOut = (t: number) => t * (2 - t);

/** Lowest half-width drawn, in canvas units, so a stroke never vanishes. */
export const MIN_HALF_WIDTH = 0.5;

/**
 * Half of the drawn width at a point, in canvas units.
 *
 * The width is the stroke width times `min + (max - min) * pressure^gamma`,
 * narrowed by the start and end tapers. With the default width rule this is
 * `strokeWidth * pressure / 2`, the legacy width. `distanceFromStart` and
 * `distanceToEnd` are along the stroke, in the unit of the tapers.
 */
export function halfWidthAt(
  look: WeaveStrokeLook,
  strokeWidth: number,
  pressure: number,
  distanceFromStart: number,
  distanceToEnd: number
): number {
  const { min, max, gamma, taperStart, taperEnd } = look.width;
  const p = Math.min(
    1,
    Math.max(0, Number.isFinite(pressure) ? pressure : 0.5)
  );
  let fraction = min + (max - min) * Math.pow(p, gamma);

  if (taperStart > 0 && distanceFromStart < taperStart) {
    fraction *= easeOut(Math.max(0, distanceFromStart) / taperStart);
  }
  if (taperEnd > 0 && distanceToEnd < taperEnd) {
    fraction *= easeOut(Math.max(0, distanceToEnd) / taperEnd);
  }

  return Math.max((strokeWidth * fraction) / 2, MIN_HALF_WIDTH);
}
