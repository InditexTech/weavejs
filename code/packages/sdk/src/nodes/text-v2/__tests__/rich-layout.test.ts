// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import {
  TextLayoutEngine,
  fontString,
  type TextLayoutStyle,
} from '../layout/engine';
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

describe('paragraph align and per-run line height', () => {
  it('aligns each paragraph by its own value without relayout', () => {
    const e = engine();
    const blocks: WeaveTextBlock[] = [
      { align: 'center', runs: [{ t: 'ab' }] },
      { align: 'right', runs: [{ t: 'ab' }] },
      { runs: [{ t: 'ab' }] },
    ];
    const l = e.layout(blocks, style, { ...bounds, width: 100 });
    expect(l.lines.map((x) => x.offsetX)).toEqual([45, 90, 0]);
    const again = [
      { ...blocks[0], align: 'left' as const },
      blocks[1],
      blocks[2],
    ];
    e.layout(again, style, { ...bounds, width: 100 });
    expect(e.getLastRelaidCount()).toBe(0);
  });

  it('keeps the list indent on the left when aligned', () => {
    const l = engine().layout(
      [{ kind: 'ul', align: 'right', runs: [{ t: 'ab' }] }],
      style,
      { ...bounds, width: 100 }
    );
    expect(l.lines[0].offsetX).toBe(100 - 10);
    expect(l.lines[0].marker?.x).toBe(0);
  });

  it('uses the tallest run line height on a line', () => {
    const l = engine().layout(
      [
        {
          runs: [
            { t: 'a', m: { lineHeight: 1 } },
            { t: 'b', m: { lineHeight: 2 } },
          ],
        },
      ],
      style,
      bounds
    );
    expect(l.lines[0].height).toBe(20);
  });

  it('a lower value next to a taller run does not shrink the line', () => {
    const l = engine().layout(
      [{ runs: [{ t: 'a' }, { t: 'b', m: { lineHeight: 0.5 } }] }],
      { ...style, lineHeight: 1.5 },
      bounds
    );
    expect(l.lines[0].height).toBe(15);
  });

  it('only the lines holding the marked text change height', () => {
    const l = engine().layout(
      [
        {
          runs: [{ t: 'aaaa ', m: { lineHeight: 2 } }, { t: 'bbbb cccc' }],
        },
      ],
      style,
      { ...bounds, width: 25 }
    );
    expect(l.lines.length).toBeGreaterThan(1);
    expect(l.lines[0].height).toBe(20);
    expect(l.lines.at(-1)!.height).toBe(10);
    expect(l.contentHeight).toBe(l.lines.reduce((a, x) => a + x.height, 0));
  });

  it('invalid lineHeight falls back to the node value', () => {
    const l = engine().layout(
      [{ runs: [{ t: 'a', m: { lineHeight: 0 } }] }],
      style,
      bounds
    );
    expect(l.lines[0].height).toBe(10);
  });
});

describe('font shorthand', () => {
  it('has no `normal` keywords (skia-canvas drops italic when they follow it)', () => {
    const f = (fontStyle: string, fontVariant = 'normal') =>
      fontString({ ...style, fontStyle, fontVariant, fontSize: 20 });
    expect(f('normal')).toBe('20px Arial');
    expect(f('italic')).toBe('italic 20px Arial');
    expect(f('bold')).toBe('bold 20px Arial');
    expect(f('italic bold')).toBe('italic bold 20px Arial');
    expect(f('italic', 'small-caps')).toBe('italic small-caps 20px Arial');
    expect(f('normal', 'normal')).not.toMatch(/normal/);
  });

  it('runs resolve to the italic font', () => {
    const l = new TextLayoutEngine(measurer).layout(
      [{ runs: [{ t: 'it', m: { italic: true, bold: true } }] }],
      style,
      bounds
    );
    expect(l.lines[0].segments[0].font).toBe('italic bold 10px Arial');
  });
});
