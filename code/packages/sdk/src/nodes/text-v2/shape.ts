// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  TextLayoutEngine,
  canvasMeasurer,
  fontString,
  type TextAlign,
  type LayoutLine,
  type TextLayout,
  type TextLayoutStyle,
  type TextWrap,
} from './layout/engine';
import { blocksToText, resolveBlocks, type WeaveTextBlock } from './model';

export type TextVerticalAlign = 'top' | 'middle' | 'bottom';

const LAYOUT_ATTRS = [
  'text',
  'blocks',
  'link',
  'fontSize',
  'fontFamily',
  'fontStyle',
  'fontVariant',
  'lineHeight',
  'letterSpacing',
  'wrap',
  'align',
  'padding',
  'width',
  'height',
];

export type TextV2ShapeConfig = Konva.ShapeConfig & {
  text?: string;
  blocks?: WeaveTextBlock[];
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fontVariant?: string;
  lineHeight?: number;
  letterSpacing?: number;
  wrap?: TextWrap;
  align?: TextAlign;
  verticalAlign?: TextVerticalAlign;
  padding?: number;
  textDecoration?: string;
  link?: string;
};

/**
 * Canvas shape that lays out and paints blocks/runs text with the
 * `TextLayoutEngine`. Exposes Konva.Text-compatible getters/setters so
 * code written against `Konva.Text` keeps working.
 */
export class WeaveTextV2Shape extends Konva.Shape {
  private readonly engine = new TextLayoutEngine();
  private readonly naturalEngine = new TextLayoutEngine();
  private layoutCache: TextLayout | null = null;
  private blocksKey: { b?: unknown; t?: string; l?: string } = {};
  private blocksCache: WeaveTextBlock[] = [];
  private viewport: { y1: number; y2: number } | null = null;

  constructor(config?: TextV2ShapeConfig) {
    super(config);
    this.className = 'WeaveTextV2Shape';
    this.on(LAYOUT_ATTRS.map((a) => `${a}Change.konva`).join(' '), () => {
      this.layoutCache = null;
    });
  }

  // ---- Konva.Text compatible facade ---------------------------------------

  text(): string;
  text(value: string): this;
  text(value?: string): string | this {
    if (value === undefined) {
      return typeof this.attrs.text === 'string'
        ? this.attrs.text
        : blocksToText(this.getBlocks());
    }
    return this.setText(value);
  }

  setText(value: string | null | undefined): this {
    // Plain-text assignment resets rich content: blocks re-synthesize lazily.
    // `setAttrs` dispatches back to `setText`, so write attrs directly.
    this._setAttr('blocks', undefined);
    this._setAttr('text', value == null ? '' : String(value));
    return this;
  }

  /** Resolved blocks: stored or lazily synthesized (never written back). */
  getBlocks(): WeaveTextBlock[] {
    const k = this.blocksKey;
    const { blocks, text, link } = this.attrs;
    if (k.b !== blocks || k.t !== text || k.l !== link) {
      this.blocksCache = resolveBlocks({ blocks, text, link });
      this.blocksKey = { b: blocks, t: text, l: link };
    }
    return this.blocksCache;
  }

  /** Replace content with blocks, keeping the `text` mirror in sync. */
  setBlocks(blocks: WeaveTextBlock[]): this {
    this._setAttr('blocks', blocks);
    this._setAttr('text', blocksToText(blocks));
    return this;
  }

  fontSize(): number;
  fontSize(v: number): this;
  fontSize(v?: number): number | this {
    return this.accessor('fontSize', 12, v);
  }
  fontFamily(): string;
  fontFamily(v: string): this;
  fontFamily(v?: string): string | this {
    return this.accessor('fontFamily', 'Arial', v);
  }
  fontStyle(): string;
  fontStyle(v: string): this;
  fontStyle(v?: string): string | this {
    return this.accessor('fontStyle', 'normal', v);
  }
  fontVariant(): string;
  fontVariant(v: string): this;
  fontVariant(v?: string): string | this {
    return this.accessor('fontVariant', 'normal', v);
  }
  lineHeight(): number;
  lineHeight(v: number): this;
  lineHeight(v?: number): number | this {
    return this.accessor('lineHeight', 1, v);
  }
  letterSpacing(): number;
  letterSpacing(v: number): this;
  letterSpacing(v?: number): number | this {
    return this.accessor('letterSpacing', 0, v);
  }
  padding(): number;
  padding(v: number): this;
  padding(v?: number): number | this {
    return this.accessor('padding', 0, v);
  }
  align(): TextAlign;
  align(v: TextAlign): this;
  align(v?: TextAlign): TextAlign | this {
    return this.accessor('align', 'left' as TextAlign, v);
  }
  verticalAlign(): TextVerticalAlign;
  verticalAlign(v: TextVerticalAlign): this;
  verticalAlign(v?: TextVerticalAlign): TextVerticalAlign | this {
    return this.accessor('verticalAlign', 'top' as const, v);
  }
  wrap(): TextWrap;
  wrap(v: TextWrap): this;
  wrap(v?: TextWrap): TextWrap | this {
    return this.accessor('wrap', 'word' as TextWrap, v);
  }
  textDecoration(): string;
  textDecoration(v: string): this;
  textDecoration(v?: string): string | this {
    return this.accessor('textDecoration', '', v);
  }

  private accessor<T>(name: string, fallback: T, value?: T): T | this {
    if (value === undefined) {
      return (this.attrs[name] ?? fallback) as T;
    }
    this.setAttr(name, value);
    return this;
  }

  getTextWidth(): number {
    return this.ensureLayout().textWidth;
  }

  getTextHeight(): number {
    return this.fontSize();
  }

  measureSize(text: string): { width: number; height: number } {
    return {
      width: canvasMeasurer(fontString(this.style()), text),
      height: this.fontSize(),
    };
  }

  getWidth(): number {
    const w = this.attrs.width;
    return w === undefined || w === 'auto' || Number.isNaN(w)
      ? this.ensureLayout().width
      : w;
  }

  getHeight(): number {
    const h = this.attrs.height;
    return h === undefined || h === 'auto' || Number.isNaN(h)
      ? this.ensureLayout().height
      : h;
  }

  // ---- layout --------------------------------------------------------------

  style(): TextLayoutStyle {
    return {
      fontSize: this.fontSize(),
      fontFamily: this.fontFamily(),
      fontStyle: this.fontStyle(),
      fontVariant: this.fontVariant(),
      lineHeight: this.lineHeight(),
      letterSpacing: this.letterSpacing(),
      wrap: this.wrap(),
      align: this.align(),
    };
  }

  /** Lazy, cached layout. Size accessors and painting force it. */
  ensureLayout(): TextLayout {
    if (!this.layoutCache) {
      const w = this.attrs.width;
      const h = this.attrs.height;
      const num = (v: unknown) =>
        typeof v === 'number' && !Number.isNaN(v) ? v : undefined;
      this.layoutCache = this.engine.layout(this.getBlocks(), this.style(), {
        width: num(w),
        height: num(h),
        padding: this.padding(),
      });
    }
    return this.layoutCache;
  }

  /** Size the text would take with no width constraint (for auto layouts). */
  measureNaturalSize(): { width: number; height: number } {
    const out = this.naturalEngine.layout(this.getBlocks(), this.style(), {
      width: undefined,
      height: undefined,
      padding: this.padding(),
    });
    return { width: out.width, height: out.height };
  }

  /** Rendered width of a string with this shape's font and letter spacing. */
  measureText(text: string): number {
    return (
      canvasMeasurer(fontString(this.style()), text) +
      text.length * this.letterSpacing()
    );
  }

  /** Offset of the first line inside the box (padding + vertical align). */
  getContentOffset(): { x: number; y: number } {
    const padding = this.padding();
    const layout = this.ensureLayout();
    const used = layout.lines.length * layout.lineHeightPx + padding * 2;
    const va = this.verticalAlign();
    let alignY = 0;
    if (va === 'middle') alignY = (this.getHeight() - used) / 2;
    else if (va === 'bottom') alignY = this.getHeight() - used;
    return { x: padding, y: alignY + padding };
  }

  /** Pre-compute layout for candidate blocks within a time budget. */
  warmLayout(blocks: WeaveTextBlock[], budgetMs: number): boolean {
    const num = (v: unknown) =>
      typeof v === 'number' && !Number.isNaN(v) ? v : undefined;
    return this.engine.warm(
      blocks,
      this.style(),
      {
        width: num(this.attrs.width),
        height: num(this.attrs.height),
        padding: this.padding(),
      },
      budgetMs
    );
  }

  /** Optional visible y-range in local coordinates, used for line culling. */
  setViewport(range: { y1: number; y2: number } | null) {
    this.viewport = range;
  }

  /**
   * Visible y-range in local coordinates, derived from the context being
   * painted (current transform + backing canvas size) instead of the stage.
   * The stage is not the paint target during export (off-screen canvases,
   * tiles, server-side), so using it culled visible lines. Returns null (paint
   * everything) when the transform cannot be read.
   */
  private visibleRange(ctx: Konva.Context): { y1: number; y2: number } | null {
    if (this.viewport) return this.viewport;
    const native = ctx._context as unknown as {
      getTransform?: () => DOMMatrix;
      currentTransform?: DOMMatrix;
    };
    const m = native.getTransform?.() ?? native.currentTransform;
    if (!m) return null;
    const det = m.a * m.d - m.b * m.c;
    if (!det || !Number.isFinite(det)) return null;
    const canvas = ctx.getCanvas();
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    if (!(w > 0) || !(h > 0)) return null;
    // device px -> local coords (inverse of the current matrix)
    let y1 = Infinity;
    let y2 = -Infinity;
    for (const [px, py] of [
      [0, 0],
      [w, 0],
      [0, h],
      [w, h],
    ]) {
      const y = (m.a * (py - m.f) - m.b * (px - m.e)) / det;
      if (y < y1) y1 = y;
      if (y > y2) y2 = y;
    }
    return { y1, y2 };
  }

  // ---- painting ------------------------------------------------------------

  // Konva looks up `_sceneFunc`/`_hitFunc` on the instance when `attrs.sceneFunc`
  // is unset. Do NOT call `sceneFunc()`/`hitFunc()`: that would store functions
  // in `attrs`, which are copied into shared (Yjs) state on serialize.
  _sceneFunc = (ctx: Konva.Context, shape: Konva.Shape) => {
    const self = shape as WeaveTextV2Shape;
    const layout = self.ensureLayout();
    if (layout.lines.length === 0) return;

    const padding = self.padding();
    const lineHeightPx = layout.lineHeightPx;

    let baseline: CanvasTextBaseline = 'middle';
    let translateY = lineHeightPx / 2;
    if (!Konva.legacyTextRendering) {
      const m = self.measureMetrics();
      baseline = 'alphabetic';
      translateY = (m.ascent - m.descent) / 2 + lineHeightPx / 2;
    }

    ctx.setAttr('font', fontString(self.style()));
    ctx.setAttr('textBaseline', baseline);
    ctx.setAttr('textAlign', 'left');

    const alignY = self.verticalOffset(layout);
    // must run before the translate below: range is in node-local coords
    const range = self.visibleRange(ctx);
    ctx.translate(padding, alignY + padding);

    const top = alignY + padding;
    for (let n = 0; n < layout.lines.length; n++) {
      const lineTop = top + n * lineHeightPx;
      // line-level culling (local coords, with one line of slack)
      if (
        range &&
        (lineTop + lineHeightPx < range.y1 - lineHeightPx ||
          lineTop > range.y2 + lineHeightPx)
      ) {
        continue;
      }
      self.paintLine(ctx, layout.lines[n], translateY + n * lineHeightPx);
    }
  };

  /** Vertical offset of the text block inside the box (verticalAlign). */
  private verticalOffset(layout: TextLayout): number {
    const used = layout.lines.length * layout.lineHeightPx + this.padding() * 2;
    const va = this.verticalAlign();
    if (va === 'middle') return (this.getHeight() - used) / 2;
    if (va === 'bottom') return this.getHeight() - used;
    return 0;
  }

  private paintLine(ctx: Konva.Context, line: LayoutLine, y: number) {
    const decoration = this.textDecoration();
    const fontSize = this.fontSize();
    ctx.save();
    if (decoration.includes('underline')) {
      this.strokeDecoration(ctx, line, y + Math.round(fontSize / 4));
    }
    for (const seg of line.segments) {
      this.paintSegment(ctx, seg.t, line.offsetX + seg.x, y);
    }
    if (decoration.includes('line-through')) {
      this.strokeDecoration(ctx, line, y - Math.round(fontSize / 4));
    }
    ctx.restore();
  }

  private strokeDecoration(ctx: Konva.Context, line: LayoutLine, y: number) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(line.offsetX, y);
    ctx.lineTo(line.offsetX + Math.round(line.width), y);
    ctx.lineWidth = this.fontSize() / 15;
    ctx.strokeStyle = this.fill() as string;
    ctx.stroke();
    ctx.restore();
  }

  private paintSegment(ctx: Konva.Context, text: string, x: number, y: number) {
    const spacing = this.letterSpacing();
    if (spacing === 0) {
      this.fillText(ctx, text, x, y);
      return;
    }
    let cx = x;
    for (const ch of Array.from(text)) {
      this.fillText(ctx, ch, cx, y);
      cx += this.measureSize(ch).width + spacing;
    }
  }

  private fillText(ctx: Konva.Context, text: string, x: number, y: number) {
    const self = this as unknown as {
      _partialText: string;
      _partialTextX: number;
      _partialTextY: number;
    };
    self._partialText = text;
    self._partialTextX = x;
    self._partialTextY = y;
    ctx.fillStrokeShape(this);
  }

  _hitFunc = (ctx: Konva.Context, shape: Konva.Shape) => {
    ctx.beginPath();
    const self = shape as WeaveTextV2Shape;
    ctx.rect(0, 0, self.getWidth(), self.getHeight());
    ctx.closePath();
    ctx.fillStrokeShape(shape);
  };

  private metricsCache: {
    key: string;
    ascent: number;
    descent: number;
  } | null = null;

  /** Font ascent/descent used for baseline placement (parity with Konva.Text). */
  measureMetrics(): { ascent: number; descent: number } {
    const font = fontString(this.style());
    if (this.metricsCache?.key === font) return this.metricsCache;
    const ctx = Konva.Util.createCanvasElement().getContext('2d')!;
    ctx.font = font;
    const m = ctx.measureText('M');
    const scale = this.fontSize() / 100;
    // Same fallbacks as Konva.Text.measureSize (needed for pixel parity).
    const ascent = m.fontBoundingBoxAscent ?? 91 * scale;
    const descent = m.fontBoundingBoxDescent ?? 21 * scale;
    this.metricsCache = { key: font, ascent, descent };
    return this.metricsCache;
  }
}

// Konva paints fill/stroke through these hooks.
Object.assign(WeaveTextV2Shape.prototype, {
  _fillFunc(
    this: {
      _partialText: string;
      _partialTextX: number;
      _partialTextY: number;
    },
    ctx: Konva.Context
  ) {
    ctx.fillText(this._partialText, this._partialTextX, this._partialTextY);
  },
  _strokeFunc(
    this: {
      _partialText: string;
      _partialTextX: number;
      _partialTextY: number;
    },
    ctx: Konva.Context
  ) {
    ctx.setAttr('miterLimit', 2);
    ctx.strokeText(this._partialText, this._partialTextX, this._partialTextY);
  },
});
