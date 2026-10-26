// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import Konva from 'konva';
import { WeaveShapeLabelEditor } from '../shape-label-editor';
import { WeaveShapeLabelNativeEditor } from '../shape-label-native-editor';
import { createShapeLabelEngine } from '../shape-label.engine';
import { computeRectangleLabelMinSize } from '../shape-label.utils';
import {
  labelId,
  WEAVE_STAGE_SHAPE_LABEL_EDITION_MODE,
} from '../shape-label.constants';
import type { WeaveShapeLabelEngine } from '../shape-label.types';
import { augmentKonvaNodeClass } from '../../node';
import { WeaveTextV2Shape } from '../../text-v2/shape';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

function setup() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const stage = new Konva.Stage({ container, width: 600, height: 400 });
  const layer = new Konva.Layer();
  const utility = new Konva.Layer();
  stage.add(layer, utility);
  const modes: string[] = [];
  (stage as unknown as { mode: (m?: string) => void }).mode = (m?: string) => {
    if (m) modes.push(m);
  };
  const tr = { hide: vi.fn() };
  const instance = {
    getStage: () => stage,
    getUtilityLayer: () => utility,
    getPlugin: vi
      .fn()
      .mockReturnValue({ getTransformer: () => tr, setSelectedNodes: vi.fn() }),
    setMutexLock: vi.fn().mockReturnValue(true),
    releaseMutexLock: vi.fn(),
    disablePlugin: vi.fn(),
    enablePlugin: vi.fn(),
    getEventsController: () => new AbortController(),
    getFonts: () => [],
    emitEvent: vi.fn(),
  };
  const group = new Konva.Group({ id: 'shape', labelText: 'Hello', x: 10, y: 10, width: 200, height: 100 });
  layer.add(group);
  return { container, stage, layer, group, instance, modes };
}

const bounds = { x: 8, y: 8, width: 184, height: 84 };
const props = { id: 'shape', labelText: 'Hello' };

beforeAll(() => {
  augmentKonvaNodeClass();
});

let containers: HTMLElement[] = [];
afterEach(() => {
  containers.forEach((c) => c.remove());
  containers = [];
});

type Factory = (inst: ReturnType<typeof setup>['instance']) => WeaveShapeLabelEngine;
const engines: [string, Factory][] = [
  ['legacy', (i) => new WeaveShapeLabelEditor(i as never)],
  ['native', (i) => new WeaveShapeLabelNativeEditor(i as never)],
];

describe.each(engines)('shape label engine contract: %s', (_name, make) => {
  it('renders the label child with labelId(id) and the label text', () => {
    const s = setup();
    containers.push(s.container);
    const engine = make(s.instance);
    const node = engine.renderLabel(s.group, props, bounds);
    expect(node.id()).toBe(labelId('shape'));
    expect(node.getAttr('text')).toBe('Hello');
    expect(node.visible()).toBe(true);
    expect(s.group.findOne(`#${labelId('shape')}`)).toBe(node);
  });

  it('hides an empty label', () => {
    const s = setup();
    containers.push(s.container);
    const node = make(s.instance).renderLabel(
      s.group,
      { ...props, labelText: '' },
      bounds
    );
    expect(node.visible()).toBe(false);
  });

  it('computes min size from the label node', () => {
    const s = setup();
    containers.push(s.container);
    make(s.instance).renderLabel(s.group, props, bounds);
    const size = computeRectangleLabelMinSize(s.stage, s.group);
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });

  it('acquires the label-edit lock, sets the mode and releases on exit', () => {
    const s = setup();
    containers.push(s.container);
    const engine = make(s.instance);
    engine.renderLabel(s.group, props, bounds);
    engine.triggerEditMode(s.group, bounds, vi.fn());
    expect(engine.isEditing()).toBe(true);
    expect(s.instance.setMutexLock).toHaveBeenCalledWith({
      nodeIds: ['shape'],
      operation: 'label-edit',
    });
    expect(s.modes).toContain(WEAVE_STAGE_SHAPE_LABEL_EDITION_MODE);
    expect(s.instance.disablePlugin).toHaveBeenCalledWith('nodesSelection');
    engine.exitEditMode();
    expect(engine.isEditing()).toBe(false);
    expect(s.instance.releaseMutexLock).toHaveBeenCalled();
    expect(s.instance.enablePlugin).toHaveBeenCalledWith('nodesSelection');
  });

  it('does not enter edit when the lock is refused', () => {
    const s = setup();
    containers.push(s.container);
    s.instance.setMutexLock.mockReturnValue(false);
    const engine = make(s.instance);
    engine.renderLabel(s.group, props, bounds);
    engine.triggerEditMode(s.group, bounds, vi.fn());
    expect(engine.isEditing()).toBe(false);
  });
});

describe('createShapeLabelEngine', () => {
  it('defaults to legacy', () => {
    const s = setup();
    containers.push(s.container);
    expect(createShapeLabelEngine(s.instance as never)).toBeInstanceOf(
      WeaveShapeLabelEditor
    );
    expect(
      createShapeLabelEngine(s.instance as never, { engine: 'legacy' })
    ).toBeInstanceOf(WeaveShapeLabelEditor);
  });

  it('returns native when configured', () => {
    const s = setup();
    containers.push(s.container);
    expect(
      createShapeLabelEngine(s.instance as never, { engine: 'native' })
    ).toBeInstanceOf(WeaveShapeLabelNativeEditor);
  });
});

describe('legacy engine rendering is unchanged', () => {
  it('renders a Konva.Text', () => {
    const s = setup();
    containers.push(s.container);
    const node = new WeaveShapeLabelEditor(s.instance as never).renderLabel(
      s.group,
      props,
      bounds
    );
    expect(node).toBeInstanceOf(Konva.Text);
  });
});

describe('native engine', () => {
  function native() {
    const s = setup();
    containers.push(s.container);
    const engine = new WeaveShapeLabelNativeEditor(s.instance as never);
    const node = engine.renderLabel(s.group, props, bounds);
    return { s, engine, node };
  }

  it('renders a WeaveTextV2Shape with label typography', () => {
    const s = setup();
    containers.push(s.container);
    const node = new WeaveShapeLabelNativeEditor(s.instance as never).renderLabel(
      s.group,
      { ...props, labelFontSize: 20, labelAlign: 'left', labelVerticalAlign: 'top' },
      bounds
    );
    expect(node).toBeInstanceOf(WeaveTextV2Shape);
    expect(node.fontSize()).toBe(20);
    expect(node.align()).toBe('left');
    expect(node.verticalAlign()).toBe('top');
  });

  it('enables rich text and persists rich content on commit', () => {
    const { s, engine } = native();
    const onCommit = vi.fn();
    engine.triggerEditMode(s.group, bounds, onCommit);
    const ta = s.container.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'Hi';
    ta.setSelectionRange(2, 2);
    ta.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }));
    ta.setSelectionRange(0, 2);
    ta.dispatchEvent(new Event('select'));
    ta.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'b', metaKey: true, ctrlKey: true, bubbles: true, cancelable: true })
    );
    ta.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    expect(onCommit).toHaveBeenCalledTimes(1);
    const [text, blocks] = onCommit.mock.calls[0];
    expect(text).toBe('Hi');
    expect(blocks?.[0].runs[0].m?.bold).toBe(true);
  });

  it('renders stored labelBlocks and ignores them when stale', () => {
    const s = setup();
    containers.push(s.container);
    const engine = new WeaveShapeLabelNativeEditor(s.instance as never);
    const blocks = [{ runs: [{ t: 'Hello', m: { bold: true } }] }];
    const node = engine.renderLabel(
      s.group,
      { id: 'shape', labelText: 'Hello', labelBlocks: blocks },
      bounds
    );
    expect(node.getBlocks()[0].runs[0].m?.bold).toBe(true);
    engine.updateLabel(
      s.group,
      { id: 'shape', labelText: 'Changed', labelBlocks: blocks },
      bounds
    );
    expect(node.getBlocks()[0].runs[0].m?.bold).toBeUndefined();
    expect(node.text()).toBe('Changed');
  });

  it('creates no label DOM overlay, only the proxy textarea', () => {
    const { s, engine } = native();
    engine.triggerEditMode(s.group, bounds, vi.fn());
    expect(s.container.querySelector('#shape_label_textarea')).toBeNull();
    expect(s.container.querySelectorAll('textarea')).toHaveLength(1);
    engine.exitEditMode();
    expect(s.container.querySelectorAll('textarea')).toHaveLength(0);
  });

  it('flattens to plain text on Escape commit', () => {
    const { s, engine } = native();
    const onCommit = vi.fn();
    engine.triggerEditMode(s.group, bounds, onCommit);
    const ta = s.container.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'Hello world';
    ta.setSelectionRange(11, 11);
    ta.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }));
    ta.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    expect(onCommit).toHaveBeenCalledWith('Hello world', undefined);
    expect(engine.isEditing()).toBe(false);
    expect(s.instance.releaseMutexLock).toHaveBeenCalled();
  });

  it('grows while typing and restores down to the original size', () => {
    const { s, engine } = native();
    const heights: number[] = [];
    const original = 100;
    engine.triggerEditMode(s.group, bounds, vi.fn(), (needed) => {
      heights.push(Math.max(needed, original));
    });
    const ta = s.container.querySelector('textarea') as HTMLTextAreaElement;
    const type = (v: string) => {
      ta.value = v;
      ta.setSelectionRange(v.length, v.length);
      ta.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }));
    };
    type(Array.from({ length: 30 }, () => 'line').join('\n'));
    expect(Math.max(...heights)).toBeGreaterThan(original);
    type('x');
    expect(heights.at(-1)).toBe(original);
    engine.exitEditMode();
  });

  it('does not overwrite session content on update while editing', () => {
    const { s, engine, node } = native();
    engine.triggerEditMode(s.group, bounds, vi.fn());
    const ta = s.container.querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'edited';
    ta.setSelectionRange(6, 6);
    ta.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }));
    engine.updateLabel(s.group, props, bounds);
    expect(node.text()).toBe('edited');
    engine.exitEditMode();
  });

  it('repositions the label bounds through repositionTextArea', () => {
    const { s, engine, node } = native();
    engine.triggerEditMode(s.group, bounds, vi.fn());
    engine.repositionTextArea(s.group, { x: 20, y: 30, width: 100, height: 40 });
    expect(node.x()).toBe(20);
    expect(node.y()).toBe(30);
    expect(node.width()).toBe(100);
    engine.exitEditMode();
  });

  it('keeps min size equal to legacy for the same plain text', () => {
    const a = setup();
    const b = setup();
    containers.push(a.container, b.container);
    new WeaveShapeLabelEditor(a.instance as never).renderLabel(a.group, props, bounds);
    new WeaveShapeLabelNativeEditor(b.instance as never).renderLabel(b.group, props, bounds);
    const la = computeRectangleLabelMinSize(a.stage, a.group);
    const lb = computeRectangleLabelMinSize(b.stage, b.group);
    expect(lb.width).toBe(la.width);
    expect(Math.abs(lb.height - la.height)).toBeLessThan(8);
  });
});
