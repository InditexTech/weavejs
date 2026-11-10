// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { TextEditModel } from '../edit/model';
import { TextLayoutEngine, type TextLayoutStyle } from '../layout/engine';
import {
  blocksToText,
  indentBlocks,
  listMarkers,
  parseWeaveClipboard,
  toggleList,
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
const measurer = (_font: string, text: string) => text.length * 5;

const item = (t: string, extra: Partial<WeaveTextBlock> = {}) =>
  ({ kind: 'ol', runs: [{ t }], ...extra } as WeaveTextBlock);

describe('list continuation blocks', () => {
  it('Shift+Enter in an item adds a continuation without marker', () => {
    const m = new TextEditModel([item('abcd')]);
    m.moveTo(2);
    expect(m.enter(true)).toBe(true);
    expect(m.blocks.map((b) => [b.kind, b.cont])).toEqual([
      ['ol', undefined],
      ['ol', true],
    ]);
    expect(blocksToText(m.blocks)).toBe('ab\ncd');
  });

  it('Shift+Enter inside a continuation adds another one', () => {
    const m = new TextEditModel([item('ab'), item('cd', { cont: true })]);
    m.moveTo(4);
    m.enter(true);
    expect(m.blocks.map((b) => !!b.cont)).toEqual([false, true, true]);
  });

  it('Enter inside a continuation starts a new bullet', () => {
    const m = new TextEditModel([item('ab'), item('cdef', { cont: true })]);
    m.moveTo(5);
    m.enter();
    expect(m.blocks.map((b) => !!b.cont)).toEqual([false, true, false]);
  });

  it('Enter on an empty continuation exits the list', () => {
    const m = new TextEditModel([
      item('ab'),
      { kind: 'ol', cont: true, runs: [] },
    ]);
    m.moveTo(3);
    m.enter();
    expect(m.blocks[1]).toEqual({ runs: [] });
  });

  it('Shift+Enter outside a list behaves like Enter', () => {
    const m = new TextEditModel([{ runs: [{ t: 'abcd' }] }]);
    m.moveTo(2);
    m.enter(true);
    expect(m.blocks.map((b) => b.cont)).toEqual([undefined, undefined]);
    expect(blocksToText(m.blocks)).toBe('ab\ncd');
  });

  it('Shift+Enter at the start of an item is ignored', () => {
    const m = new TextEditModel([item('abcd')]);
    m.moveTo(0);
    expect(m.enter(true)).toBe(false);
    expect(m.blocks).toHaveLength(1);
  });

  it('Backspace at the start of a continuation merges it back', () => {
    const m = new TextEditModel([item('ab'), item('cd', { cont: true })]);
    m.moveTo(3);
    expect(m.backspaceInList()).toBe(false);
    m.backspace();
    expect(m.blocks).toHaveLength(1);
    expect(blocksToText(m.blocks)).toBe('abcd');
    expect(m.blocks[0].cont).toBeUndefined();
  });

  it('numbering continues across continuations', () => {
    const blocks = [
      item('a'),
      item('b', { cont: true }),
      item('c', { cont: true }),
      item('d'),
    ];
    expect(listMarkers(blocks)).toEqual(['1.', null, null, '2.']);
  });

  it('indent and toggle apply to the whole item', () => {
    const blocks = [item('a'), item('b', { cont: true }), item('c')];
    const indented = indentBlocks(blocks, 3, 3);
    expect(indented.map((b) => b.depth)).toEqual([1, 1, undefined]);
    const off = toggleList(blocks, 0, 0, 'ol');
    expect(off.map((b) => [b.kind, b.cont])).toEqual([
      [undefined, undefined],
      [undefined, undefined],
      ['ol', undefined],
    ]);
  });

  it('lays out a continuation at the item indent with no marker', () => {
    const l = new TextLayoutEngine(measurer).layout(
      [item('ab'), item('cd', { cont: true })],
      style,
      { width: undefined, height: undefined, padding: 0 }
    );
    expect(l.lines[1].marker).toBeUndefined();
    expect(l.lines[1].offsetX).toBe(l.lines[0].offsetX);
  });

  it('keeps the continuation flag through the clipboard payload', () => {
    const blocks = [item('a'), item('b', { cont: true })];
    const parsed = parseWeaveClipboard(JSON.stringify({ v: 1, blocks }));
    expect(parsed?.map((b) => !!b.cont)).toEqual([false, true]);
  });
});
