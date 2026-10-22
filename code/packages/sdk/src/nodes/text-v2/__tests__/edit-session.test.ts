// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import Konva from 'konva';
import { WeaveTextV2Shape } from '../shape';
import {
  BULK_PASTE_THRESHOLD,
  TextEditSession,
  type TextEditHost,
  type TextEditTarget,
} from '../edit/session';

type Ctx = ReturnType<typeof setup>;

function setup(text = 'Hello world', extra: Konva.ShapeConfig = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const stage = new Konva.Stage({ container, width: 400, height: 200 });
  const main = new Konva.Layer();
  const utility = new Konva.Layer();
  stage.add(main, utility);
  const shape = new WeaveTextV2Shape({
    text,
    fontSize: 20,
    fontFamily: 'sans-serif',
    fill: '#000000',
    x: 10,
    y: 10,
    width: 300,
    ...extra,
  });
  main.add(shape);

  const target: TextEditTarget = {
    getBlocks: () => shape.getBlocks(),
    setBlocks: (b) => shape.setBlocks(b),
    getLayout: () => shape.ensureLayout(),
    measure: (t) => shape.measureText(t),
    getAbsoluteTransform: () => shape.getAbsoluteTransform(),
    getContentOffset: () => shape.getContentOffset(),
    getSize: () => ({ width: shape.getWidth(), height: shape.getHeight() }),
    getFontSize: () => shape.fontSize(),
    requestRedraw: () => main.batchDraw(),
    warmLayout: (b, ms) => shape.warmLayout(b, ms),
  };
  const exits: string[] = [];
  const host: TextEditHost = {
    utilityLayer: utility,
    container,
    clientToStage: (x, y) => ({ x, y }),
    stageToContainer: (p) => p,
    caretColor: '#000000',
    selectionColor: 'rgba(0,0,255,0.3)',
    outlineColor: '#ff0000',
    outlineWidth: 2,
    onRequestExit: (r) => exits.push(r),
  };
  const session = new TextEditSession(target, host, 'n1');
  session.start();
  const ta = container.querySelector('textarea') as HTMLTextAreaElement;
  return { container, stage, main, utility, shape, session, ta, exits };
}

function type(c: Ctx, value: string, inputType = 'insertText', caret?: number) {
  c.ta.value = value;
  const pos = caret ?? value.length;
  c.ta.setSelectionRange(pos, pos);
  c.ta.dispatchEvent(new InputEvent('input', { inputType, bubbles: true }));
}

function key(c: Ctx, k: string, init: KeyboardEventInit = {}) {
  const e = new KeyboardEvent('keydown', {
    key: k,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  c.ta.dispatchEvent(e);
  return e;
}

let live: Ctx[] = [];
function make(text?: string, extra?: Konva.ShapeConfig) {
  const c = setup(text, extra);
  live.push(c);
  return c;
}
afterEach(() => {
  live.forEach((c) => {
    c.session.destroy();
    c.container.remove();
  });
  live = [];
  vi.useRealTimers();
});

describe('TextEditSession', () => {
  it('creates a focused proxy textarea and no DOM overlay mimicking text', () => {
    const c = make();
    expect(c.ta).toBeTruthy();
    expect(c.ta.value).toBe('Hello world');
    expect(document.activeElement).toBe(c.ta);
    expect(c.container.querySelectorAll('textarea')).toHaveLength(1);
    expect(c.utility.findOne('.text-v2-edit-overlay')).toBeTruthy();
    expect(c.ta.style.opacity).toBe('0');
    // editing flag exposed for app-level key handlers
    expect(
      Object.keys(
        (window as unknown as { weaveTextEditing: object }).weaveTextEditing
      )
    ).toContain('n1');
  });

  it('typing updates the shape live and coalesces into one undo step', () => {
    const c = make('ab');
    type(c, 'abc');
    type(c, 'abcd');
    expect(c.shape.text()).toBe('abcd');
    key(c, 'z', { ctrlKey: true });
    expect(c.shape.text()).toBe('ab');
    expect(c.ta.value).toBe('ab');
    key(c, 'y', { ctrlKey: true });
    expect(c.shape.text()).toBe('abcd');
    key(c, 'z', { metaKey: true });
    key(c, 'z', { metaKey: true, shiftKey: true });
    expect(c.shape.text()).toBe('abcd');
  });

  it('keydown never propagates to the document (app-level undo cannot fire)', () => {
    const c = make('ab');
    const seen: string[] = [];
    document.addEventListener('keydown', (e) => seen.push(e.key));
    for (const k of ['a', 'Enter', 'Backspace']) key(c, k);
    key(c, 'z', { ctrlKey: true });
    key(c, 'y', { ctrlKey: true });
    expect(seen).toEqual([]);
  });

  it('blocks native textarea undo/redo', () => {
    const c = make('ab');
    const e = new InputEvent('beforeinput', {
      inputType: 'historyUndo',
      cancelable: true,
      bubbles: true,
    });
    c.ta.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });

  it('delete and paste are separate undo entries; paste is one command', () => {
    const c = make('abcdef');
    type(c, 'abcde', 'deleteContentBackward');
    type(c, 'abcd', 'deleteContentBackward');
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', {
      value: { getData: () => 'X\r\nY\nZ' },
    });
    c.ta.dispatchEvent(paste);
    expect(c.shape.text()).toBe('abcdX\nY\nZ');
    expect(paste.defaultPrevented).toBe(true);
    key(c, 'z', { ctrlKey: true });
    expect(c.shape.text()).toBe('abcd');
    key(c, 'z', { ctrlKey: true });
    expect(c.shape.text()).toBe('abcdef');
  });

  it('IME composition is a single undo entry', () => {
    const c = make('');
    c.ta.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true })
    );
    type(c, 'に', 'insertCompositionText');
    type(c, 'にほ', 'insertCompositionText');
    type(c, '日本', 'insertCompositionText');
    c.ta.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true })
    );
    expect(c.shape.text()).toBe('日本');
    key(c, 'z', { ctrlKey: true });
    expect(c.shape.text()).toBe('');
  });

  it('ArrowUp/Down and Home/End navigate visually on wrapped text', () => {
    const c = make('aaa bbb ccc ddd', { width: 80 });
    const lines = c.shape.ensureLayout().lines;
    expect(lines.length).toBeGreaterThan(1);
    c.session.model.moveTo(1);
    const down = key(c, 'ArrowDown');
    expect(down.defaultPrevented).toBe(true);
    expect(c.session.model.focus).toBeGreaterThanOrEqual(lines[1].start);
    expect(c.session.model.focus).toBeLessThanOrEqual(lines[1].end);
    key(c, 'ArrowUp');
    expect(c.session.model.focus).toBeLessThanOrEqual(lines[0].end);
    key(c, 'End');
    expect(c.session.model.focus).toBe(lines[0].end);
    key(c, 'Home', { shiftKey: true });
    expect(c.session.model.getSelection()).toEqual({
      start: 0,
      end: lines[0].end,
    });
    expect(c.ta.selectionStart).toBe(0);
    expect(c.ta.selectionEnd).toBe(lines[0].end);
  });

  it('click, drag, double and triple click select via pointer', () => {
    const c = make('hello brave world\nsecond', { width: 400 });
    const mid = (off: number) => {
      const r = c.shape.measureText('hello brave world\nsecond'.slice(0, off));
      return 10 + r + 1;
    };
    const fire = (type: string, x: number, y: number, detail = 1) =>
      window.dispatchEvent(
        new MouseEvent(type, {
          clientX: x,
          clientY: y,
          detail,
          button: 0,
          bubbles: true,
          cancelable: true,
        })
      );
    fire('pointerdown', mid(8), 15, 1);
    expect(c.session.model.focus).toBe(8);
    fire('pointermove', mid(12), 15);
    fire('pointerup', mid(12), 15);
    expect(c.session.model.getSelection()).toEqual({ start: 8, end: 12 });
    fire('pointerdown', mid(8), 15, 2);
    expect(c.session.model.getSelectedText()).toBe('brave');
    fire('pointerdown', mid(8), 15, 3);
    expect(c.session.model.getSelectedText()).toBe('hello brave world');
  });

  it('pointer outside the node requests exit', () => {
    const c = make('hi');
    window.dispatchEvent(
      new MouseEvent('pointerdown', {
        clientX: 390,
        clientY: 190,
        button: 0,
        bubbles: true,
      })
    );
    expect(c.exits).toEqual(['outside']);
    key(c, 'Escape');
    expect(c.exits).toEqual(['outside', 'escape']);
  });

  it('paints caret and selection on the utility layer', () => {
    const c = make('Hello');
    const px = () => {
      c.utility.draw();
      const d = c.utility
        .getCanvas()
        ._canvas.getContext('2d')!
        .getImageData(0, 0, 400, 200).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
      return n;
    };
    const caretPx = px();
    expect(caretPx).toBeGreaterThan(5);
    c.session.model.setSelection(0, 5);
    expect(px()).toBeGreaterThan(caretPx + 500);
  });

  it('draws an outline of the box (fixed size) on the utility layer', () => {
    const c = make('Hi', { width: 200, height: 100 });
    c.utility.draw();
    const d = c.utility.getCanvas()._canvas.getContext('2d')!;
    // top edge of the box at stage (10,10)..(210,10): red pixels on it
    const px = d.getImageData(100, 10, 1, 1).data;
    const bottom = d.getImageData(100, 110, 1, 1).data;
    expect(px[3]).toBeGreaterThan(0);
    expect(bottom[3]).toBeGreaterThan(0);
  });

  it('result reports unchanged when content returns to the original', () => {
    const c = make('ab');
    expect(c.session.getResult().changed).toBe(false);
    type(c, 'abc');
    expect(c.session.getResult().changed).toBe(true);
    type(c, 'ab', 'deleteContentBackward');
    expect(c.session.getResult().changed).toBe(false);
  });

  it('bulk paste lays out in time slices, then applies once', async () => {
    const c = make('');
    const big = Array.from(
      { length: 4000 },
      (_, i) => `line number ${i} with some text`
    ).join('\n');
    expect(big.length).toBeGreaterThan(BULK_PASTE_THRESHOLD);
    const spy = vi.spyOn(c.shape, 'setBlocks');
    c.session.insertText(big);
    // model updated immediately, live shape deferred
    expect(c.session.model.getText()).toBe(big);
    await vi.waitFor(() => expect(c.shape.text()).toBe(big), { timeout: 5000 });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('a new edit during a pending bulk layout flushes immediately', async () => {
    const c = make('');
    const big = Array.from(
      { length: 4000 },
      (_, i) => `row ${i} ${'x'.repeat(i % 17)}`
    ).join('\n');
    c.session.insertText(big);
    type(c, big + '!');
    expect(c.shape.text()).toBe(big + '!');
  });

  it('destroy removes textarea, overlay and editing flag, and flushes content', () => {
    const c = make('ab');
    type(c, 'abc');
    c.session.destroy();
    expect(c.container.querySelector('textarea')).toBeNull();
    expect(c.utility.findOne('.text-v2-edit-overlay')).toBeUndefined();
    expect(
      (window as unknown as { weaveTextEditing: Record<string, string> })
        .weaveTextEditing.n1
    ).toBeUndefined();
    expect(c.shape.text()).toBe('abc');
  });
});
