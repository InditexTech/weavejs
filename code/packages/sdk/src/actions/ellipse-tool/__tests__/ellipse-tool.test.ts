// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Break circular dependency: action.ts → @/weave → managers/async → @/index.node → index.common → …
vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));

// Ellipse-tool delegates shape creation to nodeHandler — no direct Konva constructors needed.
vi.mock('konva', () => ({ default: {} }));

// In Vitest node environment, `window` is not defined — alias it to globalThis
if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { type R } from '../../__tests__/shared/action.test-helpers';
import { WeaveEllipseToolAction } from '../ellipse-tool';
import {
  ELLIPSE_TOOL_ACTION_NAME,
  ELLIPSE_TOOL_STATE,
} from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeMockWeave() {
  const container = {
    tabIndex: 0,
    focus: vi.fn(),
    blur: vi.fn(),
    style: { cursor: '' },
  };

  const stageHandlers: Record<string, (e?: unknown) => void> = {};
  const stage = {
    container: vi.fn().mockReturnValue(container),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      stageHandlers[event] = handler;
    }),
    findOne: vi.fn().mockReturnValue(undefined),
  };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(undefined),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    getActiveAction: vi.fn().mockReturnValue(ELLIPSE_TOOL_ACTION_NAME),
    getEventsController: vi.fn().mockReturnValue({ signal: new AbortController().signal }),
    getMousePointer: vi.fn().mockReturnValue({
      mousePoint: { x: 10, y: 20 },
      container: { getAttrs: vi.fn().mockReturnValue({ id: 'mainLayer' }) },
    }),
    getMousePointerRelativeToContainer: vi.fn().mockReturnValue({
      mousePoint: { x: 30, y: 40 },
    }),
    addNode: vi.fn(),
    updateNode: vi.fn(),
    triggerAction: vi.fn(),
    emitEvent: vi.fn(),
    _stage: stage,
    _container: container,
    _stageHandlers: stageHandlers,
  };
}

function makePointerEvent(opts: {
  pointerId?: number;
  clientX?: number;
  clientY?: number;
  buttons?: number;
  pointerType?: string;
} = {}) {
  return {
    evt: {
      pointerId: opts.pointerId ?? 1,
      clientX: opts.clientX ?? 0,
      clientY: opts.clientY ?? 0,
      buttons: opts.buttons ?? 1,
      pointerType: opts.pointerType ?? 'mouse',
      stopPropagation: vi.fn(),
    },
  };
}

function makeMockEllipse() {
  const attrs: R = { id: 'ellipse-1' };
  return {
    setAttrs: vi.fn((a: R) => { Object.assign(attrs, a); }),
    getAttrs: vi.fn(() => ({ ...attrs })),
    destroy: vi.fn(),
  };
}

function makeMockNodeHandler() {
  return {
    create: vi.fn().mockReturnValue({ id: 'ellipse-1', props: {} }),
    onUpdate: vi.fn(),
    serialize: vi.fn().mockReturnValue({ id: 'ellipse-1', type: 'ellipse', props: {} }),
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveEllipseToolAction', () => {
  let action: WeaveEllipseToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let windowHandlers: Record<string, (e: unknown) => void>;

  beforeEach(() => {
    windowHandlers = {};
    vi.stubGlobal(
      'addEventListener',
      vi.fn((type: string, handler: (e: unknown) => void) => {
        windowHandlers[type] = handler;
      })
    );

    action = new WeaveEllipseToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
    (action as unknown as R)['cancelAction'] = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function triggerAndCapture(cancelFn = vi.fn()) {
    action.trigger(cancelFn);
    return { cancelFn, handlers: mockWeave._stageHandlers };
  }

  // ── Suite 1: constructor / initialize ─────────────────────────────────────

  describe('constructor / initialize', () => {
    it('1.1 initialized is false after construction', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
    });

    it('1.2 state is ELLIPSE_TOOL_STATE.IDLE after construction', () => {
      expect((action as unknown as R)['state']).toBe(ELLIPSE_TOOL_STATE.IDLE);
    });

    it('1.3 ellipseId is null', () => {
      expect((action as unknown as R)['ellipseId']).toBeNull();
    });

    it('1.4 creating is false', () => {
      expect((action as unknown as R)['creating']).toBe(false);
    });

    it('1.5 moved is false', () => {
      expect((action as unknown as R)['moved']).toBe(false);
    });

    it('1.6 pointers is an empty Map', () => {
      const pointers = (action as unknown as R)['pointers'];
      expect(pointers).toBeInstanceOf(Map);
      expect((pointers as Map<number, unknown>).size).toBe(0);
    });

    it('1.7 container is undefined, clickPoint is null', () => {
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });

    it('1.8 onPropsChange and onInit are undefined; props equals initProps() result', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
      expect(action.props).toEqual({
        opacity: 1,
        fill: '#ffffffff',
        stroke: '#000000ff',
        strokeWidth: 1,
        radiusX: 50,
        radiusY: 50,
        keepAspectRatio: false,
      });
    });
  });

  // ── Suite 2: getName ───────────────────────────────────────────────────────

  describe('getName', () => {
    it('2.1 returns ELLIPSE_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(ELLIPSE_TOOL_ACTION_NAME);
    });
  });

  // ── Suite 3: initProps ─────────────────────────────────────────────────────

  describe('initProps', () => {
    it('3.1 returns default props object', () => {
      const props = (action as unknown as R)['initProps']() as R;
      expect(props).toEqual({
        opacity: 1,
        fill: '#ffffffff',
        stroke: '#000000ff',
        strokeWidth: 1,
        radiusX: 50,
        radiusY: 50,
        keepAspectRatio: false,
      });
    });
  });

  // ── Suite 4: setupEvents – keydown ─────────────────────────────────────────

  describe('setupEvents – keydown', () => {
    beforeEach(() => {
      triggerAndCapture();
    });

    it('4.1 Enter + active=ellipseTool → cancelAction called', () => {
      const cancelAction = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelAction;
      mockWeave.getActiveAction.mockReturnValue(ELLIPSE_TOOL_ACTION_NAME);
      windowHandlers['keydown']?.({ code: 'Enter' });
      expect(cancelAction).toHaveBeenCalled();
    });

    it('4.2 Enter + active≠ellipseTool → cancelAction NOT called', () => {
      const cancelAction = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelAction;
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      windowHandlers['keydown']?.({ code: 'Enter' });
      expect(cancelAction).not.toHaveBeenCalled();
    });

    it('4.3 Escape + active=ellipseTool → cancelAction called', () => {
      const cancelAction = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelAction;
      mockWeave.getActiveAction.mockReturnValue(ELLIPSE_TOOL_ACTION_NAME);
      windowHandlers['keydown']?.({ code: 'Escape' });
      expect(cancelAction).toHaveBeenCalled();
    });

    it('4.4 Escape + active≠ellipseTool → cancelAction NOT called', () => {
      const cancelAction = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelAction;
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      windowHandlers['keydown']?.({ code: 'Escape' });
      expect(cancelAction).not.toHaveBeenCalled();
    });

    it('4.5 other key → nothing', () => {
      const cancelAction = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelAction;
      windowHandlers['keydown']?.({ code: 'KeyA' });
      expect(cancelAction).not.toHaveBeenCalled();
    });
  });

  // ── Suite 5: setupEvents – pointerdown ────────────────────────────────────

  describe('setupEvents – pointerdown', () => {
    let handlers: Record<string, (e?: unknown) => void>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
    });

    it('5.1 pointers.size=2, active=ellipseTool → state=ADDING, handleAdding NOT called', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.ADDING;
      // Add a first pointer to the map so the second push makes size=2
      (action as unknown as R)['pointers'] = new Map([[99, { x: 0, y: 0 }]]);
      mockWeave.getActiveAction.mockReturnValue(ELLIPSE_TOOL_ACTION_NAME);
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 2 }));
      expect((action as unknown as R)['state']).toBe(ELLIPSE_TOOL_STATE.ADDING);
      // creating should NOT be set (early return before handleAdding)
      expect((action as unknown as R)['creating']).toBe(false);
    });

    it('5.2 pointers.size=1, state=ADDING → creating=true, handleAdding called', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.ADDING;
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['creating']).toBe(true);
      // handleAdding sets state to DEFINING_SIZE
      expect((action as unknown as R)['state']).toBe(ELLIPSE_TOOL_STATE.DEFINING_SIZE);
    });

    it('5.3 pointers.size=1, state=IDLE → neither branch fires', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.IDLE;
      const originalState = ELLIPSE_TOOL_STATE.IDLE;
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['state']).toBe(originalState);
      expect((action as unknown as R)['creating']).toBe(false);
    });

    it('5.4 pointer id stored in pointers map', () => {
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 42, clientX: 5, clientY: 7 }));
      const pointers = (action as unknown as R)['pointers'] as Map<number, { x: number; y: number }>;
      expect(pointers.has(42)).toBe(true);
      expect(pointers.get(42)).toEqual({ x: 5, y: 7 });
    });

  });

  // ── Suite 6: setupEvents – pointermove ────────────────────────────────────

  describe('setupEvents – pointermove', () => {
    let handlers: Record<string, (e?: unknown) => void>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
      // Set up a pointer in the map so we can test the pointerId path
      (action as unknown as R)['pointers'] = new Map([[1, { x: 0, y: 0 }]]);
    });

    it('6.1 state=IDLE → early return, cursor NOT set', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.IDLE;
      handlers['pointermove']?.(makePointerEvent());
      expect(mockWeave._container.style.cursor).toBe('crosshair'); // from trigger's addEllipse
      // Reset cursor to check setCursor is NOT called again
      mockWeave._container.style.cursor = '';
      handlers['pointermove']?.(makePointerEvent());
      expect(mockWeave._container.style.cursor).toBe('');
    });

    it('6.2 state=ADDING, isPressed=false → setCursor called, return', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.ADDING;
      const e = makePointerEvent({ buttons: 0 }); // buttons=0 → not pressed
      handlers['pointermove']?.(e);
      expect(mockWeave._container.style.cursor).toBe('crosshair');
    });

    it('6.3 state=ADDING, isPressed=true, pointerId NOT in pointers → setCursor + return', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.ADDING;
      const e = makePointerEvent({ pointerId: 999, buttons: 1 }); // not in map
      handlers['pointermove']?.(e);
      expect(mockWeave._container.style.cursor).toBe('crosshair');
      // state unchanged
      expect((action as unknown as R)['state']).toBe(ELLIPSE_TOOL_STATE.ADDING);
    });

    it('6.4 state=ADDING, pressed, pointerId in pointers, size=2 + active=ellipse → state=ADDING, return', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.ADDING;
      // Add a second pointer to make size=2
      (action as unknown as R)['pointers'] = new Map([[1, { x: 0, y: 0 }], [2, { x: 10, y: 10 }]]);
      mockWeave.getActiveAction.mockReturnValue(ELLIPSE_TOOL_ACTION_NAME);
      handlers['pointermove']?.(makePointerEvent({ pointerId: 1, buttons: 1 }));
      expect((action as unknown as R)['state']).toBe(ELLIPSE_TOOL_STATE.ADDING);
      expect((action as unknown as R)['moved']).toBe(false);
    });

    it('6.5 state=ADDING, pressed, pointerId in pointers, size=1 → no-op (not DEFINING_SIZE)', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.ADDING;
      handlers['pointermove']?.(makePointerEvent({ pointerId: 1, buttons: 1 }));
      expect((action as unknown as R)['moved']).toBe(false);
      expect((action as unknown as R)['state']).toBe(ELLIPSE_TOOL_STATE.ADDING);
    });

    it('6.6 state=DEFINING_SIZE, pressed, pointerId in pointers → moved=true, handleMovement called', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['ellipseId'] = 'ellipse-1';
      (action as unknown as R)['container'] = { getAttrs: vi.fn().mockReturnValue({ id: 'layer' }) };
      (action as unknown as R)['clickPoint'] = { x: 10, y: 20 };
      const mockEllipse = makeMockEllipse();
      mockWeave._stage.findOne.mockReturnValue(mockEllipse);
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      handlers['pointermove']?.(makePointerEvent({ pointerId: 1, buttons: 1 }));
      expect((action as unknown as R)['moved']).toBe(true);
      expect(nodeHandler.onUpdate).toHaveBeenCalled();
    });

    it('6.7 state=DEFINING_SIZE, pressed, pointerId in pointers, size=2 → state=ADDING, return before handleMovement', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['pointers'] = new Map([[1, { x: 0, y: 0 }], [2, { x: 10, y: 10 }]]);
      mockWeave.getActiveAction.mockReturnValue(ELLIPSE_TOOL_ACTION_NAME);
      handlers['pointermove']?.(makePointerEvent({ pointerId: 1, buttons: 1 }));
      expect((action as unknown as R)['state']).toBe(ELLIPSE_TOOL_STATE.ADDING);
      expect((action as unknown as R)['moved']).toBe(false);
    });
  });

  // ── Suite 7: setupEvents – pointerup ──────────────────────────────────────

  describe('setupEvents – pointerup', () => {
    let handlers: Record<string, (e?: unknown) => void>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
      (action as unknown as R)['pointers'] = new Map([[1, { x: 0, y: 0 }]]);
    });

    it('7.1 isTap=true → moved=false', () => {
      (action as unknown as R)['moved'] = true;
      // isTap requires: pen/touch, dist<10, dt<300
      // Set tapStart to same position and recent time
      (action as unknown as R)['tapStart'] = { x: 0, y: 0, time: performance.now() - 10 };
      const e = makePointerEvent({ pointerId: 1, clientX: 0, clientY: 0, pointerType: 'pen' });
      handlers['pointerup']?.(e);
      expect((action as unknown as R)['moved']).toBe(false);
    });

    it('7.2 isTap=false → moved unchanged', () => {
      (action as unknown as R)['moved'] = true;
      // isTap false: pointerType='mouse'
      (action as unknown as R)['tapStart'] = { x: 0, y: 0, time: performance.now() - 10 };
      const e = makePointerEvent({ pointerId: 1, clientX: 0, clientY: 0, pointerType: 'mouse' });
      handlers['pointerup']?.(e);
      expect((action as unknown as R)['moved']).toBe(true);
    });

    it('7.3 state=DEFINING_SIZE → creating=false, handleSettingSize called', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['ellipseId'] = 'ellipse-1';
      (action as unknown as R)['clickPoint'] = { x: 10, y: 20 };
      (action as unknown as R)['container'] = { getAttrs: vi.fn().mockReturnValue({ id: 'layer' }) };
      const mockEllipse = makeMockEllipse();
      mockWeave._stage.findOne.mockReturnValue(mockEllipse);
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      handlers['pointerup']?.(makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['creating']).toBe(false);
      expect(cancelFn).toHaveBeenCalled(); // handleSettingSize calls cancelAction
    });

    it('7.4 state≠DEFINING_SIZE (ADDING) → handleSettingSize NOT called', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.ADDING;
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      handlers['pointerup']?.(makePointerEvent({ pointerId: 1 }));
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 8: handleAdding ─────────────────────────────────────────────────

  describe('handleAdding (private)', () => {
    const callHandleAdding = (a: WeaveEllipseToolAction) =>
      (a as unknown as R)['handleAdding']();

    beforeEach(() => {
      triggerAndCapture();
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.ADDING;
    });

    it('8.1 nodeHandler present → create() + addNode() called; state→DEFINING_SIZE', () => {
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      callHandleAdding(action);
      expect(nodeHandler.create).toHaveBeenCalled();
      expect(mockWeave.addNode).toHaveBeenCalled();
      expect((action as unknown as R)['state']).toBe(ELLIPSE_TOOL_STATE.DEFINING_SIZE);
    });

    it('8.2 nodeHandler absent → skips node creation; state still→DEFINING_SIZE', () => {
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      callHandleAdding(action);
      expect(mockWeave.addNode).not.toHaveBeenCalled();
      expect((action as unknown as R)['state']).toBe(ELLIPSE_TOOL_STATE.DEFINING_SIZE);
    });

    it('8.3 mousePoint=null → clickPoint?.x ?? 0 and clickPoint?.y ?? 0 use 0', () => {
      mockWeave.getMousePointer.mockReturnValue({ mousePoint: null, container: undefined });
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      callHandleAdding(action);
      expect(nodeHandler.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
      );
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });

    it('8.4 container=undefined → addNode called with undefined container id', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 5, y: 5 },
        container: undefined,
      });
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      callHandleAdding(action);
      expect(mockWeave.addNode).toHaveBeenCalledWith(expect.anything(), undefined);
    });

    it('8.5 container defined → addNode called with container id', () => {
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      callHandleAdding(action);
      expect(mockWeave.addNode).toHaveBeenCalledWith(expect.anything(), 'mainLayer');
    });
  });

  // ── Suite 9: handleSettingSize ────────────────────────────────────────────

  describe('handleSettingSize (private)', () => {
    const callHandleSettingSize = (a: WeaveEllipseToolAction) =>
      (a as unknown as R)['handleSettingSize']();

    let mockEllipse: ReturnType<typeof makeMockEllipse>;

    function setupSettingSize() {
      mockEllipse = makeMockEllipse();
      (action as unknown as R)['ellipseId'] = 'ellipse-1';
      (action as unknown as R)['clickPoint'] = { x: 10, y: 20 };
      (action as unknown as R)['container'] = { getAttrs: vi.fn().mockReturnValue({ id: 'layer' }) };
      mockWeave._stage.findOne.mockReturnValue(mockEllipse);
    }

    beforeEach(() => {
      triggerAndCapture();
    });

    it('9.1 all conditions true + moved=true → computed pos/radii, updateNode, emitEvent, cancelAction', () => {
      setupSettingSize();
      (action as unknown as R)['moved'] = true;
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      callHandleSettingSize(action);
      // moved=true → pos = min(clickPoint, mousePoint), radii from diff
      expect(mockEllipse.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({ x: 10, y: 20 }) // min(10,30)=10, min(20,40)=20
      );
      expect(nodeHandler.serialize).toHaveBeenCalled();
      expect(mockWeave.updateNode).toHaveBeenCalled();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedEllipse');
      expect(cancelFn).toHaveBeenCalled();
    });

    it('9.2 all conditions true + moved=false → default pos/radii, updateNode called', () => {
      setupSettingSize();
      (action as unknown as R)['moved'] = false;
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      callHandleSettingSize(action);
      // moved=false → pos = clickPoint = {x:10, y:20}
      expect(mockEllipse.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({ x: 10, y: 20 })
      );
      expect(nodeHandler.serialize).toHaveBeenCalled();
      expect(cancelFn).toHaveBeenCalled();
    });

    it('9.3 nodeHandler absent → skips updateNode, still emits event + cancelAction', () => {
      setupSettingSize();
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      callHandleSettingSize(action);
      expect(mockWeave.updateNode).not.toHaveBeenCalled();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedEllipse');
      expect(cancelFn).toHaveBeenCalled();
    });

    it('9.4 ellipseId=null → skips inner block, only cancelAction called', () => {
      (action as unknown as R)['ellipseId'] = null;
      (action as unknown as R)['clickPoint'] = { x: 10, y: 20 };
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      callHandleSettingSize(action);
      expect(mockWeave.updateNode).not.toHaveBeenCalled();
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAddedEllipse');
      expect(cancelFn).toHaveBeenCalled();
    });

    it('9.5 clickPoint=null → compound guard false → only cancelAction', () => {
      (action as unknown as R)['ellipseId'] = 'ellipse-1';
      (action as unknown as R)['clickPoint'] = null;
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      callHandleSettingSize(action);
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAddedEllipse');
      expect(cancelFn).toHaveBeenCalled();
    });

    it('9.6 ellipse not found → compound guard false → only cancelAction', () => {
      (action as unknown as R)['ellipseId'] = 'ellipse-1';
      (action as unknown as R)['clickPoint'] = { x: 10, y: 20 };
      (action as unknown as R)['container'] = { getAttrs: vi.fn().mockReturnValue({ id: 'layer' }) };
      mockWeave._stage.findOne.mockReturnValue(undefined);
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      callHandleSettingSize(action);
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAddedEllipse');
      expect(cancelFn).toHaveBeenCalled();
    });
  });

  // ── Suite 10: handleMovement ──────────────────────────────────────────────

  describe('handleMovement (private)', () => {
    const callHandleMovement = (a: WeaveEllipseToolAction) =>
      (a as unknown as R)['handleMovement']();

    beforeEach(() => {
      triggerAndCapture();
    });

    it('10.1 state≠DEFINING_SIZE → early return', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.ADDING;
      expect(() => callHandleMovement(action)).not.toThrow();
      expect(mockWeave.getNodeHandler).not.toHaveBeenCalled();
    });

    it('10.2 all conditions true + moved=true → ellipsePos = Math.min(...)', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['ellipseId'] = 'ellipse-1';
      (action as unknown as R)['container'] = { getAttrs: vi.fn().mockReturnValue({ id: 'layer' }) };
      (action as unknown as R)['clickPoint'] = { x: 10, y: 20 };
      (action as unknown as R)['moved'] = true;
      const mockEllipse = makeMockEllipse();
      mockWeave._stage.findOne.mockReturnValue(mockEllipse);
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      callHandleMovement(action);
      // moved=true: ellipsePos.x = Math.min(10,30)=10, ellipsePos.y = Math.min(20,40)=20
      expect(nodeHandler.onUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 'ellipse-1' })
      );
    });

    it('10.3 all conditions true + moved=false → ellipsePos stays at clickPoint', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['ellipseId'] = 'ellipse-1';
      (action as unknown as R)['container'] = { getAttrs: vi.fn().mockReturnValue({ id: 'layer' }) };
      (action as unknown as R)['clickPoint'] = { x: 10, y: 20 };
      (action as unknown as R)['moved'] = false;
      const mockEllipse = makeMockEllipse();
      mockWeave._stage.findOne.mockReturnValue(mockEllipse);
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      callHandleMovement(action);
      expect(nodeHandler.onUpdate).toHaveBeenCalled();
    });

    it('10.4 nodeHandler absent → skips onUpdate', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['ellipseId'] = 'ellipse-1';
      (action as unknown as R)['container'] = { getAttrs: vi.fn().mockReturnValue({ id: 'layer' }) };
      (action as unknown as R)['clickPoint'] = { x: 10, y: 20 };
      const mockEllipse = makeMockEllipse();
      mockWeave._stage.findOne.mockReturnValue(mockEllipse);
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      expect(() => callHandleMovement(action)).not.toThrow();
      expect(mockWeave.updateNode).not.toHaveBeenCalled();
    });

    it('10.5 ellipse not found → compound guard false, inner block skipped', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['ellipseId'] = 'ellipse-1';
      (action as unknown as R)['container'] = { getAttrs: vi.fn().mockReturnValue({ id: 'layer' }) };
      (action as unknown as R)['clickPoint'] = { x: 10, y: 20 };
      mockWeave._stage.findOne.mockReturnValue(undefined);
      expect(() => callHandleMovement(action)).not.toThrow();
    });

    it('10.6 ellipseId=null → compound guard false', () => {
      (action as unknown as R)['state'] = ELLIPSE_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['ellipseId'] = null;
      expect(() => callHandleMovement(action)).not.toThrow();
    });
  });

  // ── Suite 11: trigger ─────────────────────────────────────────────────────

  describe('trigger', () => {
    it('11.1 no instance set → throws "Instance not defined"', () => {
      const bare = new WeaveEllipseToolAction();
      expect(() => bare.trigger(vi.fn())).toThrow('Instance not defined');
    });

    it('11.2 first call → setupEvents called, initialized=true', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      action.trigger(vi.fn());
      expect((action as unknown as R)['initialized']).toBe(true);
      // stage.on should have been called 3 times (pointerdown, pointermove, pointerup)
      expect(mockWeave._stage.on).toHaveBeenCalledTimes(3);
    });

    it('11.3 second call → setupEvents NOT called again', () => {
      action.trigger(vi.fn());
      action.trigger(vi.fn());
      // Still only 3 stage.on calls (not 6)
      expect(mockWeave._stage.on).toHaveBeenCalledTimes(3);
    });

    it('11.4 selectionPlugin present → setSelectedNodes([]) called', () => {
      const selPlugin = { setSelectedNodes: vi.fn(), getTransformer: vi.fn().mockReturnValue({ hide: vi.fn() }) };
      mockWeave.getPlugin.mockReturnValue(selPlugin);
      action.trigger(vi.fn());
      expect(selPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
    });

    it('11.5 selectionPlugin absent → skips setSelectedNodes', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => action.trigger(vi.fn())).not.toThrow();
    });

    it('11.6 sets tabIndex=1, calls focus(), stores cancelAction, calls initProps, addEllipse', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      expect(mockWeave._container.tabIndex).toBe(1);
      expect(mockWeave._container.focus).toHaveBeenCalled();
      expect((action as unknown as R)['cancelAction']).toBe(cancelFn);
      // addEllipse emits onAddingEllipse and sets state=ADDING
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddingEllipse');
      expect((action as unknown as R)['state']).toBe(ELLIPSE_TOOL_STATE.ADDING);
    });
  });

  // ── Suite 12: cleanup ─────────────────────────────────────────────────────

  describe('cleanup', () => {
    beforeEach(() => {
      triggerAndCapture();
      (action as unknown as R)['ellipseId'] = 'ellipse-1';
      (action as unknown as R)['creating'] = true;
      (action as unknown as R)['moved'] = true;
      (action as unknown as R)['container'] = { getAttrs: vi.fn().mockReturnValue({ id: 'layer' }) };
      (action as unknown as R)['clickPoint'] = { x: 5, y: 5 };
    });

    it('12.1 selectionPlugin present + findOne returns node → setSelectedNodes + triggerAction', () => {
      const node = { id: 'ellipse-1' };
      mockWeave._stage.findOne.mockReturnValue(node);
      const selPlugin = { setSelectedNodes: vi.fn(), triggerAction: vi.fn() };
      mockWeave.getPlugin.mockReturnValue(selPlugin);
      action.cleanup();
      expect(selPlugin.setSelectedNodes).toHaveBeenCalledWith([node]);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('12.2 selectionPlugin present + findOne returns undefined → no setSelectedNodes, still triggerAction', () => {
      mockWeave._stage.findOne.mockReturnValue(undefined);
      const selPlugin = { setSelectedNodes: vi.fn() };
      mockWeave.getPlugin.mockReturnValue(selPlugin);
      action.cleanup();
      expect(selPlugin.setSelectedNodes).not.toHaveBeenCalled();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('12.3 selectionPlugin absent → skips both', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => action.cleanup()).not.toThrow();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('12.4 cursor set to "default"; fields reset', () => {
      action.cleanup();
      expect(mockWeave._container.style.cursor).toBe('default');
      expect((action as unknown as R)['ellipseId']).toBeNull();
      expect((action as unknown as R)['creating']).toBe(false);
      expect((action as unknown as R)['moved']).toBe(false);
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });

    it('12.5 state set to IDLE', () => {
      action.cleanup();
      expect((action as unknown as R)['state']).toBe(ELLIPSE_TOOL_STATE.IDLE);
    });
  });

  // ── Suite 13: setCursor ───────────────────────────────────────────────────

  describe('setCursor (private, via trigger)', () => {
    it('13.1 sets stage.container().style.cursor to "crosshair"', () => {
      mockWeave._container.style.cursor = '';
      action.trigger(vi.fn()); // trigger → addEllipse → setCursor
      expect(mockWeave._container.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 14: setFocusStage ───────────────────────────────────────────────

  describe('setFocusStage (private, via trigger)', () => {
    it('14.1 sets tabIndex=1, calls blur() then focus()', () => {
      action.trigger(vi.fn()); // trigger → addEllipse → setFocusStage
      expect(mockWeave._container.tabIndex).toBe(1);
      expect(mockWeave._container.blur).toHaveBeenCalled();
      expect(mockWeave._container.focus).toHaveBeenCalled();
    });
  });
});
