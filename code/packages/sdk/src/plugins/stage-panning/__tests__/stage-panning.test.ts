// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('lodash/throttle', () => ({ default: (fn: (...args: unknown[]) => unknown) => fn }));
vi.mock('@/utils/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/utils')>();
  return {
    ...actual,
    isInShadowDOM: vi.fn().mockReturnValue(false),
    getTopmostShadowHost: vi.fn().mockReturnValue(null),
  };
});

import { WeaveStagePanningPlugin } from '../stage-panning';
import { WEAVE_STAGE_PANNING_KEY } from '../constants';
import { MOVE_TOOL_ACTION_NAME } from '@/actions/move-tool/constants';
import { isInShadowDOM, getTopmostShadowHost } from '@/utils/utils';

// ─── helpers ──────────────────────────────────────────────────────────────────

type Handler = (e: Record<string, unknown>) => void;

function makeContainer() {
  return {
    style: {
      cursor: '',
      touchAction: '',
      userSelect: '',
      setProperty: vi.fn(),
    },
    parentNode: {},
  };
}

function makeTarget(id = 'node-1') {
  return {
    getAttrs: vi.fn().mockReturnValue({ id }),
    x: vi.fn().mockReturnValue(0),
    y: vi.fn().mockReturnValue(0),
  };
}

function makeStage() {
  const container = makeContainer();
  const stageHandlers: Record<string, Handler> = {};
  const stage = {
    container: vi.fn().mockReturnValue(container),
    getPointerPosition: vi.fn().mockReturnValue({ x: 100, y: 100 }),
    x: vi.fn().mockReturnValue(0),
    y: vi.fn().mockReturnValue(0),
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    size: vi.fn().mockReturnValue({ width: 1000, height: 800 }),
    on: vi.fn((event: string, handler: Handler) => {
      stageHandlers[event] = handler;
    }),
    getContent: vi.fn().mockReturnValue({ addEventListener: vi.fn() }),
  };
  return { stage, container, stageHandlers };
}

function makeWeave(stage: ReturnType<typeof makeStage>['stage']) {
  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(undefined),
    getActiveAction: vi.fn().mockReturnValue(''),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    emitEvent: vi.fn(),
    getClosestParentWithWeaveId: vi.fn().mockReturnValue(stage.container()),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  };
}

function setup(params?: ConstructorParameters<typeof WeaveStagePanningPlugin>[0]) {
  const { stage, container, stageHandlers } = makeStage();
  const weave = makeWeave(stage);
  const plugin = new WeaveStagePanningPlugin(params);
  // @ts-expect-error — accessing protected instance for test setup
  plugin.instance = weave;

  const windowListenerSpy = vi.spyOn(window, 'addEventListener');
  plugin.onInit();
  const spyCalls = windowListenerSpy.mock.calls;
  const keydownHandler = spyCalls.find((c) => c[0] === 'keydown')?.[1] as Handler | undefined;
  const keyupHandler = spyCalls.find((c) => c[0] === 'keyup')?.[1] as Handler | undefined;
  const wheelHandler = spyCalls.find((c) => c[0] === 'wheel')?.[1] as Handler | undefined;
  windowListenerSpy.mockRestore();

  return { plugin, stage, container, stageHandlers, weave, keydownHandler, keyupHandler, wheelHandler };
}

function pdEvt(overrides: Record<string, unknown> = {}) {
  return {
    evt: {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      pointerType: 'mouse',
      buttons: 0,
      ...overrides,
    },
  };
}

// ─── Suite 1: constructor + initialize() ──────────────────────────────────────

describe('WeaveStagePanningPlugin - constructor + initialize()', () => {
  it('1.1 no params → config uses defaults (offset=25, speed=20)', () => {
    const { stage } = makeStage();
    const plugin = new WeaveStagePanningPlugin();
    // @ts-expect-error — accessing private config for test assertions
    plugin.instance = makeWeave(stage);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.config.edgePan.offset).toBe(25);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.config.edgePan.speed).toBe(20);
  });

  it('1.2 custom config → merges with defaults', () => {
    const plugin = new WeaveStagePanningPlugin({ config: { edgePan: { offset: 50, speed: 10 } } });
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.config.edgePan.offset).toBe(50);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.config.edgePan.speed).toBe(10);
  });

  it('1.3 initialize() resets all state fields', () => {
    const { plugin } = setup();
    plugin.initialize();
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.panning).toBe(false);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.isDragging).toBe(false);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.enableMove).toBe(false);
    expect(plugin.enabled).toBe(true);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.moveToolActive).toBe(false);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.isMouseLeftButtonPressed).toBe(false);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.isMouseMiddleButtonPressed).toBe(false);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.isSpaceKeyPressed).toBe(false);
    expect(plugin.previousPointer).toBeNull();
    expect(plugin.currentPointer).toBeNull();
    expect(plugin.stageScrollInterval).toBeUndefined();
    expect(plugin.panEdgeTargets).toEqual({});
  });
});

// ─── Suite 2: getName() + static fields ───────────────────────────────────────

describe('WeaveStagePanningPlugin - getName() + static fields', () => {
  it('2.1 getName() returns correct key', () => {
    const { plugin } = setup();
    expect(plugin.getName()).toBe(WEAVE_STAGE_PANNING_KEY);
  });

  it('2.2 getLayerName, initLayer, onRender are undefined', () => {
    const { plugin } = setup();
    expect(plugin.getLayerName).toBeUndefined();
    expect(plugin.initLayer).toBeUndefined();
    expect(plugin.onRender).toBeUndefined();
  });
});

// ─── Suite 3: setCursor() ─────────────────────────────────────────────────────

describe('WeaveStagePanningPlugin - setCursor()', () => {
  afterEach(() => vi.clearAllMocks());

  it('3.1 cursor !== "grabbing" → saves previousPointer, sets cursor to "grabbing"', () => {
    const { plugin, container, keydownHandler } = setup();
    container.style.cursor = 'default';
    keydownHandler!({ code: 'Space' });
    expect(plugin.previousPointer).toBe('default');
    expect(container.style.cursor).toBe('grabbing');
  });

  it('3.2 cursor === "grabbing" → no-op (previousPointer unchanged)', () => {
    const { plugin, container, keydownHandler } = setup();
    container.style.cursor = 'grabbing';
    plugin.previousPointer = 'crosshair';
    keydownHandler!({ code: 'Space' });
    expect(plugin.previousPointer).toBe('crosshair');
    expect(container.style.cursor).toBe('grabbing');
  });
});

// ─── Suite 4: disableMove() ───────────────────────────────────────────────────

describe('WeaveStagePanningPlugin - disableMove()', () => {
  afterEach(() => vi.clearAllMocks());

  it('4.1 cursor="grabbing" + previousPointer set → restores cursor, clears previousPointer', () => {
    const { plugin, container, keydownHandler, keyupHandler } = setup();
    container.style.cursor = 'default';
    keydownHandler!({ code: 'Space' }); // cursor→'grabbing', previousPointer→'default'
    keyupHandler!({ code: 'Space' });
    expect(container.style.cursor).toBe('default');
    expect(plugin.previousPointer).toBeNull();
  });

  it('4.2 cursor="grabbing", previousPointer=null → restores to "default"', () => {
    const { plugin, container, keydownHandler, keyupHandler } = setup();
    container.style.cursor = 'default';
    keydownHandler!({ code: 'Space' });
    plugin.previousPointer = null; // force null after setCursor
    container.style.cursor = 'grabbing';
    keyupHandler!({ code: 'Space' });
    expect(container.style.cursor).toBe('default');
  });

  it('4.3 cursor !== "grabbing" → no-op', () => {
    const { plugin, container, keyupHandler } = setup();
    container.style.cursor = 'crosshair';
    plugin.previousPointer = 'pointer';
    keyupHandler!({ code: 'Space' });
    expect(container.style.cursor).toBe('crosshair');
    expect(plugin.previousPointer).toBe('pointer');
  });
});

// ─── Suite 5: keydown / keyup window events ───────────────────────────────────

describe('WeaveStagePanningPlugin - keydown/keyup window events', () => {
  afterEach(() => vi.clearAllMocks());

  it('5.1 keydown Space → disables contextMenu+nodesSelection, isSpaceKeyPressed=true, setCursor called', () => {
    const { plugin, weave, container, keydownHandler } = setup();
    const mockPlugin = { disable: vi.fn(), enable: vi.fn() };
    weave.getPlugin.mockReturnValue(mockPlugin);
    container.style.cursor = 'default';
    keydownHandler!({ code: 'Space' });
    expect(mockPlugin.disable).toHaveBeenCalled();
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.isSpaceKeyPressed).toBe(true);
    expect(container.style.cursor).toBe('grabbing');
  });

  it('5.2 keydown non-Space → no state change', () => {
    const { plugin, keydownHandler } = setup();
    keydownHandler!({ code: 'KeyA' });
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.isSpaceKeyPressed).toBe(false);
  });

  it('5.3 keyup Space → enables contextMenu+nodesSelection, isSpaceKeyPressed=false, disableMove called', () => {
    const { plugin, weave, container, keydownHandler, keyupHandler } = setup();
    const mockPlugin = { disable: vi.fn(), enable: vi.fn() };
    weave.getPlugin.mockReturnValue(mockPlugin);
    container.style.cursor = 'default';
    keydownHandler!({ code: 'Space' });
    keyupHandler!({ code: 'Space' });
    expect(mockPlugin.enable).toHaveBeenCalled();
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.isSpaceKeyPressed).toBe(false);
  });

  it('5.4 keyup non-Space → no state change', () => {
    const { plugin, keyupHandler } = setup();
    // @ts-expect-error — accessing private/protected member for test assertions
    plugin.isSpaceKeyPressed = true;
    keyupHandler!({ code: 'KeyB' });
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.isSpaceKeyPressed).toBe(true);
  });
});

// ─── Suite 6: pointerdown ─────────────────────────────────────────────────────

describe('WeaveStagePanningPlugin - pointerdown', () => {
  afterEach(() => vi.clearAllMocks());

  it('6.1 activeAction = MOVE_TOOL_ACTION_NAME → moveToolActive = true', () => {
    const { plugin, weave, stageHandlers } = setup();
    weave.getActiveAction.mockReturnValue(MOVE_TOOL_ACTION_NAME);
    stageHandlers['pointerdown'](pdEvt());
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.moveToolActive).toBe(true);
  });

  it('6.2 two pointers → second pointerdown returns early, enableMove stays false', () => {
    const { plugin, stageHandlers } = setup();
    stageHandlers['pointerdown'](pdEvt({ pointerId: 1 }));
    stageHandlers['pointerdown'](pdEvt({ pointerId: 2 }));
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.enableMove).toBe(false);
  });

  it('6.3 buttons===1 (mouse left) → isMouseLeftButtonPressed = true', () => {
    const { plugin, stageHandlers } = setup();
    stageHandlers['pointerdown'](pdEvt({ buttons: 1 }));
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.isMouseLeftButtonPressed).toBe(true);
  });

  it('6.4 buttons===4 (mouse middle) → isMouseMiddleButtonPressed = true', () => {
    const { plugin, stageHandlers } = setup();
    stageHandlers['pointerdown'](pdEvt({ buttons: 4 }));
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.isMouseMiddleButtonPressed).toBe(true);
  });

  it('6.5 pointerType="touch" + moveToolActive → enableMove = true', () => {
    const { plugin, weave, stageHandlers } = setup();
    weave.getActiveAction.mockReturnValue(MOVE_TOOL_ACTION_NAME);
    stageHandlers['pointerdown'](pdEvt({ pointerType: 'touch', buttons: 1 }));
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.enableMove).toBe(true);
  });

  it('6.6 enabled + isSpaceKeyPressed → enableMove=true, isDragging=true', () => {
    const { plugin, stageHandlers, keydownHandler, container } = setup();
    container.style.cursor = 'default';
    keydownHandler!({ code: 'Space' });
    stageHandlers['pointerdown'](pdEvt());
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.enableMove).toBe(true);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.isDragging).toBe(true);
  });

  it('6.7 enabled + moveToolActive + left button → enableMove=true, isDragging=true', () => {
    const { plugin, weave, stageHandlers } = setup();
    weave.getActiveAction.mockReturnValue(MOVE_TOOL_ACTION_NAME);
    stageHandlers['pointerdown'](pdEvt({ buttons: 1 }));
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.enableMove).toBe(true);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.isDragging).toBe(true);
  });

  it('6.8 disabled → enableMove=false even with move tool + left button', () => {
    const { plugin, weave, stageHandlers } = setup();
    plugin.disable();
    weave.getActiveAction.mockReturnValue(MOVE_TOOL_ACTION_NAME);
    stageHandlers['pointerdown'](pdEvt({ buttons: 1 }));
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.enableMove).toBe(false);
  });
});

// ─── Suite 7: pointercancel ───────────────────────────────────────────────────

describe('WeaveStagePanningPlugin - pointercancel', () => {
  afterEach(() => vi.clearAllMocks());

  it('7.1 has pointerId → pointer removed from map', () => {
    const { plugin, stageHandlers } = setup();
    stageHandlers['pointerdown'](pdEvt({ pointerId: 1 }));
    stageHandlers['pointercancel']({ evt: { pointerId: 1 } });
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.pointers.has(1)).toBe(false);
  });

  it('7.2 no pointerId → does not throw', () => {
    const { stageHandlers } = setup();
    expect(() => stageHandlers['pointercancel']({ evt: {} })).not.toThrow();
  });
});

// ─── Suite 8: pointermove ─────────────────────────────────────────────────────

describe('WeaveStagePanningPlugin - pointermove', () => {
  afterEach(() => vi.clearAllMocks());

  function pmEvt(overrides: Record<string, unknown> = {}) {
    return {
      evt: {
        pointerId: 1,
        clientX: 110,
        clientY: 110,
        pointerType: 'mouse',
        buttons: 1,
        ...overrides,
      },
    };
  }

  it('8.1 updates currentPointer to stage.getPointerPosition()', () => {
    const { plugin, stage, stageHandlers } = setup();
    stage.getPointerPosition.mockReturnValue({ x: 42, y: 84 });
    stageHandlers['pointermove'](pmEvt());
    expect(plugin.currentPointer).toEqual({ x: 42, y: 84 });
  });

  it('8.2 touch with buttons !== 1 → returns early, no emitEvent', () => {
    const { stageHandlers, weave } = setup();
    stageHandlers['pointermove'](pmEvt({ pointerType: 'touch', buttons: 0 }));
    expect(weave.emitEvent).not.toHaveBeenCalled();
  });

  it('8.3 two pointers → returns early after updating map, no emitEvent', () => {
    const { stageHandlers, weave } = setup();
    stageHandlers['pointerdown'](pdEvt({ pointerId: 2 }));
    stageHandlers['pointermove'](pmEvt({ pointerId: 1 }));
    expect(weave.emitEvent).not.toHaveBeenCalled();
  });

  it('8.4 isSpaceKeyPressed=true → sets cursor to "grabbing"', () => {
    const { container, stageHandlers, keydownHandler } = setup();
    container.style.cursor = 'default';
    keydownHandler!({ code: 'Space' });
    container.style.cursor = 'something';
    stageHandlers['pointermove'](pmEvt());
    expect(container.style.cursor).toBe('grabbing');
  });

  it('8.5 !isDragging → returns early, no stage move', () => {
    const { stageHandlers, weave, stage } = setup();
    stageHandlers['pointermove'](pmEvt());
    const setterCalls = stage.x.mock.calls.filter((c: unknown[]) => c.length > 0);
    expect(setterCalls).toHaveLength(0);
    expect(weave.emitEvent).not.toHaveBeenCalled();
  });

  it('8.6 isDragging + pos + lastPos → moves stage by dx/dy, emits onStageMove', () => {
    const { weave, stage, stageHandlers } = setup();
    weave.getActiveAction.mockReturnValue(MOVE_TOOL_ACTION_NAME);
    stage.getPointerPosition.mockReturnValueOnce({ x: 50, y: 50 }); // lastPos in pointerdown
    stageHandlers['pointerdown'](pdEvt({ buttons: 1 }));
    stage.getPointerPosition.mockReturnValue({ x: 80, y: 70 });
    stageHandlers['pointermove'](pmEvt({ clientX: 80, clientY: 70 }));
    expect(stage.x).toHaveBeenCalledWith(30); // 0 + (80-50)
    expect(stage.y).toHaveBeenCalledWith(20); // 0 + (70-50)
    expect(weave.emitEvent).toHaveBeenCalledWith('onStageMove');
  });
});

// ─── Suite 9: pointerup ───────────────────────────────────────────────────────

describe('WeaveStagePanningPlugin - pointerup', () => {
  it('9.1 resets all flags and calls cleanupEdgeMoveIntervals()', () => {
    const { plugin, weave, stageHandlers } = setup();
    weave.getActiveAction.mockReturnValue(MOVE_TOOL_ACTION_NAME);
    stageHandlers['pointerdown'](pdEvt({ buttons: 1 }));
    stageHandlers['pointerup']({ evt: { pointerId: 1 } });
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.isMouseLeftButtonPressed).toBe(false);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.isMouseMiddleButtonPressed).toBe(false);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.moveToolActive).toBe(false);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.isDragging).toBe(false);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.enableMove).toBe(false);
    // @ts-expect-error — accessing private/protected member for test assertions
    expect(plugin.panning).toBe(false);
    expect(plugin.stageScrollInterval).toBeUndefined();
  });
});

// ─── Suite 10: handleWheel early exits ────────────────────────────────────────

describe('WeaveStagePanningPlugin - handleWheel early exits', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'elementFromPoint', {
      value: vi.fn().mockReturnValue(null),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => vi.clearAllMocks());

  function wEvt(overrides: Record<string, unknown> = {}) {
    return {
      clientX: 500,
      clientY: 400,
      deltaX: 10,
      deltaY: 20,
      ctrlKey: false,
      metaKey: false,
      buttons: 0,
      preventDefault: vi.fn(),
      ...overrides,
    };
  }

  it('10.1 ctrlKey=true → returns early, no stage move', () => {
    const { stage, wheelHandler } = setup();
    wheelHandler!(wEvt({ ctrlKey: true }));
    const setterCalls = stage.x.mock.calls.filter((c: unknown[]) => c.length > 0);
    expect(setterCalls).toHaveLength(0);
  });

  it('10.2 metaKey=true → returns early', () => {
    const { stage, wheelHandler } = setup();
    wheelHandler!(wEvt({ metaKey: true }));
    const setterCalls = stage.x.mock.calls.filter((c: unknown[]) => c.length > 0);
    expect(setterCalls).toHaveLength(0);
  });

  it('10.3 buttons===4 → returns early', () => {
    const { stage, wheelHandler } = setup();
    wheelHandler!(wEvt({ buttons: 4 }));
    const setterCalls = stage.x.mock.calls.filter((c: unknown[]) => c.length > 0);
    expect(setterCalls).toHaveLength(0);
  });

  it('10.4 !enabled → returns early', () => {
    const { plugin, stage, wheelHandler } = setup();
    plugin.disable();
    wheelHandler!(wEvt());
    const setterCalls = stage.x.mock.calls.filter((c: unknown[]) => c.length > 0);
    expect(setterCalls).toHaveLength(0);
  });

  it('10.5 getClosestParentWithWeaveId returns different element → returns early', () => {
    const { weave, stage, wheelHandler } = setup();
    weave.getClosestParentWithWeaveId.mockReturnValue(document.createElement('div'));
    wheelHandler!(wEvt());
    const setterCalls = stage.x.mock.calls.filter((c: unknown[]) => c.length > 0);
    expect(setterCalls).toHaveLength(0);
  });

  it('10.6 normal wheel → cancels contextMenu long press, moves stage, emits onStageMove', () => {
    const { weave, stage, wheelHandler } = setup();
    const mockContextMenu = { cancelLongPressTimer: vi.fn() };
    weave.getPlugin.mockReturnValue(mockContextMenu);
    wheelHandler!(wEvt({ deltaX: 10, deltaY: 20 }));
    expect(mockContextMenu.cancelLongPressTimer).toHaveBeenCalled();
    expect(stage.x).toHaveBeenCalledWith(-10); // 0 - 10
    expect(stage.y).toHaveBeenCalledWith(-20); // 0 - 20
    expect(weave.emitEvent).toHaveBeenCalledWith('onStageMove');
  });
});

// ─── Suite 11: handleWheel shadow DOM path ────────────────────────────────────

describe('WeaveStagePanningPlugin - handleWheel shadow DOM', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'elementFromPoint', {
      value: vi.fn().mockReturnValue(null),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => vi.clearAllMocks());

  it('11.1 isInShadowDOM=true, shadowHost exists → uses shadowHost.elementFromPoint', () => {
    const { weave, stage, wheelHandler } = setup();
    (isInShadowDOM as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const mockShadowHost = { elementFromPoint: vi.fn().mockReturnValue(null) };
    (getTopmostShadowHost as ReturnType<typeof vi.fn>).mockReturnValue(mockShadowHost);
    weave.getClosestParentWithWeaveId.mockReturnValue(stage.container());
    wheelHandler!({
      clientX: 500,
      clientY: 400,
      deltaX: 5,
      deltaY: 5,
      ctrlKey: false,
      metaKey: false,
      buttons: 0,
    });
    expect(mockShadowHost.elementFromPoint).toHaveBeenCalledWith(500, 400);
  });
});

// ─── Suite 12: dragstart ──────────────────────────────────────────────────────

describe('WeaveStagePanningPlugin - dragstart', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it('12.1 target already in panEdgeTargets → early return, no new interval', () => {
    const { plugin, stageHandlers } = setup();
    const target = makeTarget('node-1');
    stageHandlers['dragstart']({ target });
    const interval1 = plugin.stageScrollInterval;
    stageHandlers['dragstart']({ target }); // same target id
    expect(plugin.stageScrollInterval).toBe(interval1);
  });

  it('12.2 stageScrollInterval already exists → new target added, but no new interval', () => {
    const { plugin, stageHandlers } = setup();
    stageHandlers['dragstart']({ target: makeTarget('node-1') });
    const interval1 = plugin.stageScrollInterval;
    stageHandlers['dragstart']({ target: makeTarget('node-2') }); // different target
    expect(plugin.stageScrollInterval).toBe(interval1);
    expect(plugin.panEdgeTargets['node-2']).toBeDefined();
  });

  it('12.3 getPointerPosition=null → interval tick does nothing (no stage move)', () => {
    const { stage, stageHandlers } = setup();
    stage.getPointerPosition.mockReturnValue(null);
    stageHandlers['dragstart']({ target: makeTarget() });
    vi.advanceTimersByTime(17);
    const setterCalls = stage.x.mock.calls.filter((c: unknown[]) => c.length > 0);
    expect(setterCalls).toHaveLength(0);
  });

  it('12.4 pointer near left edge → target.x adjusted, stage.x moved right', () => {
    const { stage, stageHandlers } = setup();
    stage.getPointerPosition.mockReturnValue({ x: 10, y: 400 }); // x=10 < offset=25
    const target = makeTarget('node-1');
    stageHandlers['dragstart']({ target });
    vi.advanceTimersByTime(17);
    expect(target.x).toHaveBeenCalledWith(-20); // 0 - speed(20)/scaleX(1)
    expect(stage.x).toHaveBeenCalledWith(20);   // 0 + speed(20)
  });
});

// ─── Suite 13: dragstart — edge directions ────────────────────────────────────

describe('WeaveStagePanningPlugin - dragstart edge directions', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it('13.1 near right edge → target.x adjusted, stage.x moved left', () => {
    const { stage, stageHandlers } = setup();
    stage.getPointerPosition.mockReturnValue({ x: 990, y: 400 }); // x=990 > 1000-25=975
    const target = makeTarget('node-1');
    stageHandlers['dragstart']({ target });
    vi.advanceTimersByTime(17);
    expect(target.x).toHaveBeenCalledWith(20); // 0 + speed(20)/scaleX(1)
    expect(stage.x).toHaveBeenCalledWith(-20); // 0 - speed(20)
  });

  it('13.2 near top edge → target.y adjusted, stage.y moved down', () => {
    const { stage, stageHandlers } = setup();
    stage.getPointerPosition.mockReturnValue({ x: 500, y: 10 }); // y=10 < offset=25
    const target = makeTarget('node-1');
    stageHandlers['dragstart']({ target });
    vi.advanceTimersByTime(17);
    expect(target.y).toHaveBeenCalledWith(-20); // 0 - speed/scaleY
    expect(stage.y).toHaveBeenCalledWith(20);   // 0 + speed
  });

  it('13.3 near bottom edge → target.y adjusted, stage.y moved up', () => {
    const { stage, stageHandlers } = setup();
    stage.getPointerPosition.mockReturnValue({ x: 500, y: 790 }); // y=790 > 800-25=775
    const target = makeTarget('node-1');
    stageHandlers['dragstart']({ target });
    vi.advanceTimersByTime(17);
    expect(target.y).toHaveBeenCalledWith(20); // 0 + speed/scaleY
    expect(stage.y).toHaveBeenCalledWith(-20); // 0 - speed
  });

  it('13.4 not near any edge → no target/stage movement', () => {
    const { stage, stageHandlers } = setup();
    stage.getPointerPosition.mockReturnValue({ x: 500, y: 400 }); // center
    const target = makeTarget('node-1');
    stageHandlers['dragstart']({ target });
    vi.advanceTimersByTime(17);
    const xSetter = target.x.mock.calls.filter((c: unknown[]) => c.length > 0);
    const ySetter = target.y.mock.calls.filter((c: unknown[]) => c.length > 0);
    expect(xSetter).toHaveLength(0);
    expect(ySetter).toHaveLength(0);
  });
});

// ─── Suite 14: dragend ────────────────────────────────────────────────────────

describe('WeaveStagePanningPlugin - dragend', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it('14.1 dragend → cleanupEdgeMoveIntervals called (panEdgeTargets cleared, interval cleared)', () => {
    const { plugin, stage, stageHandlers } = setup();
    stage.getPointerPosition.mockReturnValue({ x: 10, y: 400 });
    stageHandlers['dragstart']({ target: makeTarget('n1') });
    expect(plugin.stageScrollInterval).toBeDefined();
    stageHandlers['dragend']({});
    expect(plugin.panEdgeTargets).toEqual({});
    expect(plugin.stageScrollInterval).toBeUndefined();
  });
});

// ─── Suite 15: container CSS setup ───────────────────────────────────────────

describe('WeaveStagePanningPlugin - container CSS setup on onInit()', () => {
  it('15.1 sets touchAction, userSelect, -webkit-user-drag; adds touchmove listener', () => {
    const { container, stage } = setup();
    const content = stage.getContent();
    expect(container.style.touchAction).toBe('none');
    expect(container.style.userSelect).toBe('none');
    expect(container.style.setProperty).toHaveBeenCalledWith('-webkit-user-drag', 'none');
    expect(content.addEventListener).toHaveBeenCalledWith(
      'touchmove',
      expect.any(Function),
      expect.objectContaining({ passive: false })
    );
  });
});

// ─── Suite 16: isPanning() ────────────────────────────────────────────────────

describe('WeaveStagePanningPlugin - isPanning()', () => {
  it('16.1 returns panning (false by default)', () => {
    const { plugin } = setup();
    expect(plugin.isPanning()).toBe(false);
  });
});

// ─── Suite 17: getDistance() ─────────────────────────────────────────────────

describe('WeaveStagePanningPlugin - getDistance()', () => {
  it('17.1 returns euclidean distance', () => {
    const { plugin } = setup();
    expect(plugin.getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

// ─── Suite 18: getTouchCenter() ──────────────────────────────────────────────

describe('WeaveStagePanningPlugin - getTouchCenter()', () => {
  it('18.1 exactly 2 pointers → returns midpoint', () => {
    const { plugin, stageHandlers } = setup();
    stageHandlers['pointerdown'](pdEvt({ pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch', buttons: 1 }));
    stageHandlers['pointerdown'](pdEvt({ pointerId: 2, clientX: 100, clientY: 200, pointerType: 'touch', buttons: 1 }));
    expect(plugin.getTouchCenter()).toEqual({ x: 50, y: 100 });
  });

  it('18.2 not 2 pointers → returns null', () => {
    const { plugin } = setup();
    expect(plugin.getTouchCenter()).toBeNull();
  });
});

// ─── Suite 19: plugin getters ─────────────────────────────────────────────────

describe('WeaveStagePanningPlugin - plugin getters', () => {
  it('19.1 plugin present → all getters return it', () => {
    const { plugin, weave } = setup();
    const mockZoom = {};
    weave.getPlugin.mockReturnValue(mockZoom);
    expect(plugin.getZoomPlugin()).toBe(mockZoom);
    expect(plugin.getContextMenuPlugin()).toBe(mockZoom);
    expect(plugin.getNodesSelectionPlugin()).toBe(mockZoom);
    expect(plugin.getStageGridPlugin()).toBe(mockZoom);
  });

  it('19.2 plugin absent → all getters return undefined', () => {
    const { plugin, weave } = setup();
    weave.getPlugin.mockReturnValue(undefined);
    expect(plugin.getZoomPlugin()).toBeUndefined();
    expect(plugin.getContextMenuPlugin()).toBeUndefined();
    expect(plugin.getNodesSelectionPlugin()).toBeUndefined();
    expect(plugin.getStageGridPlugin()).toBeUndefined();
  });
});

// ─── Suite 20: getCurrentPointer / cleanupEdgeMoveIntervals / enable / disable

describe('WeaveStagePanningPlugin - getCurrentPointer / cleanup / enable / disable', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it('20.1 getCurrentPointer() returns currentPointer', () => {
    const { plugin } = setup();
    plugin.currentPointer = { x: 5, y: 10 };
    expect(plugin.getCurrentPointer()).toEqual({ x: 5, y: 10 });
  });

  it('20.2 cleanupEdgeMoveIntervals() clears panEdgeTargets and stageScrollInterval', () => {
    const { plugin, stage, stageHandlers } = setup();
    stage.getPointerPosition.mockReturnValue({ x: 10, y: 400 });
    stageHandlers['dragstart']({ target: makeTarget('n1') });
    expect(plugin.stageScrollInterval).toBeDefined();
    plugin.cleanupEdgeMoveIntervals();
    expect(plugin.panEdgeTargets).toEqual({});
    expect(plugin.stageScrollInterval).toBeUndefined();
  });

  it('20.3 enable() sets enabled to true', () => {
    const { plugin } = setup();
    plugin.disable();
    plugin.enable();
    expect(plugin.enabled).toBe(true);
  });

  it('20.4 disable() sets enabled to false', () => {
    const { plugin } = setup();
    plugin.disable();
    expect(plugin.enabled).toBe(false);
  });
});
