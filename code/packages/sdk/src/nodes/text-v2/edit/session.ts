// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { TextLayout } from '../layout/engine';
import {
  getSelectionFormat,
  type WeaveTextBlock,
  type WeaveTextBlockAlign,
  type WeaveTextListKind,
  type WeaveTextMarkKey,
  type WeaveTextSelectionFormat,
} from '../model';
import { TextEditModel, type EditKind } from './model';
import {
  caretRect,
  lineEnd,
  lineHome,
  moveVertical,
  offsetFromPoint,
  paragraphRangeAt,
  selectionRects,
  wordRangeAt,
  type Point,
} from './geometry';

/**
 * What the session edits. Not tied to `WeaveTextNode`: any shape that can
 * expose blocks, a layout and a transform can be edited (e.g. shape labels).
 */
export interface TextEditTarget {
  getBlocks(): WeaveTextBlock[];
  /** Apply new content (and any auto-resize) to the live target. */
  setBlocks(blocks: WeaveTextBlock[]): void;
  getLayout(): TextLayout;
  /** Rendered width of a string (letter spacing included). */
  measure(text: string, font?: string): number;
  /** Local -> stage (container px) transform of the text box. */
  getAbsoluteTransform(): Konva.Transform;
  /** Offset of the first line inside the box (padding + vertical align). */
  getContentOffset(): Point;
  getSize(): { width: number; height: number };
  getFontSize(): number;
  /** Redraw the target after a change. */
  requestRedraw(): void;
  /** Optional: pre-compute layout within a budget; true when finished. */
  warmLayout?(blocks: WeaveTextBlock[], budgetMs: number): boolean;
}

export interface TextEditHost {
  utilityLayer: Konva.Layer | undefined;
  /** Element the hidden proxy textarea is attached to. */
  container: HTMLElement;
  clientToStage(clientX: number, clientY: number): Point;
  stageToContainer(point: Point): Point;
  /** Called with the caret in container px so the host can pan it into view. */
  revealCaret?(point: Point): void;
  caretColor: string;
  selectionColor: string;
  /** Outline of the text box while editing (screen px width). Omit to hide. */
  outlineColor?: string;
  outlineWidth?: number;
  /** Gap between box and outline (screen px). Default 0. */
  outlinePadding?: number;
  /** Select all content when the session starts (Figma-like). Default false. */
  selectAllOnStart?: boolean;
  /** Aborts the session listeners (e.g. instance teardown). */
  signal?: AbortSignal;
  /** Rich text commands, shortcuts and list key rules are active. */
  richText?: boolean;
  /** Selection, caret or content changed (not throttled). */
  onSelectionChange?(): void;
  /** A format command, undo or redo ran. */
  onFormatChange?(reason: 'command' | 'undo' | 'redo'): void;
  /** Content changed (live; not yet committed). */
  onChange?(blocks: WeaveTextBlock[]): void;
  /** User asked to leave edit mode. */
  onRequestExit(reason: 'escape' | 'outside'): void;
}

/** Pastes above this many characters are laid out in time slices. */
export const BULK_PASTE_THRESHOLD = 20000;
const SLICE_BUDGET_MS = 8;
const BLINK_MS = 530;

type WeaveWindow = Window & { weaveTextEditing?: Record<string, string> };

export class TextEditSession {
  readonly model: TextEditModel;
  private readonly target: TextEditTarget;
  private readonly host: TextEditHost;
  private readonly id: string;
  private readonly abort = new AbortController();

  private textarea: HTMLTextAreaElement | null = null;
  private overlay: Konva.Shape | null = null;
  private blinkTimer: ReturnType<typeof setInterval> | undefined;
  private caretOn = true;
  private dragging = false;
  private composing = false;
  private pendingTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingFlush = false;
  private destroyed = false;
  private readonly initialJson: string;

  constructor(
    target: TextEditTarget,
    host: TextEditHost,
    id = 'text-edit-session'
  ) {
    this.target = target;
    this.host = host;
    this.id = id;
    this.model = new TextEditModel(target.getBlocks());
    this.initialJson = JSON.stringify(this.model.getBlocks());
  }

  // ---- lifecycle -----------------------------------------------------------

  start() {
    const signal = this.abort.signal;
    host_signal(this.host.signal, this.abort);

    this.createTextarea();
    this.createOverlay();

    const ta = this.textarea!;
    const opts = { signal };

    ta.addEventListener('keydown', this.onKeyDown, opts);
    ta.addEventListener('keyup', this.onKeyUp, opts);
    ta.addEventListener('beforeinput', this.onBeforeInput, opts);
    ta.addEventListener('input', this.onInput, opts);
    ta.addEventListener('paste', this.onPaste, opts);
    ta.addEventListener('compositionstart', this.onCompositionStart, opts);
    ta.addEventListener('compositionend', this.onCompositionEnd, opts);
    ta.addEventListener('select', this.syncFromTextarea, opts);
    ta.ownerDocument.addEventListener(
      'selectionchange',
      this.syncFromTextarea,
      opts
    );

    // Capture so Konva/tools never see gestures meant for the editor.
    window.addEventListener('pointerdown', this.onPointerDown, {
      signal,
      capture: true,
    });
    window.addEventListener('pointermove', this.onPointerMove, { signal });
    // Entered with the mouse over the node (double click, new text): the
    // I-beam shows before the first move.
    this.host.container.style.cursor = 'text';
    window.addEventListener('pointerup', this.onPointerUp, { signal });
    window.addEventListener('mousedown', this.onMouseDown, {
      signal,
      capture: true,
    });

    (window as WeaveWindow).weaveTextEditing = {
      ...(window as WeaveWindow).weaveTextEditing,
      [this.id]: this.id,
    };

    if (this.host.selectAllOnStart) this.model.selectAll();
    this.syncTextarea();
    ta.focus({ preventScroll: true });
    this.positionTextarea();
    this.startBlink();
    this.repaint();
  }

  /** Final content and whether it differs from when the session started. */
  getResult(): { blocks: WeaveTextBlock[]; changed: boolean } {
    return {
      blocks: this.model.getBlocks(),
      changed: JSON.stringify(this.model.getBlocks()) !== this.initialJson,
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.flushPending();
    this.abort.abort();
    clearInterval(this.blinkTimer);
    clearTimeout(this.pendingTimer);
    if (this.host.container.style.cursor === 'text') {
      this.host.container.style.cursor = 'default';
    }
    this.textarea?.remove();
    this.textarea = null;
    const layer = this.overlay?.getLayer();
    this.overlay?.destroy();
    this.overlay = null;
    layer?.batchDraw();
    const w = window as WeaveWindow;
    if (w.weaveTextEditing) {
      delete w.weaveTextEditing[this.id];
    }
  }

  focus() {
    this.textarea?.focus({ preventScroll: true });
  }

  // ---- proxy textarea ------------------------------------------------------

  private createTextarea() {
    const ta = this.host.container.ownerDocument.createElement('textarea');
    ta.setAttribute('autocapitalize', 'off');
    ta.setAttribute('autocomplete', 'off');
    ta.setAttribute('autocorrect', 'off');
    ta.setAttribute('spellcheck', 'false');
    ta.setAttribute('wrap', 'off');
    ta.setAttribute('aria-label', 'Text editor');
    ta.tabIndex = 1;
    Object.assign(ta.style, {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: '1px',
      height: '1em',
      margin: '0',
      padding: '0',
      border: '0',
      outline: 'none',
      resize: 'none',
      overflow: 'hidden',
      whiteSpace: 'pre',
      opacity: '0',
      // >=16px avoids iOS zoom on focus.
      fontSize: '16px',
      background: 'transparent',
      color: 'transparent',
      caretColor: 'transparent',
      pointerEvents: 'none',
      zIndex: '1',
    } as Partial<CSSStyleDeclaration>);
    this.host.container.appendChild(ta);
    this.textarea = ta;
  }

  private syncTextarea() {
    const ta = this.textarea;
    if (!ta || this.composing) return;
    const text = this.model.getText();
    if (ta.value !== text) ta.value = text;
    const { start, end } = this.model.getSelection();
    const backward = this.model.focus < this.model.anchor;
    if (ta.selectionStart !== start || ta.selectionEnd !== end) {
      ta.setSelectionRange(start, end, backward ? 'backward' : 'forward');
    }
  }

  private positionTextarea() {
    const ta = this.textarea;
    if (!ta) return;
    const c = this.caretStagePoint();
    const p = this.host.stageToContainer(c);
    this.host.revealCaret?.(p);
    // Keep the proxy inside the container: a focused textarea outside it makes
    // the browser scroll the container to reveal it, shifting the whole canvas
    // when the caret leaves the viewport.
    const box = this.host.container;
    const maxX = Math.max(0, (box.clientWidth || Infinity) - 2);
    const maxY = Math.max(0, (box.clientHeight || Infinity) - 20);
    ta.style.left = `${Math.min(Math.max(p.x, 0), maxX)}px`;
    ta.style.top = `${Math.min(Math.max(p.y, 0), maxY)}px`;
  }

  private caretStagePoint(): Point {
    const layout = this.target.getLayout();
    const r = caretRect(layout, this.model.focus, this.target.measure);
    const o = this.target.getContentOffset();
    return this.target
      .getAbsoluteTransform()
      .point({ x: r.x + o.x, y: r.y + o.y });
  }

  private syncFromTextarea = () => {
    const ta = this.textarea;
    if (!ta || this.composing || this.destroyed) return;
    const root = ta.getRootNode() as Document | ShadowRoot;
    if (root.activeElement !== ta) return;
    if (ta.value !== this.model.getText()) return; // input handler owns this
    const backward = ta.selectionDirection === 'backward';
    const a = backward ? ta.selectionEnd : ta.selectionStart;
    const f = backward ? ta.selectionStart : ta.selectionEnd;
    if (a !== this.model.anchor || f !== this.model.focus) {
      this.model.setSelection(a, f);
      this.afterSelectionChange();
    }
  };

  // ---- keyboard ------------------------------------------------------------

  /** Keys the session handles itself; everything else stays native. */
  private handleSessionKey(e: KeyboardEvent): boolean {
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    const isUndo = mod && key === 'z' && !e.shiftKey;
    const isRedo = mod && (key === 'y' || (key === 'z' && e.shiftKey));

    if (e.key === 'Escape') this.host.onRequestExit('escape');
    else if (isUndo) this.undo();
    else if (isRedo) this.redo();
    else if (this.handleRichKey(e, mod, key)) return true;
    else if (e.key === 'Tab') return true;
    else return false;
    return true;
  }

  /** Format shortcuts and list key rules; only when rich text is enabled. */
  private handleRichKey(e: KeyboardEvent, mod: boolean, key: string): boolean {
    if (!this.host.richText) return false;
    if (mod && !e.shiftKey && !e.altKey) {
      const marks: Record<string, WeaveTextMarkKey> = {
        b: 'bold',
        i: 'italic',
        u: 'underline',
      };
      if (marks[key]) {
        this.toggleMark(marks[key]);
        return true;
      }
    }
    if (mod || this.composing) return false;
    if (e.key === 'Tab') {
      if (e.shiftKey) this.outdent();
      else this.indent();
      return true;
    }
    if (e.key === 'Enter') {
      if (this.model.enter()) this.afterFormat('command', true);
      return true;
    }
    if (e.key === 'Backspace' && this.model.backspaceInList()) {
      this.afterFormat('command', true);
      return true;
    }
    return false;
  }

  private handleNavigationKey(e: KeyboardEvent): boolean {
    const mod = e.ctrlKey || e.metaKey;
    if (mod) return false;
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.altKey) {
      this.moveVertically(e.key === 'ArrowUp' ? -1 : 1, e.shiftKey);
      return true;
    }
    if (e.key === 'Home' || e.key === 'End') {
      const layout = this.target.getLayout();
      const to =
        e.key === 'Home'
          ? lineHome(layout, this.model.focus)
          : lineEnd(layout, this.model.focus);
      this.model.moveTo(to, e.shiftKey);
      this.afterSelectionChange();
      return true;
    }
    return false;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    // The app listens for keys on `document` (e.g. undo): the editor must be
    // the only consumer while it has focus.
    e.stopPropagation();

    if (this.handleSessionKey(e)) {
      e.preventDefault();
      return;
    }
    if (this.composing) return;
    if (this.handleNavigationKey(e)) {
      e.preventDefault();
      return;
    }
    // Everything else (typing, left/right, word moves, select-all, copy,
    // cut) is native on the proxy; selection is mirrored after it ran.
    setTimeout(this.syncFromTextarea, 0);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    e.stopPropagation();
    this.syncFromTextarea();
  };

  private onBeforeInput = (e: InputEvent) => {
    // Native undo/redo would diverge from the session history.
    if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
      e.preventDefault();
    }
  };

  private moveVertically(dir: -1 | 1, extend: boolean) {
    const layout = this.target.getLayout();
    this.model.desiredX ??= caretRect(
      layout,
      this.model.focus,
      this.target.measure
    ).x;
    const to = moveVertical(
      layout,
      this.model.focus,
      dir,
      this.model.desiredX,
      this.target.measure
    );
    this.model.moveTo(to, extend, true);
    this.afterSelectionChange();
  }

  // ---- input / IME / clipboard --------------------------------------------

  private onInput = (e: Event) => {
    const ta = this.textarea;
    if (!ta) return;
    const oldText = this.model.getText();
    const newText = ta.value;
    if (oldText === newText) return;

    let p = 0;
    const max = Math.min(oldText.length, newText.length);
    while (p < max && oldText[p] === newText[p]) p++;
    let s = 0;
    while (
      s < max - p &&
      oldText[oldText.length - 1 - s] === newText[newText.length - 1 - s]
    ) {
      s++;
    }
    let inserted = newText.slice(p, newText.length - s);
    // A pure insertion is ambiguous when it repeats the text next to it (e.g.
    // a new line before an existing one): anchor it at the caret instead.
    if (s + p === oldText.length && inserted !== '') {
      const q = ta.selectionEnd - inserted.length;
      if (
        q >= 0 &&
        q < p &&
        newText.slice(q, q + inserted.length) === inserted &&
        oldText.slice(0, q) + inserted + oldText.slice(q) === newText
      ) {
        s = oldText.length - q;
        p = q;
        inserted = newText.slice(p, newText.length - s);
      }
    }
    const inputType = (e as InputEvent).inputType ?? '';
    const kind = this.editKindFor(inputType);

    this.model.replaceRange(p, oldText.length - s, inserted, kind);
    // Keep the caret the browser computed (mid-composition, mid-text).
    this.model.anchor = this.model.focus = Math.min(
      ta.selectionEnd,
      this.model.getText().length
    );
    this.afterContentChange(inserted.length);
  };

  private editKindFor(inputType: string): EditKind {
    if (this.composing || inputType.includes('Composition')) return 'ime';
    if (inputType.startsWith('delete')) return 'delete';
    if (inputType === 'insertFromPaste') return 'paste';
    return 'type';
  }

  private onPaste = (e: ClipboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const raw = e.clipboardData?.getData('text/plain') ?? '';
    if (raw === '') return;
    this.insertText(raw.replace(/\r\n?/g, '\n'), 'paste');
  };

  private onCompositionStart = () => {
    this.composing = true;
    this.model.beginComposition();
  };

  private onCompositionEnd = () => {
    this.composing = false;
    this.model.endComposition();
    this.syncFromTextarea();
  };

  /** Programmatic insert at the selection (paste, tests, host actions). */
  insertText(text: string, kind: EditKind = 'paste') {
    if (this.model.replaceSelection(text, kind)) {
      this.syncTextarea();
      this.afterContentChange(text.length);
    }
  }

  undo() {
    this.flushPending();
    if (this.model.undo()) {
      this.syncTextarea();
      this.afterContentChange(0, true);
      this.host.onFormatChange?.('undo');
    }
  }

  redo() {
    this.flushPending();
    if (this.model.redo()) {
      this.syncTextarea();
      this.afterContentChange(0, true);
      this.host.onFormatChange?.('redo');
    }
  }

  // ---- format commands -----------------------------------------------------

  private afterFormat(reason: 'command', content = false) {
    this.flushPending();
    this.syncTextarea();
    if (content) this.afterContentChange(0, true);
    else this.applyContent();
    this.afterSelectionChange();
    this.host.onFormatChange?.(reason);
  }

  toggleMark(key: WeaveTextMarkKey) {
    if (this.model.toggleMark(key)) this.afterFormat('command');
  }

  setMark(key: WeaveTextMarkKey, value: unknown) {
    if (this.model.setMark(key, value)) this.afterFormat('command');
  }

  toggleList(kind: WeaveTextListKind) {
    if (this.model.toggleList(kind)) this.afterFormat('command');
  }

  setAlign(align: WeaveTextBlockAlign | undefined) {
    if (this.model.setAlign(align)) this.afterFormat('command');
  }

  indent() {
    if (this.model.indent()) this.afterFormat('command');
  }

  outdent() {
    if (this.model.outdent()) this.afterFormat('command');
  }

  getSelection(): { start: number; end: number } {
    return this.model.getSelection();
  }

  getFormat(): WeaveTextSelectionFormat {
    const { start, end } = this.model.getSelection();
    return getSelectionFormat(
      this.model.getBlocks(),
      start,
      end,
      this.target.getFontSize(),
      this.model.storedMarks
    );
  }

  // ---- pointer -------------------------------------------------------------

  private toLocal(e: PointerEvent | MouseEvent): Point {
    const stagePt = this.host.clientToStage(e.clientX, e.clientY);
    const inv = this.target.getAbsoluteTransform().copy().invert();
    const p = inv.point(stagePt);
    const o = this.target.getContentOffset();
    return { x: p.x - o.x, y: p.y - o.y };
  }

  private isInside(local: Point): boolean {
    const o = this.target.getContentOffset();
    const { width, height } = this.target.getSize();
    return (
      local.x + o.x >= 0 &&
      local.y + o.y >= 0 &&
      local.x + o.x <= width &&
      local.y + o.y <= height
    );
  }

  /**
   * True for pointer targets inside an element the app marked with
   * `data-weave-text-edit-keep` (e.g. a formatting toolbar): they neither
   * end the session nor, unless they are form fields, steal focus.
   */
  private isKeepTarget(e: Event): boolean {
    const t = e.target;
    return (
      typeof Element !== 'undefined' &&
      t instanceof Element &&
      !!t.closest('[data-weave-text-edit-keep]')
    );
  }

  private onMouseDown = (e: MouseEvent) => {
    if (this.isKeepTarget(e)) {
      const t = e.target as Element;
      if (!t.closest('input, textarea, select, [contenteditable="true"]')) {
        e.preventDefault(); // keep focus on the proxy textarea
      }
      return;
    }
    if (this.isInside(this.toLocal(e))) e.preventDefault(); // keep focus
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (this.textarea && e.target === this.textarea) return;
    if (this.isKeepTarget(e)) return;
    const local = this.toLocal(e);
    if (!this.isInside(local)) {
      e.stopPropagation();
      this.host.onRequestExit('outside');
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    const layout = this.target.getLayout();
    const offset = offsetFromPoint(layout, local, this.target.measure);
    const text = this.model.getText();
    const clicks = this.countClicks(e);
    if (clicks >= 3) {
      const [s, en] = paragraphRangeAt(text, offset);
      this.model.setSelection(s, en);
    } else if (clicks === 2) {
      const [s, en] = wordRangeAt(text, offset);
      this.model.setSelection(s, en);
    } else {
      this.model.moveTo(offset, e.shiftKey);
      this.dragging = true;
    }
    this.syncTextarea();
    this.afterSelectionChange();
    this.textarea?.focus({ preventScroll: true });
  };

  private lastClick = { t: 0, x: 0, y: 0, n: 0 };

  /**
   * Browsers report `detail` as 0 on pointerdown, so multi-click is counted
   * here (same spot, within 500 ms). A real `detail` still wins.
   */
  private countClicks(e: PointerEvent): number {
    const now = e.timeStamp || Date.now();
    const l = this.lastClick;
    const near =
      now - l.t < 500 &&
      Math.hypot(e.clientX - l.x, e.clientY - l.y) < 5 &&
      l.n > 0;
    const n = Math.max(e.detail, near ? l.n + 1 : 1);
    this.lastClick = { t: now, x: e.clientX, y: e.clientY, n: n >= 3 ? 0 : n };
    return n;
  }

  /**
   * I-beam over the text box, like a text field. The canvas has no element to
   * give the browser a cursor, so it is set on the stage container; anything
   * outside the box (where a click leaves edit mode) gets the default one.
   */
  private updateCursor(e: PointerEvent) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (this.isKeepTarget(e)) return; // the host UI owns its own cursors
    const style = this.host.container.style;
    const over = this.dragging || this.isInside(this.toLocal(e));
    if (over) {
      if (style.cursor !== 'text') style.cursor = 'text';
    } else if (style.cursor === 'text') {
      style.cursor = 'default';
    }
  }

  private onPointerMove = (e: PointerEvent) => {
    this.updateCursor(e);
    if (!this.dragging) return;
    const local = this.toLocal(e);
    const offset = offsetFromPoint(
      this.target.getLayout(),
      local,
      this.target.measure
    );
    this.model.moveTo(offset, true);
    this.syncTextarea();
    this.afterSelectionChange();
  };

  private onPointerUp = () => {
    if (!this.dragging) return;
    this.dragging = false;
    this.textarea?.focus({ preventScroll: true });
  };

  // ---- change propagation --------------------------------------------------

  private afterSelectionChange() {
    this.syncTextarea();
    this.positionTextarea();
    this.resetBlink();
    this.repaint();
    this.host.onSelectionChange?.();
  }

  private afterContentChange(insertedLength: number, immediate = false) {
    // A new edit while a bulk layout is pending applies right away.
    this.flushPending();
    const bulk =
      !immediate &&
      insertedLength > BULK_PASTE_THRESHOLD &&
      typeof this.target.warmLayout === 'function';
    if (bulk) {
      this.pendingFlush = true;
      this.sliceLayout();
    } else {
      this.applyContent();
    }
    this.resetBlink();
  }

  private sliceLayout = () => {
    if (!this.pendingFlush || this.destroyed) return;
    const done = this.target.warmLayout!(
      this.model.getBlocks(),
      SLICE_BUDGET_MS
    );
    if (done) {
      this.flushPending();
    } else {
      this.pendingTimer = setTimeout(this.sliceLayout, 0);
    }
  };

  private flushPending() {
    if (!this.pendingFlush) return;
    this.pendingFlush = false;
    clearTimeout(this.pendingTimer);
    this.applyContent();
  }

  private applyContent() {
    this.target.setBlocks(this.model.getBlocks());
    this.host.onChange?.(this.model.getBlocks());
    this.host.onSelectionChange?.();
    this.positionTextarea();
    this.target.requestRedraw();
    this.repaint();
  }

  // ---- painting ------------------------------------------------------------

  private createOverlay() {
    const layer = this.host.utilityLayer;
    if (!layer) return;
    const overlay = new Konva.Shape({
      name: 'text-v2-edit-overlay',
      listening: false,
      sceneFunc: (ctx, shape) => this.paintOverlay(ctx, shape),
    });
    layer.add(overlay);
    overlay.moveToTop();
    this.overlay = overlay;
  }

  private paintOverlay(ctx: Konva.Context, shape: Konva.Shape) {
    if (this.destroyed || this.pendingFlush) return;
    const layout = this.target.getLayout();
    const abs = this.target.getAbsoluteTransform();
    const rel = shape.getAbsoluteTransform().copy().invert().multiply(abs);
    const o = this.target.getContentOffset();

    ctx.save();
    ctx.transform(rel.m[0], rel.m[1], rel.m[2], rel.m[3], rel.m[4], rel.m[5]);

    if (this.host.outlineColor) {
      const scale = Math.hypot(abs.m[0], abs.m[1]) || 1;
      const lw = (this.host.outlineWidth ?? 1) / scale;
      const { width, height } = this.target.getSize();
      ctx.setAttr('strokeStyle', this.host.outlineColor);
      ctx.setAttr('lineWidth', lw);
      ctx.beginPath();
      const pad = (this.host.outlinePadding ?? 0) / scale;
      ctx.rect(-pad, -pad, width + pad * 2, height + pad * 2);
      ctx.stroke();
    }
    ctx.translate(o.x, o.y);

    const { start, end } = this.model.getSelection();
    if (start !== end) {
      ctx.setAttr('fillStyle', this.host.selectionColor);
      for (const r of selectionRects(layout, start, end, this.target.measure)) {
        ctx.fillRect(r.x, r.y, r.width, r.height);
      }
    } else if (this.caretOn) {
      const c = caretRect(layout, this.model.focus, this.target.measure);
      const scale = Math.hypot(abs.m[0], abs.m[1]) || 1;
      const w = Math.max(1, 1.5) / scale;
      ctx.setAttr('fillStyle', this.host.caretColor);
      ctx.fillRect(c.x - w / 2, c.y, w, c.height);
    }
    ctx.restore();
  }

  private repaint() {
    this.overlay?.getLayer()?.batchDraw();
  }

  private startBlink() {
    this.blinkTimer = setInterval(() => {
      this.caretOn = !this.caretOn;
      this.repaint();
    }, BLINK_MS);
  }

  private resetBlink() {
    this.caretOn = true;
    if (this.blinkTimer) {
      clearInterval(this.blinkTimer);
      this.startBlink();
    }
  }
}

function host_signal(signal: AbortSignal | undefined, abort: AbortController) {
  if (!signal) return;
  if (signal.aborted) abort.abort();
  else signal.addEventListener('abort', () => abort.abort(), { once: true });
}
