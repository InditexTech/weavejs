// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { TextEditModel } from '../edit/model';
import { TextLayoutEngine, type TextLayoutStyle } from '../layout/engine';
import {
  applyMarkToEmptyBlock,
  marksAtOffset,
  replaceRange,
  type WeaveTextBlock,
} from '../model';

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
const measurer = (font: string, text: string) => text.length * 5;
const bounds = { width: undefined, height: undefined, padding: 0 };

const sized: WeaveTextBlock[] = [
  { kind: 'ul', runs: [{ t: 'item', m: { size: 2, bold: true } }] },
];

describe('empty block marks: model', () => {
  it('Enter at end carries marks to the new empty block', () => {
    const out = replaceRange(sized, 4, 4, '\n');
    expect(out[1]).toEqual({
      kind: 'ul',
      runs: [],
      m: { size: 2, bold: true },
    });
  });

  it('does not carry link', () => {
    const out = replaceRange(
      [{ runs: [{ t: 'a', m: { link: 'https://x.com', size: 2 } }] }],
      1,
      1,
      '\n'
    );
    expect(out[1].m).toEqual({ size: 2 });
  });

  it('typing into the block uses m and drops it', () => {
    const split = replaceRange(sized, 4, 4, '\n');
    const out = replaceRange(split, 5, 5, 'x');
    expect(out[1].runs).toEqual([{ t: 'x', m: { size: 2, bold: true } }]);
    expect(out[1].m).toBeUndefined();
  });

  it('marksAtOffset reads m of an empty block', () => {
    const split = replaceRange(sized, 4, 4, '\n');
    expect(marksAtOffset(split, 5)).toEqual({ size: 2, bold: true });
  });

  it('sets a mark on an empty block', () => {
    const out = applyMarkToEmptyBlock([{ runs: [] }], 0, 'size', 3);
    expect(out[0].m).toEqual({ size: 3 });
    expect(
      applyMarkToEmptyBlock(out, 0, 'size', undefined)[0].m
    ).toBeUndefined();
  });
});

describe('empty block marks: layout', () => {
  it('uses m for marker and empty line height', () => {
    const blocks: WeaveTextBlock[] = [
      ...sized,
      { kind: 'ul', runs: [], m: { size: 2 } },
    ];
    const l = new TextLayoutEngine(measurer).layout(blocks, style, bounds);
    expect(l.lines[1].marker?.fontSize).toBe(20);
    expect(l.lines[1].height).toBe(20);
  });

  it('falls back to base without m and refreshes the cache on m change', () => {
    const e = new TextLayoutEngine(measurer);
    const plain = e.layout([{ kind: 'ul', runs: [] }], style, bounds);
    expect(plain.lines[0].height).toBe(10);
    const marked = e.layout(
      [{ kind: 'ul', runs: [], m: { size: 2 } }],
      style,
      bounds
    );
    expect(marked.lines[0].height).toBe(20);
  });
});

describe('empty block marks: editing', () => {
  const make = () => {
    const m = new TextEditModel(sized);
    m.moveTo(4);
    m.enter();
    return m;
  };

  it('Enter keeps marks on the new bullet', () => {
    const m = make();
    expect(m.blocks[1].m).toEqual({ size: 2, bold: true });
    expect(m.caretMarks()).toEqual({ size: 2, bold: true });
  });

  it('outdent keeps m, exit by Enter clears it', () => {
    const a = make();
    a.outdent();
    expect(a.blocks[1].kind).toBeUndefined();
    expect(a.blocks[1].m).toEqual({ size: 2, bold: true });
    const b = make();
    b.enter();
    expect(b.blocks[1]).toEqual({ runs: [] });
  });

  it('setMark at an empty caret writes block m', () => {
    const m = new TextEditModel([{ runs: [] }]);
    m.setMark('size', 3);
    expect(m.blocks[0].m).toEqual({ size: 3 });
  });
});
