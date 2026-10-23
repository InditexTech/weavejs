// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { TextLayoutEngine, type TextLayoutStyle } from '../layout/engine';
import type { WeaveTextBlock } from '../model';

const style: TextLayoutStyle = {
  fontSize: 10,
  fontFamily: 'Arial',
  fontStyle: 'normal',
  fontVariant: 'normal',
  lineHeight: 1,
  letterSpacing: 0,
  wrap: 'word',
  align: 'left',
};

// width = 1px per font px per char: "10px" chars are 10 wide, bold doubles
const measurer = (font: string, text: string) => {
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 10);
  const k = font.includes('bold') ? 1.5 : 1;
  return text.length * size * 0.5 * k;
};

const engine = () => new TextLayoutEngine(measurer);
const bounds = { width: undefined, height: undefined, padding: 0 };

describe('mixed runs', () => {
  it('measures each run with its own font', () => {
    const blocks: WeaveTextBlock[] = [
      { runs: [{ t: 'aa' }, { t: 'bb', m: { bold: true } }] },
    ];
    const l = engine().layout(blocks, style, bounds);
    const [a, b] = l.lines[0].segments;
    expect(a.width).toBe(10);
    expect(b.width).toBe(15);
    expect(b.font).toContain('bold');
    expect(l.lines[0].width).toBe(25);
  });

  it('sizes the line by the tallest run', () => {
    const blocks: WeaveTextBlock[] = [
      { runs: [{ t: 'a' }, { t: 'B', m: { size: 2 } }] },
      { runs: [{ t: 'c' }] },
    ];
    const l = engine().layout(blocks, style, bounds);
    expect(l.lines[0].height).toBe(20);
    expect(l.lines[1].height).toBe(10);
    expect(l.lines[1].y).toBe(20);
    expect(l.height).toBe(30);
  });

  it('wraps using per-run widths', () => {
    const blocks: WeaveTextBlock[] = [
      { runs: [{ t: 'aaaa ', m: { bold: true } }, { t: 'bbbb' }] },
    ];
    const l = engine().layout(blocks, style, { ...bounds, width: 30 });
    expect(l.lines.length).toBeGreaterThan(1);
  });

  it('plain documents keep uniform line height', () => {
    const blocks: WeaveTextBlock[] = [{ runs: [{ t: 'a' }] }, { runs: [] }];
    const l = engine().layout(blocks, style, bounds);
    expect(l.lines.map((x) => x.height)).toEqual([10, 10]);
  });
});

describe('lists', () => {
  const items: WeaveTextBlock[] = [
    { kind: 'ol', runs: [{ t: 'one' }] },
    { kind: 'ol', depth: 1, runs: [{ t: 'sub' }] },
    { runs: [{ t: 'plain' }] },
  ];

  it('indents by depth and emits markers only on the first line', () => {
    const l = engine().layout(items, style, bounds);
    expect(l.lines[0].indent).toBe(15);
    expect(l.lines[0].offsetX).toBe(15);
    expect(l.lines[0].marker?.text).toBe('1.');
    expect(l.lines[1].indent).toBe(30);
    expect(l.lines[1].marker?.text).toBe('a.');
    expect(l.lines[2].indent).toBe(0);
    expect(l.lines[2].marker).toBeUndefined();
  });

  it('keeps text and offsets free of markers', () => {
    const l = engine().layout(items, style, bounds);
    expect(l.lines[0].text).toBe('one');
    expect(l.lines[1].start).toBe(4);
  });

  it('clamps the indent so min text width remains', () => {
    const deep: WeaveTextBlock[] = [
      { kind: 'ul', depth: 50, runs: [{ t: 'x' }] },
    ];
    const l = engine().layout(deep, style, { ...bounds, width: 100 });
    expect(l.lines[0].indent).toBe(60); // 100 - 4 * 10
    const tiny = engine().layout(deep, style, { ...bounds, width: 20 });
    expect(tiny.lines[0].indent).toBe(0);
    expect(l.lines[0].marker?.text).toBe('\u25AA'); // depth 50 cycles to 2
  });

  it('does not clamp auto width layouts', () => {
    const deep: WeaveTextBlock[] = [
      { kind: 'ul', depth: 9, runs: [{ t: 'x' }] },
    ];
    expect(engine().layout(deep, style, bounds).lines[0].indent).toBe(150);
  });

  it('honours indentStep and falls back on invalid values', () => {
    const one: WeaveTextBlock[] = [{ kind: 'ul', runs: [{ t: 'x' }] }];
    const at = (indentStep: number) =>
      engine().layout(one, { ...style, indentStep }, bounds).lines[0].indent;
    expect(at(3)).toBe(30);
    expect(at(0)).toBe(15);
    expect(at(NaN)).toBe(15);
  });

  it('relays out only the edited item', () => {
    const e = engine();
    const blocks: WeaveTextBlock[] = [
      { kind: 'ol', runs: [{ t: 'a' }] },
      { kind: 'ol', runs: [{ t: 'b' }] },
      { kind: 'ol', runs: [{ t: 'c' }] },
    ];
    e.layout(blocks, style, bounds);
    const edited = [
      blocks[0],
      { ...blocks[1], runs: [{ t: 'bb' }] },
      blocks[2],
    ];
    e.layout(edited, style, bounds);
    expect(e.getLastRelaidCount()).toBe(1);
  });
});
