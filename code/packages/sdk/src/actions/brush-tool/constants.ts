// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const BRUSH_TOOL_ACTION_NAME = 'brushTool';

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

export const BRUSH_TOOL_DEFAULT_CONFIG = {
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
