// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import { TextLayoutEngine, type TextLayoutStyle } from '../layout/engine';
import { synthesizeBlocks } from '../model';

const base: TextLayoutStyle = {
  fontSize: 20,
  fontFamily: 'sans-serif',
  fontStyle: 'normal',
  fontVariant: 'normal',
  lineHeight: 1,
  letterSpacing: 0,
  wrap: 'word',
  align: 'left',
};

const samples = [
  'Hello world',
  'The quick brown fox jumps over the lazy dog and keeps running far away',
  'line one\nline two is a bit longer than one\n\nlast',
  'a-very-long-hyphenated-word-that-must-break-at-dashes ok',
  'Supercalifragilisticexpialidocious_with_no_break_points_at_all',
  'emoji 😀 test 👨‍👩‍👧 family and text that wraps around',
  '日本語のテキストはスペースなしで折り返されます。日本語のテキスト',
  '   leading spaces and  double  spaces   inside   ',
];

function konvaLines(
  text: string,
  style: TextLayoutStyle,
  width?: number,
  height?: number
) {
  const k = new Konva.Text({
    text,
    width,
    height,
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    lineHeight: style.lineHeight,
    wrap: style.wrap,
    letterSpacing: style.letterSpacing,
    align: style.align,
  });
  return {
    lines: (k as unknown as { textArr: { text: string }[] }).textArr.map(
      (l) => l.text
    ),
    textWidth: k.getTextWidth(),
    width: k.width(),
    height: k.height(),
  };
}

describe('layout engine parity with Konva.Text', () => {
  const tol = 0.5;

  // layouts: smart/auto-all => no fixed width; auto-height => width only; fixed => both
  describe.each([
    ['auto (smart/auto-all)', undefined, undefined],
    ['auto-height w=150', 150, undefined],
    ['auto-height w=320', 320, undefined],
    ['fixed 150x60', 150, 60],
    ['fixed 320x400', 320, 400],
  ])('%s', (_name, w, h) => {
    it.each(samples)('matches lines and size: %s', (text) => {
      const engine = new TextLayoutEngine();
      const out = engine.layout(synthesizeBlocks(text), base, {
        width: w,
        height: h,
        padding: 0,
      });
      const k = konvaLines(text, base, w, h);
      if (h === undefined || text.length < 40) {
        expect(out.lines.map((l) => l.text)).toEqual(k.lines);
      }
      expect(Math.abs(out.textWidth - k.textWidth)).toBeLessThanOrEqual(tol);
      expect(Math.abs(out.width - k.width)).toBeLessThanOrEqual(tol);
      expect(Math.abs(out.height - k.height)).toBeLessThanOrEqual(tol);
    });
  });

  it('char wrap, letterSpacing, padding and center align match', () => {
    const style = {
      ...base,
      wrap: 'char' as const,
      letterSpacing: 2,
      align: 'center' as const,
    };
    const text = 'abcdefghijklmnopqrstuvwxyz abcdefghij';
    const engine = new TextLayoutEngine();
    const out = engine.layout(synthesizeBlocks(text), style, {
      width: 140,
      height: undefined,
      padding: 4,
    });
    const k = new Konva.Text({
      text,
      width: 140,
      padding: 4,
      fontSize: 20,
      fontFamily: 'sans-serif',
      wrap: 'char',
      letterSpacing: 2,
    });
    const kl = (k as unknown as { textArr: { text: string }[] }).textArr.map(
      (l) => l.text
    );
    expect(out.lines.map((l) => l.text)).toEqual(kl);
    expect(Math.abs(out.height - k.height())).toBeLessThanOrEqual(tol);
  });
});

describe('layout engine behaviour', () => {
  it('maps lines to global offsets of the derived text', () => {
    const engine = new TextLayoutEngine();
    const out = engine.layout(synthesizeBlocks('ab cd\nef'), base, {
      width: undefined,
      height: undefined,
      padding: 0,
    });
    expect(out.lines.map((l) => [l.start, l.end])).toEqual([
      [0, 5],
      [6, 8],
    ]);
  });

  it('lays out multi-run paragraphs with per-run segments', () => {
    const engine = new TextLayoutEngine();
    const out = engine.layout(
      [{ runs: [{ t: 'Hello ', m: { b: true } }, { t: 'world' }] }],
      base,
      { width: undefined, height: undefined, padding: 0 }
    );
    expect(out.lines).toHaveLength(1);
    expect(out.lines[0].segments.map((s) => s.t)).toEqual(['Hello ', 'world']);
    expect(out.lines[0].segments[1].x).toBeCloseTo(
      out.lines[0].segments[0].width
    );
  });

  it('relays out only changed paragraphs', () => {
    const engine = new TextLayoutEngine();
    const bounds = { width: 200, height: undefined, padding: 0 };
    engine.layout(synthesizeBlocks('one\ntwo\nthree'), base, bounds);
    expect(engine.getLastRelaidCount()).toBe(3);
    engine.layout(synthesizeBlocks('one\nTWO\nthree'), base, bounds);
    expect(engine.getLastRelaidCount()).toBe(1);
    engine.layout(
      synthesizeBlocks('one\nTWO\nthree'),
      { ...base, fontSize: 30 },
      bounds
    );
    expect(engine.getLastRelaidCount()).toBe(3);
  });

  it('never drops text when a single char exceeds the width', () => {
    const engine = new TextLayoutEngine();
    const out = engine.layout(synthesizeBlocks('abc'), base, {
      width: 2,
      height: undefined,
      padding: 0,
    });
    expect(out.lines.map((l) => l.text).join('')).toBe('abc');
  });
});
