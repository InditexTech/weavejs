// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import Konva from 'konva';
import { WeaveTextV2Node } from '../text-v2';
import { WeaveTextV2Shape } from '../shape';
import {
  WEAVE_STAGE_TEXT_EDITION_MODE,
  TEXT_LAYOUT,
} from '../../text/constants';
import { WEAVE_STAGE_DEFAULT_MODE } from '../../stage/constants';
import { augmentKonvaNodeClass } from '../../node';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

beforeAll(() => augmentKonvaNodeClass());

const cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup.splice(0).forEach((f) => f());
});

function setup(config?: object) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const stage = new Konva.Stage({ container, width: 400, height: 300 });
  const main = new Konva.Layer();
  const utility = new Konva.Layer();
  stage.add(main, utility);
  const modeSpy = vi.fn();
  (stage as unknown as { mode: unknown }).mode = modeSpy;

  const selection = {
    getTransformer: vi.fn().mockReturnValue({
      hide: vi.fn(),
      nodes: vi.fn(),
      forceUpdate: vi.fn(),
      getActiveAnchor: vi.fn(),
      keepRatio: vi.fn(),
    }),
    getHoverTransformer: vi.fn().mockReturnValue({
      nodes: vi.fn(),
      forceUpdate: vi.fn(),
      moveToTop: vi.fn(),
    }),
    getSelectedNodes: vi.fn().mockReturnValue([]),
    setSelectedNodes: vi.fn(),
    getSelectorConfig: vi.fn().mockReturnValue({}),
    isAreaSelecting: vi.fn().mockReturnValue(false),
    isDragging: vi.fn().mockReturnValue(false),
    isTransforming: vi.fn().mockReturnValue(false),
  };
  const events: [string, unknown][] = [];
  const instance = {
    getPlugin: vi
      .fn()
      .mockImplementation((n: string) =>
        n === 'nodesSelection' ? selection : undefined
      ),
    getStage: () => stage,
    getUtilityLayer: () => utility,
    emitEvent: vi.fn((name: string, payload: unknown) =>
      events.push([name, payload])
    ),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setMutexLock: vi.fn().mockReturnValue(true),
    releaseMutexLock: vi.fn(),
    updateNode: vi.fn(),
    addNode: vi.fn(),
    disablePlugin: vi.fn(),
    enablePlugin: vi.fn(),
    triggerAction: vi.fn(),
    isServerSide: () => false,
    getActiveAction: () => 'selectionTool',
    getEventsController: () => new AbortController(),
    getChildLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      trace: vi.fn(),
    }),
  };
  const node = new WeaveTextV2Node(config ? { config } : undefined);
  (node as unknown as { instance: unknown }).instance = instance;
  const shape = node.onRender({
    id: 't1',
    nodeType: 'text',
    text: 'Hello',
    x: 10,
    y: 10,
    width: 200,
    fontSize: 20,
    fontFamily: 'sans-serif',
    fill: '#000000',
    layout: TEXT_LAYOUT.FIXED,
  }) as WeaveTextV2Shape;
  main.add(shape);
  cleanup.push(() => container.remove());
  const edit = (create = false) =>
    (
      node as unknown as { triggerEditMode: (s: unknown, c?: boolean) => void }
    ).triggerEditMode(shape, create);
  const ta = () => container.querySelector('textarea') as HTMLTextAreaElement;
  const input = (v: string, inputType = 'insertText') => {
    ta().value = v;
    ta().setSelectionRange(v.length, v.length);
    ta().dispatchEvent(new InputEvent('input', { inputType, bubbles: true }));
  };
  const esc = () =>
    ta().dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
    );
  return {
    node,
    shape,
    instance,
    stage,
    main,
    utility,
    container,
    modeSpy,
    events,
    edit,
    ta,
    input,
    esc,
    selection,
  };
}

describe('WeaveTextV2Node edit outline config', () => {
  type Host = {
    outlineColor?: string;
    outlineWidth?: number;
    outlinePadding?: number;
  };
  const hostOf = (t: ReturnType<typeof setup>) => {
    t.edit();
    const host = (t.node as unknown as { session: { host: Host } }).session
      .host;
    t.esc();
    return host;
  };

  it('defaults: enabled, #0074ff, width 1', () => {
    expect(hostOf(setup())).toMatchObject({
      outlineColor: '#0074ff',
      outlineWidth: 1,
      outlinePadding: 0,
    });
  });

  it('partial override keeps the other defaults', () => {
    const h = hostOf(setup({ edition: { outline: { color: '#ff0000' } } }));
    expect(h).toMatchObject({ outlineColor: '#ff0000', outlineWidth: 1 });
  });

  it('padding is configurable', () => {
    const h = hostOf(setup({ edition: { outline: { padding: 6 } } }));
    expect(h.outlinePadding).toBe(6);
  });

  it('enabled:false draws no outline', () => {
    const h = hostOf(setup({ edition: { outline: { enabled: false } } }));
    expect(h.outlineColor).toBeUndefined();
    expect(h.outlineWidth).toBeUndefined();
  });

  it('edition.borderSize is not part of the text-v2 config type', () => {
    // @ts-expect-error borderSize was removed from WeaveTextV2Properties
    const node = new WeaveTextV2Node({
      config: { edition: { borderSize: 4 } },
    });
    expect(node).toBeInstanceOf(WeaveTextV2Node);
  });
});

describe('WeaveTextV2Node edit lifecycle', () => {
  it('enter: mutex, edition mode, plugin off, proxy input, event', () => {
    const t = setup();
    t.edit();
    expect(t.instance.setMutexLock).toHaveBeenCalledWith({
      nodeIds: ['t1'],
      operation: 'text-edit',
    });
    expect(t.modeSpy).toHaveBeenCalledWith(WEAVE_STAGE_TEXT_EDITION_MODE);
    expect(t.instance.disablePlugin).toHaveBeenCalledWith('nodesSelection');
    expect(t.ta()).toBeTruthy();
    expect(t.shape.visible()).toBe(true); // node stays painted: no overlay swap
    expect(
      t.events.some(
        ([n, p]) =>
          n === 'onEnterTextNodeEditMode' &&
          (p as { node: unknown }).node === t.shape
      )
    ).toBe(true);
    t.esc();
  });

  it('existing node: selects all on enter; created node: caret only', () => {
    const t = setup();
    t.edit();
    const sess = (
      t.node as unknown as {
        session: { model: { getSelection(): { start: number; end: number } } };
      }
    ).session;
    expect(sess.model.getSelection()).toEqual({ start: 0, end: 5 });
    t.esc();
    const c = setup();
    c.edit(true);
    const s2 = (
      c.node as unknown as {
        session: { model: { getSelection(): { start: number; end: number } } };
      }
    ).session;
    expect(s2.model.getSelection()).toEqual({ start: 5, end: 5 });
    c.esc();
  });

  it('does not start when the mutex is not acquired', () => {
    const t = setup();
    t.instance.setMutexLock.mockReturnValue(false);
    t.edit();
    expect(t.ta()).toBeNull();
  });

  it('exit with changes: exactly one updateNode, state restored, event', () => {
    const t = setup();
    t.edit();
    t.input('Hello!');
    t.input('Hello!!');
    t.esc();
    expect(t.instance.updateNode).toHaveBeenCalledTimes(1);
    const props = t.instance.updateNode.mock.calls[0][0].props;
    expect(props.text).toBe('Hello!!');
    expect(props.blocks[0].runs[0].t).toBe('Hello!!');
    expect(t.instance.releaseMutexLock).toHaveBeenCalled();
    expect(t.modeSpy).toHaveBeenLastCalledWith(WEAVE_STAGE_DEFAULT_MODE);
    expect(t.instance.enablePlugin).toHaveBeenCalledWith('nodesSelection');
    expect(t.selection.setSelectedNodes).toHaveBeenCalledWith([t.shape]);
    expect(t.ta()).toBeNull();
    expect(t.events.map(([n]) => n)).toContain('onExitTextNodeEditMode');
  });

  it('exit without changes: no updateNode', () => {
    const t = setup();
    t.edit();
    t.esc();
    expect(t.instance.updateNode).not.toHaveBeenCalled();
    t.edit();
    t.input('Hello!');
    t.input('Hello', 'deleteContentBackward');
    t.esc();
    expect(t.instance.updateNode).not.toHaveBeenCalled();
  });

  it('create flow: non-empty text is added, empty is discarded; flag does not leak', () => {
    const a = setup();
    a.shape.text('');
    a.edit(true);
    a.input('New');
    a.esc();
    expect(a.instance.addNode).toHaveBeenCalledTimes(1);
    expect(a.instance.updateNode).not.toHaveBeenCalled();

    const b = setup();
    b.shape.text('');
    b.edit(true);
    b.esc();
    expect(b.instance.addNode).not.toHaveBeenCalled();
    expect(b.main.findOne('#t1')).toBeUndefined();
    // next session on another node behaves as a normal edit
    const c = setup();
    (c.node as unknown as { createNode: boolean }).createNode = false;
    c.edit();
    c.input('Hello?');
    c.esc();
    expect(c.instance.updateNode).toHaveBeenCalledTimes(1);
  });

  it('auto layouts resize live while typing (smart grows, auto-height wraps)', () => {
    const t = setup();
    t.shape.setAttrs({
      layout: TEXT_LAYOUT.SMART,
      width: 10,
      smartFixedWidth: undefined,
    });
    t.edit();
    const w0 = t.shape.width();
    t.input('Hello world, a much longer line');
    expect(t.shape.width()).toBeGreaterThan(w0);
    t.esc();

    const h = setup();
    h.shape.setAttrs({ layout: TEXT_LAYOUT.AUTO_HEIGHT, width: 60 });
    h.edit();
    const h0 = h.shape.height();
    h.input('word word word word word word');
    expect(h.shape.height()).toBeGreaterThan(h0);
    expect(h.shape.attrs.height).toBeUndefined();
    h.esc();
  });

  it('onUpdate during a session does not clobber live content', () => {
    const t = setup();
    t.edit();
    t.input('typing...');
    t.node.onUpdate(t.shape, {
      id: 't1',
      nodeType: 'text',
      text: 'remote',
      x: 10,
      y: 10,
      width: 200,
      fontSize: 20,
      layout: TEXT_LAYOUT.FIXED,
    });
    expect(t.shape.text()).toBe('typing...');
    t.esc();
  });

  it('cancelEditMode (node re-rendered) closes the session', () => {
    const t = setup();
    t.edit();
    t.shape.getAttr('cancelEditMode')();
    expect(t.ta()).toBeNull();
    expect(t.shape.getAttr('cancelEditMode')).toBeUndefined();
  });

  it('emits onTextSizeWarning once past the configurable threshold, no cap', () => {
    const t = setup({ sizeWarning: { threshold: 200 } });
    t.edit();
    t.input('x'.repeat(100));
    expect(t.events.filter(([n]) => n === 'onTextSizeWarning')).toHaveLength(0);
    t.input('x'.repeat(400));
    t.input('x'.repeat(500));
    const warns = t.events.filter(([n]) => n === 'onTextSizeWarning');
    expect(warns).toHaveLength(1);
    expect((warns[0][1] as { threshold: number }).threshold).toBe(200);
    expect(t.shape.text()).toHaveLength(500); // never truncated
    t.esc();
  });

  it('dblClick on a selected node enters edit mode', () => {
    const t = setup();
    t.selection.getSelectedNodes.mockReturnValue([t.shape]);
    vi.spyOn(
      t.node as unknown as { isSelecting: () => boolean },
      'isSelecting'
    ).mockReturnValue(true);
    vi.spyOn(
      t.node as unknown as { isNodeSelected: () => boolean },
      'isNodeSelected'
    ).mockReturnValue(true);
    t.shape.dblClick();
    expect(t.ta()).toBeTruthy();
    t.esc();
  });

  it('exposes triggerEditMode attr for text-tool create-then-edit', () => {
    const t = setup();
    expect(typeof t.shape.getAttr('triggerEditMode')).toBe('function');
    t.shape.getAttr('triggerEditMode')(t.shape, true);
    expect(t.ta()).toBeTruthy();
    t.input('x');
    t.esc();
    expect(t.instance.addNode).toHaveBeenCalled();
  });
});

describe('WeaveTextV2Node rich text in a session', () => {
  const rich = { richText: { enabled: true } };

  it('many format commands produce one Weave undo step on exit', () => {
    const t = setup(rich);
    t.edit(); // selects all
    t.ta().dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    t.node.toggleList(t.shape, 'ul');
    t.node.applyMark(t.shape, 'color', '#ff0000');
    t.esc();
    expect(t.instance.updateNode).toHaveBeenCalledTimes(1);
    const props = t.instance.updateNode.mock.calls[0][0].props;
    expect(props.blocks[0]).toMatchObject({
      kind: 'ul',
      runs: [{ t: 'Hello', m: { bold: true, color: '#ff0000' } }],
    });
    expect(props.text).toBe('Hello');
  });

  it('emits format and (throttled) selection events', () => {
    vi.useFakeTimers();
    const t = setup(rich);
    t.edit();
    t.node.toggleMark(t.shape, 'italic');
    vi.advanceTimersByTime(100);
    vi.useRealTimers();
    const names = t.events.map(([n]) => n);
    expect(names).toContain('onTextFormatChange');
    expect(names).toContain('onTextSelectionChange');
    const sel = t.events.filter(([n]) => n === 'onTextSelectionChange');
    expect(sel.length).toBeLessThanOrEqual(2);
    t.esc();
  });

  it('disabled: commands do nothing and Ctrl+B stays inert', () => {
    const t = setup();
    t.edit();
    expect(t.node.toggleMark(t.shape, 'bold')).toBe(false);
    t.ta().dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    t.esc();
    expect(t.instance.updateNode).not.toHaveBeenCalled();
  });

  it('resize scales every run through the base font size', () => {
    const t = setup(rich);
    t.node.applyMark(t.shape, 'size', 40, { start: 0, end: 2 });
    const before = t.shape.ensureLayout().lines[0].segments[0].fontSize;
    t.shape.fontSize(t.shape.fontSize() * 2); // what the transformer does
    const after = t.shape.ensureLayout().lines[0].segments[0].fontSize;
    expect(after).toBe(before * 2);
  });
});
