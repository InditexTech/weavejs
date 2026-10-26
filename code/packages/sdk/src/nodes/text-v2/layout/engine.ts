// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  blockText,
  listMarkers,
  runLineHeight,
  runRatio,
  type WeaveTextBlock,
  type WeaveTextMarks,
} from '../model';

/**
 * Text layout engine. Independent of `WeaveTextNode` and of any Konva node:
 * it takes blocks + a style + bounds, so other shapes (e.g. shape labels)
 * can reuse it. Wrapping is a port of the greedy algorithm in
 * `Konva.Text._setTextData` (binary search for the longest fitting prefix,
 * then back up to the last space/dash), LTR only.
 */

export type TextWrap = 'word' | 'char' | 'none';
export type TextAlign = 'left' | 'center' | 'right';

export type TextLayoutStyle = {
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  fontVariant: string;
  lineHeight: number;
  letterSpacing: number;
  wrap: TextWrap;
  align: TextAlign;
  /** List indent per depth, as a multiple of `fontSize` (default 1.5). */
  indentStep?: number;
};

export const DEFAULT_INDENT_STEP = 1.5;
/** Width always left for text next to a list indent, in `fontSize` units. */
export const MIN_TEXT_WIDTH_RATIO = 4;

/** Bounds supplied by the target. `undefined` width/height means "auto". */
export type TextLayoutBounds = {
  width: number | undefined;
  height: number | undefined;
  padding: number;
};

export type TextMeasurer = (font: string, text: string) => number;

export type LayoutSegment = {
  t: string;
  m?: WeaveTextMarks;
  /** x offset relative to the line start. */
  x: number;
  width: number;
  /** Run index inside its paragraph (hit testing / hover). */
  run: number;
  /** Resolved canvas font and size (px) of the run. */
  font: string;
  fontSize: number;
};

export type LayoutMarker = {
  text: string;
  /** x relative to the content box (before padding). */
  x: number;
  font: string;
  fontSize: number;
  color?: string;
};

export type LayoutLine = {
  paragraph: number;
  /** Global character offsets [start, end) in the derived `text` string. */
  start: number;
  end: number;
  text: string;
  /** Width of the trimmed line text. */
  width: number;
  /** Width Konva reports for the line before trimming (for textWidth parity). */
  measuredWidth: number;
  /** Alignment x offset (0 for left). */
  offsetX: number;
  y: number;
  /** Line box height and baseline offset from the line top. */
  height: number;
  baseline: number;
  /** Indent of the text (list blocks), already included in `offsetX`. */
  indent: number;
  marker?: LayoutMarker;
  /** Resolved paragraph alignment. */
  align: TextAlign;
  segments: LayoutSegment[];
  lastInParagraph: boolean;
};

export type TextLayout = {
  lines: LayoutLine[];
  /** Widest line, like `Konva.Text.getTextWidth()`. */
  textWidth: number;
  /** Font size, like `Konva.Text.getTextHeight()`. */
  textHeight: number;
  lineHeightPx: number;
  /** Sum of line heights (without padding). */
  contentHeight: number;
  /** Resolved node size, like `Konva.Text.width()/height()`. */
  width: number;
  height: number;
};

/** Quote multi-word families like `Konva` does so the font shorthand parses. */
export function normalizeFontFamily(fontFamily: string): string {
  return fontFamily
    .split(',')
    .map((family) => {
      family = family.trim();
      const hasSpace = family.includes(' ');
      const hasQuotes = family.includes('"') || family.includes("'");
      return hasSpace && !hasQuotes ? `"${family}"` : family;
    })
    .join(', ');
}

export function fontString(s: TextLayoutStyle): string {
  // Leave out `normal` keywords: skia-canvas (server side) parses
  // `italic normal 20px X` as a regular font and silently drops the italic,
  // while `italic 20px X` works everywhere.
  const keywords = `${s.fontStyle} ${s.fontVariant}`
    .split(/\s+/)
    .filter((token) => token !== '' && token !== 'normal');
  return `${[...keywords, `${s.fontSize}px`].join(' ')} ${normalizeFontFamily(
    s.fontFamily
  )}`;
}

/** Style of a run: node style overridden by the run marks. */
export function runStyle(
  style: TextLayoutStyle,
  m: WeaveTextMarks | undefined
): TextLayoutStyle {
  if (!m) return style;
  let fontStyle = style.fontStyle;
  if (m.bold || m.italic) {
    const tokens = new Set(fontStyle.split(/\s+/).filter(Boolean));
    tokens.delete('normal');
    if (m.italic) tokens.add('italic');
    if (m.bold) tokens.add('bold');
    fontStyle = tokens.size === 0 ? 'normal' : Array.from(tokens).join(' ');
  }
  return {
    ...style,
    fontStyle,
    fontSize: style.fontSize * runRatio(m),
    fontFamily:
      typeof m.family === 'string' && m.family ? m.family : style.fontFamily,
  };
}

export type FontMetrics = { ascent: number; descent: number };
export type MetricsProvider = (font: string, size: number) => FontMetrics;

/** Pure fallback (same constants as Konva.Text when the browser has none). */
export const approxMetrics: MetricsProvider = (_font, size) => ({
  ascent: 0.91 * size,
  descent: 0.21 * size,
});
const metricsCache = new Map<string, FontMetrics>();

/** Ascent/descent used for baseline placement (parity with Konva.Text). */
export function fontMetrics(font: string, size: number): FontMetrics {
  if (Konva.legacyTextRendering) return { ascent: 0, descent: 0 };
  const hit = metricsCache.get(font);
  if (hit) return hit;
  const ctx = Konva.Util.createCanvasElement().getContext('2d')!;
  ctx.font = font;
  const m = ctx.measureText('M');
  const scale = size / 100;
  const out = {
    ascent: m.fontBoundingBoxAscent ?? 91 * scale,
    descent: m.fontBoundingBoxDescent ?? 21 * scale,
  };
  if (metricsCache.size > 2000) metricsCache.clear();
  metricsCache.set(font, out);
  return out;
}

let sharedContext: CanvasRenderingContext2D | null = null;

/** Default measurer: works on browser, node-canvas and skia-canvas backends. */
export const canvasMeasurer: TextMeasurer = (font, text) => {
  sharedContext ??= Konva.Util.createCanvasElement().getContext('2d');
  sharedContext!.font = font;
  return sharedContext!.measureText(text).width;
};

const graphemeSegmenter: Intl.Segmenter | null =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

export function splitGraphemes(text: string): string[] {
  if (text === '') return [];
  if (graphemeSegmenter) {
    return Array.from(graphemeSegmenter.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

const WS = /\s/;
const MAX_CACHE = 20000;
const MAX_CACHED_CHUNK = 256;

type ParagraphLine = {
  startG: number;
  endG: number; // trimmed end (grapheme index, exclusive)
  measuredWidth: number;
  lastInParagraph: boolean;
  height: number;
  baseline: number;
};

type ParagraphEntry = {
  sig: string;
  graphemes: string[];
  runOf: number[]; // run index per grapheme
  fonts: string[]; // canvas font per run
  lineHeights: number[]; // line height multiplier per run
  sizes: number[]; // px size per run
  lines: ParagraphLine[];
};

function flattenBlock(block: WeaveTextBlock) {
  const graphemes: string[] = [];
  const runOf: number[] = [];
  for (let ri = 0; ri < block.runs.length; ri++) {
    for (const g of splitGraphemes(block.runs[ri].t)) {
      graphemes.push(g);
      runOf.push(ri);
    }
  }
  return { graphemes, runOf };
}

function trimTrailingSpace(graphemes: string[], start: number, end: number) {
  let e = end;
  while (e > start && WS.test(graphemes[e - 1])) e--;
  return e;
}

function skipSpace(graphemes: string[], from: number) {
  let i = from;
  while (i < graphemes.length && WS.test(graphemes[i])) i++;
  return i;
}

const isNum = (v: number | undefined): v is number =>
  v !== undefined && !Number.isNaN(v);

/** Konva's word wrap: break after the last space/dash that fits (0 = no break). */
function wordWrapIndex(
  graphemes: string[],
  start: number,
  matchLen: number,
  matchWidth: number,
  maxWidth: number
): number {
  const nextChar = graphemes[start + matchLen];
  const nextIsSpaceOrDash = nextChar === ' ' || nextChar === '-';
  if (nextIsSpaceOrDash && matchWidth <= maxWidth) return matchLen;
  const seg = graphemes.slice(start, start + matchLen);
  return Math.max(seg.lastIndexOf(' '), seg.lastIndexOf('-')) + 1;
}

function applyAlign(lines: LayoutLine[], width: number, padding: number) {
  for (const line of lines) {
    const align = line.align;
    if (align === 'left') {
      line.offsetX = line.indent;
      continue;
    }
    const free = width - line.indent - line.width - padding * 2;
    line.offsetX = line.indent + (align === 'center' ? free / 2 : free);
  }
}

export class TextLayoutEngine {
  private readonly measure: TextMeasurer;
  private readonly cache = new Map<string, number>();
  private paragraphs: ParagraphEntry[] = [];
  /** Entries by signature, so paragraphs that shifted index are reused. */
  private pool = new Map<string, ParagraphEntry>();
  private lastParagraphsRelaid = 0;

  private readonly metrics: MetricsProvider;

  constructor(
    measurer: TextMeasurer = canvasMeasurer,
    metrics: MetricsProvider = approxMetrics
  ) {
    this.measure = measurer;
    this.metrics = metrics;
  }

  /** Number of paragraphs recomputed by the last `layout()` call. */
  getLastRelaidCount(): number {
    return this.lastParagraphsRelaid;
  }

  clearCaches() {
    this.cache.clear();
    this.paragraphs = [];
    this.pool.clear();
  }

  /** Text indent of a block in px (0 for plain paragraphs). */
  private indentFor(
    block: WeaveTextBlock,
    style: TextLayoutStyle,
    fixedWidth: boolean,
    maxWidth: number
  ): number {
    if (!block.kind) return 0;
    const step =
      typeof style.indentStep === 'number' &&
      Number.isFinite(style.indentStep) &&
      style.indentStep > 0
        ? style.indentStep
        : DEFAULT_INDENT_STEP;
    const stepPx = step * style.fontSize;
    const depth = Math.max(0, Math.floor(block.depth ?? 0));
    const wanted = (depth + 1) * stepPx;
    if (!fixedWidth) return wanted;
    const limit = Math.max(0, maxWidth - MIN_TEXT_WIDTH_RATIO * style.fontSize);
    return Math.min(wanted, limit);
  }

  private sigFor(
    block: WeaveTextBlock,
    style: TextLayoutStyle,
    fixedWidth: boolean,
    maxWidth: number,
    indent: number
  ): string {
    return `${fontString(style)}|${style.lineHeight}|${style.letterSpacing}|${
      style.wrap
    }|${fixedWidth ? maxWidth - indent : 'auto'}|${JSON.stringify(block.runs)}`;
  }

  /**
   * Pre-compute paragraph layouts for `blocks` within a time budget so a
   * following `layout()` is cheap. Call repeatedly until it returns true.
   * Lets callers time-slice very large content (e.g. bulk paste).
   */
  warm(
    blocks: WeaveTextBlock[],
    style: TextLayoutStyle,
    bounds: TextLayoutBounds,
    budgetMs: number
  ): boolean {
    const fixedWidth = isNum(bounds.width);
    const maxWidth = (bounds.width ?? 0) - bounds.padding * 2;
    const deadline = now() + budgetMs;
    for (const block of blocks) {
      const indent = this.indentFor(block, style, fixedWidth, maxWidth);
      const sig = this.sigFor(block, style, fixedWidth, maxWidth, indent);
      if (this.pool.has(sig)) continue;
      this.pool.set(
        sig,
        this.layoutParagraph(block, sig, style, fixedWidth, maxWidth - indent)
      );
      if (now() >= deadline) return false;
    }
    return true;
  }

  private measureChunk(font: string, text: string, spacing: number): number {
    if (text === '') return 0;
    // Long chunks are rarely re-measured and make poor (costly) map keys.
    if (text.length > MAX_CACHED_CHUNK) {
      return this.measure(font, text) + text.length * spacing;
    }
    const key = `${font}\u0000${text}`;
    let w = this.cache.get(key);
    if (w === undefined) {
      w = this.measure(font, text);
      if (this.cache.size >= MAX_CACHE) this.cache.clear();
      this.cache.set(key, w);
    }
    return w + text.length * spacing;
  }

  layout(
    blocks: WeaveTextBlock[],
    style: TextLayoutStyle,
    bounds: TextLayoutBounds
  ): TextLayout {
    const padding = bounds.padding;
    const fixedWidth = isNum(bounds.width);
    const fixedHeight = isNum(bounds.height);
    const maxWidth = (bounds.width ?? 0) - padding * 2;
    const maxHeightPx = (bounds.height ?? 0) - padding * 2;
    const lineHeightPx = style.lineHeight * style.fontSize;
    const markers = listMarkers(blocks);

    const prev = this.paragraphs;
    const next: ParagraphEntry[] = [];
    let relaid = 0;
    const lines: LayoutLine[] = [];
    let textWidth = 0;
    let offset = 0;
    let contentHeight = 0;

    for (let p = 0; p < blocks.length; p++) {
      const block = blocks[p];
      const indent = this.indentFor(block, style, fixedWidth, maxWidth);
      const sig = this.sigFor(block, style, fixedWidth, maxWidth, indent);
      let entry: ParagraphEntry | undefined =
        prev[p]?.sig === sig ? prev[p] : this.pool.get(sig);
      if (!entry) {
        entry = this.layoutParagraph(
          block,
          sig,
          style,
          fixedWidth,
          maxWidth - indent
        );
        relaid++;
      }
      next.push(entry);

      const emitted = this.emitLines(entry, block, p, offset, lines, {
        style,
        indent,
        marker: markers[p],
        y: contentHeight,
        maxHeightPx: fixedHeight ? maxHeightPx : undefined,
      });
      contentHeight = emitted.y;
      textWidth = Math.max(textWidth, emitted.maxWidth);
      if (emitted.stopped) break;
      offset += blockText(block).length + 1;
    }

    this.paragraphs = next;
    this.pool = new Map(next.map((e) => [e.sig, e]));
    this.lastParagraphsRelaid = relaid;

    const width = fixedWidth
      ? (bounds.width as number)
      : textWidth + padding * 2;
    const height = fixedHeight
      ? (bounds.height as number)
      : contentHeight + padding * 2;

    applyAlign(lines, width, padding);

    return {
      lines,
      textWidth,
      textHeight: style.fontSize,
      lineHeightPx,
      contentHeight,
      width,
      height,
    };
  }

  /** Append a paragraph's lines to `lines`; stops once a fixed height is full. */
  private emitLines(
    entry: ParagraphEntry,
    block: WeaveTextBlock,
    paragraph: number,
    offset: number,
    lines: LayoutLine[],
    opts: {
      style: TextLayoutStyle;
      indent: number;
      marker: string | null;
      y: number;
      maxHeightPx: number | undefined;
    }
  ): { stopped: boolean; maxWidth: number; y: number } {
    const { style, indent, maxHeightPx } = opts;
    let { y } = opts;
    let maxWidth = 0;
    let first = true;
    for (const pl of entry.lines) {
      const text = entry.graphemes.slice(pl.startG, pl.endG).join('');
      const segments = this.buildSegments(entry, block, pl, style);
      const startChar = entry.graphemes.slice(0, pl.startG).join('').length;
      let marker: LayoutMarker | undefined;
      if (first && opts.marker) {
        const m0 = block.runs[0]?.m;
        const rs = runStyle(style, m0);
        const stepPx = Math.min(indent, this.stepPx(style));
        marker = {
          text: opts.marker,
          x: Math.max(0, indent - stepPx),
          font: fontString(rs),
          fontSize: rs.fontSize,
          color: typeof m0?.color === 'string' ? m0.color : undefined,
        };
      }
      first = false;
      lines.push({
        paragraph,
        start: offset + startChar,
        end: offset + startChar + text.length,
        text,
        width: segments.reduce((a, s) => a + s.width, 0),
        measuredWidth: pl.measuredWidth,
        offsetX: indent,
        y,
        height: pl.height,
        baseline: pl.baseline,
        indent,
        marker,
        align: block.align ?? style.align,
        segments,
        lastInParagraph: pl.lastInParagraph,
      });
      y += pl.height;
      maxWidth = Math.max(maxWidth, pl.measuredWidth + indent);
      // Konva stops emitting lines once the fixed height is full.
      if (maxHeightPx !== undefined && y + pl.height > maxHeightPx) {
        return { stopped: true, maxWidth, y };
      }
    }
    return { stopped: false, maxWidth, y };
  }

  private stepPx(style: TextLayoutStyle): number {
    const step =
      typeof style.indentStep === 'number' &&
      Number.isFinite(style.indentStep) &&
      style.indentStep > 0
        ? style.indentStep
        : DEFAULT_INDENT_STEP;
    return step * style.fontSize;
  }

  private rangeWidth(
    entry: Pick<ParagraphEntry, 'graphemes' | 'runOf' | 'fonts'>,
    from: number,
    to: number,
    spacing: number
  ): number {
    let width = 0;
    let i = from;
    while (i < to) {
      const run = entry.runOf[i];
      let j = i;
      while (j < to && entry.runOf[j] === run) j++;
      width += this.measureChunk(
        entry.fonts[run],
        entry.graphemes.slice(i, j).join(''),
        spacing
      );
      i = j;
    }
    return width;
  }

  /**
   * Longest prefix of graphemes[start..n) that fits `maxWidth`, found with an
   * exponential probe (bounds the work to about one line) plus a binary
   * search, like Konva. Always consumes at least one grapheme.
   */
  private longestFit(
    start: number,
    n: number,
    maxWidth: number,
    width: (a: number, b: number) => number
  ): { matchLen: number; matchWidth: number } {
    let low = 0;
    let high = n - start;
    let probe = Math.min(high, 32);
    while (probe < high && width(start, start + probe) <= maxWidth) {
      probe = Math.min(high, probe * 2);
    }
    high = probe;
    let matchLen = 0;
    let matchWidth = 0;
    while (low < high) {
      const mid = (low + high) >>> 1;
      const w = width(start, start + mid + 1);
      if (w <= maxWidth) {
        low = mid + 1;
        matchLen = mid + 1;
        matchWidth = w;
      } else {
        high = mid;
      }
    }
    // Deviation from Konva (which drops the rest): always consume 1 char.
    if (matchLen === 0) {
      matchLen = 1;
      matchWidth = width(start, start + 1);
    }
    return { matchLen, matchWidth };
  }

  private layoutParagraph(
    block: WeaveTextBlock,
    sig: string,
    style: TextLayoutStyle,
    fixedWidth: boolean,
    maxWidth: number
  ): ParagraphEntry {
    const entry = this.wrapParagraph(block, sig, style, fixedWidth, maxWidth);
    this.measureLines(entry, style);
    return entry;
  }

  /** Per-line box height and baseline from the runs on each line. */
  private measureLines(entry: ParagraphEntry, style: TextLayoutStyle) {
    const baseFont = fontString(style);
    for (const line of entry.lines) {
      let size = 0;
      let height = 0;
      let asc = 0;
      let desc = 0;
      const seen = new Set<number>();
      for (let g = line.startG; g < line.endG; g++) {
        const r = entry.runOf[g];
        if (seen.has(r)) continue;
        seen.add(r);
        size = Math.max(size, entry.sizes[r]);
        height = Math.max(height, entry.lineHeights[r] * entry.sizes[r]);
        const m = this.metrics(entry.fonts[r], entry.sizes[r]);
        asc = Math.max(asc, m.ascent);
        desc = Math.max(desc, m.descent);
      }
      if (seen.size === 0) {
        size = style.fontSize;
        height = style.lineHeight * size;
        const m = this.metrics(baseFont, style.fontSize);
        asc = m.ascent;
        desc = m.descent;
      }
      line.height = height;
      line.baseline = (asc - desc) / 2 + line.height / 2;
    }
  }

  private wrapParagraph(
    block: WeaveTextBlock,
    sig: string,
    style: TextLayoutStyle,
    fixedWidth: boolean,
    maxWidth: number
  ): ParagraphEntry {
    const { graphemes, runOf } = flattenBlock(block);
    const baseFont = fontString(style);
    const fonts = block.runs.map((r) =>
      r.m ? fontString(runStyle(style, r.m)) : baseFont
    );
    const sizes = block.runs.map((r) => style.fontSize * runRatio(r.m));
    const lineHeights = block.runs.map(
      (r) => runLineHeight(r.m) ?? style.lineHeight
    );
    const entry: ParagraphEntry = {
      sig,
      graphemes,
      runOf,
      fonts,
      lineHeights,
      sizes,
      lines: [],
    };
    const n = graphemes.length;
    const spacing = style.letterSpacing;
    const width = (a: number, b: number) =>
      this.rangeWidth(entry, a, b, spacing);

    const shouldWrap = style.wrap !== 'none';
    const wrapAtWord = style.wrap !== 'char' && shouldWrap;
    const whole = width(0, n);

    if (!fixedWidth || !shouldWrap || whole <= maxWidth || n === 0) {
      entry.lines.push({
        startG: 0,
        endG: n,
        measuredWidth: whole,
        lastInParagraph: true,
        height: 0,
        baseline: 0,
      });
      return entry;
    }

    let start = 0;
    while (start < n) {
      let { matchLen, matchWidth } = this.longestFit(start, n, maxWidth, width);

      // The whole remainder fits: it is the final line (no word-wrap step).
      if (start + matchLen >= n) {
        entry.lines.push({
          startG: start,
          endG: n,
          measuredWidth: matchWidth,
          lastInParagraph: true,
          height: 0,
          baseline: 0,
        });
        return entry;
      }

      if (wrapAtWord) {
        const wrapped = wordWrapIndex(
          graphemes,
          start,
          matchLen,
          matchWidth,
          maxWidth
        );
        if (wrapped > 0) {
          matchLen = wrapped;
          matchWidth = width(start, start + matchLen);
        }
      }

      const end = start + matchLen;
      entry.lines.push({
        startG: start,
        endG: trimTrailingSpace(graphemes, start, end),
        measuredWidth: matchWidth,
        lastInParagraph: false,
        height: 0,
        baseline: 0,
      });

      start = skipSpace(graphemes, end);
    }
    const last = entry.lines.at(-1);
    if (last) last.lastInParagraph = true;
    return entry;
  }

  private buildSegments(
    entry: ParagraphEntry,
    block: WeaveTextBlock,
    pl: ParagraphLine,
    style: TextLayoutStyle
  ): LayoutSegment[] {
    const segments: LayoutSegment[] = [];
    let x = 0;
    let i = pl.startG;
    while (i < pl.endG) {
      const run = entry.runOf[i];
      let j = i;
      while (j < pl.endG && entry.runOf[j] === run) j++;
      const t = entry.graphemes.slice(i, j).join('');
      const font = entry.fonts[run];
      const width = this.measureChunk(font, t, style.letterSpacing);
      segments.push({
        t,
        m: block.runs[run].m,
        run,
        x,
        width,
        font,
        fontSize: entry.sizes[run],
      });
      x += width;
      i = j;
    }
    return segments;
  }
}
