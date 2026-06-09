// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));

vi.mock('konva', () => {
  class MockTransformer {
    _nodes: unknown[] = [];
    nodes(n?: unknown[]) {
      if (n !== undefined) {
        this._nodes = n;
        return this;
      }
      return this._nodes;
    }
    getParent() {
      return null;
    }
  }
  return { default: { Transformer: MockTransformer } };
});

vi.mock('@/utils/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/utils')>();
  return { ...actual, getTargetedNode: vi.fn().mockReturnValue(undefined) };
});

import { WeaveContextMenuPlugin } from '../context-menu';
import {
  WEAVE_CONTEXT_MENU_PLUGIN_KEY,
  WEAVE_CONTEXT_MENU_TAP_HOLD_TIMEOUT,
  WEAVE_CONTEXT_MENU_X_OFFSET_DEFAULT,
  WEAVE_CONTEXT_MENU_Y_OFFSET_DEFAULT,
} from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '@/actions/selection-tool/constants';
import { getTargetedNode } from '@/utils/utils';
import Konva from 'konva';

// ─── helper types ─────────────────────────────────────────────────────────────

type Handler = (...args: unknown[]) => void;

// ─── stage factory ────────────────────────────────────────────────────────────

function makeContainer() {
  return {
    getBoundingClientRect: vi.fn().mockReturnValue({ left: 100, top: 50 }),
    style: {},
  };
}

function makeStage() {
  const stageHandlers: Record<string, Handler> = {};
  const container = makeContainer();
  const stage = {
    on: vi.fn((event: string, handler: Handler) => {
      stageHandlers[event] = handler;
    }),
    container: vi.fn().mockReturnValue(container),
    getPointerPosition: vi.fn().mockReturnValue({ x: 200, y: 300 }),
    getRelativePointerPosition: vi.fn().mockReturnValue({ x: 100, y: 150 }),
    scale: vi.fn().mockReturnValue({ x: 1, y: 1 }),
    position: vi.fn().mockReturnValue({ x: 0, y: 0 }),
  };
  return { stage, stageHandlers, container };
}

// ─── selection plugin factory ─────────────────────────────────────────────────

function makeSelectionPlugin() {
  const hoverTransformer = { nodes: vi.fn() };
  return {
    getSelectedNodes: vi.fn().mockReturnValue([]),
    setSelectedNodes: vi.fn(),
    getHoverTransformer: vi.fn().mockReturnValue(hoverTransformer),
    hoverTransformer,
  };
}

// ─── node-handler factory ─────────────────────────────────────────────────────

function makeNodeHandler() {
  return { serialize: vi.fn().mockReturnValue({ key: 'node-key-1' }) };
}

// ─── weave factory ────────────────────────────────────────────────────────────

function makeWeave(
  stage: ReturnType<typeof makeStage>['stage'],
  opts: { selectionPlugin?: unknown; nodeHandler?: unknown } = {}
) {
  const eventHandlers: Record<string, Handler> = {};
  const store = { getUser: vi.fn().mockReturnValue({ id: 'u1' }) };
  const weave = {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(opts.selectionPlugin),
    getNodeHandler: vi.fn().mockReturnValue(opts.nodeHandler),
    getStore: vi.fn().mockReturnValue(store),
    getNodeMutexLock: vi.fn().mockReturnValue(null),
    getActiveAction: vi.fn().mockReturnValue(''),
    addEventListener: vi.fn((event: string, handler: Handler) => {
      eventHandlers[event] = handler;
    }),
    emitEvent: vi.fn(),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  };
  return { weave, store, eventHandlers };
}

// ─── full setup ───────────────────────────────────────────────────────────────

function setup(
  opts: {
    config?: { xOffset?: number; yOffset?: number };
    selectionPlugin?: unknown;
    nodeHandler?: unknown;
  } = {}
) {
  const { stage, stageHandlers, container } = makeStage();
  const selPlugin =
    opts.selectionPlugin !== undefined
      ? opts.selectionPlugin
      : makeSelectionPlugin();
  const { weave, store, eventHandlers } = makeWeave(stage, {
    selectionPlugin: selPlugin,
    nodeHandler: opts.nodeHandler,
  });

  const plugin = new WeaveContextMenuPlugin({ config: opts.config ?? {} });
  // @ts-expect-error — assigning protected instance for test
  plugin.instance = weave;
  plugin.onInit();

  return {
    plugin,
    weave,
    store,
    stage,
    stageHandlers,
    eventHandlers,
    container,
    selectionPlugin: selPlugin as ReturnType<typeof makeSelectionPlugin>,
  };
}

// ─── event-target factory ─────────────────────────────────────────────────────

function makeEventTarget(
  opts: {
    nodeType?: string;
    locked?: boolean;
    id?: string;
    parent?: unknown;
  } = {}
) {
  return {
    getAttrs: vi.fn().mockReturnValue({
      nodeType: opts.nodeType ?? 'textNode',
      id: opts.id ?? 'node-1',
      locked: opts.locked ?? false,
    }),
    getParent: vi.fn().mockReturnValue(opts.parent ?? null),
  };
}

// ─── Suite 1: constructor + initialize() ──────────────────────────────────────

describe('WeaveContextMenuPlugin - constructor + initialize()', () => {
  it('1.1 no config → uses defaults (xOffset=4, yOffset=4)', () => {
    const plugin = new WeaveContextMenuPlugin({});
    // @ts-expect-error — reading private config for assertion
    expect(plugin.config.xOffset).toBe(WEAVE_CONTEXT_MENU_X_OFFSET_DEFAULT);
    // @ts-expect-error — reading private config for assertion
    expect(plugin.config.yOffset).toBe(WEAVE_CONTEXT_MENU_Y_OFFSET_DEFAULT);
  });

  it('1.2 custom config → overrides xOffset but keeps yOffset default', () => {
    const plugin = new WeaveContextMenuPlugin({ config: { xOffset: 10 } });
    // @ts-expect-error — reading private config for assertion
    expect(plugin.config.xOffset).toBe(10);
    // @ts-expect-error — reading private config for assertion
    expect(plugin.config.yOffset).toBe(WEAVE_CONTEXT_MENU_Y_OFFSET_DEFAULT);
  });

  it('1.3 initialize() resets all state fields', () => {
    const { plugin } = setup();
    plugin.initialize();
    // @ts-expect-error — reading private timer for assertion
    expect(plugin.timer).toBeNull();
    // @ts-expect-error — reading private tapHold for assertion
    expect(plugin.tapHold).toBe(false);
    // @ts-expect-error — reading private contextMenuVisible for assertion
    expect(plugin.contextMenuVisible).toBe(false);
    expect(plugin.tapStart).toEqual({ x: 0, y: 0, time: 0 });
    // @ts-expect-error — reading private tapHoldTimeout for assertion
    expect(plugin.tapHoldTimeout).toBe(WEAVE_CONTEXT_MENU_TAP_HOLD_TIMEOUT);
    // @ts-expect-error — reading private pointers for assertion
    expect(plugin.pointers).toEqual({});
  });
});

// ─── Suite 2: getName() + statics ─────────────────────────────────────────────

describe('WeaveContextMenuPlugin - getName() + statics', () => {
  it('2.1 getName() returns WEAVE_CONTEXT_MENU_PLUGIN_KEY', () => {
    const { plugin } = setup();
    expect(plugin.getName()).toBe(WEAVE_CONTEXT_MENU_PLUGIN_KEY);
  });

  it('2.2 getLayerName, initLayer, onRender are undefined', () => {
    const { plugin } = setup();
    expect(plugin.getLayerName).toBeUndefined();
    expect(plugin.initLayer).toBeUndefined();
    expect(plugin.onRender).toBeUndefined();
  });
});

// ─── Suite 3: isPressed() / setTapStart() ────────────────────────────────────

describe('WeaveContextMenuPlugin - isPressed() / setTapStart()', () => {
  it('3.1 isPressed: buttons > 0 → true; buttons === 0 → false', () => {
    const { plugin } = setup();
    // @ts-expect-error — passing partial KonvaEventObject for test
    expect(plugin.isPressed({ evt: { buttons: 1 } })).toBe(true);
    // @ts-expect-error — passing partial KonvaEventObject for test
    expect(plugin.isPressed({ evt: { buttons: 0 } })).toBe(false);
  });

  it('3.2 setTapStart stores clientX, clientY, and a timestamp', () => {
    const { plugin } = setup();
    // @ts-expect-error — passing partial KonvaEventObject for test
    plugin.setTapStart({ evt: { clientX: 42, clientY: 77 } });
    expect(plugin.tapStart?.x).toBe(42);
    expect(plugin.tapStart?.y).toBe(77);
    expect(typeof plugin.tapStart?.time).toBe('number');
  });
});

// ─── Suite 4: cancelLongPressTimer() ─────────────────────────────────────────

describe('WeaveContextMenuPlugin - cancelLongPressTimer()', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('4.1 timer exists → cleared and set to null', () => {
    const { plugin, stageHandlers } = setup();
    stageHandlers['pointerdown']({
      evt: {
        pointerId: 1,
        clientX: 0,
        clientY: 0,
        buttons: 1,
        pointerType: 'touch',
      },
      target: makeEventTarget(),
    });
    // @ts-expect-error — reading private timer for assertion
    expect(plugin.timer).not.toBeNull();
    plugin.cancelLongPressTimer();
    // @ts-expect-error — reading private timer for assertion
    expect(plugin.timer).toBeNull();
  });

  it('4.2 timer=null → no-op, does not throw', () => {
    const { plugin } = setup();
    // @ts-expect-error — reading private timer for assertion
    expect(plugin.timer).toBeNull();
    expect(() => plugin.cancelLongPressTimer()).not.toThrow();
  });
});

// ─── Suite 5: closeContextMenu() ─────────────────────────────────────────────

describe('WeaveContextMenuPlugin - closeContextMenu()', () => {
  it('5.1 sets contextMenuVisible=false, emits onNodeContextMenu visible=false', () => {
    const { plugin, weave } = setup();
    // @ts-expect-error — setting private contextMenuVisible for test
    plugin.contextMenuVisible = true;
    plugin.closeContextMenu();
    // @ts-expect-error — reading private contextMenuVisible for assertion
    expect(plugin.contextMenuVisible).toBe(false);
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onNodeContextMenu',
      expect.objectContaining({ visible: false, selection: [] })
    );
  });
});

// ─── Suite 6: triggerContextMenu() ───────────────────────────────────────────

describe('WeaveContextMenuPlugin - triggerContextMenu()', () => {
  afterEach(() => vi.clearAllMocks());

  it('6.1 target !== stage → nodeHandler.serialize called, nodes has one item', () => {
    const nodeHandler = makeNodeHandler();
    const { plugin, weave } = setup({ nodeHandler });
    const target = makeEventTarget({ nodeType: 'textNode' });
    const eventTarget = makeEventTarget({ parent: null });
    // @ts-expect-error — passing mock Konva nodes for test
    plugin.triggerContextMenu(eventTarget, target);
    expect(weave.getNodeHandler).toHaveBeenCalledWith('textNode');
    expect(nodeHandler.serialize).toHaveBeenCalledWith(target);
  });

  it('6.2 target === stage → nodes stays [], serialize not called', () => {
    const nodeHandler = makeNodeHandler();
    const { plugin, stage } = setup({ nodeHandler });
    const eventTarget = makeEventTarget({ parent: null });
    // @ts-expect-error — passing mock Konva nodes for test
    plugin.triggerContextMenu(eventTarget, stage);
    expect(nodeHandler.serialize).not.toHaveBeenCalled();
  });

  it('6.3 target=undefined → nodes stays [], serialize not called', () => {
    const nodeHandler = makeNodeHandler();
    const { plugin } = setup({ nodeHandler });
    const eventTarget = makeEventTarget({ parent: null });
    // @ts-expect-error — passing mock Konva nodes for test
    plugin.triggerContextMenu(eventTarget, undefined);
    expect(nodeHandler.serialize).not.toHaveBeenCalled();
  });

  it('6.4 eventTargetParent instanceof Konva.Transformer → nodes from transformer', () => {
    const nodeHandler = makeNodeHandler();
    const { plugin, weave } = setup({ nodeHandler });
    // @ts-expect-error — instantiating mocked Konva.Transformer for test
    const transformer = new (Konva as { Transformer: new () => unknown }).Transformer() as {
      nodes: (n?: unknown[]) => unknown[] | { nodes: () => unknown[] };
    };
    const innerNode = makeEventTarget({ nodeType: 'textNode' });
    (transformer as { nodes: (n: unknown[]) => void }).nodes([innerNode]);
    const eventTarget = makeEventTarget({ parent: transformer });
    // @ts-expect-error — passing mock Konva nodes for test
    plugin.triggerContextMenu(eventTarget, undefined);
    expect(weave.getNodeHandler).toHaveBeenCalled();
  });

  it('6.5 contextMenuVisible=true → closeContextMenu emits visible=false first', () => {
    const { plugin, weave } = setup();
    // @ts-expect-error — setting private contextMenuVisible for test
    plugin.contextMenuVisible = true;
    const eventTarget = makeEventTarget({ parent: null });
    // @ts-expect-error — passing mock Konva node for test
    plugin.triggerContextMenu(eventTarget, undefined);
    const allCalls = (weave.emitEvent as ReturnType<typeof vi.fn>).mock
      .calls as [string, { visible: boolean }][];
    const visibleFalseCalls = allCalls.filter((c) => c[1]?.visible === false);
    expect(visibleFalseCalls.length).toBeGreaterThan(0);
  });

  it('6.6 node.locked=true → allNodesUnlocked=false, returns early, no visible=true emit', () => {
    const nodeHandler = makeNodeHandler();
    const { plugin, weave } = setup({ nodeHandler });
    const target = makeEventTarget({ locked: true });
    const eventTarget = makeEventTarget({ parent: null });
    // @ts-expect-error — passing mock Konva nodes for test
    plugin.triggerContextMenu(eventTarget, target);
    const allCalls = (weave.emitEvent as ReturnType<typeof vi.fn>).mock
      .calls as [string, { visible: boolean }][];
    expect(allCalls.filter((c) => c[1]?.visible === true)).toHaveLength(0);
  });

  it('6.7 mutex locked by OTHER user → allNodesMutexUnlocked=false, returns early', () => {
    const nodeHandler = makeNodeHandler();
    const { plugin, weave } = setup({ nodeHandler });
    weave.getNodeMutexLock.mockReturnValue({ user: { id: 'other-user' } });
    const target = makeEventTarget();
    const eventTarget = makeEventTarget({ parent: null });
    // @ts-expect-error — passing mock Konva nodes for test
    plugin.triggerContextMenu(eventTarget, target);
    const allCalls = (weave.emitEvent as ReturnType<typeof vi.fn>).mock
      .calls as [string, { visible: boolean }][];
    expect(allCalls.filter((c) => c[1]?.visible === true)).toHaveLength(0);
  });

  it('6.8 mutex locked by SAME user → does NOT return early, emits visible=true', () => {
    const nodeHandler = makeNodeHandler();
    const { plugin, weave } = setup({ nodeHandler });
    weave.getNodeMutexLock.mockReturnValue({ user: { id: 'u1' } });
    const target = makeEventTarget();
    const eventTarget = makeEventTarget({ parent: null });
    // @ts-expect-error — passing mock Konva nodes for test
    plugin.triggerContextMenu(eventTarget, target);
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onNodeContextMenu',
      expect.objectContaining({ visible: true })
    );
  });

  it('6.9 all unlocked → emits onNodeContextMenu visible=true with computed contextMenuPoint', () => {
    const { plugin, weave } = setup();
    const eventTarget = makeEventTarget({ parent: null });
    // @ts-expect-error — passing mock Konva node for test
    plugin.triggerContextMenu(eventTarget, undefined);
    // contextMenuPoint = { x: 100 + 200 + 4, y: 50 + 300 + 4 }
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onNodeContextMenu',
      expect.objectContaining({
        visible: true,
        contextMenuPoint: { x: 304, y: 354 },
      })
    );
  });

  it('6.10 selectionPlugin present + not in transformer → setSelectedNodes + hoverTransformer cleared', () => {
    const selPlugin = makeSelectionPlugin();
    const { plugin } = setup({ selectionPlugin: selPlugin });
    const eventTarget = makeEventTarget({ parent: null });
    // @ts-expect-error — passing mock Konva node for test
    plugin.triggerContextMenu(eventTarget, undefined);
    expect(selPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
    expect(selPlugin.hoverTransformer.nodes).toHaveBeenCalledWith([]);
  });

  it('6.11 getPointerPosition=null → no visible=true emit', () => {
    const { plugin, weave, stage } = setup();
    stage.getPointerPosition.mockReturnValue(null);
    const eventTarget = makeEventTarget({ parent: null });
    // @ts-expect-error — passing mock Konva node for test
    plugin.triggerContextMenu(eventTarget, undefined);
    const allCalls = (weave.emitEvent as ReturnType<typeof vi.fn>).mock
      .calls as [string, { visible: boolean }][];
    expect(allCalls.filter((c) => c[1]?.visible === true)).toHaveLength(0);
  });
});

// ─── Suite 7: pointerdown handler ────────────────────────────────────────────

describe('WeaveContextMenuPlugin - pointerdown handler', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function pdEvt(overrides: Record<string, unknown> = {}) {
    return {
      evt: {
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        buttons: 1,
        pointerType: 'touch',
        ...overrides,
      },
      target: makeEventTarget(),
    };
  }

  it('7.1 buttons===0 → early return, no timer set', () => {
    const { plugin, stageHandlers } = setup();
    stageHandlers['pointerdown'](pdEvt({ buttons: 0 }));
    // @ts-expect-error — reading private timer for assertion
    expect(plugin.timer).toBeNull();
  });

  it('7.2 pointerType==="mouse" → early return, no timer set', () => {
    const { plugin, stageHandlers } = setup();
    stageHandlers['pointerdown'](pdEvt({ pointerType: 'mouse' }));
    // @ts-expect-error — reading private timer for assertion
    expect(plugin.timer).toBeNull();
  });

  it('7.3 pointerType==="touch" with 2 pre-existing pointers → early return, no timer', () => {
    const { plugin, stageHandlers } = setup();
    // Seed two existing pointers directly to force multi-touch path
    // @ts-expect-error — setting private pointers for test
    plugin.pointers = { 1: {}, 2: {} };
    stageHandlers['pointerdown'](pdEvt({ pointerId: 3 }));
    // @ts-expect-error — reading private timer for assertion
    expect(plugin.timer).toBeNull();
  });

  it('7.4 timer already set → early return at timer guard, timer unchanged', () => {
    const { plugin, stageHandlers } = setup();
    stageHandlers['pointerdown'](pdEvt({ pointerId: 1 }));
    // @ts-expect-error — reading private timer for assertion
    const firstTimer = plugin.timer;
    expect(firstTimer).not.toBeNull();
    // Remove the pointer so the multi-pointer guard passes on the next call
    // @ts-expect-error — mutating private pointers for test
    delete plugin.pointers[1];
    stageHandlers['pointerdown'](pdEvt({ pointerId: 1 }));
    // @ts-expect-error — reading private timer for assertion
    expect(plugin.timer).toBe(firstTimer);
  });

  it('7.5 tick fires, activeAction !== SELECTION → tapHold=true, triggerContextMenu NOT called', () => {
    const { plugin, weave, stageHandlers } = setup();
    weave.getActiveAction.mockReturnValue('someOtherAction');
    stageHandlers['pointerdown'](pdEvt());
    vi.advanceTimersByTime(WEAVE_CONTEXT_MENU_TAP_HOLD_TIMEOUT);
    // @ts-expect-error — reading private tapHold for assertion
    expect(plugin.tapHold).toBe(true);
    const allCalls = (weave.emitEvent as ReturnType<typeof vi.fn>).mock
      .calls as [string, { visible: boolean }][];
    expect(allCalls.filter((c) => c[1]?.visible === true)).toHaveLength(0);
  });

  it('7.6 tick fires, activeAction === SELECTION → triggerContextMenu emits visible=true', () => {
    const { weave, stageHandlers } = setup();
    weave.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
    (getTargetedNode as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    stageHandlers['pointerdown'](pdEvt());
    vi.advanceTimersByTime(WEAVE_CONTEXT_MENU_TAP_HOLD_TIMEOUT);
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onNodeContextMenu',
      expect.objectContaining({ visible: true })
    );
  });
});

// ─── Suite 8: pointerup handler ──────────────────────────────────────────────

describe('WeaveContextMenuPlugin - pointerup handler', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function touchDown(stageHandlers: Record<string, Handler>, pointerId = 1) {
    stageHandlers['pointerdown']({
      evt: {
        pointerId,
        clientX: 0,
        clientY: 0,
        buttons: 1,
        pointerType: 'touch',
      },
      target: makeEventTarget(),
    });
  }

  it('8.1 pointerType==="mouse" → early return, timer NOT cleared', () => {
    const { plugin, stageHandlers } = setup();
    touchDown(stageHandlers, 1);
    // @ts-expect-error — reading private timer for assertion
    expect(plugin.timer).not.toBeNull();
    stageHandlers['pointerup']({ evt: { pointerId: 1, pointerType: 'mouse' } });
    // @ts-expect-error — reading private timer for assertion
    expect(plugin.timer).not.toBeNull();
  });

  it('8.2 touch + was multi-pointer → early return, timer not cleared', () => {
    const { plugin, stageHandlers } = setup();
    touchDown(stageHandlers, 1);
    // Inject a second pointer without going through pointerdown (to avoid multi-touch guard)
    // @ts-expect-error — mutating private pointers for test
    plugin.pointers[2] = { pointerId: 2 };
    // pointerup pointerId=2: delete ptr2 → pointers={1}, size=1; 1+1=2>1 → early return
    stageHandlers['pointerup']({ evt: { pointerId: 2, pointerType: 'touch' } });
    // @ts-expect-error — reading private timer for assertion
    expect(plugin.timer).not.toBeNull();
  });

  it('8.3 single touch + timer → clears timer, sets tapHold=false', () => {
    const { plugin, stageHandlers } = setup();
    touchDown(stageHandlers, 1);
    // @ts-expect-error — reading private timer for assertion
    expect(plugin.timer).not.toBeNull();
    // pointerup pointerId=1: delete ptr1 → pointers={}, size=0; 0+1=1 NOT >1 → clears timer
    stageHandlers['pointerup']({ evt: { pointerId: 1, pointerType: 'touch' } });
    // @ts-expect-error — reading private timer for assertion
    expect(plugin.timer).toBeNull();
    // @ts-expect-error — reading private tapHold for assertion
    expect(plugin.tapHold).toBe(false);
  });
});

// ─── Suite 9: contextmenu handler ────────────────────────────────────────────

describe('WeaveContextMenuPlugin - contextmenu handler', () => {
  afterEach(() => vi.clearAllMocks());

  it('9.1 !enabled → preventDefault called but triggerContextMenu skipped', () => {
    const { plugin, weave, stageHandlers } = setup();
    plugin.disable();
    weave.emitEvent.mockClear();
    const e = { evt: { preventDefault: vi.fn() }, target: makeEventTarget() };
    stageHandlers['contextmenu'](e);
    expect(e.evt.preventDefault).toHaveBeenCalled();
    const allCalls = (weave.emitEvent as ReturnType<typeof vi.fn>).mock
      .calls as [string, { visible: boolean }][];
    expect(allCalls.filter((c) => c[1]?.visible === true)).toHaveLength(0);
  });

  it('9.2 enabled → triggerContextMenu called, emits visible=true', () => {
    const { weave, stageHandlers } = setup();
    const e = { evt: { preventDefault: vi.fn() }, target: makeEventTarget() };
    stageHandlers['contextmenu'](e);
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onNodeContextMenu',
      expect.objectContaining({ visible: true })
    );
  });
});

// ─── Suite 10: onStageSelection handler ──────────────────────────────────────

describe('WeaveContextMenuPlugin - onStageSelection handler', () => {
  afterEach(() => vi.clearAllMocks());

  it('10.1 tapHold=true → early return, no emitEvent', () => {
    const { plugin, weave, eventHandlers } = setup();
    // @ts-expect-error — setting private tapHold for test
    plugin.tapHold = true;
    weave.emitEvent.mockClear();
    eventHandlers['onStageSelection']?.();
    expect(weave.emitEvent).not.toHaveBeenCalled();
  });

  it('10.2 tapHold=false, containerRect && pointerPos → emits onNodeContextMenu visible=false', () => {
    const { weave, eventHandlers } = setup();
    weave.emitEvent.mockClear();
    eventHandlers['onStageSelection']?.();
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onNodeContextMenu',
      expect.objectContaining({
        visible: false,
        selection: [],
        contextMenuPoint: { x: 304, y: 354 },
      })
    );
  });

  it('10.3 getPointerPosition=null → no emitEvent', () => {
    const { weave, stage, eventHandlers } = setup();
    stage.getPointerPosition.mockReturnValue(null);
    weave.emitEvent.mockClear();
    eventHandlers['onStageSelection']?.();
    expect(weave.emitEvent).not.toHaveBeenCalled();
  });
});

// ─── Suite 11: getStageClickPoint() ──────────────────────────────────────────

describe('WeaveContextMenuPlugin - getStageClickPoint()', () => {
  it('11.1 computes (pointerPos − position) / scale correctly', () => {
    const { plugin, weave } = setup();
    const eventTarget = makeEventTarget({ parent: null });
    // scale={x:1,y:1}, position={x:0,y:0}, pointerPos={x:200,y:300}
    // stageClickPoint = { x: 200, y: 300 }
    // @ts-expect-error — passing mock Konva node for test
    plugin.triggerContextMenu(eventTarget, undefined);
    expect(weave.emitEvent).toHaveBeenCalledWith(
      'onNodeContextMenu',
      expect.objectContaining({ stageClickPoint: { x: 200, y: 300 } })
    );
  });
});

// ─── Suite 12: isContextMenuVisible / isTapHold / enable / disable ─────────

describe('WeaveContextMenuPlugin - state accessors + enable/disable', () => {
  it('12.1 isContextMenuVisible() reflects contextMenuVisible', () => {
    const { plugin } = setup();
    expect(plugin.isContextMenuVisible()).toBe(false);
    // @ts-expect-error — setting private contextMenuVisible for test
    plugin.contextMenuVisible = true;
    expect(plugin.isContextMenuVisible()).toBe(true);
  });

  it('12.2 isTapHold() reflects tapHold', () => {
    const { plugin } = setup();
    expect(plugin.isTapHold()).toBe(false);
    // @ts-expect-error — setting private tapHold for test
    plugin.tapHold = true;
    expect(plugin.isTapHold()).toBe(true);
  });

  it('12.3 enable() / disable() toggle enabled', () => {
    const { plugin } = setup();
    plugin.disable();
    // @ts-expect-error — reading protected enabled for assertion
    expect(plugin.enabled).toBe(false);
    plugin.enable();
    // @ts-expect-error — reading protected enabled for assertion
    expect(plugin.enabled).toBe(true);
  });
});
