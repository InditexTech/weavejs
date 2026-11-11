// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import {
  blocksToText,
  hasMarks,
  normalizeRuns,
  replaceRange,
  resolveBlocks,
  synthesizeBlocks,
} from '../model';

describe('text model', () => {
  it('synthesizes one run per paragraph and round-trips text', () => {
    const b = synthesizeBlocks('ab\n\ncd');
    expect(b).toHaveLength(3);
    expect(b[1].runs).toEqual([]);
    expect(blocksToText(b)).toBe('ab\n\ncd');
    expect(blocksToText(synthesizeBlocks(''))).toBe('');
  });

  it('maps legacy link to a full-range mark', () => {
    const b = synthesizeBlocks('hi\nyo', 'https://a.b');
    expect(b[0].runs[0].m).toEqual({ link: 'https://a.b' });
    expect(b[1].runs[0].m).toEqual({ link: 'https://a.b' });
    expect(hasMarks(b)).toBe(true);
  });

  it('resolveBlocks prefers stored blocks and does not mutate attrs', () => {
    const attrs = { text: 'x' };
    expect(resolveBlocks(attrs)).toEqual(synthesizeBlocks('x'));
    expect(attrs).toEqual({ text: 'x' });
    const stored = [{ runs: [{ t: 'z' }] }];
    expect(resolveBlocks({ text: 'x', blocks: stored })).toBe(stored);
  });

  it('normalizes runs', () => {
    expect(normalizeRuns([{ t: 'a' }, { t: '' }, { t: 'b' }])).toEqual([
      { t: 'ab' },
    ]);
  });

  it('replaceRange inserts, deletes, and splits paragraphs', () => {
    const b = synthesizeBlocks('hello\nworld');
    expect(blocksToText(replaceRange(b, 5, 6, ' '))).toBe('hello world');
    expect(blocksToText(replaceRange(b, 2, 2, 'X'))).toBe('heXllo\nworld');
    expect(blocksToText(replaceRange(b, 3, 3, '\n'))).toBe('hel\nlo\nworld');
    expect(blocksToText(replaceRange(b, 0, 11, ''))).toBe('');
  });

  it('replaceRange preserves marks on untouched text', () => {
    const b = [{ runs: [{ t: 'bold', m: { b: true } }, { t: ' plain' }] }];
    const r = replaceRange(b, 5, 6, 'P');
    expect(blocksToText(r)).toBe('bold Plain');
    expect(r[0].runs[0]).toEqual({ t: 'bold', m: { b: true } });
    expect(r[0].runs[1].m).toBeUndefined();
  });
});
