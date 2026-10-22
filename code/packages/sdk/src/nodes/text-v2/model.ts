// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Pure text model: `blocks[] -> runs[{ t, m }]`. No Konva or DOM dependency.
 * `text` is a derived mirror: block texts joined by `\n`.
 */

export type WeaveTextMarks = {
  link?: string;
  [mark: string]: unknown;
};

export type WeaveTextRun = { t: string; m?: WeaveTextMarks };
export type WeaveTextBlock = { runs: WeaveTextRun[] };

function isEmptyMarks(m: WeaveTextMarks | undefined): boolean {
  return !m || Object.keys(m).length === 0;
}

function sameMarks(
  a: WeaveTextMarks | undefined,
  b: WeaveTextMarks | undefined
): boolean {
  if (isEmptyMarks(a) && isEmptyMarks(b)) return true;
  if (isEmptyMarks(a) || isEmptyMarks(b)) return false;
  const ka = Object.keys(a!);
  const kb = Object.keys(b!);
  return ka.length === kb.length && ka.every((k) => a![k] === b![k]);
}

/** Merge adjacent runs with equal marks and drop empty runs (keeps >= 0). */
export function normalizeRuns(runs: WeaveTextRun[]): WeaveTextRun[] {
  const out: WeaveTextRun[] = [];
  for (const run of runs) {
    if (run.t === '') continue;
    const last = out.at(-1);
    if (last && sameMarks(last.m, run.m)) {
      last.t += run.t;
    } else {
      out.push({ t: run.t, ...(isEmptyMarks(run.m) ? {} : { m: run.m }) });
    }
  }
  return out;
}

/**
 * Synthesize blocks from legacy plain `text`. One run per paragraph; a
 * legacy whole-text `link` becomes a full-range `link` mark.
 */
export function synthesizeBlocks(
  text: string,
  link?: string
): WeaveTextBlock[] {
  return (text ?? '').split('\n').map((paragraph) => ({
    runs:
      paragraph === ''
        ? []
        : [{ t: paragraph, ...(link ? { m: { link } } : {}) }],
  }));
}

/** Resolve blocks of a node: stored `blocks` or lazily synthesized (no write). */
export function resolveBlocks(attrs: {
  blocks?: WeaveTextBlock[];
  text?: string;
  link?: string;
}): WeaveTextBlock[] {
  if (Array.isArray(attrs.blocks) && attrs.blocks.length > 0) {
    return attrs.blocks;
  }
  return synthesizeBlocks(attrs.text ?? '', attrs.link);
}

export function blockText(block: WeaveTextBlock): string {
  return block.runs.map((r) => r.t).join('');
}

/** Derived mirror for the `text` attribute. */
export function blocksToText(blocks: WeaveTextBlock[]): string {
  return blocks.map(blockText).join('\n');
}

/** True when any run carries marks (rich content: rendered read-only). */
export function hasMarks(blocks: WeaveTextBlock[]): boolean {
  return blocks.some((b) => b.runs.some((r) => !isEmptyMarks(r.m)));
}

/** Slice runs of a block between local offsets [from, to). */
function sliceRuns(runs: WeaveTextRun[], from: number, to: number) {
  const out: WeaveTextRun[] = [];
  let pos = 0;
  for (const run of runs) {
    const start = pos;
    const end = pos + run.t.length;
    pos = end;
    const s = Math.max(from, start);
    const e = Math.min(to, end);
    if (s < e) {
      out.push({ t: run.t.slice(s - start, e - start), m: run.m });
    }
  }
  return out;
}

/** Marks of the run at (or immediately before) a local offset. */
function marksAt(runs: WeaveTextRun[], offset: number) {
  let pos = 0;
  let found: WeaveTextMarks | undefined;
  for (const run of runs) {
    const end = pos + run.t.length;
    if (offset > pos && offset <= end) return run.m;
    if (offset === pos && !found) found = run.m;
    pos = end;
  }
  return found;
}

/**
 * Replace the global range [start, end) (newline counts as 1 char between
 * blocks) with plain `insert`. Marks on untouched text are preserved; the
 * inserted text inherits marks of the character before `start`.
 */
export function replaceRange(
  blocks: WeaveTextBlock[],
  start: number,
  end: number,
  insert: string
): WeaveTextBlock[] {
  const total = blocksToText(blocks).length;
  start = Math.max(0, Math.min(start, total));
  end = Math.max(start, Math.min(end, total));

  let before: WeaveTextRun[] = [];
  let after: WeaveTextRun[] = [];
  const prefixBlocks: WeaveTextBlock[] = [];
  const suffixBlocks: WeaveTextBlock[] = [];
  let inheritedMarks: WeaveTextMarks | undefined;
  let pos = 0;

  blocks.forEach((block) => {
    const len = blockText(block).length;
    const bStart = pos;
    const bEnd = pos + len; // newline sits at bEnd (if not last)
    pos = bEnd + 1;

    if (bEnd < start) {
      prefixBlocks.push(block);
    } else if (bStart > end) {
      suffixBlocks.push(block);
    } else {
      if (start >= bStart && start <= bEnd) {
        const local = start - bStart;
        before = sliceRuns(block.runs, 0, local);
        inheritedMarks = marksAt(block.runs, local);
      }
      if (end >= bStart && end <= bEnd) {
        after = sliceRuns(block.runs, end - bStart, len);
      }
    }
  });

  const lines = insert.split('\n');
  const mk = (t: string): WeaveTextRun[] =>
    t === ''
      ? []
      : [{ t, ...(isEmptyMarks(inheritedMarks) ? {} : { m: inheritedMarks }) }];

  const middle: WeaveTextBlock[] = [];
  lines.forEach((line, idx) => {
    let runs = mk(line);
    if (idx === 0) runs = [...before, ...runs];
    if (idx === lines.length - 1) runs = [...runs, ...after];
    middle.push({ runs: normalizeRuns(runs) });
  });

  return [...prefixBlocks, ...middle, ...suffixBlocks];
}
