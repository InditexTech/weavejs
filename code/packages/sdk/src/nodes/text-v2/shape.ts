// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  TextLayoutEngine,
  canvasMeasurer,
  fontMetrics,
  fontString,
  type TextAlign,
  type LayoutLine,
  type LayoutSegment,
  type TextLayout,
  type TextLayoutStyle,
  type TextWrap,
} from './layout/engine';
import {
  blocksToText,
  isSafeLink,
  resolveBlocks,
  type WeaveTextBlock,
} from './model';

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
  private readonly engine = new TextLayoutEngine(canvasMeasurer, fontMetrics);
  private readonly naturalEngine = new TextLayoutEngine(
    canvasMeasurer,
    fontMetrics
  );
  private layoutCache: TextLayout | null = null;
  private blocksKey: { b?: unknown; t?: string; l?: string } = {};
  private blocksCache: WeaveTextBlock[] = [];
  private viewport: { y1: number; y2: number } | null = null;
  private indentStepValue: number | undefined;
  private linkStyle = { color: '#1155ccff', hoverColor: '#3d7be0ff' };
  private hoveredRun: string | null = null;

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

  /**
   * List indent per depth, as a multiple of `fontSize`. Not a node attr: it
   * comes from the node config and must not be serialized into the document.
   */
  setIndentStep(step: number | undefined): this {
    if (this.indentStepValue !== step) {
      this.indentStepValue = step;
      this.layoutCache = null;
    }
    return this;
  }

  /** Link run colours (from the node config; not serialized). */
  setLinkStyle(style: { color: string; hoverColor: string }): this {
    this.linkStyle = style;
    return this;
  }

  /** Run under the pointer (`paragraph:run`), repainted with the hover colour. */
  setHoveredRun(key: string | null): this {
    if (this.hoveredRun !== key) {
      this.hoveredRun = key;
      this.getLayer()?.batchDraw();
    }
    return this;
  }

  getHoveredRun(): string | null {
    return this.hoveredRun;
  }

  /**
   * Link run at a point in node-local coordinates (the legacy node-level
   * `link` wins: runs are then not links).
   */
  linkAtPoint(point: {
    x: number;
    y: number;
  }): { key: string; url: string } | null {
    if (this.attrs.link) return null;
    const layout = this.ensureLayout();
    const o = this.getContentOffset();
    const x = point.x - o.x;
    const y = point.y - o.y;
    for (const line of layout.lines) {
      if (y < line.y || y >= line.y + line.height) continue;
      for (const seg of line.segments) {
        const sx = line.offsetX + seg.x;
        if (x >= sx && x <= sx + seg.width && isSafeLink(seg.m?.link)) {
          return {
            key: `${line.paragraph}:${seg.run}`,
            url: seg.m!.link as string,
          };
        }
      }
    }
    return null;
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
      indentStep: this.indentStepValue,
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
  measureText(text: string, font?: string): number {
    return (
      canvasMeasurer(font ?? fontString(this.style()), text) +
      text.length * this.letterSpacing()
    );
  }

  /** Offset of the first line inside the box (padding + vertical align). */
  getContentOffset(): { x: number; y: number } {
    const padding = this.padding();
    const layout = this.ensureLayout();
    const used = layout.contentHeight + padding * 2;
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
    // The native transform maps to device px (it includes the pixel ratio),
    // so use the backing store size, not the CSS size from getWidth().
    const backing = (canvas as unknown as {
      _canvas?: { width: number; height: number };
    })._canvas;
    const w = backing?.width ?? canvas.getWidth() * canvas.getPixelRatio();
    const h = backing?.height ?? canvas.getHeight() * canvas.getPixelRatio();
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
    if (!Konva.legacyTextRendering) baseline = 'alphabetic';

    ctx.setAttr('font', fontString(self.style()));
    ctx.setAttr('textBaseline', baseline);
    ctx.setAttr('textAlign', 'left');

    const alignY = self.verticalOffset(layout);
    // must run before the translate below: range is in node-local coords
    const range = self.visibleRange(ctx);
    ctx.translate(padding, alignY + padding);

    for (const line of layout.lines) {
      // line-level culling (local coords, with one line of slack)
      if (
        range &&
        (alignY + padding + line.y + line.height < range.y1 - lineHeightPx ||
          alignY + padding + line.y > range.y2 + lineHeightPx)
      ) {
        continue;
      }
      self.paintLine(ctx, line, line.y + line.baseline);
    }
  };

  /** Vertical offset of the text block inside the box (verticalAlign). */
  private verticalOffset(layout: TextLayout): number {
    const used = layout.contentHeight + this.padding() * 2;
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
    if (line.marker) {
      const mk = line.marker;
      ctx.setAttr('font', mk.font);
      this.fillText(ctx, mk.text, mk.x, y, mk.color);
    }
    for (const seg of line.segments) {
      ctx.setAttr('font', seg.font);
      const x = line.offsetX + seg.x;
      const isLink = !this.attrs.link && isSafeLink(seg.m?.link);
      let color =
        typeof seg.m?.color === 'string' ? (seg.m.color as string) : undefined;
      if (isLink) {
        color =
          this.hoveredRun === `${line.paragraph}:${seg.run}`
            ? this.linkStyle.hoverColor
            : this.linkStyle.color;
      }
      this.paintSegment(ctx, seg, x, y, color);
      if (seg.m?.underline || isLink) {
        this.strokeSegment(
          ctx,
          seg,
          x,
          y + Math.round(seg.fontSize / 4),
          color
        );
      }
      if (seg.m?.strike) {
        this.strokeSegment(
          ctx,
          seg,
          x,
          y - Math.round(seg.fontSize / 4),
          color
        );
      }
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

  private strokeSegment(
    ctx: Konva.Context,
    seg: LayoutSegment,
    x: number,
    y: number,
    color: string | undefined
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.round(seg.width), y);
    ctx.lineWidth = seg.fontSize / 15;
    ctx.strokeStyle = color ?? (this.fill() as string);
    ctx.stroke();
    ctx.restore();
  }

  private paintSegment(
    ctx: Konva.Context,
    seg: LayoutSegment,
    x: number,
    y: number,
    color: string | undefined
  ) {
    const spacing = this.letterSpacing();
    if (spacing === 0) {
      this.fillText(ctx, seg.t, x, y, color);
      return;
    }
    let cx = x;
    for (const ch of Array.from(seg.t)) {
      this.fillText(ctx, ch, cx, y, color);
      cx += canvasMeasurer(seg.font, ch) + spacing;
    }
  }

  private fillText(
    ctx: Konva.Context,
    text: string,
    x: number,
    y: number,
    color?: string
  ) {
    const self = this as unknown as {
      _partialText: string;
      _partialTextX: number;
      _partialTextY: number;
    };
    self._partialText = text;
    self._partialTextX = x;
    self._partialTextY = y;
    if (color === undefined) {
      ctx.fillStrokeShape(this);
      return;
    }
    // Konva reads the fill from attrs: swap it without firing change events.
    const prev = this.attrs.fill;
    this.attrs.fill = color;
    try {
      ctx.fillStrokeShape(this);
    } finally {
      this.attrs.fill = prev;
    }
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
