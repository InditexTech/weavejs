// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  WEAVE_STROKE_LEGACY_LOOK,
  WEAVE_STROKE_LOOK_OPTIONAL_DEFAULTS,
} from '../constants';
import type { WeaveStrokeLook } from '../types';

const OUTLINES = ['legacy', 'round', 'freehand'] as const;
const CURVES = ['uniform', 'centripetal', 'none'] as const;
const PRESSURE_INTERPS = ['catmullRom', 'linear'] as const;
const CAPS = ['separate', 'merged'] as const;
const ENDS = ['round', 'flat'] as const;
const EASINGS = ['linear', 'easeIn', 'easeOut', 'easeInOut'] as const;

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

const isNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

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

  const look: WeaveStrokeLook = {
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

  // Fields added after the first release are kept only when the stored look
  // has a valid value, so looks saved before them read back unchanged.
  if (ENDS.includes(raw['ends'] as (typeof ENDS)[number])) {
    look.ends = raw['ends'] as (typeof ENDS)[number];
  }
  if (isNumber(raw['variance'])) look.variance = num(raw['variance'], 0, 1, 0);
  if (EASINGS.includes(width['easing'] as (typeof EASINGS)[number])) {
    look.width.easing = width['easing'] as (typeof EASINGS)[number];
  }
  if (isNumber(width['nibAngle'])) {
    look.width.nibAngle = num(width['nibAngle'], -180, 180, 0);
  }
  if (isNumber(width['nibContrast'])) {
    look.width.nibContrast = num(width['nibContrast'], 0, 1, 0);
  }

  return look;
}

const EASE: Record<
  NonNullable<WeaveStrokeLook['width']['easing']>,
  (t: number) => number
> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  /** Quadratic ease-out: 0 at the tip, 1 once the taper distance is covered. */
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
};

/** Lowest half-width drawn, in canvas units, so a stroke never vanishes. */
export const MIN_HALF_WIDTH = 0.5;

/** How far, at a variance of 1, the width strays from its base: a fraction of it. */
export const VARIANCE_AMPLITUDE = 0.5;

/** What is known at a point besides its pressure and distance along the stroke. */
export type WidthContext = {
  /** Variation at the point, from -1 to 1; used with the look's `variance`. */
  variation?: number;
  /** Direction of travel at the point, in radians; used with the look's nib. */
  heading?: number;
};

/**
 * Half of the drawn width at a point, in canvas units.
 *
 * The width is the stroke width times `min + (max - min) * pressure^gamma`,
 * narrowed by the start and end tapers, which follow the look's `easing`. With
 * the default width rule this is `strokeWidth * pressure / 2`, the legacy
 * width. `distanceFromStart` and `distanceToEnd` are along the stroke, in the
 * unit of the tapers. `context` adds the variance and the nib of the look; a
 * look without them, or a call without a context, gives the plain width.
 */
export function halfWidthAt(
  look: WeaveStrokeLook,
  strokeWidth: number,
  pressure: number,
  distanceFromStart: number,
  distanceToEnd: number,
  context?: WidthContext
): number {
  const { min, max, gamma } = look.width;
  let { taperStart, taperEnd } = look.width;
  const ease =
    EASE[look.width.easing ?? WEAVE_STROKE_LOOK_OPTIONAL_DEFAULTS.width.easing];

  // Tapers that do not both fit in a short stroke shrink together, in
  // proportion. Left as they are they narrow the stroke from both ends at once
  // and it never reaches its full width: a short stroke would be a hairline.
  const length = distanceFromStart + distanceToEnd;
  const reach = taperStart + taperEnd;
  if (reach > length && reach > 0 && Number.isFinite(length)) {
    const fit = Math.max(length, 0) / reach;
    taperStart *= fit;
    taperEnd *= fit;
  }
  const p = Math.min(
    1,
    Math.max(0, Number.isFinite(pressure) ? pressure : 0.5)
  );
  let fraction = min + (max - min) * Math.pow(p, gamma);

  if (taperStart > 0 && distanceFromStart < taperStart) {
    fraction *= ease(Math.max(0, distanceFromStart) / taperStart);
  }
  if (taperEnd > 0 && distanceToEnd < taperEnd) {
    fraction *= ease(Math.max(0, distanceToEnd) / taperEnd);
  }

  const variance = look.variance ?? 0;
  if (variance > 0 && context?.variation !== undefined) {
    fraction *= 1 + variance * VARIANCE_AMPLITUDE * context.variation;
  }

  const contrast = look.width.nibContrast ?? 0;
  if (contrast > 0 && context?.heading !== undefined) {
    const across = Math.abs(
      Math.sin(context.heading - ((look.width.nibAngle ?? 0) * Math.PI) / 180)
    );
    fraction *= 1 - contrast * (1 - across);
  }

  return Math.max((strokeWidth * fraction) / 2, MIN_HALF_WIDTH);
}
