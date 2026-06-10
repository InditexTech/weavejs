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

vi.mock('konva', () => {
  function makeShape(attrs: Record<string, unknown> = {}) {
    const _a: Record<string, unknown> = { ...attrs };
    return {
      setAttrs: vi.fn((a: Record<string, unknown>) => {
        Object.assign(_a, a);
      }),
      getAttrs: vi.fn(() => ({ ..._a })),
      points: vi.fn((p?: number[]) => {
        if (p !== undefined) {
          _a['points'] = p;
          return;
        }
        return (_a['points'] as number[]) ?? [0, 0];
      }),
      x: vi.fn(() => (_a['x'] as number) ?? 0),
      y: vi.fn(() => (_a['y'] as number) ?? 0),
      clone: vi.fn(function () {
        return makeShape({ ..._a });
      }),
      destroy: vi.fn(),
      moveToTop: vi.fn(),
      add: vi.fn(),
    };
  }

  return {
    default: {
      Line: vi.fn((attrs: Record<string, unknown>) => makeShape(attrs)),
      Arrow: vi.fn((attrs: Record<string, unknown>) => makeShape(attrs)),
      Circle: vi.fn((attrs: Record<string, unknown>) => makeShape(attrs)),
    },
  };
});

vi.mock('simplify-js', () => ({
  default: vi.fn().mockImplementation((pts: unknown[]) => pts),
}));

// In Vitest node environment, `window` is not defined — alias it to globalThis
if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { type R } from '../../__tests__/shared/action.test-helpers';
import { WeaveBrushToolAction } from '../brush-tool';
import {
  BRUSH_TOOL_ACTION_NAME,
  BRUSH_TOOL_DEFAULT_CONFIG,
  BRUSH_TOOL_STATE,
} from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';
import simplify from 'simplify-js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeMockMeasureContainer() {
  return {
    add: vi.fn(),
    getAttrs: vi.fn().mockReturnValue({ id: 'measureLayer' }),
  };
}

function makeMockTempStroke(strokeId: string, elements: R[] = [{ x: 0, y: 0, pressure: 0.5 }]) {
  const attrs: R = { id: strokeId, strokeElements: [...elements] };
  return {
    _attrs: attrs,
    getAttrs: vi.fn(() => ({ ...attrs, strokeElements: [...attrs['strokeElements'] as R[]] })),
    setAttrs: vi.fn((a: R) => { Object.assign(attrs, a); }),
    x: vi.fn().mockReturnValue(0),
    y: vi.fn().mockReturnValue(0),
    destroy: vi.fn(),
  };
}

function makeMockNodeHandler() {
  const renderedShape = {
    add: vi.fn(),
    getAttrs: vi.fn().mockReturnValue({}),
  };
  return {
    create: vi.fn().mockReturnValue({ props: { fill: 'red' } }),
    onRender: vi.fn().mockReturnValue(renderedShape),
    onUpdate: vi.fn(),
    serialize: vi.fn().mockReturnValue({ id: 'stroke-id', type: 'stroke', props: {} }),
    _renderedShape: renderedShape,
  };
}

function makeMockWeave() {
  const measureContainer = makeMockMeasureContainer();
  const container = {
    tabIndex: 0,
    focus: vi.fn(),
    blur: vi.fn(),
    style: { cursor: '', touchAction: 'auto' },
  };

  const stageHandlers: Record<string, (e?: unknown) => void> = {};
  const stage = {
    container: vi.fn().mockReturnValue(container),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      stageHandlers[event] = handler;
    }),
    findOne: vi.fn().mockReturnValue(undefined),
    scaleX: vi.fn().mockReturnValue(1),
    setPointersPositions: vi.fn(),
  };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(undefined),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    getActiveAction: vi.fn().mockReturnValue(BRUSH_TOOL_ACTION_NAME),
    getEventsController: vi.fn().mockReturnValue({ signal: new AbortController().signal }),
    getMousePointer: vi.fn().mockReturnValue({
      mousePoint: { x: 10, y: 20 },
      container: { getAttrs: vi.fn().mockReturnValue({ id: 'mainLayer' }) },
      measureContainer,
    }),
    getMousePointerRelativeToContainer: vi.fn().mockReturnValue({
      mousePoint: { x: 30, y: 40 },
    }),
    addNode: vi.fn(),
    triggerAction: vi.fn(),
    emitEvent: vi.fn(),
    _stage: stage,
    _container: container,
    _measureContainer: measureContainer,
    _stageHandlers: stageHandlers,
  };
}

function makePointerEvent(
  opts: {
    clientX?: number;
    clientY?: number;
    button?: number;
    pointerType?: string;
    pressure?: number;
    pointerId?: number;
    buttons?: number;
    coalescedEvents?: R[];
    predictedEvents?: R[];
  } = {}
) {
  return {
    evt: {
      clientX: opts.clientX ?? 10,
      clientY: opts.clientY ?? 20,
      button: opts.button ?? 0,
      pointerType: opts.pointerType ?? 'mouse',
      pressure: opts.pressure ?? 0,
      pointerId: opts.pointerId ?? 0,
      buttons: opts.buttons ?? 1,
      stopPropagation: vi.fn(),
      getCoalescedEvents: opts.coalescedEvents !== undefined ? () => opts.coalescedEvents : undefined,
      getPredictedEvents: opts.predictedEvents !== undefined ? () => opts.predictedEvents : undefined,
    },
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveBrushToolAction', () => {
  let action: WeaveBrushToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let windowHandlers: Record<string, (e: unknown) => void>;

  beforeEach(() => {
    windowHandlers = {};
    vi.stubGlobal(
      'addEventListener',
      vi.fn((type: string, handler: (e: unknown) => void) => {
        // Capture only the LAST registered handler per type (keydown overrides previous)
        windowHandlers[type] = handler;
      })
    );

    action = new WeaveBrushToolAction();
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

  // ── Suite 1: constructor / initialize ──────────────────────────────────────

  describe('constructor / initialize', () => {
    it('1.1 default constructor → config equals BRUSH_TOOL_DEFAULT_CONFIG', () => {
      expect((action as unknown as R)['config']).toEqual(BRUSH_TOOL_DEFAULT_CONFIG);
    });

    it('1.2 constructor with partial params → config merges with defaults', () => {
      const custom = new WeaveBrushToolAction({ config: { interpolationSteps: 5 } });
      expect((custom as unknown as R)['config']).toMatchObject({ interpolationSteps: 5 });
    });

    it('1.3 initialized is false after construction', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
    });

    it('1.4 state is BRUSH_TOOL_STATE.INACTIVE after construction', () => {
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.INACTIVE);
    });

    it('1.5 strokeId and clickPoint are null; container and measureContainer are undefined', () => {
      const a = action as unknown as R;
      expect(a['strokeId']).toBeNull();
      expect(a['clickPoint']).toBeNull();
      expect(a['container']).toBeUndefined();
      expect(a['measureContainer']).toBeUndefined();
    });

    it('1.6 isEraser is false; isSpacePressed is false', () => {
      expect((action as unknown as R)['isEraser']).toBe(false);
      expect((action as unknown as R)['isSpacePressed']).toBe(false);
    });

    it('1.7 penActive is false; lastSmoothedPressure is 0.5', () => {
      expect((action as unknown as R)['penActive']).toBe(false);
      expect((action as unknown as R)['lastSmoothedPressure']).toBe(0.5);
    });

    it('1.8 onPropsChange and onInit are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
    });

    it('1.9 props equals initProps() result', () => {
      expect(action.props).toEqual({ stroke: '#000000ff', strokeWidth: 1, opacity: 1 });
    });
  });

  // ── Suite 2: getName ───────────────────────────────────────────────────────

  describe('getName', () => {
    it('2.1 returns BRUSH_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(BRUSH_TOOL_ACTION_NAME);
    });
  });

  // ── Suite 3: initProps ─────────────────────────────────────────────────────

  describe('initProps', () => {
    it('3.1 returns default props', () => {
      const props = (action as unknown as R)['initProps']() as R;
      expect(props['stroke']).toBe('#000000ff');
      expect(props['strokeWidth']).toBe(1);
      expect(props['opacity']).toBe(1);
    });
  });

  // ── Suite 4: getEventPressure ──────────────────────────────────────────────

  describe('getEventPressure (private)', () => {
    const callGetEventPressure = (
      a: WeaveBrushToolAction,
      evt: ReturnType<typeof makePointerEvent>
    ) => (a as unknown as R)['getEventPressure'](evt) as number;

    it('4.1 first call (lastPointerPos=null) → velocity=0, alpha clamped to min 0.15', () => {
      // lastPointerPos is null → velocity = 0, alpha = 0.15
      const result = callGetEventPressure(action, makePointerEvent({ pointerType: 'mouse' }));
      // raw=0.5, alpha=0.15, lastSmoothedPressure=0.5 → 0.15*0.5+0.85*0.5=0.5
      expect(result).toBeCloseTo(0.5);
    });

    it('4.2 second call with lastPointerPos set and time elapsed → velocity computed', () => {
      const nowSpy = vi.spyOn(performance, 'now');
      nowSpy.mockReturnValueOnce(1000); // first call
      nowSpy.mockReturnValueOnce(1010); // second call (10ms later)
      // First call sets lastPointerPos
      callGetEventPressure(action, makePointerEvent({ clientX: 0, clientY: 0, pointerType: 'mouse' }));
      // Second call: dx=100, dy=0 → hypot=100, dt=10ms → velocity=100/10*1000=10000 px/s
      const result = callGetEventPressure(action, makePointerEvent({ clientX: 100, clientY: 0, pointerType: 'mouse' }));
      // alpha = min(max(10000/1500, 0.15), 0.6) = 0.6 (capped)
      // raw=0.5, lastSmoothed=~0.5 → 0.6*0.5+0.4*0.5=0.5
      expect(result).toBeCloseTo(0.5);
      nowSpy.mockRestore();
    });

    it('4.3 pointerType=pen + pressure>0 → raw=e.evt.pressure', () => {
      // First call: lastPointerPos=null, alpha=0.15, raw=0.8
      // 0.15*0.8 + 0.85*0.5 = 0.12 + 0.425 = 0.545
      const result = callGetEventPressure(action, makePointerEvent({ pointerType: 'pen', pressure: 0.8 }));
      expect(result).toBeCloseTo(0.545);
    });

    it('4.4 pointerType=pen + pressure=0 (falsy) → raw=0.5', () => {
      // pressure=0 is falsy → raw = 0.5
      // alpha=0.15, raw=0.5, lastSmoothed=0.5 → 0.5
      const result = callGetEventPressure(action, makePointerEvent({ pointerType: 'pen', pressure: 0 }));
      expect(result).toBeCloseTo(0.5);
    });

    it('4.5 pointerType=mouse → raw=0.5', () => {
      const result = callGetEventPressure(action, makePointerEvent({ pointerType: 'mouse', pressure: 0.9 }));
      expect(result).toBeCloseTo(0.5); // raw forced to 0.5 for non-pen
    });

    it('4.6 low velocity → alpha clamped to floor 0.15', () => {
      const nowSpy = vi.spyOn(performance, 'now');
      nowSpy.mockReturnValueOnce(1000);
      nowSpy.mockReturnValueOnce(1100); // 100ms elapsed
      // First call sets pos
      callGetEventPressure(action, makePointerEvent({ clientX: 0, clientY: 0, pointerType: 'mouse' }));
      // dx=1, dy=0, dt=100ms → velocity=1/100*1000=10 px/s → vel/1500=0.0067, clamped to 0.15
      callGetEventPressure(action, makePointerEvent({ clientX: 1, clientY: 0, pointerType: 'mouse' }));
      // alpha used = 0.15 (clamped to min)
      expect((action as unknown as R)['lastSmoothedPressure']).toBeCloseTo(0.5);
      nowSpy.mockRestore();
    });

    it('4.7 high velocity → alpha clamped to ceiling 0.6', () => {
      const nowSpy = vi.spyOn(performance, 'now');
      nowSpy.mockReturnValueOnce(1000);
      nowSpy.mockReturnValueOnce(1001); // 1ms elapsed
      callGetEventPressure(action, makePointerEvent({ clientX: 0, clientY: 0, pointerType: 'mouse' }));
      // dx=3000, dy=0, dt=1ms → velocity=3000/1*1000=3000000 px/s → vel/1500=2000, clamped to 0.6
      callGetEventPressure(action, makePointerEvent({ clientX: 3000, clientY: 0, pointerType: 'mouse' }));
      expect((action as unknown as R)['lastSmoothedPressure']).toBeCloseTo(0.5); // 0.6*0.5+0.4*0.5=0.5
      nowSpy.mockRestore();
    });

    it('4.8 smoothing formula: lastSmoothedPressure = alpha*raw + (1-alpha)*prev', () => {
      // Set known state: lastSmoothedPressure=0.0 (simulate fresh with pen+no lastPos)
      (action as unknown as R)['lastSmoothedPressure'] = 0.0;
      // alpha=0.15 (no velocity), raw=1.0 (pen, full pressure)
      // result = max(0.15*1.0 + 0.85*0.0, 0.15) = max(0.15, 0.15) = 0.15
      const result = callGetEventPressure(action, makePointerEvent({ pointerType: 'pen', pressure: 1.0 }));
      expect(result).toBeCloseTo(0.15);
    });

    it('4.9 floor: returns at least 0.15 even when smoothed value would be lower', () => {
      // raw=0 (pen, pressure=0 → raw=0.5 via || fallback), so this won't go below 0.15 easily
      // Force by setting lastSmoothedPressure to deeply negative (unreachable normally)
      (action as unknown as R)['lastSmoothedPressure'] = -1.0;
      // alpha=0.15, raw=0.05 (pen pressure below 0.15), result = 0.15*0.05 + 0.85*(-1) = 0.0075 - 0.85 < 0
      // → returns Math.max(<negative>, 0.15) = 0.15
      const result = callGetEventPressure(action, makePointerEvent({ pointerType: 'pen', pressure: 0.05 }));
      expect(result).toBeGreaterThanOrEqual(0.15);
    });
  });

  // ── Suite 5: keyup listener ────────────────────────────────────────────────

  describe('setupEvents – keyup', () => {
    let cancelFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      cancelFn = vi.fn();
      action.trigger(cancelFn);
      (action as unknown as R)['isSpacePressed'] = true;
    });

    it('5.1 Space + active = brushTool → isSpacePressed = false', () => {
      windowHandlers['keyup']?.({ code: 'Space' });
      expect((action as unknown as R)['isSpacePressed']).toBe(false);
    });

    it('5.2 Space + active ≠ brushTool → isSpacePressed unchanged', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      windowHandlers['keyup']?.({ code: 'Space' });
      expect((action as unknown as R)['isSpacePressed']).toBe(true);
    });

    it('5.3 other key → isSpacePressed unchanged', () => {
      windowHandlers['keyup']?.({ code: 'Enter' });
      expect((action as unknown as R)['isSpacePressed']).toBe(true);
    });
  });

  // ── Suite 6: keydown listener ──────────────────────────────────────────────

  describe('setupEvents – keydown', () => {
    let cancelFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      cancelFn = vi.fn();
      action.trigger(cancelFn);
    });

    it('6.1 Enter + active = brushTool → stopPropagation, cancelAction, early return', () => {
      const evt = { code: 'Enter', stopPropagation: vi.fn() };
      windowHandlers['keydown']?.(evt);
      expect(evt.stopPropagation).toHaveBeenCalled();
      expect(cancelFn).toHaveBeenCalled();
    });

    it('6.2 Enter + active ≠ brushTool → nothing', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      const evt = { code: 'Enter', stopPropagation: vi.fn() };
      windowHandlers['keydown']?.(evt);
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('6.3 Space + active = brushTool → stopPropagation, isSpacePressed=true, early return', () => {
      const evt = { code: 'Space', stopPropagation: vi.fn() };
      windowHandlers['keydown']?.(evt);
      expect(evt.stopPropagation).toHaveBeenCalled();
      expect((action as unknown as R)['isSpacePressed']).toBe(true);
      // Escape branch should NOT fire (early return)
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('6.4 Space + active ≠ brushTool → nothing', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      const evt = { code: 'Space', stopPropagation: vi.fn() };
      windowHandlers['keydown']?.(evt);
      expect((action as unknown as R)['isSpacePressed']).toBe(false);
    });

    it('6.5 Escape + active = brushTool → stopPropagation, cancelAction', () => {
      const evt = { code: 'Escape', stopPropagation: vi.fn() };
      windowHandlers['keydown']?.(evt);
      expect(evt.stopPropagation).toHaveBeenCalled();
      expect(cancelFn).toHaveBeenCalled();
    });

    it('6.6 Escape + active ≠ brushTool → nothing', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      const evt = { code: 'Escape', stopPropagation: vi.fn() };
      windowHandlers['keydown']?.(evt);
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('6.7 other key → nothing', () => {
      const evt = { code: 'KeyA', stopPropagation: vi.fn() };
      windowHandlers['keydown']?.(evt);
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 7: pointerdown handler ───────────────────────────────────────────

  describe('setupEvents – pointerdown', () => {
    let handlers: Record<string, (e?: unknown) => void>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
      // After trigger(), state is IDLE
    });

    it('7.1 state INACTIVE → returns early', () => {
      action.cleanup(); // resets to INACTIVE
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      handlers['pointerdown']?.(makePointerEvent());
      // No state change
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.INACTIVE);
    });

    it('7.2 state DEFINE_STROKE (not IDLE) → returns early', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
      handlers['pointerdown']?.(makePointerEvent());
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.DEFINE_STROKE);
    });

    it('7.3 state IDLE + isPinching=true → returns early', () => {
      mockWeave.getPlugin.mockReturnValue({ isPinching: vi.fn().mockReturnValue(true) });
      handlers['pointerdown']?.(makePointerEvent());
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.IDLE);
    });

    it('7.4 state IDLE + isSpacePressed=true → returns early', () => {
      (action as unknown as R)['isSpacePressed'] = true;
      handlers['pointerdown']?.(makePointerEvent());
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.IDLE);
    });

    it('7.5 state IDLE + button !== 0 → returns early', () => {
      handlers['pointerdown']?.(makePointerEvent({ button: 2 }));
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.IDLE);
    });

    it('7.6 state IDLE + pointerType=touch + penActive=true → returns early', () => {
      (action as unknown as R)['penActive'] = true;
      handlers['pointerdown']?.(makePointerEvent({ pointerType: 'touch' }));
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.IDLE);
    });

    it('7.7 state IDLE + pointerType=pen → sets penActive=true, proceeds to handleStartStroke', () => {
      handlers['pointerdown']?.(makePointerEvent({ pointerType: 'pen', pressure: 0.5 }));
      expect((action as unknown as R)['penActive']).toBe(true);
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.DEFINE_STROKE);
    });

    it('7.8 state IDLE (normal) + no zoom plugin → calls handleStartStroke, stopPropagation', () => {
      const e = makePointerEvent();
      handlers['pointerdown']?.(e);
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.DEFINE_STROKE);
      expect(e.evt.stopPropagation).toHaveBeenCalled();
    });

    it('7.9 zoom plugin absent → getZoomPlugin().?.isPinching() is safe (no throw)', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => handlers['pointerdown']?.(makePointerEvent())).not.toThrow();
    });
  });

  // ── Suite 8: pointermove handler ───────────────────────────────────────────

  describe('setupEvents – pointermove', () => {
    let handlers: Record<string, (e?: unknown) => void>;
    let mockTempStroke: ReturnType<typeof makeMockTempStroke>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
      mockTempStroke = makeMockTempStroke('stroke-1', [{ x: 0, y: 0, pressure: 0.5 }]);
      (action as unknown as R)['strokeId'] = 'stroke-1';
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      mockWeave._stage.findOne.mockReturnValue(mockTempStroke);
    });

    it('8.1 state INACTIVE → returns early, cursor NOT changed', () => {
      action.cleanup(); // INACTIVE
      mockWeave._container.style.cursor = '';
      handlers['pointermove']?.(makePointerEvent());
      expect(mockWeave._container.style.cursor).toBe('');
    });

    it('8.2 state IDLE → setCursor() called, then returns (not DEFINE_STROKE)', () => {
      // state is IDLE after trigger
      mockWeave._container.style.cursor = '';
      handlers['pointermove']?.(makePointerEvent());
      expect(mockWeave._container.style.cursor).toBe('crosshair');
      // tempStroke.setAttrs should NOT be called (returned before handleMovement)
      expect(mockTempStroke.setAttrs).not.toHaveBeenCalled();
    });

    it('8.3 state DEFINE_STROKE + isPinching=true → setCursor then returns', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
      mockWeave.getPlugin.mockReturnValue({ isPinching: vi.fn().mockReturnValue(true) });
      handlers['pointermove']?.(makePointerEvent());
      expect(mockTempStroke.setAttrs).not.toHaveBeenCalled();
    });

    it('8.4 state DEFINE_STROKE + zoom plugin absent → proceeds without throw', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() =>
        handlers['pointermove']?.(makePointerEvent({ coalescedEvents: [] }))
      ).not.toThrow();
    });

    it('8.5 coalesced.length > 1 with non-pen events → pressure=0.5 for each', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
      const ce1 = { pointerType: 'mouse', pressure: 0.9 };
      const ce2 = { pointerType: 'touch', pressure: 0.8 };
      const e = makePointerEvent({ coalescedEvents: [ce1, ce2], predictedEvents: [] });
      handlers['pointermove']?.(e);
      // handleMovement called twice with pressure=0.5 each (non-pen)
      expect(mockTempStroke.setAttrs).toHaveBeenCalledTimes(2);
    });

    it('8.6 coalesced.length > 1 with pen events → uses ce.pressure', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
      const ce1 = { pointerType: 'pen', pressure: 0.7 };
      const ce2 = { pointerType: 'pen', pressure: 0.3 };
      const e = makePointerEvent({ coalescedEvents: [ce1, ce2], predictedEvents: [] });
      handlers['pointermove']?.(e);
      expect(mockTempStroke.setAttrs).toHaveBeenCalledTimes(2);
    });

    it('8.7 coalesced + predicted pen events → setPointersPositions called, last predicted processed', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
      const ce1 = { pointerType: 'mouse', pressure: 0.5 };
      const ce2 = { pointerType: 'mouse', pressure: 0.5 };
      const pred1 = { pointerType: 'pen', pressure: 0.6 };
      const pred2 = { pointerType: 'pen', pressure: 0.8 };
      const e = makePointerEvent({ coalescedEvents: [ce1, ce2], predictedEvents: [pred1, pred2] });
      handlers['pointermove']?.(e);
      // 2 coalesced + 1 predicted (last of [pred1, pred2] = pred2)
      expect(mockWeave._stage.setPointersPositions).toHaveBeenCalledWith(pred2);
    });

    it('8.8 coalesced + predicted non-pen events → predicted pressure=0.5', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
      const ce = { pointerType: 'mouse', pressure: 0 };
      const pred = { pointerType: 'mouse', pressure: 0.9 }; // non-pen → pressure=0.5
      const e = makePointerEvent({ coalescedEvents: [ce, ce], predictedEvents: [pred] });
      handlers['pointermove']?.(e);
      // 2 coalesced + 1 predicted processed
      expect(mockTempStroke.setAttrs).toHaveBeenCalledTimes(3);
    });

    it('8.9 coalesced + predicted.length=0 → skips predicted block', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
      const ce1 = { pointerType: 'mouse', pressure: 0 };
      const ce2 = { pointerType: 'mouse', pressure: 0 };
      const e = makePointerEvent({ coalescedEvents: [ce1, ce2], predictedEvents: [] });
      handlers['pointermove']?.(e);
      expect(mockWeave._stage.setPointersPositions).not.toHaveBeenCalled();
      // Only 2 coalesced calls
      expect(mockTempStroke.setAttrs).toHaveBeenCalledTimes(2);
    });

    it('8.10 getCoalescedEvents not on event (undefined) → falls back to []', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
      // No coalescedEvents/predictedEvents on the event → both ternaries use []
      const e = makePointerEvent(); // no coalescedEvents → undefined → ternary returns []
      handlers['pointermove']?.(e);
      // Single move: getEventPressure + handleMovement called once
      expect(mockTempStroke.setAttrs).toHaveBeenCalledTimes(1);
    });

    it('8.11 getPredictedEvents not on event → falls back to [] (skips predicted)', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
      // Provide coalescedEvents but no getPredictedEvents
      const ce1 = { pointerType: 'mouse', pressure: 0 };
      const ce2 = { pointerType: 'mouse', pressure: 0 };
      const e = {
        evt: {
          ...makePointerEvent().evt,
          getCoalescedEvents: () => [ce1, ce2],
          getPredictedEvents: undefined,
          stopPropagation: vi.fn(),
        },
      };
      handlers['pointermove']?.(e);
      expect(mockWeave._stage.setPointersPositions).not.toHaveBeenCalled();
    });

    it('8.12 coalesced.length <= 1 → getEventPressure + handleMovement + stopPropagation', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
      const e = makePointerEvent({ coalescedEvents: [{ pointerType: 'mouse', pressure: 0 }] });
      handlers['pointermove']?.(e);
      expect(mockTempStroke.setAttrs).toHaveBeenCalledTimes(1);
      expect(e.evt.stopPropagation).toHaveBeenCalled();
    });
  });

  // ── Suite 9: pointerup handler ─────────────────────────────────────────────

  describe('setupEvents – pointerup', () => {
    let handlers: Record<string, (e?: unknown) => void>;
    let mockTempStroke: ReturnType<typeof makeMockTempStroke>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
      mockTempStroke = makeMockTempStroke('stroke-1', [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 10, y: 10, pressure: 0.5 },
        { x: 20, y: 20, pressure: 0.5 },
      ]);
      (action as unknown as R)['strokeId'] = 'stroke-1';
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      (action as unknown as R)['penActive'] = true;
      mockWeave._stage.findOne.mockReturnValue(mockTempStroke);
    });

    it('9.1 always sets penActive=false regardless of state', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.IDLE;
      handlers['pointerup']?.(makePointerEvent());
      expect((action as unknown as R)['penActive']).toBe(false);
    });

    it('9.2 state not DEFINE_STROKE → returns after penActive reset', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.IDLE;
      handlers['pointerup']?.(makePointerEvent());
      // handleEndStroke not called → state remains IDLE
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.IDLE);
    });

    it('9.3 state DEFINE_STROKE + isPinching=true → returns', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
      mockWeave.getPlugin.mockReturnValue({ isPinching: vi.fn().mockReturnValue(true) });
      handlers['pointerup']?.(makePointerEvent());
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.DEFINE_STROKE);
    });

    it('9.4 state DEFINE_STROKE + zoom plugin absent → proceeds without throw', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => handlers['pointerup']?.(makePointerEvent())).not.toThrow();
    });

    it('9.5 state DEFINE_STROKE (normal) → handleEndStroke, stopPropagation, state→IDLE', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
      const e = makePointerEvent();
      handlers['pointerup']?.(e);
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.IDLE);
      expect(e.evt.stopPropagation).toHaveBeenCalled();
    });
  });

  // ── Suite 10: getBoundingBox ───────────────────────────────────────────────

  describe('getBoundingBox (private)', () => {
    const callGetBoundingBox = (pts: R[]) =>
      (action as unknown as R)['getBoundingBox'](pts) as R;

    it('10.1 empty array → {x:0, y:0, width:0, height:0}', () => {
      expect(callGetBoundingBox([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it('10.2 single point → {x:px, y:py, width:0, height:0}', () => {
      expect(callGetBoundingBox([{ x: 5, y: 10, pressure: 0.5 }])).toEqual({
        x: 5,
        y: 10,
        width: 0,
        height: 0,
      });
    });

    it('10.3 multiple points → correct bounding box', () => {
      const pts = [
        { x: 10, y: 20, pressure: 0.5 },
        { x: 5, y: 30, pressure: 0.5 },
        { x: 15, y: 15, pressure: 0.5 },
      ];
      expect(callGetBoundingBox(pts)).toEqual({ x: 5, y: 15, width: 10, height: 15 });
    });
  });

  // ── Suite 11: handleStartStroke ────────────────────────────────────────────

  describe('handleStartStroke (private)', () => {
    const callHandleStartStroke = (a: WeaveBrushToolAction, pressure: number) =>
      (a as unknown as R)['handleStartStroke'](pressure);

    beforeEach(() => {
      // Trigger first to set up the action properly
      triggerAndCapture();
    });

    it('11.1 resets lastSmoothedPressure, lastPointerPos, lastPointerTime, predictedCount', () => {
      (action as unknown as R)['lastSmoothedPressure'] = 0.9;
      (action as unknown as R)['lastPointerPos'] = { x: 1, y: 1 };
      (action as unknown as R)['lastPointerTime'] = 9999;
      (action as unknown as R)['predictedCount'] = 5;
      callHandleStartStroke(action, 0.5);
      expect((action as unknown as R)['lastSmoothedPressure']).toBe(0.5);
      expect((action as unknown as R)['lastPointerPos']).toBeNull();
      expect((action as unknown as R)['lastPointerTime']).toBe(0);
      expect((action as unknown as R)['predictedCount']).toBe(0);
    });

    it('11.2 sets clickPoint, container, measureContainer from getMousePointer()', () => {
      callHandleStartStroke(action, 0.5);
      expect((action as unknown as R)['clickPoint']).toEqual({ x: 10, y: 20 });
      expect((action as unknown as R)['measureContainer']).toBe(mockWeave._measureContainer);
    });

    it('11.3 sets strokeId to a UUID string', () => {
      callHandleStartStroke(action, 0.5);
      expect(typeof (action as unknown as R)['strokeId']).toBe('string');
      expect((action as unknown as R)['strokeId']).not.toBeNull();
    });

    it('11.4 nodeHandler + mousePoint + measureContainer → creates node, onRender, add to container', () => {
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      callHandleStartStroke(action, 0.5);
      expect(nodeHandler.create).toHaveBeenCalled();
      expect(nodeHandler.onRender).toHaveBeenCalled();
      expect(mockWeave._measureContainer.add).toHaveBeenCalled();
    });

    it('11.5 nodeHandler present but mousePoint null → skips node creation', () => {
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      mockWeave.getMousePointer.mockReturnValueOnce({
        mousePoint: null,
        container: undefined,
        measureContainer: mockWeave._measureContainer,
      });
      callHandleStartStroke(action, 0.5);
      expect(nodeHandler.create).not.toHaveBeenCalled();
    });

    it('11.6 nodeHandler present but measureContainer undefined → skips node creation', () => {
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      mockWeave.getMousePointer.mockReturnValueOnce({
        mousePoint: { x: 10, y: 20 },
        container: undefined,
        measureContainer: undefined,
      });
      callHandleStartStroke(action, 0.5);
      expect(nodeHandler.create).not.toHaveBeenCalled();
    });

    it('11.7 nodeHandler absent → skips node creation entirely', () => {
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      expect(() => callHandleStartStroke(action, 0.5)).not.toThrow();
      expect(mockWeave._measureContainer.add).not.toHaveBeenCalled();
    });

    it('11.8 measureContainer?.add() with null measureContainer → no throw', () => {
      // Node handler present, measureContainer=null → guard prevents add call
      mockWeave.getMousePointer.mockReturnValueOnce({
        mousePoint: { x: 5, y: 5 },
        container: undefined,
        measureContainer: null,
      });
      expect(() => callHandleStartStroke(action, 0.5)).not.toThrow();
    });

    it('11.9 sets state to DEFINE_STROKE', () => {
      callHandleStartStroke(action, 0.5);
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.DEFINE_STROKE);
    });
  });

  // ── Suite 12: handleMovement ───────────────────────────────────────────────

  describe('handleMovement (private)', () => {
    const callHandleMovement = (
      a: WeaveBrushToolAction,
      pressure: number,
      predictedEvent?: unknown,
      isPredicted = false
    ) => (a as unknown as R)['handleMovement'](pressure, predictedEvent, isPredicted);

    let mockTempStroke: ReturnType<typeof makeMockTempStroke>;

    beforeEach(() => {
      triggerAndCapture();
      mockTempStroke = makeMockTempStroke('stroke-1', [{ x: 5, y: 5, pressure: 0.5 }]);
      (action as unknown as R)['strokeId'] = 'stroke-1';
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
      mockWeave._stage.findOne.mockReturnValue(mockTempStroke);
    });

    it('12.1 state ≠ DEFINE_STROKE → returns early without updating', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.IDLE;
      callHandleMovement(action, 0.5);
      expect(mockTempStroke.setAttrs).not.toHaveBeenCalled();
    });

    it('12.2 measureContainer undefined → skips update', () => {
      (action as unknown as R)['measureContainer'] = undefined;
      callHandleMovement(action, 0.5);
      expect(mockTempStroke.setAttrs).not.toHaveBeenCalled();
    });

    it('12.3 tempStroke not found → skips update', () => {
      mockWeave._stage.findOne.mockReturnValue(undefined);
      callHandleMovement(action, 0.5);
      expect(mockTempStroke.setAttrs).not.toHaveBeenCalled();
    });

    it('12.4 predictedEvent provided → stage.setPointersPositions called', () => {
      const predictedEvt = { pointerType: 'pen', pressure: 0.6, x: 50, y: 60 };
      callHandleMovement(action, 0.6, predictedEvt, true);
      expect(mockWeave._stage.setPointersPositions).toHaveBeenCalledWith(predictedEvt);
    });

    it('12.5 predictedEvent not provided → setPointersPositions NOT called', () => {
      callHandleMovement(action, 0.5, undefined, false);
      expect(mockWeave._stage.setPointersPositions).not.toHaveBeenCalled();
    });

    it('12.6 isPredicted=false + predictedCount > 0 → slices array, resets count', () => {
      (action as unknown as R)['predictedCount'] = 2;
      // Stroke has 3 elements: [a, b, c]. With predictedCount=2, slice to [-2] = [a]
      mockTempStroke = makeMockTempStroke('stroke-1', [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 5, y: 5, pressure: 0.5 }, // predicted 1
        { x: 10, y: 10, pressure: 0.5 }, // predicted 2
      ]);
      mockWeave._stage.findOne.mockReturnValue(mockTempStroke);
      callHandleMovement(action, 0.5, undefined, false);
      expect((action as unknown as R)['predictedCount']).toBe(0);
    });

    it('12.7 isPredicted=false + predictedCount=0 → no slice', () => {
      (action as unknown as R)['predictedCount'] = 0;
      callHandleMovement(action, 0.5, undefined, false);
      // setAttrs still called (normal update)
      expect(mockTempStroke.setAttrs).toHaveBeenCalled();
    });

    it('12.8 isPredicted=true → increments predictedCount', () => {
      (action as unknown as R)['predictedCount'] = 1;
      callHandleMovement(action, 0.5, undefined, true);
      expect((action as unknown as R)['predictedCount']).toBe(2);
    });

    it('12.9 pushes currentPoint to strokeElements and calls setAttrs', () => {
      callHandleMovement(action, 0.7, undefined, false);
      expect(mockTempStroke.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({ strokeElements: expect.any(Array) })
      );
    });

    it('12.10 getBoundingBox called (verifiable via setAttrs width/height)', () => {
      callHandleMovement(action, 0.5, undefined, false);
      const callArg = mockTempStroke.setAttrs.mock.calls[0]?.[0] as R;
      expect('width' in callArg).toBe(true);
      expect('height' in callArg).toBe(true);
    });

    it('12.11 nodeHandler found → nodeHandler.onUpdate called', () => {
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      callHandleMovement(action, 0.5, undefined, false);
      expect(nodeHandler.onUpdate).toHaveBeenCalled();
    });

    it('12.12 nodeHandler absent → skips onUpdate without throw', () => {
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      expect(() => callHandleMovement(action, 0.5, undefined, false)).not.toThrow();
    });
  });

  // ── Suite 13: handleEndStroke ──────────────────────────────────────────────

  describe('handleEndStroke (private)', () => {
    const callHandleEndStroke = (a: WeaveBrushToolAction) =>
      (a as unknown as R)['handleEndStroke']();

    let mockTempStroke: ReturnType<typeof makeMockTempStroke>;
    let nodeHandler: ReturnType<typeof makeMockNodeHandler>;

    function setupEndStroke(elementCount = 3, predictedCount = 0) {
      const elements: R[] = Array.from({ length: elementCount }, (_, i) => ({
        x: i * 10,
        y: i * 5,
        pressure: 0.5,
      }));
      mockTempStroke = makeMockTempStroke('stroke-1', elements);
      (action as unknown as R)['strokeId'] = 'stroke-1';
      (action as unknown as R)['predictedCount'] = predictedCount;
      nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      // findOne: first call → tempStroke; second call → realNode (for cleanup)
      const realNode = { destroy: vi.fn() };
      mockWeave._stage.findOne
        .mockReturnValueOnce(mockTempStroke)
        .mockReturnValueOnce(realNode);
      return { realNode };
    }

    beforeEach(() => {
      triggerAndCapture();
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.DEFINE_STROKE;
    });

    it('13.1 tempStroke not found → nothing happens', () => {
      mockWeave._stage.findOne.mockReturnValue(undefined);
      expect(() => callHandleEndStroke(action)).not.toThrow();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('13.2 tempStroke found + nodeHandler absent → skips processing, state→IDLE', () => {
      mockTempStroke = makeMockTempStroke('stroke-1', [{ x: 0, y: 0, pressure: 0.5 }]);
      (action as unknown as R)['strokeId'] = 'stroke-1';
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      mockWeave._stage.findOne.mockReturnValue(mockTempStroke);
      callHandleEndStroke(action);
      expect(mockWeave.addNode).not.toHaveBeenCalled();
      // clickPoint reset, state→IDLE still happen after the outer if block
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.IDLE);
    });

    it('13.3 predictedCount > 0 → slices predicted points before processing', () => {
      setupEndStroke(4, 2); // 4 elements, 2 predicted → slice last 2 → 2 remaining
      callHandleEndStroke(action);
      const call = mockTempStroke.setAttrs.mock.calls[0]?.[0] as R;
      const elements = call?.['strokeElements'] as R[];
      // After slice(-2): 2 elements remain (+ mapped)
      expect(elements.length).toBe(2);
    });

    it('13.4 predictedCount=0 → no slice, all elements used', () => {
      setupEndStroke(3, 0);
      callHandleEndStroke(action);
      const call = mockTempStroke.setAttrs.mock.calls[0]?.[0] as R;
      const elements = call?.['strokeElements'] as R[];
      expect(elements.length).toBe(3);
    });

    it('13.5 maps points to subtract box.x/box.y', () => {
      setupEndStroke(3, 0); // elements at x=0,10,20; y=0,5,10 → box.x=0, box.y=0
      callHandleEndStroke(action);
      const call = mockTempStroke.setAttrs.mock.calls[0]?.[0] as R;
      const elements = call?.['strokeElements'] as R[];
      // box.x=0, box.y=0 → same values after subtraction
      expect(elements[0]).toMatchObject({ x: 0, y: 0 });
    });

    it('13.6 simplify() called on mapped points', () => {
      setupEndStroke(3, 0);
      callHandleEndStroke(action);
      expect(simplify).toHaveBeenCalled();
    });

    it('13.7 tempStroke.setAttrs() called with final bounding box values', () => {
      setupEndStroke(3, 0);
      callHandleEndStroke(action);
      expect(mockTempStroke.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) })
      );
    });

    it('13.8 realNode found → realNode.destroy() called', () => {
      const { realNode } = setupEndStroke(3, 0);
      callHandleEndStroke(action);
      expect(realNode.destroy).toHaveBeenCalled();
    });

    it('13.9 realNode not found → skips destroy without throw', () => {
      mockTempStroke = makeMockTempStroke('stroke-1', [
        { x: 0, y: 0, pressure: 0.5 },
        { x: 10, y: 10, pressure: 0.5 },
        { x: 20, y: 20, pressure: 0.5 },
      ]);
      (action as unknown as R)['strokeId'] = 'stroke-1';
      nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      // Both findOne calls return undefined
      mockWeave._stage.findOne
        .mockReturnValueOnce(mockTempStroke)
        .mockReturnValueOnce(undefined); // no realNode
      expect(() => callHandleEndStroke(action)).not.toThrow();
    });

    it('13.10 strokeElements.length >= 1 → addNode() called', () => {
      setupEndStroke(1, 0); // 1 element → >= 1 → addNode
      callHandleEndStroke(action);
      expect(mockWeave.addNode).toHaveBeenCalled();
    });

    it('13.10b tap (1 element) → addNode() called', () => {
      setupEndStroke(1, 0); // single tap → should be saved as dot
      callHandleEndStroke(action);
      expect(mockWeave.addNode).toHaveBeenCalled();
    });

    it('13.10c short stroke (2 elements) → addNode() called', () => {
      setupEndStroke(2, 0); // short line → should now be saved
      callHandleEndStroke(action);
      expect(mockWeave.addNode).toHaveBeenCalled();
    });

    it('13.11 strokeElements.length = 0 → addNode() NOT called', () => {
      setupEndStroke(0, 0); // 0 elements → skip addNode
      callHandleEndStroke(action);
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('13.12 container defined → addNode called with container id', () => {
      setupEndStroke(3, 0);
      (action as unknown as R)['container'] = {
        getAttrs: vi.fn().mockReturnValue({ id: 'target-layer' }),
      };
      callHandleEndStroke(action);
      expect(mockWeave.addNode).toHaveBeenCalledWith(expect.anything(), 'target-layer');
    });

    it('13.13 container undefined → addNode called with undefined container id', () => {
      setupEndStroke(3, 0);
      (action as unknown as R)['container'] = undefined;
      callHandleEndStroke(action);
      expect(mockWeave.addNode).toHaveBeenCalledWith(expect.anything(), undefined);
    });

    it('13.13b tap (1 point, box width/height = 0) → setAttrs called with width ≥ strokeWidth', () => {
      // Single point at (5, 5) → box.width = 0, box.height = 0
      mockTempStroke = makeMockTempStroke('stroke-1', [{ x: 5, y: 5, pressure: 0.5 }]);
      // Set strokeWidth on the mock stroke so the minimum bounding box uses it
      mockTempStroke.getAttrs = vi.fn(() => ({
        id: 'stroke-1',
        strokeElements: [{ x: 5, y: 5, pressure: 0.5 }],
        strokeWidth: 4,
      }));
      (action as unknown as R)['strokeId'] = 'stroke-1';
      nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      const realNode = { destroy: vi.fn() };
      mockWeave._stage.findOne
        .mockReturnValueOnce(mockTempStroke)
        .mockReturnValueOnce(realNode);

      callHandleEndStroke(action);

      const call = (mockTempStroke.setAttrs as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as R;
      expect((call?.['width'] as number)).toBeGreaterThanOrEqual(4);
      expect((call?.['height'] as number)).toBeGreaterThanOrEqual(4);
    });

    it('13.14 clickPoint set to null after processing', () => {
      (action as unknown as R)['clickPoint'] = { x: 1, y: 2 };
      // Provide a tempStroke (nodeHandler absent → simple path) so the if(tempStroke) block runs
      const ts = makeMockTempStroke('stroke-1', [{ x: 0, y: 0, pressure: 0.5 }]);
      (action as unknown as R)['strokeId'] = 'stroke-1';
      mockWeave._stage.findOne.mockReturnValue(ts);
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      callHandleEndStroke(action);
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });

    it('13.15 setCursor() and setFocusStage() called after processing', () => {
      mockWeave._stage.findOne.mockReturnValue(undefined);
      mockWeave._container.style.cursor = '';
      callHandleEndStroke(action);
      // Without tempStroke found, none of the internal code runs — just checking no throw
      // For the full path, use a real tempStroke:
      setupEndStroke(3, 0);
      callHandleEndStroke(action);
      expect(mockWeave._container.style.cursor).toBe('crosshair');
      expect(mockWeave._container.blur).toHaveBeenCalled();
    });

    it('13.16 state set to IDLE after processing', () => {
      setupEndStroke(3, 0);
      callHandleEndStroke(action);
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.IDLE);
    });
  });

  // ── Suite 14: trigger ──────────────────────────────────────────────────────

  describe('trigger', () => {
    it('14.1 throws "Instance not defined" when no instance set', () => {
      const bare = new WeaveBrushToolAction();
      expect(() => bare.trigger(vi.fn())).toThrow('Instance not defined');
    });

    it('14.2 first call → setupEvents called, initialized=true', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      action.trigger(vi.fn());
      expect((action as unknown as R)['initialized']).toBe(true);
    });

    it('14.3 second call → setupEvents NOT called again', () => {
      const setupSpy = vi.spyOn(action as unknown as R, 'setupEvents' as never);
      action.trigger(vi.fn());
      const callsAfterFirst = setupSpy.mock.calls.length;
      action.trigger(vi.fn());
      expect(setupSpy.mock.calls.length).toBe(callsAfterFirst);
    });

    it('14.4 selectionPlugin present → tr.hide() and setSelectedNodes([])', () => {
      const tr = { hide: vi.fn() };
      const setSelectedNodes = vi.fn();
      mockWeave.getPlugin.mockReturnValue({ getTransformer: vi.fn().mockReturnValue(tr), setSelectedNodes });
      action.trigger(vi.fn());
      expect(tr.hide).toHaveBeenCalled();
      expect(setSelectedNodes).toHaveBeenCalledWith([]);
    });

    it('14.5 selectionPlugin absent → skips both plugin blocks', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => action.trigger(vi.fn())).not.toThrow();
    });

    it('14.6 sets tabIndex=1 and calls focus()', () => {
      action.trigger(vi.fn());
      expect(mockWeave._container.tabIndex).toBe(1);
      expect(mockWeave._container.focus).toHaveBeenCalled();
    });

    it('14.7 stores cancelAction callback', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      expect((action as unknown as R)['cancelAction']).toBe(cancelFn);
    });

    it('14.8 resets props via initProps()', () => {
      action.props = { stroke: 'red' } as R;
      action.trigger(vi.fn());
      expect(action.props['stroke']).toBe('#000000ff');
    });

    it('14.9 sets state to IDLE', () => {
      action.trigger(vi.fn());
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.IDLE);
    });

    it('14.10 emits onAddingBrush event', () => {
      action.trigger(vi.fn());
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddingBrush');
    });

    it('14.11 calls setCursor (cursor → crosshair) and setFocusStage (blur + focus)', () => {
      action.trigger(vi.fn());
      expect(mockWeave._container.style.cursor).toBe('crosshair');
      expect(mockWeave._container.blur).toHaveBeenCalled();
    });

    it('14.12 setupEvents sets style.touchAction = "none"', () => {
      action.trigger(vi.fn());
      expect(mockWeave._container.style.touchAction).toBe('none');
    });
  });

  // ── Suite 15: onEraserMode ─────────────────────────────────────────────────

  describe('onEraserMode', () => {
    it('15.1 returns false when isEraser=false', () => {
      (action as unknown as R)['isEraser'] = false;
      expect(action.onEraserMode()).toBe(false);
    });

    it('15.2 returns true when isEraser=true', () => {
      (action as unknown as R)['isEraser'] = true;
      expect(action.onEraserMode()).toBe(true);
    });
  });

  // ── Suite 16: cleanup ──────────────────────────────────────────────────────

  describe('cleanup', () => {
    beforeEach(() => {
      // Trigger first so prevTouchAction is set
      action.trigger(vi.fn());
      // Simulate prevTouchAction was 'auto' (set before setupEvents overwrote it)
      (action as unknown as R)['prevTouchAction'] = 'auto';
    });

    it('16.1 restores style.touchAction to prevTouchAction', () => {
      action.cleanup();
      expect(mockWeave._container.style.touchAction).toBe('auto');
    });

    it('16.2 sets cursor to "default"', () => {
      action.cleanup();
      expect(mockWeave._container.style.cursor).toBe('default');
    });

    it('16.3 emits onAddedBrush event', () => {
      action.cleanup();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedBrush');
    });

    it('16.4 selectionPlugin present + findOne returns node → setSelectedNodes + triggerAction', () => {
      const foundNode = { id: 'stroke-id' };
      mockWeave._stage.findOne.mockReturnValue(foundNode);
      const setSelectedNodes = vi.fn();
      mockWeave.getPlugin.mockReturnValue({ setSelectedNodes });
      action.cleanup();
      expect(setSelectedNodes).toHaveBeenCalledWith([foundNode]);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('16.5 selectionPlugin present + findOne returns undefined → no setSelectedNodes, still triggerAction', () => {
      mockWeave._stage.findOne.mockReturnValue(undefined);
      const setSelectedNodes = vi.fn();
      mockWeave.getPlugin.mockReturnValue({ setSelectedNodes });
      action.cleanup();
      expect(setSelectedNodes).not.toHaveBeenCalled();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('16.6 selectionPlugin absent → skips both', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      action.cleanup();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('16.7 clickPoint set to null', () => {
      (action as unknown as R)['clickPoint'] = { x: 1, y: 2 };
      action.cleanup();
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });

    it('16.8 state set to INACTIVE', () => {
      (action as unknown as R)['state'] = BRUSH_TOOL_STATE.IDLE;
      action.cleanup();
      expect((action as unknown as R)['state']).toBe(BRUSH_TOOL_STATE.INACTIVE);
    });
  });

  // ── Suite 17: getZoomPlugin ────────────────────────────────────────────────

  describe('getZoomPlugin', () => {
    it('17.1 returns the plugin when stageZoom is registered', () => {
      const zoomPlugin = { isPinching: vi.fn() };
      mockWeave.getPlugin.mockImplementation((name: string) =>
        name === 'stageZoom' ? zoomPlugin : undefined
      );
      expect(action.getZoomPlugin()).toBe(zoomPlugin);
    });

    it('17.2 returns undefined when plugin is not registered', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(action.getZoomPlugin()).toBeUndefined();
    });
  });

  // ── Suite 18: setCursor ────────────────────────────────────────────────────

  describe('setCursor (private, via trigger)', () => {
    it('18.1 isSpacePressed=true → returns early, cursor NOT changed', () => {
      action.trigger(vi.fn());
      mockWeave._container.style.cursor = '';
      (action as unknown as R)['isSpacePressed'] = true;
      (action as unknown as R)['setCursor']();
      expect(mockWeave._container.style.cursor).toBe('');
    });

    it('18.2 isSpacePressed=false → cursor set to "crosshair"', () => {
      action.trigger(vi.fn());
      mockWeave._container.style.cursor = '';
      (action as unknown as R)['isSpacePressed'] = false;
      (action as unknown as R)['setCursor']();
      expect(mockWeave._container.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 19: setFocusStage ────────────────────────────────────────────────

  describe('setFocusStage (private, via trigger)', () => {
    it('19.1 sets tabIndex=1, calls blur(), then focus()', () => {
      action.trigger(vi.fn());
      expect(mockWeave._container.tabIndex).toBe(1);
      expect(mockWeave._container.blur).toHaveBeenCalled();
      expect(mockWeave._container.focus).toHaveBeenCalled();
    });
  });
});
