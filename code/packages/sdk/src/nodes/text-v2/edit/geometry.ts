// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { TextLayout, LayoutLine } from '../layout/engine';

/**
 * Pure caret/selection geometry over a `TextLayout`. Offsets are UTF-16
 * indices into the derived `text` string (newline counts as one char).
 * `measure(str)` returns the rendered width of a string (letter spacing
 * included) so this module has no Konva/DOM dependency.
 */

/** Rendered width of a string; `font` overrides the node font (rich runs). */
export type Measure = (text: string, font?: string) => number;
export type Point = { x: number; y: number };

const graphemeSeg: Intl.Segmenter | null =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;
const wordSeg: Intl.Segmenter | null =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'word' })
    : null;

function boundaries(text: string, seg: Intl.Segmenter | null): number[] {
  if (!seg) return Array.from({ length: text.length + 1 }, (_, i) => i);
  const out = [0];
  for (const s of seg.segment(text)) out.push(s.index + s.segment.length);
  return out;
}

export function prevGrapheme(text: string, offset: number): number {
  if (offset <= 0) return 0;
  const b = boundaries(text, graphemeSeg);
  for (let i = b.length - 1; i >= 0; i--) if (b[i] < offset) return b[i];
  return 0;
}

export function nextGrapheme(text: string, offset: number): number {
  if (offset >= text.length) return text.length;
  const b = boundaries(text, graphemeSeg);
  for (const v of b) if (v > offset) return v;
  return text.length;
}

/** Word segment [start, end) containing (or adjacent to) the offset. */
export function wordRangeAt(text: string, offset: number): [number, number] {
  if (text === '') return [0, 0];
  offset = Math.max(0, Math.min(offset, text.length));
  if (!wordSeg) {
    let s = offset;
    let e = offset;
    while (s > 0 && /\S/.test(text[s - 1])) s--;
    while (e < text.length && /\S/.test(text[e])) e++;
    return [s, e];
  }
  let last: [number, number] = [offset, offset];
  for (const seg of wordSeg.segment(text)) {
    const s = seg.index;
    const e = s + seg.segment.length;
    last = [s, e];
    if (offset < e) return [s, e];
  }
  return last;
}

/** Paragraph range [start, end) (no trailing newline) containing offset. */
export function paragraphRangeAt(
  text: string,
  offset: number
): [number, number] {
  offset = Math.max(0, Math.min(offset, text.length));
  const s = text.lastIndexOf('\n', offset - 1) + 1;
  let e = text.indexOf('\n', offset);
  if (e === -1) e = text.length;
  return [s, e];
}

/** Previous word start (Ctrl+Left semantics). */
export function prevWordBoundary(text: string, offset: number): number {
  let i = offset;
  while (i > 0 && /\s/.test(text[i - 1])) i--;
  if (i === 0) return 0;
  return wordRangeAt(text, i - 1)[0];
}

/** Next word end (Ctrl+Right semantics). */
export function nextWordBoundary(text: string, offset: number): number {
  let i = offset;
  while (i < text.length && /\s/.test(text[i])) i++;
  if (i >= text.length) return text.length;
  return wordRangeAt(text, i)[1];
}

export function lineIndexAt(layout: TextLayout, offset: number): number {
  const lines = layout.lines;
  if (lines.length === 0) return 0;
  let fallback = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.start <= offset) fallback = i;
    if (offset >= l.start && offset <= l.end) {
      const next = lines[i + 1];
      // A soft-wrap boundary belongs to the start of the next line.
      if (offset === l.end && !l.lastInParagraph && next?.start === offset) {
        continue;
      }
      return i;
    }
  }
  return fallback;
}

/** Width of the first `k` UTF-16 units of a line, run by run. */
function prefixWidth(line: LayoutLine, k: number, measure: Measure): number {
  if (k <= 0) return 0;
  if (line.segments.length === 0) return measure(line.text.slice(0, k));
  let width = 0;
  let pos = 0;
  for (const seg of line.segments) {
    const end = pos + seg.t.length;
    if (k >= end) {
      width += seg.width;
    } else {
      width += measure(seg.t.slice(0, k - pos), seg.font);
      break;
    }
    pos = end;
    if (k === end) break;
  }
  return width;
}

function lineX(line: LayoutLine, offset: number, measure: Measure): number {
  const k = Math.max(0, Math.min(offset - line.start, line.text.length));
  return line.offsetX + prefixWidth(line, k, measure);
}

/** Caret rectangle in text-local coordinates (before padding/valign offset). */
export function caretRect(
  layout: TextLayout,
  offset: number,
  measure: Measure
): { x: number; y: number; height: number; line: number } {
  const i = lineIndexAt(layout, offset);
  const line = layout.lines[i];
  if (!line) return { x: 0, y: 0, height: layout.lineHeightPx, line: 0 };
  return {
    x: lineX(line, offset, measure),
    y: line.y,
    height: line.height,
    line: i,
  };
}

/** Index of the line containing a local y (clamped). */
export function lineIndexAtY(layout: TextLayout, y: number): number {
  const lines = layout.lines;
  for (let i = 0; i < lines.length; i++) {
    if (y < lines[i].y + lines[i].height) return i;
  }
  return Math.max(0, lines.length - 1);
}

/** Offset closest to a point in text-local coordinates. */
export function offsetFromPoint(
  layout: TextLayout,
  point: Point,
  measure: Measure
): number {
  const lines = layout.lines;
  if (lines.length === 0) return 0;
  const i = lineIndexAtY(layout, point.y);
  return offsetInLine(lines[i], point.x, measure);
}

export function offsetInLine(
  line: LayoutLine,
  x: number,
  measure: Measure
): number {
  const rel = x - line.offsetX;
  if (rel <= 0 || line.text === '') return line.start;
  const b = boundaries(line.text, graphemeSeg);
  let prevW = 0;
  for (let k = 1; k < b.length; k++) {
    const w = prefixWidth(line, b[k], measure);
    if (rel < (prevW + w) / 2) return line.start + b[k - 1];
    prevW = w;
  }
  return line.end;
}

/** Move one visual line up/down keeping a desired x. */
export function moveVertical(
  layout: TextLayout,
  offset: number,
  dir: -1 | 1,
  desiredX: number,
  measure: Measure
): number {
  const i = lineIndexAt(layout, offset);
  const j = i + dir;
  if (j < 0) return 0;
  if (j >= layout.lines.length) {
    return layout.lines.at(-1)?.end ?? 0;
  }
  return offsetInLine(layout.lines[j], desiredX, measure);
}

export function lineHome(layout: TextLayout, offset: number): number {
  return layout.lines[lineIndexAt(layout, offset)]?.start ?? 0;
}

export function lineEnd(layout: TextLayout, offset: number): number {
  return layout.lines[lineIndexAt(layout, offset)]?.end ?? 0;
}

/** Selection rectangles (one per touched line) in text-local coordinates. */
export function selectionRects(
  layout: TextLayout,
  from: number,
  to: number,
  measure: Measure
): { x: number; y: number; width: number; height: number }[] {
  if (from > to) [from, to] = [to, from];
  if (from === to) return [];
  const out: { x: number; y: number; width: number; height: number }[] = [];
  layout.lines.forEach((line) => {
    const hasNewline = line.lastInParagraph;
    // newline char sits at line.end for the last line of a paragraph
    const lineFrom = Math.max(from, line.start);
    const lineTo = Math.min(to, hasNewline ? line.end + 1 : line.end);
    if (
      lineTo <= lineFrom &&
      !(line.start === line.end && from <= line.start && to > line.start)
    ) {
      return;
    }
    const x1 = lineX(line, Math.min(lineFrom, line.end), measure);
    let x2 = lineX(line, Math.min(lineTo, line.end), measure);
    if (hasNewline && to > line.end) x2 += Math.max(4, layout.textHeight / 3);
    if (x2 <= x1) return;
    out.push({
      x: x1,
      y: line.y,
      width: x2 - x1,
      height: line.height,
    });
  });
  return out;
}
