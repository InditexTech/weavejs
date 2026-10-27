import { describe, expect, it } from 'vitest';
import {
  insertBlocks,
  parseWeaveClipboard,
  sliceBlocks,
  type WeaveTextBlock,
} from '../model';

const src: WeaveTextBlock[] = [
  { runs: [{ t: 'ab', m: { bold: true } }, { t: 'cd' }] },
  { kind: 'ul', runs: [{ t: 'ef', m: { italic: true } }] },
];

describe('clipboard blocks', () => {
  it('slices across blocks keeping marks and kind', () => {
    const s = sliceBlocks(src, 1, 6);
    expect(s).toEqual([
      { runs: [{ t: 'b', m: { bold: true } }, { t: 'cd' }] },
      { kind: 'ul', runs: [{ t: 'e', m: { italic: true } }] },
    ]);
  });
  it('inserts inline for single block', () => {
    const r = insertBlocks(
      [{ runs: [{ t: 'xy' }] }],
      1,
      1,
      [{ runs: [{ t: 'Q', m: { bold: true } }] }]
    );
    expect(r).toEqual([
      { runs: [{ t: 'x' }, { t: 'Q', m: { bold: true } }, { t: 'y' }] },
    ]);
  });
  it('splits for multi block', () => {
    const r = insertBlocks([{ runs: [{ t: 'xy' }] }], 1, 1, src);
    expect(r.length).toBe(2);
    expect(r[1].kind).toBe('ul');
    expect(r[1].runs.map((x) => x.t).join('')).toBe('efy');
  });
  it('rejects bad payload, strips unsafe link', () => {
    expect(parseWeaveClipboard('nope')).toBeUndefined();
    const ok = parseWeaveClipboard(
      JSON.stringify({
        v: 1,
        blocks: [{ runs: [{ t: 'a', m: { link: 'javascript:x', bold: true } }] }],
      })
    );
    expect(ok?.[0].runs[0].m).toEqual({ bold: true });
  });
});
