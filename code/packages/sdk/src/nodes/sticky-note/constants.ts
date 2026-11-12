// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WEAVE_SHAPE_LABEL_DEFAULTS } from '../shared/shape-label.constants';

export const WEAVE_STICKY_NOTE_NODE_TYPE = 'sticky-note';

export const DEFAULT_STICKY_NOTE_WIDTH = 200;
export const DEFAULT_STICKY_NOTE_HEIGHT = 200;
export const MIN_STICKY_NOTE_SIZE = 120;
export const DEFAULT_DOG_EAR_SIZE = 28;
export const STICKY_NOTE_AUTHOR_MARGIN = 22;
export const DEFAULT_STICKY_NOTE_PADDING = 16;

export const DEFAULT_STICKY_NOTE_COLOR = '#FEF08A'; // Pastel Yellow
export const DEFAULT_STICKY_NOTE_FONT_SIZE = 16;
export const DEFAULT_STICKY_NOTE_FONT_FAMILY = 'Inter, system-ui, sans-serif';
export const DEFAULT_STICKY_NOTE_TEXT_COLOR = '#1F2937';
export const DEFAULT_STICKY_NOTE_LINE_HEIGHT = 1.35;

export const STICKY_NOTE_PASTEL_COLORS = [
  '#FEF08A', // Yellow
  '#A7F3D0', // Mint
  '#FECDD3', // Rose
  '#DDD6FE', // Lavender
  '#BAE6FD', // Sky
  '#FDE68A', // Amber
  '#FFEDD5', // Coral
  '#F9FAFB', // White
] as const;

/**
 * Label defaults for sticky notes: top-left aligned text, Inter 16px with
 * comfortable padding. Overrides the generic shape-label defaults
 * (centered Arial 14px, 8px padding).
 */
export const STICKY_NOTE_LABEL_DEFAULTS = {
  ...WEAVE_SHAPE_LABEL_DEFAULTS,
  labelFontFamily: DEFAULT_STICKY_NOTE_FONT_FAMILY,
  labelFontSize: DEFAULT_STICKY_NOTE_FONT_SIZE,
  labelFill: DEFAULT_STICKY_NOTE_TEXT_COLOR,
  labelLineHeight: DEFAULT_STICKY_NOTE_LINE_HEIGHT,
  labelAlign: 'left',
  labelVerticalAlign: 'top',
  labelPaddingX: DEFAULT_STICKY_NOTE_PADDING,
  labelPaddingY: DEFAULT_STICKY_NOTE_PADDING,
} as const;

/**
 * Vertical space reserved inside a sticky note below the text. `top` and
 * `bottom` alignment keep the text clear of the dog-ear fold and the author
 * row. `middle` alignment only reserves the author row, so the text is
 * centered in the space above it (and on the sheet when there is no author);
 * the fold is a corner triangle that left-aligned text rarely reaches.
 */
export function getStickyNoteVerticalReserve(
  dogEarSize: number,
  hasAuthor: boolean,
  verticalAlign: string
): { top: number; bottom: number; total: number } {
  const authorMargin = hasAuthor ? STICKY_NOTE_AUTHOR_MARGIN : 0;
  const bottom =
    verticalAlign === 'middle' ? authorMargin : dogEarSize + authorMargin;
  return { top: 0, bottom, total: bottom };
}
