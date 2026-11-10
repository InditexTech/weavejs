// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveBrushInputProfile } from './types';

export const BRUSH_TOOL_ACTION_NAME = 'brushTool';

/** Name under which the lab plugin registers itself. */
export const BRUSH_LAB_PLUGIN_NAME = 'brushLab';

export const BRUSH_TOOL_STATE = {
  ['INACTIVE']: 'inactive',
  ['IDLE']: 'idle',
  ['DEFINE_STROKE']: 'defineStroke',
} as const;

/**
 * Suffix applied to a finished stroke's preview node while it is briefly
 * kept on screen alongside the persisted node, so the two cannot collide on
 * the same id.
 */
export const PREVIEW_ID_SUFFIX = '--preview';

/**
 * How many frames the preview of a finished stroke may wait for its
 * persisted counterpart to be rendered before it is removed regardless.
 * Bounds the handover so a preview can never be orphaned on screen.
 */
export const PREVIEW_HANDOVER_MAX_FRAMES = 30;

export const BRUSH_INPUT_PROFILE_KEYS = [
  'mouse',
  'touch',
  'pen.applePencil',
  'pen.desktop',
] as const;

/**
 * The legacy input profile: reproduces, point for point, what the brush tool
 * recorded before profiles existed. Every profile starts from it.
 */
export const BRUSH_LEGACY_INPUT_PROFILE: WeaveBrushInputProfile = {
  capture: {
    source: 'legacy',
    clock: 'now',
    minMovePx: 0,
    predicted: 'tail',
    event: 'pointermove',
  },
  pressure: {
    zero: 'legacy',
    filter: 'legacy',
    timeConstantMs: 40,
    oneEuro: { minCutoff: 1, beta: 0.01 },
    floor: 0.15,
    start: 'backfill',
    startSamples: 3,
    end: 'backfill',
  },
  stabilizer: {
    type: 'none',
    minCutoff: 3,
    beta: 0.01,
    radiusPx: 4,
    amount: 0.3,
    zoomAware: false,
    catchUpOnEnd: true,
  },
  finalize: {
    mode: 'dp',
    toleranceUnit: 'canvas',
    pressureWeight: 20,
    resampleSpacingPx: 2,
  },
  touchGuard: {
    waitMs: 0,
    movePx: 0,
    cancelOnSecondTouch: false,
    ignoreAfterPen: false,
  },
};

export const BRUSH_TOOL_DEFAULT_CONFIG = {
  input: {
    forceProfile: null,
    profiles: {
      mouse: BRUSH_LEGACY_INPUT_PROFILE,
      touch: BRUSH_LEGACY_INPUT_PROFILE,
      'pen.applePencil': BRUSH_LEGACY_INPUT_PROFILE,
      'pen.desktop': BRUSH_LEGACY_INPUT_PROFILE,
    },
  },
  interpolationSteps: 10,
  // Douglas-Peucker tolerance (in canvas units) applied once, when a stroke
  // is finalized. This is the dominant cause of a finished stroke looking
  // less faithful than the one being drawn: while drawing, every raw sample
  // is rendered, but on pointer-up the point list is simplified and only
  // then re-rendered.
  //
  // Measured max deviation from the drawn path (spline resolution 8):
  //   tolerance 1.0  → 0.79px / 6.22px / 0.46px   (handwriting / signature / long sweep)
  //   tolerance 0.5  → 0.40px / 1.60px / 0.30px
  //   tolerance 0.25 → 0.21px / 1.18px / 0.15px
  // 0.5 removes most of the visible "snap" on finalize while still dropping
  // ~75% of raw samples; going below it buys little and costs point count
  // in every persisted document.
  simplifyTolerance: 0.5,
};
