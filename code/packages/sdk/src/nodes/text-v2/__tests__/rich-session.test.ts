// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import Konva from 'konva';
import { WeaveTextV2Shape } from '../shape';
import {
  TextEditSession,
  type TextEditHost,
  type TextEditTarget,
} from '../edit/session';
import { WEAVE_TEXT_MIME, type WeaveTextBlock } from '../model';

function setup(blocks: WeaveTextBlock[], richText: boolean) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const stage = new Konva.Stage({ container, width: 400, height: 200 });
  const main = new Konva.Layer();
  stage.add(main, new Konva.Layer());
  const shape = new WeaveTextV2Shape({
    fontSize: 20,
    fontFamily: 'sans-serif',
    width: 300,
  });
  shape.setBlocks(blocks);
  main.add(shape);
  const target: TextEditTarget = {
    getBlocks: () => shape.getBlocks(),
    setBlocks: (b) => shape.setBlocks(b),
    getLayout: () => shape.ensureLayout(),
    measure: (t, f) => shape.measureText(t, f),
    getAbsoluteTransform: () => shape.getAbsoluteTransform(),
    getContentOffset: () => shape.getContentOffset(),
    getSize: () => ({ width: shape.getWidth(), height: shape.getHeight() }),
    getFontSize: () => shape.fontSize(),
    requestRedraw: () => main.batchDraw(),
  };
  const events: string[] = [];
  const host: TextEditHost = {
    utilityLayer: undefined,
    container,
    clientToStage: (x, y) => ({ x, y }),
    stageToContainer: (p) => p,
    caretColor: '#000',
    selectionColor: '#00f',
    richText,
    onFormatChange: (r) => events.push(r),
    onRequestExit: () => {},
  };
  const session = new TextEditSession(target, host, 'r1');
  session.start();
  const ta = container.querySelector('textarea') as HTMLTextAreaElement;
  return { container, shape, session, ta, events };
}

let live: ReturnType<typeof setup>[] = [];
const make = (b: WeaveTextBlock[], rich = true) => {
  const c = setup(b, rich);
  live.push(c);
  return c;
};
afterEach(() => {
  live.forEach((c) => {
    c.session.destroy();
    c.container.remove();
  });
  live = [];
});

const key = (c: ReturnType<typeof setup>, k: string, init = {}) => {
  const e = new KeyboardEvent('keydown', {
    key: k,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  c.ta.dispatchEvent(e);
  return e;
};

describe('rich text session', () => {
  it('Ctrl+B bolds the selection as one undo entry', () => {
    const c = make([{ runs: [{ t: 'hello' }] }]);
    c.session.model.setSelection(0, 5);
    key(c, 'b', { ctrlKey: true });
    expect(c.session.model.getBlocks()[0].runs[0].m).toEqual({ bold: true });
    expect(c.events).toEqual(['command']);
    c.session.undo();
    expect(c.session.model.getBlocks()[0].runs[0].m).toBeUndefined();
    expect(c.events).toEqual(['command', 'undo']);
  });

  it('stored marks apply to typing at a collapsed caret', () => {
    const c = make([{ runs: [{ t: 'ab' }] }]);
    c.session.model.setSelection(2, 2);
    key(c, 'b', { ctrlKey: true });
    c.ta.value = 'abX';
    c.ta.setSelectionRange(3, 3);
    c.ta.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
    expect(c.session.model.getBlocks()[0].runs).toEqual([
      { t: 'ab' },
      { t: 'X', m: { bold: true } },
    ]);
  });

  it('Enter continues a list item and exits on an empty one', () => {
    const c = make([{ kind: 'ul', runs: [{ t: 'a' }] }]);
    c.session.model.setSelection(1, 1);
    key(c, 'Enter');
    let b = c.session.model.getBlocks();
    expect(b).toHaveLength(2);
    expect(b[1].kind).toBe('ul');
    key(c, 'Enter');
    b = c.session.model.getBlocks();
    expect(b[1].kind).toBeUndefined();
  });

  it('Tab / Shift+Tab change depth; Backspace at start outdents', () => {
    const c = make([{ kind: 'ol', runs: [{ t: 'a' }] }]);
    c.session.model.setSelection(0, 0);
    key(c, 'Tab');
    expect(c.session.model.getBlocks()[0].depth).toBe(1);
    key(c, 'Tab', { shiftKey: true });
    expect(c.session.model.getBlocks()[0].depth).toBeUndefined();
    key(c, 'Backspace');
    expect(c.session.model.getBlocks()[0].kind).toBeUndefined();
  });

  it('disabled: shortcuts and list rules are inactive, keydown stays stopped', () => {
    const c = make([{ kind: 'ul', runs: [{ t: 'a' }] }], false);
    c.session.model.setSelection(0, 1);
    key(c, 'b', { ctrlKey: true });
    expect(c.session.model.getBlocks()[0].runs[0].m).toBeUndefined();
    const e = key(c, 'Tab');
    expect(e.defaultPrevented).toBe(true);
    expect(c.session.model.getBlocks()[0].depth).toBeUndefined();
    let reached = false;
    document.addEventListener('keydown', () => (reached = true), {
      once: true,
    });
    key(c, 'z', { ctrlKey: true });
    expect(reached).toBe(false);
  });

  it('flag off: Enter in a list item copies kind and depth', () => {
    const c = make([{ kind: 'ul', depth: 1, runs: [{ t: 'ab' }] }], false);
    c.ta.value = 'a\nb';
    c.ta.setSelectionRange(2, 2);
    c.ta.dispatchEvent(
      new InputEvent('input', { inputType: 'insertLineBreak' })
    );
    const b = c.session.model.getBlocks();
    expect(b[1]).toMatchObject({ kind: 'ul', depth: 1 });
  });

  it('paste inherits caret marks', () => {
    const c = make([{ runs: [{ t: 'ab', m: { bold: true } }] }]);
    c.session.model.setSelection(1, 1);
    c.session.insertText('ZZ');
    expect(c.session.model.getBlocks()[0].runs).toEqual([
      { t: 'aZZb', m: { bold: true } },
    ]);
  });

  it('reports the selection format', () => {
    const c = make([{ runs: [{ t: 'ab', m: { bold: true } }, { t: 'cd' }] }]);
    c.session.model.setSelection(0, 4);
    expect(c.session.getFormat().bold.state).toBe('some');
    c.session.model.setSelection(0, 2);
    expect(c.session.getFormat().bold.state).toBe('all');
  });
});

describe('Enter regressions', () => {
  const enterAtEndOfFirst = (c: ReturnType<typeof setup>) => {
    c.session.model.setSelection(6, 6);
    c.ta.value = 'Item A\n\nPlain B';
    c.ta.setSelectionRange(7, 7);
    c.ta.dispatchEvent(
      new InputEvent('input', { inputType: 'insertLineBreak' })
    );
  };

  it('flag off: Enter before another block keeps kind and depth', () => {
    const c = make(
      [
        { kind: 'ul', depth: 1, runs: [{ t: 'Item A' }] },
        { runs: [{ t: 'Plain B' }] },
      ],
      false
    );
    enterAtEndOfFirst(c);
    const b = c.session.model.getBlocks();
    expect(b.map((x) => [x.kind ?? null, x.depth ?? 0])).toEqual([
      ['ul', 1],
      ['ul', 1],
      [null, 0],
    ]);
  });

  it('Enter continues the marks of the previous text', () => {
    const c = make([
      { runs: [{ t: 'bold', m: { bold: true, link: 'https://a.b' } }] },
    ]);
    c.session.model.setSelection(4, 4);
    c.ta.value = 'bold\n';
    c.ta.setSelectionRange(5, 5);
    c.ta.dispatchEvent(
      new InputEvent('input', { inputType: 'insertLineBreak' })
    );
    c.ta.value = 'bold\nx';
    c.ta.setSelectionRange(6, 6);
    c.ta.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
    const b = c.session.model.getBlocks();
    expect(b[1].runs).toEqual([{ t: 'x', m: { bold: true } }]);
  });
});

describe('edit cursor', () => {
  const move = (x: number, y: number, init: PointerEventInit = {}) => {
    const e = new MouseEvent('pointermove', {
      clientX: x,
      clientY: y,
      bubbles: true,
      ...init,
    });
    Object.defineProperty(e, 'pointerType', {
      value: init.pointerType ?? 'mouse',
    });
    window.dispatchEvent(e);
  };

  it('shows the text cursor over the box, the default one outside', () => {
    const c = make([{ runs: [{ t: 'hello' }] }]);
    const style = c.container.style;
    expect(style.cursor).toBe('text'); // set on entry
    move(2000, 2000); // far outside the 300px wide box
    expect(style.cursor).toBe('default');
    move(10, 5);
    expect(style.cursor).toBe('text');
  });

  it('keeps it while dragging a selection outside the box', () => {
    const c = make([{ runs: [{ t: 'hello' }] }]);
    const down = new MouseEvent('pointerdown', {
      clientX: 10,
      clientY: 5,
      bubbles: true,
      button: 0,
    });
    Object.defineProperty(down, 'pointerType', { value: 'mouse' });
    window.dispatchEvent(down);
    move(2000, 2000);
    expect(c.container.style.cursor).toBe('text');
    window.dispatchEvent(new MouseEvent('pointerup'));
    move(2000, 2000);
    expect(c.container.style.cursor).toBe('default');
  });

  it('leaves the cursor to the host UI over keep-targets and for touch', () => {
    const c = make([{ runs: [{ t: 'hello' }] }]);
    const keep = document.createElement('div');
    keep.setAttribute('data-weave-text-edit-keep', '');
    document.body.appendChild(keep);
    c.container.style.cursor = 'text';
    const e = new MouseEvent('pointermove', {
      clientX: 2000,
      clientY: 2000,
      bubbles: true,
    });
    Object.defineProperty(e, 'pointerType', { value: 'mouse' });
    keep.dispatchEvent(e);
    expect(c.container.style.cursor).toBe('text');
    c.container.style.cursor = 'grab';
    move(10, 5, { pointerType: 'touch' });
    expect(c.container.style.cursor).toBe('grab');
    keep.remove();
  });

  it('restores the default cursor when the session ends', () => {
    const c = make([{ runs: [{ t: 'hello' }] }]);
    c.session.destroy();
    expect(c.container.style.cursor).toBe('default');
  });

  it('does not overwrite a cursor set by someone else after the session', () => {
    const c = make([{ runs: [{ t: 'hello' }] }]);
    c.container.style.cursor = 'grab';
    c.session.destroy();
    expect(c.container.style.cursor).toBe('grab');
  });

  describe('rich clipboard', () => {
    const clip = (c: ReturnType<typeof setup>, type: 'copy' | 'cut') => {
      const store: Record<string, string> = {};
      const e = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(e, 'clipboardData', {
        value: { setData: (k: string, v: string) => (store[k] = v) },
      });
      c.ta.dispatchEvent(e);
      return { e, store };
    };
    const paste = (
      c: ReturnType<typeof setup>,
      data: Record<string, string>
    ) => {
      const e = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(e, 'clipboardData', {
        value: { getData: (k: string) => data[k] ?? '' },
      });
      c.ta.dispatchEvent(e);
      return e;
    };
    const src: WeaveTextBlock[] = [
      { runs: [{ t: 'ab', m: { bold: true } }, { t: 'cd' }] },
      { kind: 'ul', runs: [{ t: 'ef' }] },
    ];

    it('copy writes plain text and weave payload', () => {
      const c = make(src);
      c.session.model.setSelection(1, 7);
      const { e, store } = clip(c, 'copy');
      expect(e.defaultPrevented).toBe(true);
      expect(store['text/plain']).toBe('bcd\nef');
      expect(JSON.parse(store[WEAVE_TEXT_MIME]).blocks).toHaveLength(2);
    });

    it('copy with empty selection or rich off is left native', () => {
      const c = make(src);
      c.session.model.setSelection(2, 2);
      expect(clip(c, 'copy').e.defaultPrevented).toBe(false);
      const p = make(src, false);
      p.session.model.setSelection(0, 3);
      expect(clip(p, 'copy').e.defaultPrevented).toBe(false);
    });

    it('cut copies then deletes, undoable', () => {
      const c = make(src);
      c.session.model.setSelection(0, 2);
      const { store } = clip(c, 'cut');
      expect(store['text/plain']).toBe('ab');
      expect(c.session.model.getText()).toBe('cd\nef');
      c.session.undo();
      expect(c.session.model.getText()).toBe('abcd\nef');
    });

    it('paste of weave payload keeps marks and structure; one undo', () => {
      const a = make(src);
      a.session.model.setSelection(1, 7);
      const { store } = clip(a, 'copy');
      const b = make([{ runs: [{ t: 'xy' }] }]);
      b.session.model.setSelection(1, 1);
      const e = paste(b, { [WEAVE_TEXT_MIME]: store[WEAVE_TEXT_MIME] });
      expect(e.defaultPrevented).toBe(true);
      const blocks = b.session.model.getBlocks();
      expect(blocks).toHaveLength(2);
      expect(blocks[0].runs.map((r) => r.t)).toEqual(['x', 'b', 'cd']);
      expect(blocks[0].runs[1].m).toEqual({ bold: true });
      expect(blocks[1].kind).toBe('ul');
      expect(b.session.model.getText()).toBe('xbcd\nefy');
      b.session.undo();
      expect(b.session.model.getText()).toBe('xy');
    });

    it('invalid payload or rich off falls back to plain text', () => {
      const c = make([{ runs: [{ t: 'x' }] }]);
      c.session.model.setSelection(1, 1);
      paste(c, { [WEAVE_TEXT_MIME]: 'garbage', 'text/plain': 'P' });
      expect(c.session.model.getText()).toBe('xP');
      const p = make([{ runs: [{ t: 'x' }] }], false);
      p.session.model.setSelection(1, 1);
      paste(p, {
        [WEAVE_TEXT_MIME]: JSON.stringify({
          v: 1,
          blocks: [{ runs: [{ t: 'Z' }] }],
        }),
        'text/plain': 'Q',
      });
      expect(p.session.model.getText()).toBe('xQ');
    });
  });
});
