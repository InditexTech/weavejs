// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const STROKE_ERASER_TOOL_ACTION_NAME = 'strokeEraserTool';

export const STROKE_ERASER_TOOL_STATE = {
  ['IDLE']: 'idle',
  ['ERASING']: 'erasing',
} as const;

/** Name of the mutex lock taken around a commit. */
export const STROKE_ERASER_MUTEX_OPERATION = 'strokeEraser';

/** The shapes the eraser can have. */
export const STROKE_ERASER_SHAPES = ['circle', 'square'] as const;

/**
 * How far, in screen pixels, the path the eraser took may be moved when it is
 * saved, to keep what is saved small: a fraction of what an anti-aliased edge
 * shows, so the edge of the erase is where the eraser had it.
 */
export const STROKE_ERASER_PATH_TOLERANCE_PX = 0.1;

export const STROKE_ERASER_DEFAULT_PROPS = {
  /** Diameter of a circular eraser, or side of a square one, in screen pixels. */
  size: 24,
  shape: 'circle',
} as const;

export const STROKE_ERASER_CURSOR_STYLE = {
  outer: 'rgba(255, 255, 255, 0.9)',
  inner: 'rgba(0, 0, 0, 0.85)',
} as const;
