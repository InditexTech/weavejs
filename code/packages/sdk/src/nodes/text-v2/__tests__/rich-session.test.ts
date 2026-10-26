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
import type { WeaveTextBlock } from '../model';

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
