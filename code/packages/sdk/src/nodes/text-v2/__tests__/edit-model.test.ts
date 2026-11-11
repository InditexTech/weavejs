// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { TextEditModel } from '../edit/model';
import {
  caretRect,
  lineEnd,
  lineHome,
  moveVertical,
  nextGrapheme,
  nextWordBoundary,
  offsetFromPoint,
  paragraphRangeAt,
  prevGrapheme,
  prevWordBoundary,
  selectionRects,
  wordRangeAt,
} from '../edit/geometry';
import { TextLayoutEngine, type TextLayoutStyle } from '../layout/engine';
import { synthesizeBlocks } from '../model';

const style: TextLayoutStyle = {
  fontSize: 10,
  fontFamily: 'x',
  fontStyle: 'normal',
  fontVariant: 'normal',
  lineHeight: 1,
  letterSpacing: 0,
  wrap: 'word',
  align: 'left',
};
// fixed-width glyphs: 10px each
const measurer = (_f: string, t: string) => t.length * 10;
const measure = (t: string) => t.length * 10;

function layoutOf(text: string, width?: number) {
  return new TextLayoutEngine(measurer).layout(synthesizeBlocks(text), style, {
    width,
    height: undefined,
    padding: 0,
  });
}

describe('TextEditModel', () => {
  it('coalesces typing into one undo entry and restores selection', () => {
    const m = new TextEditModel(synthesizeBlocks('ab'));
    m.moveTo(2);
    m.replaceSelection('c', 'type');
    m.replaceSelection('d', 'type');
    m.replaceSelection('e', 'type');
    expect(m.getText()).toBe('abcde');
    expect(m.undo()).toBe(true);
    expect(m.getText()).toBe('ab');
    expect(m.focus).toBe(2);
    expect(m.undo()).toBe(false);
    expect(m.redo()).toBe(true);
    expect(m.getText()).toBe('abcde');
  });

  it('breaks coalescing on selection move, and different kinds are separate entries', () => {
    const m = new TextEditModel(synthesizeBlocks('abc'));
    m.moveTo(3);
    m.replaceSelection('1', 'type');
    m.moveTo(0);
    m.replaceSelection('2', 'type');
    m.backspace();
    m.replaceSelection('PASTE', 'paste');
    m.replaceSelection('P2', 'paste');
    let n = 0;
    while (m.undo()) n++;
    expect(n).toBe(5); // type, type, delete, paste, paste
    expect(m.getText()).toBe('abc');
  });

  it('IME composition is one entry', () => {
    const m = new TextEditModel(synthesizeBlocks(''));
    m.beginComposition();
    m.replaceRange(0, 0, 'に', 'ime');
    m.replaceRange(0, 1, 'にほ', 'ime');
    m.replaceRange(0, 2, '日本', 'ime');
    m.endComposition();
    expect(m.getText()).toBe('日本');
    m.undo();
    expect(m.getText()).toBe('');
    expect(m.canUndo()).toBe(false);
  });

  it('backspace/delete by grapheme and word; new edit clears redo', () => {
    const m = new TextEditModel(synthesizeBlocks('hi 👨‍👩‍👧 you'));
    m.moveTo(m.getText().length);
    m.backspace(true);
    expect(m.getText()).toBe('hi 👨‍👩‍👧 ');
    m.backspace();
    m.backspace();
    expect(m.getText()).toBe('hi ');
    m.moveTo(0);
    m.del(true);
    expect(m.getText()).toBe(' ');
    m.undo();
    m.replaceSelection('z', 'type');
    expect(m.canRedo()).toBe(false);
  });

  it('no-op edits do not create history', () => {
    const m = new TextEditModel(synthesizeBlocks(''));
    expect(m.backspace()).toBe(false);
    expect(m.del()).toBe(false);
    expect(m.canUndo()).toBe(false);
  });
});

describe('edit geometry', () => {
  it('grapheme and word navigation', () => {
    expect(nextGrapheme('a👨‍👩‍👧b', 1)).toBe(1 + '👨‍👩‍👧'.length);
    expect(prevGrapheme('a👨‍👩‍👧b', 1 + '👨‍👩‍👧'.length)).toBe(1);
    expect(wordRangeAt('hello world', 7)).toEqual([6, 11]);
    expect(nextWordBoundary('hello world', 0)).toBe(5);
    expect(prevWordBoundary('hello world', 11)).toBe(6);
    expect(paragraphRangeAt('ab\ncd\nef', 4)).toEqual([3, 5]);
  });

  it('maps offsets to caret positions and back, wrapped lines', () => {
    const l = layoutOf('aaaa bbbb cccc', 50); // 5 chars per line
    expect(l.lines.map((x) => x.text)).toEqual(['aaaa', 'bbbb', 'cccc']);
    expect(caretRect(l, 0, measure)).toMatchObject({ x: 0, y: 0, line: 0 });
    // soft wrap boundary belongs to next line start
    expect(caretRect(l, 5, measure)).toMatchObject({ x: 0, y: 10, line: 1 });
    expect(caretRect(l, 4, measure)).toMatchObject({ x: 40, line: 0 });
    expect(offsetFromPoint(l, { x: 24, y: 12 }, measure)).toBe(7);
    expect(offsetFromPoint(l, { x: 500, y: 500 }, measure)).toBe(14);
    expect(offsetFromPoint(l, { x: -5, y: -5 }, measure)).toBe(0);
  });

  it('vertical movement keeps desired x; home/end are visual', () => {
    const l = layoutOf('aaaa bbbb cccc', 50);
    expect(moveVertical(l, 3, 1, 30, measure)).toBe(8);
    expect(moveVertical(l, 8, -1, 30, measure)).toBe(3);
    expect(moveVertical(l, 2, -1, 20, measure)).toBe(0);
    expect(moveVertical(l, 12, 1, 20, measure)).toBe(14);
    expect(lineHome(l, 7)).toBe(5);
    expect(lineEnd(l, 7)).toBe(9);
  });

  it('handles empty paragraphs and selection rects across lines', () => {
    const l = layoutOf('ab\n\ncd');
    expect(l.lines).toHaveLength(3);
    expect(caretRect(l, 3, measure).line).toBe(1);
    const rects = selectionRects(l, 1, 5, measure);
    expect(rects).toHaveLength(3);
    expect(rects[0].x).toBe(10);
    expect(selectionRects(l, 2, 2, measure)).toEqual([]);
  });
});
