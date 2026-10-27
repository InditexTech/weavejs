// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Pure text model: `blocks[] -> runs[{ t, m }]`. No Konva or DOM dependency.
 * `text` is a derived mirror: block texts joined by `\n`.
 */

export type WeaveTextMarks = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  /** Ratio of the node base `fontSize` (1 is omitted). */
  size?: number;
  family?: string;
  /** Multiplier of the run font size (clamped 0.5 to 4). */
  lineHeight?: number;
  link?: string;
  [mark: string]: unknown;
};

export type WeaveTextMarkKey =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'color'
  | 'size'
  | 'family'
  | 'lineHeight'
  | 'link';

export type WeaveTextListKind = 'ul' | 'ol';
export type WeaveTextBlockAlign = 'left' | 'center' | 'right';

export const MIN_LINE_HEIGHT = 0.5;
export const MAX_LINE_HEIGHT = 4;

/** Valid `lineHeight` mark of a run, or undefined (use the node value). */
export function runLineHeight(
  m: WeaveTextMarks | undefined
): number | undefined {
  const v = m?.lineHeight;
  return typeof v === 'number' && Number.isFinite(v) && v > 0
    ? Math.min(MAX_LINE_HEIGHT, Math.max(MIN_LINE_HEIGHT, v))
    : undefined;
}

export type WeaveTextRun = { t: string; m?: WeaveTextMarks };
export type WeaveTextBlock = {
  runs: WeaveTextRun[];
  kind?: WeaveTextListKind;
  depth?: number;
  start?: number;
  align?: WeaveTextBlockAlign;
  /** Marks of an empty block (no runs); ignored and dropped once it has text. */
  m?: WeaveTextMarks;
};

/** Only absolute http(s) URLs are links (same rule as the legacy node). */
export function isSafeLink(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** Marks an empty block carries: normalized and never a link. */
function emptyBlockMarks(
  m: WeaveTextMarks | undefined
): WeaveTextMarks | undefined {
  if (!m) return undefined;
  const { link: _link, ...rest } = m;
  return normalizeMarks(rest);
}

/** Block fields that describe structure (not content). */
function blockFields(block: WeaveTextBlock | undefined, withStart: boolean) {
  const out: Partial<WeaveTextBlock> = {};
  if (!block) return out;
  if (block.kind) out.kind = block.kind;
  if (block.depth) out.depth = block.depth;
  if (block.align) out.align = block.align;
  if (withStart && block.start !== undefined) out.start = block.start;
  return out;
}

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

/** Blocks covering the global range [start, end), keeping structure and marks. */
export function sliceBlocks(
  blocks: WeaveTextBlock[],
  start: number,
  end: number
): WeaveTextBlock[] {
  const out: WeaveTextBlock[] = [];
  let pos = 0;
  for (const block of blocks) {
    const len = blockText(block).length;
    const bStart = pos;
    const bEnd = pos + len;
    pos = bEnd + 1;
    if (bEnd < start || bStart > end) continue;
    const runs = normalizeRuns(
      sliceRuns(block.runs, Math.max(start, bStart) - bStart, end - bStart)
    );
    out.push({
      ...blockFields(block, true),
      runs,
      ...(runs.length === 0 && block.m ? { m: block.m } : {}),
    });
  }
  return out;
}

/**
 * Replace the global range [start, end) with a fragment of blocks. A single
 * block fragment merges inline; otherwise first/last fragment blocks merge
 * with the text before/after the range.
 */
export function insertBlocks(
  blocks: WeaveTextBlock[],
  start: number,
  end: number,
  fragment: WeaveTextBlock[]
): WeaveTextBlock[] {
  if (fragment.length === 0) return blocks;
  const total = blocksToText(blocks).length;
  start = Math.max(0, Math.min(start, total));
  end = Math.max(start, Math.min(end, total));
  const head = sliceBlocks(blocks, 0, start);
  const tail = sliceBlocks(blocks, end, total);
  const before = head.pop() ?? { runs: [] };
  const after = tail.shift() ?? { runs: [] };
  const first = fragment[0];
  const last = fragment[fragment.length - 1];
  const finish = (b: WeaveTextBlock): WeaveTextBlock => {
    const runs = normalizeRuns(b.runs);
    const { m: _m, ...rest } = b;
    return {
      ...rest,
      runs,
      ...(runs.length === 0 && b.m ? { m: b.m } : {}),
    };
  };
  if (fragment.length === 1) {
    return [
      ...head,
      finish({
        ...before,
        runs: [...before.runs, ...first.runs, ...after.runs],
      }),
      ...tail,
    ];
  }
  return [
    ...head,
    finish({ ...before, runs: [...before.runs, ...first.runs] }),
    ...fragment.slice(1, -1).map(finish),
    finish({ ...last, runs: [...last.runs, ...after.runs] }),
    ...tail,
  ];
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
  insert: string,
  insertMarks?: WeaveTextMarks | null
): WeaveTextBlock[] {
  const total = blocksToText(blocks).length;
  start = Math.max(0, Math.min(start, total));
  end = Math.max(start, Math.min(end, total));

  let before: WeaveTextRun[] = [];
  let after: WeaveTextRun[] = [];
  const prefixBlocks: WeaveTextBlock[] = [];
  const suffixBlocks: WeaveTextBlock[] = [];
  let inheritedMarks: WeaveTextMarks | undefined;
  let startBlock: WeaveTextBlock | undefined;
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
        startBlock = block;
        inheritedMarks = len === 0 ? block.m : marksAt(block.runs, local);
      }
      if (end >= bStart && end <= bEnd) {
        after = sliceRuns(block.runs, end - bStart, len);
      }
    }
  });

  if (insertMarks !== undefined) inheritedMarks = insertMarks ?? undefined;
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
    const normalized = normalizeRuns(runs);
    const carried = emptyBlockMarks(inheritedMarks);
    middle.push({
      ...blockFields(startBlock, idx === 0),
      runs: normalized,
      ...(normalized.length === 0 && carried ? { m: carried } : {}),
    });
  });

  return [...prefixBlocks, ...middle, ...suffixBlocks];
}

// ---- typed marks, size ratio ----------------------------------------------

export const DEFAULT_BASE_FONT_SIZE = 1;

function safeBase(base: number): number {
  return Number.isFinite(base) && base > 0 ? base : DEFAULT_BASE_FONT_SIZE;
}

/** px -> stored ratio (4 decimals). */
export function sizeToRatio(px: number, base: number): number {
  return Math.round((px / safeBase(base)) * 10000) / 10000;
}

/** stored ratio -> px (rounded to 0.1). Invalid ratios resolve to the base. */
export function ratioToSize(ratio: unknown, base: number): number {
  const b = safeBase(base);
  const r = typeof ratio === 'number' && ratio > 0 ? ratio : 1;
  return Math.round(r * b * 10) / 10;
}

/** Effective ratio of a run (invalid or missing -> 1). */
export function runRatio(m: WeaveTextMarks | undefined): number {
  const r = m?.size;
  return typeof r === 'number' && Number.isFinite(r) && r > 0 ? r : 1;
}

function normalizeMarks(m: WeaveTextMarks): WeaveTextMarks | undefined {
  const out: WeaveTextMarks = {};
  for (const [k, v] of Object.entries(m)) {
    if (v === undefined || v === false || v === null || v === '') continue;
    if (k === 'size' && v === 1) continue;
    out[k] = v;
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

/** Normalized marks of a run, or undefined when empty. */
export function cleanMarks(
  m: WeaveTextMarks | undefined
): WeaveTextMarks | undefined {
  return m ? normalizeMarks(m) : undefined;
}

// ---- range helpers --------------------------------------------------------

type BlockSpan = { index: number; start: number; end: number };

function blockSpans(blocks: WeaveTextBlock[]): BlockSpan[] {
  const out: BlockSpan[] = [];
  let pos = 0;
  blocks.forEach((b, index) => {
    const len = blockText(b).length;
    out.push({ index, start: pos, end: pos + len });
    pos += len + 1;
  });
  return out;
}

/** Indices of blocks touched by [start, end] (collapsed range -> its block). */
export function blockIndicesInRange(
  blocks: WeaveTextBlock[],
  start: number,
  end: number
): number[] {
  const out: number[] = [];
  for (const s of blockSpans(blocks)) {
    if (s.end >= start && s.start <= end) {
      // a non-collapsed range ending exactly at a block start excludes it
      if (end > start && s.start === end && s.start !== start) continue;
      out.push(s.index);
    }
  }
  return out;
}

/** Marks that typing at a collapsed offset would inherit. */
export function marksAtOffset(
  blocks: WeaveTextBlock[],
  offset: number
): WeaveTextMarks | undefined {
  for (const s of blockSpans(blocks)) {
    if (offset >= s.start && offset <= s.end) {
      const block = blocks[s.index];
      if (block.runs.length === 0) return cleanMarks(block.m);
      return cleanMarks(marksAt(block.runs, offset - s.start));
    }
  }
  return undefined;
}

function mapRunsInRange(
  block: WeaveTextBlock,
  from: number,
  to: number,
  fn: (m: WeaveTextMarks | undefined) => WeaveTextMarks | undefined
): WeaveTextBlock {
  const runs: WeaveTextRun[] = [];
  let pos = 0;
  for (const run of block.runs) {
    const rs = pos;
    const re = pos + run.t.length;
    pos = re;
    const s = Math.max(from, rs);
    const e = Math.min(to, re);
    if (s >= e) {
      runs.push(run);
      continue;
    }
    if (s > rs) runs.push({ t: run.t.slice(0, s - rs), m: run.m });
    runs.push({ t: run.t.slice(s - rs, e - rs), m: fn(run.m) });
    if (e < re) runs.push({ t: run.t.slice(e - rs), m: run.m });
  }
  return { ...block, runs: normalizeRuns(runs) };
}

function withEmptyMark(
  block: WeaveTextBlock,
  key: WeaveTextMarkKey,
  value: unknown
): WeaveTextBlock {
  const { m: _m, ...rest } = block;
  const m = normalizeMarks({ ...block.m, [key]: value });
  return m ? { ...rest, m } : rest;
}

/**
 * Set (or remove with `undefined`) one mark on the empty block holding the
 * collapsed offset. Other blocks are returned untouched.
 */
export function applyMarkToEmptyBlock(
  blocks: WeaveTextBlock[],
  offset: number,
  key: WeaveTextMarkKey,
  value: unknown
): WeaveTextBlock[] {
  const span = blockSpans(blocks).find(
    (s) => offset >= s.start && offset <= s.end
  );
  if (!span || blocks[span.index].runs.length > 0) return blocks;
  return blocks.map((b, i) =>
    i === span.index ? withEmptyMark(b, key, value) : b
  );
}

/** Set (or remove with `undefined`) one mark over the global range. */
export function applyMark(
  blocks: WeaveTextBlock[],
  start: number,
  end: number,
  key: WeaveTextMarkKey,
  value: unknown
): WeaveTextBlock[] {
  if (start >= end) return blocks;
  if (key === 'lineHeight' && value !== undefined) {
    const lh = runLineHeight({ lineHeight: value as number });
    if (lh === undefined) return blocks;
    value = lh;
  }
  const spans = blockSpans(blocks);
  return blocks.map((block, i) => {
    const s = spans[i];
    if (s.end <= start || s.start >= end) return block;
    if (block.runs.length === 0) return withEmptyMark(block, key, value);
    return mapRunsInRange(
      block,
      Math.max(start, s.start) - s.start,
      Math.min(end, s.end) - s.start,
      (m) => normalizeMarks({ ...m, [key]: value })
    );
  });
}

export type MarkState = 'all' | 'none' | 'some';

export type MarkQuery = { state: MarkState; value?: unknown };

/** Query one mark over a range; collapsed ranges report the caret marks. */
export function queryMark(
  blocks: WeaveTextBlock[],
  start: number,
  end: number,
  key: WeaveTextMarkKey,
  stored?: WeaveTextMarks | null
): MarkQuery {
  const values: unknown[] = [];
  if (start >= end) {
    const m = stored ?? marksAtOffset(blocks, start);
    const v = m?.[key];
    return v === undefined || v === false
      ? { state: 'none' }
      : { state: 'all', value: v };
  }
  const spans = blockSpans(blocks);
  blocks.forEach((block, i) => {
    const s = spans[i];
    if (s.end <= start || s.start >= end) return;
    const from = Math.max(start, s.start) - s.start;
    const to = Math.min(end, s.end) - s.start;
    for (const r of sliceRuns(block.runs, from, to)) {
      const v = r.m?.[key];
      values.push(v === false ? undefined : v);
    }
  });
  if (values.length === 0) return { state: 'none' };
  const set = values.filter((v) => v !== undefined);
  if (set.length === 0) return { state: 'none' };
  if (set.length < values.length) return { state: 'some' };
  const same = values.every((v) => v === values[0]);
  return same ? { state: 'all', value: values[0] } : { state: 'some' };
}

/** Toggle a boolean mark: removes when fully set, sets otherwise. */
export function toggleMark(
  blocks: WeaveTextBlock[],
  start: number,
  end: number,
  key: WeaveTextMarkKey
): WeaveTextBlock[] {
  const q = queryMark(blocks, start, end, key);
  return applyMark(
    blocks,
    start,
    end,
    key,
    q.state === 'all' ? undefined : true
  );
}

/** Apply a mark to every character of the node (used without a selection). */
export function applyMarkAll(
  blocks: WeaveTextBlock[],
  key: WeaveTextMarkKey,
  value: unknown
): WeaveTextBlock[] {
  return applyMark(blocks, 0, blocksToText(blocks).length, key, value);
}

// ---- lists ----------------------------------------------------------------

function mapBlocks(
  blocks: WeaveTextBlock[],
  indices: number[],
  fn: (b: WeaveTextBlock) => WeaveTextBlock
): WeaveTextBlock[] {
  const set = new Set(indices);
  return blocks.map((b, i) => (set.has(i) ? fn(b) : b));
}

function stripList(b: WeaveTextBlock): WeaveTextBlock {
  const { kind: _k, depth: _d, start: _s, ...rest } = b;
  return rest;
}

/** Toggle list `kind` on the blocks of a range (all already that kind -> off). */
export function toggleList(
  blocks: WeaveTextBlock[],
  start: number,
  end: number,
  kind: WeaveTextListKind
): WeaveTextBlock[] {
  const idx = blockIndicesInRange(blocks, start, end);
  const allSame = idx.every((i) => blocks[i].kind === kind);
  return mapBlocks(blocks, idx, (b) =>
    allSame ? stripList(b) : { ...b, kind }
  );
}

/** Set (or clear with `undefined`) the alignment of the blocks in a range. */
export function setBlockAlign(
  blocks: WeaveTextBlock[],
  start: number,
  end: number,
  align: WeaveTextBlockAlign | undefined
): WeaveTextBlock[] {
  const idx = blockIndicesInRange(blocks, start, end);
  return mapBlocks(blocks, idx, (b) => {
    if (align === undefined) {
      const { align: _a, ...rest } = b;
      return rest;
    }
    return { ...b, align };
  });
}

/** Increase depth of list blocks in the range (non-list blocks untouched). */
export function indentBlocks(
  blocks: WeaveTextBlock[],
  start: number,
  end: number
): WeaveTextBlock[] {
  const idx = blockIndicesInRange(blocks, start, end);
  return mapBlocks(blocks, idx, (b) =>
    b.kind ? { ...b, depth: (b.depth ?? 0) + 1 } : b
  );
}

/** Decrease depth; at depth 0 the list marker is removed. */
export function outdentBlocks(
  blocks: WeaveTextBlock[],
  start: number,
  end: number
): WeaveTextBlock[] {
  const idx = blockIndicesInRange(blocks, start, end);
  return mapBlocks(blocks, idx, (b) => {
    if (!b.kind) return b;
    const d = b.depth ?? 0;
    if (d <= 0) return stripList(b);
    const next: WeaveTextBlock = { ...b, depth: d - 1 };
    if (d - 1 === 0) delete next.depth;
    return next;
  });
}

const BULLETS = ['\u2022', '\u25E6', '\u25AA'];

function alpha(n: number): string {
  let s = '';
  let v = n;
  while (v > 0) {
    v--;
    s = String.fromCodePoint(97 + (v % 26)) + s;
    v = Math.floor(v / 26);
  }
  return s;
}

function roman(n: number): string {
  const map: [number, string][] = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];
  let v = n;
  let s = '';
  for (const [k, r] of map) {
    while (v >= k) {
      s += r;
      v -= k;
    }
  }
  return s;
}

/**
 * Marker text per block (null for plain paragraphs). Ordered numbering is
 * continuous across consecutive same-depth items and restarts after a
 * non-list block, a shallower item or a kind change; `start` seeds a run.
 * Markers are layout-only: they never enter `text` or offsets.
 */
export function listMarkers(blocks: WeaveTextBlock[]): (string | null)[] {
  const stack: { kind: WeaveTextListKind; n: number }[] = [];
  return blocks.map((b) => {
    if (!b.kind) {
      stack.length = 0;
      return null;
    }
    const d = Math.max(0, Math.floor(b.depth ?? 0));
    stack.length = Math.min(stack.length, d + 1);
    while (stack.length < d) stack.push({ kind: b.kind, n: 0 });
    const cur = stack[d];
    if (cur?.kind !== b.kind) {
      stack[d] = {
        kind: b.kind,
        n: b.kind === 'ol' ? Math.max(1, b.start ?? 1) : 0,
      };
    } else if (b.kind === 'ol') {
      cur.n += 1;
    }
    if (b.kind === 'ul') return BULLETS[d % 3];
    const n = stack[d].n;
    const style = d % 3;
    let label: string | number = n;
    if (style === 1) label = alpha(n);
    else if (style === 2) label = roman(n);
    return `${label}.`;
  });
}

// ---- selection format query ------------------------------------------------

export type WeaveTextSelectionFormat = {
  bold: MarkQuery;
  italic: MarkQuery;
  underline: MarkQuery;
  strike: MarkQuery;
  color: MarkQuery;
  family: MarkQuery;
  link: MarkQuery;
  lineHeight: MarkQuery;
  /** Paragraph alignment of the blocks in the range. */
  align: { state: MarkState; value?: WeaveTextBlockAlign };
  /** `value` in px (ratio * base); `none` reports the base size. */
  size: MarkQuery;
  list: { kind: WeaveTextListKind | 'none' | 'mixed'; depth?: number };
};

/**
 * Format of the range for toolbars. A collapsed range reports the stored
 * marks (when given) or the marks typing would inherit.
 */
export function getSelectionFormat(
  blocks: WeaveTextBlock[],
  start: number,
  end: number,
  baseFontSize: number,
  stored?: WeaveTextMarks | null
): WeaveTextSelectionFormat {
  const q = (key: WeaveTextMarkKey) =>
    queryMark(blocks, start, end, key, stored);

  // size: runs without the mark count as ratio 1
  const ratios: number[] = [];
  if (start >= end) {
    ratios.push(runRatio(stored ?? marksAtOffset(blocks, start)));
  } else {
    const spans = blockSpans(blocks);
    blocks.forEach((block, i) => {
      const s = spans[i];
      if (s.end <= start || s.start >= end) return;
      const from = Math.max(start, s.start) - s.start;
      const to = Math.min(end, s.end) - s.start;
      for (const r of sliceRuns(block.runs, from, to)) {
        ratios.push(runRatio(r.m));
      }
    });
  }
  let size: MarkQuery;
  if (ratios.every((r) => r === ratios[0])) {
    const r = ratios[0] ?? 1;
    size = {
      state: r === 1 ? 'none' : 'all',
      value: ratioToSize(r, baseFontSize),
    };
  } else {
    size = { state: 'some' };
  }

  const idx = blockIndicesInRange(blocks, start, end);
  const kinds = new Set(idx.map((i) => blocks[i].kind ?? 'none'));
  let list: WeaveTextSelectionFormat['list'] = { kind: 'none' };
  if (kinds.size === 1) {
    const kind = [...kinds][0];
    const depths = new Set(idx.map((i) => blocks[i].depth ?? 0));
    list =
      kind === 'none'
        ? { kind }
        : { kind, ...(depths.size === 1 ? { depth: [...depths][0] } : {}) };
  } else if (kinds.size > 1) {
    list = { kind: 'mixed' };
  }

  return {
    bold: q('bold'),
    italic: q('italic'),
    underline: q('underline'),
    strike: q('strike'),
    color: q('color'),
    family: q('family'),
    link: q('link'),
    lineHeight: q('lineHeight'),
    align: alignQuery(blocks, start, end),
    size,
    list,
  };
}

function alignQuery(
  blocks: WeaveTextBlock[],
  start: number,
  end: number
): { state: MarkState; value?: WeaveTextBlockAlign } {
  const idx = blockIndicesInRange(blocks, start, end);
  const vals = idx.map((i) => blocks[i].align);
  const set = vals.filter((v) => v !== undefined);
  if (set.length === 0) return { state: 'none' };
  if (set.length < vals.length || set.some((v) => v !== set[0])) {
    return { state: 'some' };
  }
  return { state: 'all', value: set[0] };
}

export const WEAVE_TEXT_MIME = 'application/x-weave-text+json';

/** Defensive parse of a clipboard payload; undefined when invalid. */
export function parseWeaveClipboard(
  raw: string | undefined
): WeaveTextBlock[] | undefined {
  if (!raw) return undefined;
  try {
    const data = JSON.parse(raw);
    if (data?.v !== 1 || !Array.isArray(data.blocks) || !data.blocks.length) {
      return undefined;
    }
    const out: WeaveTextBlock[] = [];
    for (const b of data.blocks.slice(0, 5000)) {
      if (!b || !Array.isArray(b.runs)) return undefined;
      const runs: WeaveTextRun[] = [];
      for (const r of b.runs) {
        if (typeof r?.t !== 'string') return undefined;
        const m = cleanMarks(
          r.m && typeof r.m === 'object' ? { ...r.m } : undefined
        );
        if (m && 'link' in m && !isSafeLink(m.link)) delete m.link;
        runs.push({ t: r.t, ...(m && Object.keys(m).length ? { m } : {}) });
      }
      const block: WeaveTextBlock = { runs: normalizeRuns(runs) };
      if (b.kind === 'ul' || b.kind === 'ol') block.kind = b.kind;
      if (Number.isInteger(b.depth) && b.depth > 0) block.depth = b.depth;
      if (Number.isInteger(b.start)) block.start = b.start;
      if (['left', 'center', 'right'].includes(b.align)) block.align = b.align;
      const em = cleanMarks(b.m && typeof b.m === 'object' ? b.m : undefined);
      if (!block.runs.length && em) block.m = em;
      out.push(block);
    }
    return out;
  } catch {
    return undefined;
  }
}
