// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveBrushFinalizeConfig } from '../brush-tool/types';

export const STROKE_ERASER_TOOL_ACTION_NAME = 'strokeEraserTool';

export const STROKE_ERASER_TOOL_STATE = {
  ['IDLE']: 'idle',
  ['ERASING']: 'erasing',
} as const;

/** Name of the mutex lock taken around a commit. */
export const STROKE_ERASER_MUTEX_OPERATION = 'strokeEraser';

/**
 * How the points that survive an erase are reduced: a pressure-aware
 * simplification with its tolerance in screen pixels, kept within a quarter of
 * a screen pixel of the line it was cut from, so what is left of a stroke does
 * not visibly change when the pointer is released.
 */
export const STROKE_ERASER_DEFAULT_FINALIZE: WeaveBrushFinalizeConfig = {
  mode: 'dpPressure',
  toleranceUnit: 'screen',
  tolerance: 0.5,
  pressureWeight: 20,
  resampleSpacingPx: 6,
  maxDeviationPx: 0.25,
};

/**
 * Time, in milliseconds, the pieces of one erase may take to be kept faithful
 * all together. Past it the rest are saved as the finishing step leaves them,
 * so a drag over many strokes does not hold up the release of the pointer.
 */
export const STROKE_ERASER_REFINE_BUDGET_MS = 200;

export const STROKE_ERASER_DEFAULT_PROPS = {
  /** Diameter of the eraser, in screen pixels. */
  size: 24,
  /** Pieces whose centerline is shorter than this, in screen pixels, are dropped. */
  minPieceLengthPx: 2,
  finalize: STROKE_ERASER_DEFAULT_FINALIZE,
} as const;

export const STROKE_ERASER_CURSOR_STYLE = {
  outer: 'rgba(255, 255, 255, 0.9)',
  inner: 'rgba(0, 0, 0, 0.85)',
} as const;
