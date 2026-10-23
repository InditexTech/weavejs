// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import {
  applyMark,
  indentBlocks,
  listMarkers,
  outdentBlocks,
  queryMark,
  ratioToSize,
  replaceRange,
  sizeToRatio,
  toggleList,
  toggleMark,
  type WeaveTextBlock,
} from '../model';

const plain = (t: string): WeaveTextBlock[] => [{ runs: t ? [{ t }] : [] }];

describe('typed marks', () => {
  it('splits a run and merges equal neighbours', () => {
    const b = applyMark(plain('hello world'), 0, 5, 'bold', true);
    expect(b[0].runs).toEqual([
      { t: 'hello', m: { bold: true } },
      { t: ' world' },
    ]);
    const back = applyMark(b, 0, 5, 'bold', undefined);
    expect(back[0].runs).toEqual([{ t: 'hello world' }]);
  });

  it('queries tri-state', () => {
    const b = applyMark(plain('hello world'), 0, 5, 'bold', true);
    expect(queryMark(b, 0, 5, 'bold').state).toBe('all');
    expect(queryMark(b, 0, 11, 'bold').state).toBe('some');
    expect(queryMark(b, 6, 11, 'bold').state).toBe('none');
  });

  it('toggle sets then clears', () => {
    const on = toggleMark(plain('abc'), 0, 3, 'italic');
    expect(on[0].runs[0].m).toEqual({ italic: true });
    expect(toggleMark(on, 0, 3, 'italic')).toEqual(plain('abc'));
  });

  it('plain documents stay byte-identical', () => {
    const b = plain('abc');
    expect(JSON.stringify(applyMark(b, 0, 3, 'size', 1))).toBe(
      JSON.stringify(b)
    );
  });
});

describe('size ratio', () => {
  it('round trips px', () => {
    expect(ratioToSize(sizeToRatio(24, 16), 16)).toBe(24);
    expect(sizeToRatio(13, 17)).toBe(0.7647);
  });
  it('guards invalid input', () => {
    expect(ratioToSize(-1, 16)).toBe(16);
    expect(ratioToSize(2, 0)).toBe(2);
    expect(ratioToSize(2, NaN)).toBe(2);
  });
});

describe('replaceRange', () => {
  it('uses explicit insert marks', () => {
    const b = replaceRange(plain('ab'), 1, 1, 'X', { bold: true });
    expect(b[0].runs).toEqual([
      { t: 'a' },
      { t: 'X', m: { bold: true } },
      { t: 'b' },
    ]);
  });

  it('Enter in a list item copies kind and depth, not start', () => {
    const b = replaceRange(
      [{ kind: 'ol', depth: 1, start: 4, runs: [{ t: 'ab' }] }],
      1,
      1,
      '\n'
    );
    expect(b).toHaveLength(2);
    expect(b[0]).toMatchObject({ kind: 'ol', depth: 1, start: 4 });
    expect(b[1]).toMatchObject({ kind: 'ol', depth: 1 });
    expect(b[1].start).toBeUndefined();
  });

  it('preserves list fields on plain edit', () => {
    const src: WeaveTextBlock[] = [
      { kind: 'ul', depth: 2, runs: [{ t: 'ab' }] },
    ];
    expect(replaceRange(src, 2, 2, 'c')[0]).toMatchObject({
      kind: 'ul',
      depth: 2,
    });
  });
});

describe('lists', () => {
  it('toggles, indents and outdents', () => {
    let b = toggleList(plain('a'), 0, 0, 'ul');
    expect(b[0].kind).toBe('ul');
    b = indentBlocks(b, 0, 0);
    expect(b[0].depth).toBe(1);
    b = outdentBlocks(b, 0, 0);
    expect(b[0].depth).toBeUndefined();
    b = outdentBlocks(b, 0, 0);
    expect(b[0].kind).toBeUndefined();
    expect(toggleList(toggleList(plain('a'), 0, 0, 'ol'), 0, 0, 'ol')).toEqual(
      plain('a')
    );
  });

  it('numbers continuously, restarts, honours start and cycles', () => {
    const ol = (depth: number, start?: number): WeaveTextBlock => ({
      kind: 'ol',
      depth,
      ...(start ? { start } : {}),
      runs: [{ t: 'x' }],
    });
    const blocks: WeaveTextBlock[] = [
      ol(0),
      ol(0),
      ol(1),
      ol(1),
      ol(0),
      { runs: [{ t: 'p' }] },
      ol(0, 5),
      { kind: 'ul', depth: 0, runs: [{ t: 'u' }] },
      { kind: 'ul', depth: 1, runs: [{ t: 'u' }] },
      { kind: 'ul', depth: 2, runs: [{ t: 'u' }] },
    ];
    expect(listMarkers(blocks)).toEqual([
      '1.',
      '2.',
      'a.',
      'b.',
      '3.',
      null,
      '5.',
      '\u2022',
      '\u25E6',
      '\u25AA',
    ]);
  });
});
