// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { blocksToText, replaceRange, type WeaveTextBlock } from '../model';
import {
  nextGrapheme,
  nextWordBoundary,
  prevGrapheme,
  prevWordBoundary,
} from './geometry';

export type EditKind = 'type' | 'delete' | 'paste' | 'ime' | 'other';

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
    this.breakCoalescing();
  }

  moveTo(offset: number, extend = false, keepDesiredX = false) {
    const len = this.getText().length;
    const o = Math.max(0, Math.min(offset, len));
    this.focus = o;
    if (!extend) this.anchor = o;
    if (!keepDesiredX) this.desiredX = null;
    this.breakCoalescing();
  }

  selectAll() {
    this.anchor = 0;
    this.focus = this.getText().length;
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
    this.blocks = replaceRange(this.blocks, start, end, text);
    this.anchor = this.focus = start + text.length;
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

  private restore(s: Snapshot) {
    this.blocks = s.blocks;
    this.anchor = s.anchor;
    this.focus = s.focus;
    this.lastKind = null;
    this.desiredX = null;
  }
}
