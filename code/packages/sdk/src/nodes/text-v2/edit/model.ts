// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  applyMark,
  blockText,
  blocksToText,
  cleanMarks,
  indentBlocks,
  applyMarkToEmptyBlock,
  marksAtOffset,
  outdentBlocks,
  queryMark,
  setBlockAlign,
  replaceRange,
  insertBlocks,
  sliceBlocks,
  toggleList,
  type WeaveTextBlock,
  type WeaveTextBlockAlign,
  type WeaveTextListKind,
  type WeaveTextMarkKey,
  type WeaveTextMarks,
} from '../model';
import {
  nextGrapheme,
  nextWordBoundary,
  prevGrapheme,
  prevWordBoundary,
} from './geometry';

export type EditKind = 'type' | 'delete' | 'paste' | 'ime' | 'other' | 'format';

type Snapshot = { blocks: WeaveTextBlock[]; anchor: number; focus: number };

/**
 * Session-local edit state: content + selection + undo/redo with
 * coalescing. Typing and deleting merge into one entry while they continue
 * in the same direction without a selection move; paste and IME composition
 * are always one entry each. Independent of Konva and the DOM.
 */
export class TextEditModel {
  private blocks: WeaveTextBlock[];
  anchor = 0;
  focus = 0;
  /** x kept while moving vertically; reset by any other move. */
  desiredX: number | null = null;
  /**
   * Marks the next typed text takes at a collapsed caret (e.g. bold toggled
   * with nothing selected). Cleared when the selection moves.
   */
  storedMarks: WeaveTextMarks | null = null;

  private readonly undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private lastKind: EditKind | null = null;
  private lastEditEnd = -1;
  private composing = false;

  constructor(blocks: WeaveTextBlock[]) {
    this.blocks = blocks;
    const len = blocksToText(blocks).length;
    this.anchor = this.focus = len;
  }

  getBlocks(): WeaveTextBlock[] {
    return this.blocks;
  }
  getText(): string {
    return blocksToText(this.blocks);
  }
  getSelection(): { start: number; end: number } {
    return {
      start: Math.min(this.anchor, this.focus),
      end: Math.max(this.anchor, this.focus),
    };
  }
  getSelectedText(): string {
    const { start, end } = this.getSelection();
    return this.getText().slice(start, end);
  }
  getSelectedBlocks(): WeaveTextBlock[] {
    const { start, end } = this.getSelection();
    return sliceBlocks(this.blocks, start, end);
  }
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  setSelection(anchor: number, focus: number) {
    const len = this.getText().length;
    this.anchor = Math.max(0, Math.min(anchor, len));
    this.focus = Math.max(0, Math.min(focus, len));
    this.storedMarks = null;
    this.breakCoalescing();
  }

  moveTo(offset: number, extend = false, keepDesiredX = false) {
    const len = this.getText().length;
    const o = Math.max(0, Math.min(offset, len));
    this.focus = o;
    this.storedMarks = null;
    if (!extend) this.anchor = o;
    if (!keepDesiredX) this.desiredX = null;
    this.breakCoalescing();
  }

  selectAll() {
    this.anchor = 0;
    this.focus = this.getText().length;
    this.storedMarks = null;
    this.breakCoalescing();
  }

  breakCoalescing() {
    if (!this.composing) this.lastKind = null;
  }

  beginComposition() {
    this.composing = true;
    this.lastKind = null;
  }
  endComposition() {
    this.composing = false;
    this.lastKind = null;
  }

  private snapshot(): Snapshot {
    return { blocks: this.blocks, anchor: this.anchor, focus: this.focus };
  }

  private record(kind: EditKind, editStart: number) {
    const coalesce =
      this.lastKind === kind &&
      (kind === 'type' || kind === 'delete' || kind === 'ime') &&
      // typing continues where the last edit ended
      (kind === 'ime' || this.lastEditEnd === editStart || kind === 'delete');
    if (!coalesce) {
      this.undoStack.push(this.snapshot());
      if (this.undoStack.length > 500) this.undoStack.shift();
    }
    this.redoStack = [];
    this.lastKind = kind;
  }

  /** Replace [start,end) with plain text and put the caret after it. */
  replaceRange(start: number, end: number, text: string, kind: EditKind) {
    const len = this.getText().length;
    start = Math.max(0, Math.min(start, len));
    end = Math.max(start, Math.min(end, len));
    if (start === end && text === '') return false;
    this.record(kind, start);
    const carried = this.storedMarks ?? marksAtOffset(this.blocks, start);
    this.blocks = replaceRange(
      this.blocks,
      start,
      end,
      text,
      this.storedMarks ?? undefined
    );
    this.storedMarks = null;
    // A new line starts empty, so it has nothing to inherit from: keep the
    // formatting going by storing the marks it was split from (not links).
    if (text.endsWith('\n') && carried) {
      const { link: _link, ...rest } = carried;
      const next = cleanMarks(rest);
      if (next && !marksAtOffset(this.blocks, start + text.length)) {
        this.storedMarks = next;
      }
    }
    this.anchor = this.focus = start + text.length;
    this.lastEditEnd = this.focus;
    this.desiredX = null;
    return true;
  }

  /** Replace the selection with rich blocks; caret ends after them. */
  replaceSelectionWithBlocks(fragment: WeaveTextBlock[], kind: EditKind) {
    if (fragment.length === 0) return false;
    const { start, end } = this.getSelection();
    const insertedLen = blocksToText(fragment).length;
    this.record(kind, start);
    this.blocks = insertBlocks(this.blocks, start, end, fragment);
    this.storedMarks = null;
    this.anchor = this.focus = start + insertedLen;
    this.lastEditEnd = this.focus;
    this.desiredX = null;
    return true;
  }

  replaceSelection(text: string, kind: EditKind) {
    const { start, end } = this.getSelection();
    return this.replaceRange(start, end, text, kind);
  }

  backspace(byWord = false) {
    const { start, end } = this.getSelection();
    if (start !== end) return this.replaceRange(start, end, '', 'delete');
    if (start === 0) return false;
    const text = this.getText();
    const from = byWord
      ? prevWordBoundary(text, start)
      : prevGrapheme(text, start);
    return this.replaceRange(from, start, '', 'delete');
  }

  del(byWord = false) {
    const { start, end } = this.getSelection();
    if (start !== end) return this.replaceRange(start, end, '', 'delete');
    const text = this.getText();
    if (start >= text.length) return false;
    const to = byWord
      ? nextWordBoundary(text, start)
      : nextGrapheme(text, start);
    return this.replaceRange(start, to, '', 'delete');
  }

  undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.redoStack.push(this.snapshot());
    this.restore(prev);
    return true;
  }

  redo(): boolean {
    const next = this.redoStack.pop();
    if (!next) return false;
    this.undoStack.push(this.snapshot());
    this.restore(next);
    return true;
  }

  // ---- rich formatting -----------------------------------------------------

  /** Current marks at the caret / selection start (stored marks win). */
  caretMarks(): WeaveTextMarks | undefined {
    return (
      this.storedMarks ?? marksAtOffset(this.blocks, this.getSelection().start)
    );
  }

  /** Always one new undo entry, never coalesced. */
  private commitFormat(next: WeaveTextBlock[]): boolean {
    if (JSON.stringify(next) === JSON.stringify(this.blocks)) return false;
    this.lastKind = null;
    this.record('format', -1);
    this.lastKind = null;
    this.blocks = next;
    return true;
  }

  /** Set (`undefined` clears) one mark on the selection or the stored marks. */
  setMark(key: WeaveTextMarkKey, value: unknown): boolean {
    const { start, end } = this.getSelection();
    if (start === end) {
      const base: Record<string, unknown> = { ...this.caretMarks() };
      if (value === undefined || value === false) delete base[key];
      else base[key] = value;
      this.storedMarks = cleanMarks(base) ?? {};
      // An empty block also keeps the mark so marker, line and remote
      // clients follow it.
      const next = applyMarkToEmptyBlock(this.blocks, start, key, value);
      if (next !== this.blocks) {
        const stored = this.storedMarks;
        this.commitFormat(next);
        this.storedMarks = stored;
      }
      return true;
    }
    return this.commitFormat(applyMark(this.blocks, start, end, key, value));
  }

  /** Toggle a boolean mark: on unless the whole selection already has it. */
  toggleMark(key: WeaveTextMarkKey): boolean {
    const { start, end } = this.getSelection();
    const q = queryMark(this.blocks, start, end, key, this.storedMarks);
    return this.setMark(key, q.state === 'all' ? undefined : true);
  }

  toggleList(kind: WeaveTextListKind): boolean {
    const { start, end } = this.getSelection();
    return this.commitFormat(toggleList(this.blocks, start, end, kind));
  }

  setAlign(align: WeaveTextBlockAlign | undefined): boolean {
    const { start, end } = this.getSelection();
    return this.commitFormat(setBlockAlign(this.blocks, start, end, align));
  }

  indent(): boolean {
    const { start, end } = this.getSelection();
    return this.commitFormat(indentBlocks(this.blocks, start, end));
  }

  outdent(): boolean {
    const { start, end } = this.getSelection();
    return this.commitFormat(outdentBlocks(this.blocks, start, end));
  }

  private blockAt(offset: number) {
    let pos = 0;
    for (let i = 0; i < this.blocks.length; i++) {
      const len = blockText(this.blocks[i]).length;
      if (offset <= pos + len) return { index: i, start: pos, length: len };
      pos += len + 1;
    }
    return undefined;
  }

  /**
   * Enter in a list: an empty item exits the list; otherwise the item
   * continues (the block split carries `kind` and `depth`).
   */
  enter(): boolean {
    const { start, end } = this.getSelection();
    const b = start === end ? this.blockAt(start) : undefined;
    if (b && this.blocks[b.index].kind && b.length === 0) {
      return this.commitFormat(outdentToPlain(this.blocks, b.index));
    }
    return this.replaceRange(start, end, '\n', 'other');
  }

  /**
   * Backspace at the start of a list item outdents it, or removes the
   * marker at depth 0. Returns false when the key is not handled here.
   */
  backspaceInList(): boolean {
    const { start, end } = this.getSelection();
    if (start !== end) return false;
    const b = this.blockAt(start);
    if (b?.start !== start || !this.blocks[b.index].kind) return false;
    return this.commitFormat(outdentBlocks(this.blocks, start, start));
  }

  private restore(s: Snapshot) {
    this.blocks = s.blocks;
    this.storedMarks = null;
    this.anchor = s.anchor;
    this.focus = s.focus;
    this.lastKind = null;
    this.desiredX = null;
  }
}

function outdentToPlain(
  blocks: WeaveTextBlock[],
  index: number
): WeaveTextBlock[] {
  return blocks.map((b, i) => {
    if (i !== index) return b;
    const { kind: _k, depth: _d, start: _s, m: _m, ...rest } = b;
    return rest;
  });
}
