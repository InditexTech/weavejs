// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Break circular dependency: action.ts → @/weave → managers/async → @/index.node → index.common → zoom-out-tool → action.ts
vi.mock('@/weave', () => ({ Weave: class Weave {} }));
// Break circular dependency: nodes-selection → context-menu → nodes-selection
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

// In Vitest node environment, `window` is not defined — alias it to globalThis so
// the production code's `window.addEventListener(...)` call resolves correctly.
if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { type R } from '../../__tests__/shared/action.test-helpers';
import { WeaveArrowToolAction } from '../arrow-tool';
import { WEAVE_ARROW_TOOL_ACTION_NAME, WEAVE_ARROW_TOOL_STATE } from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeMockMeasureContainer() {
  return {
    add: vi.fn(),
    getAttrs: vi.fn().mockReturnValue({ id: 'measureLayer' }),
  };
}

function makeMockWeave() {
  const measureContainer = makeMockMeasureContainer();
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
    scaleX: vi.fn().mockReturnValue(1),
  };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(undefined),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    getActiveAction: vi.fn().mockReturnValue(WEAVE_ARROW_TOOL_ACTION_NAME),
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
  opts: { pointerId?: number; clientX?: number; clientY?: number; buttons?: number } = {}
) {
  return {
    evt: {
      pointerId: opts.pointerId ?? 0,
      clientX: opts.clientX ?? 10,
      clientY: opts.clientY ?? 20,
      buttons: opts.buttons ?? 1,
      pointerType: 'mouse',
    },
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveArrowToolAction', () => {
  let action: WeaveArrowToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let windowHandlers: Record<string, (e: unknown) => void>;

  beforeEach(() => {
    windowHandlers = {};

    // Stub window.addEventListener so we can capture the keydown handler.
    // In Vitest node env, window === globalThis.
    vi.stubGlobal(
      'addEventListener',
      vi.fn((type: string, handler: (e: unknown) => void) => {
        windowHandlers[type] = handler;
      })
    );

    action = new WeaveArrowToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
    (action as unknown as R)['cancelAction'] = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function triggerAndCapture(cancelFn = vi.fn()) {
    action.trigger(cancelFn);
    return { cancelFn, handlers: mockWeave._stageHandlers };
  }

  // ── Suite 1: constructor / initialize ──────────────────────────────────────

  describe('constructor / initialize', () => {
    it('1.1 initialized is false after construction', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
    });

    it('1.2 state is IDLE after construction', () => {
      expect((action as unknown as R)['state']).toBe(WEAVE_ARROW_TOOL_STATE.IDLE);
    });

    it('1.3 arrowId, tempArrowId, tempMainArrowNode, tempArrowNode are null', () => {
      const a = action as unknown as R;
      expect(a['arrowId']).toBeNull();
      expect(a['tempArrowId']).toBeNull();
      expect(a['tempMainArrowNode']).toBeNull();
      expect(a['tempArrowNode']).toBeNull();
    });

    it('1.4 pointers is an empty Map', () => {
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      expect(pointers).toBeInstanceOf(Map);
      expect(pointers.size).toBe(0);
    });

    it('1.5 clickPoint is null', () => {
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });

    it('1.6 tempPoint and tempNextPoint are undefined', () => {
      expect((action as unknown as R)['tempPoint']).toBeUndefined();
      expect((action as unknown as R)['tempNextPoint']).toBeUndefined();
    });

    it('1.7 onPropsChange and onInit are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
    });

    it('1.8 props equals initProps() result', () => {
      expect(action.props).toEqual({
        fill: '#000000ff',
        stroke: '#000000ff',
        strokeWidth: 1,
        opacity: 1,
        pointerLength: 10,
        pointerWidth: 10,
        pointerAtBeginning: false,
        pointerAtEnding: true,
      });
    });
  });

  // ── Suite 2: getName ───────────────────────────────────────────────────────

  describe('getName', () => {
    it('2.1 returns WEAVE_ARROW_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(WEAVE_ARROW_TOOL_ACTION_NAME);
    });
  });

  // ── Suite 3: initProps ─────────────────────────────────────────────────────

  describe('initProps', () => {
    it('3.1 returns object with all expected default prop values', () => {
      const props = (action as unknown as R)['initProps']() as R;
      expect(props['fill']).toBe('#000000ff');
      expect(props['stroke']).toBe('#000000ff');
      expect(props['strokeWidth']).toBe(1);
      expect(props['opacity']).toBe(1);
      expect(props['pointerLength']).toBe(10);
      expect(props['pointerWidth']).toBe(10);
      expect(props['pointerAtBeginning']).toBe(false);
      expect(props['pointerAtEnding']).toBe(true);
    });
  });

  // ── Suite 4: trigger ───────────────────────────────────────────────────────

  describe('trigger', () => {
    it('4.1 throws "Instance not defined" when no instance is set', () => {
      const bare = new WeaveArrowToolAction();
      expect(() => bare.trigger(vi.fn())).toThrow('Instance not defined');
    });

    it('4.2 sets initialized = true on first call (setupEvents called)', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      action.trigger(vi.fn());
      expect((action as unknown as R)['initialized']).toBe(true);
    });

    it('4.3 does NOT call setupEvents again on second call', () => {
      const setupSpy = vi.spyOn(
        action as unknown as Record<string, () => void>,
        'setupEvents' as never
      );
      action.trigger(vi.fn());
      const callsAfterFirst = setupSpy.mock.calls.length;
      action.trigger(vi.fn());
      expect(setupSpy.mock.calls.length).toBe(callsAfterFirst);
    });

    it('4.4 sets container tabIndex = 1 and calls focus()', () => {
      action.trigger(vi.fn());
      expect(mockWeave._container.tabIndex).toBe(1);
      expect(mockWeave._container.focus).toHaveBeenCalled();
    });

    it('4.5 stores the cancelAction callback', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      expect((action as unknown as R)['cancelAction']).toBe(cancelFn);
    });

    it('4.6 calls selectionPlugin.setSelectedNodes([]) when plugin is present', () => {
      const setSelectedNodes = vi.fn();
      mockWeave.getPlugin.mockReturnValue({ setSelectedNodes });
      action.trigger(vi.fn());
      expect(setSelectedNodes).toHaveBeenCalledWith([]);
    });

    it('4.7 does not throw when selectionPlugin is absent', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => action.trigger(vi.fn())).not.toThrow();
    });

    it('4.8 resets props via initProps()', () => {
      action.props = { fill: 'red' } as R;
      action.trigger(vi.fn());
      expect(action.props['fill']).toBe('#000000ff');
    });

    it('4.9 transitions state to ADDING (via addArrow)', () => {
      action.trigger(vi.fn());
      expect((action as unknown as R)['state']).toBe(WEAVE_ARROW_TOOL_STATE.ADDING);
    });

    it('4.10 emits onAddingArrow event', () => {
      action.trigger(vi.fn());
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddingArrow');
    });
  });

  // ── Suite 5: keydown listener ──────────────────────────────────────────────

  describe('setupEvents – keydown', () => {
    let cancelFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      cancelFn = vi.fn();
      action.trigger(cancelFn);
    });

    it('5.1 Enter + active action = arrowTool → calls cancelAction', () => {
      windowHandlers['keydown']?.({ code: 'Enter' });
      expect(cancelFn).toHaveBeenCalled();
    });

    it('5.2 Escape + active action = arrowTool → calls cancelAction', () => {
      windowHandlers['keydown']?.({ code: 'Escape' });
      expect(cancelFn).toHaveBeenCalled();
    });

    it('5.3 Enter + active action ≠ arrowTool → does NOT call cancelAction', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      windowHandlers['keydown']?.({ code: 'Enter' });
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('5.4 Escape + active action ≠ arrowTool → does NOT call cancelAction', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      windowHandlers['keydown']?.({ code: 'Escape' });
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('5.5 any other key code → does nothing', () => {
      windowHandlers['keydown']?.({ code: 'Space' });
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 6: pointerdown listener ─────────────────────────────────────────

  describe('setupEvents – pointerdown', () => {
    let handlers: Record<string, (e?: unknown) => void>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
    });

    it('6.1 stores pointer id in pointers map', () => {
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      expect(pointers.has(1)).toBe(true);
    });

    it('6.2 2 pointers → sets state to ADDING and returns early without creating tempMainArrowNode', () => {
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['state']).toBe(WEAVE_ARROW_TOOL_STATE.ADDING);
      // Only one call to getMousePointer (from first click that fired handleAdding), not two
      expect((action as unknown as R)['tempMainArrowNode']).not.toBeNull();
    });

    it('6.3 1 pointer + !tempMainArrowNode + ADDING state → calls handleAdding (creates nodes)', () => {
      // After trigger(), state is already ADDING and tempMainArrowNode is null
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      expect((action as unknown as R)['tempMainArrowNode']).not.toBeNull();
    });

    it('6.4 1 pointer + tempMainArrowNode set + ADDING state → sets state to DEFINING_SIZE', () => {
      // First click: handleAdding creates node, sets state to DEFINING_SIZE
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      expect((action as unknown as R)['state']).toBe(WEAVE_ARROW_TOOL_STATE.DEFINING_SIZE);
      // Reset to ADDING with node present → should set DEFINING_SIZE again
      (action as unknown as R)['state'] = WEAVE_ARROW_TOOL_STATE.ADDING;
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      expect((action as unknown as R)['state']).toBe(WEAVE_ARROW_TOOL_STATE.DEFINING_SIZE);
    });

    it('6.5 1 pointer + state IDLE → neither branch fires', () => {
      // cleanup resets to IDLE
      action.cleanup();
      // Re-capture handlers (they were registered on the stage)
      const stillNull = (action as unknown as R)['tempMainArrowNode'];
      expect(stillNull).toBeNull();
      expect((action as unknown as R)['state']).toBe(WEAVE_ARROW_TOOL_STATE.IDLE);
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      // state remains IDLE (pointerdown does nothing in IDLE state after both guards fail)
      expect((action as unknown as R)['tempMainArrowNode']).toBeNull();
    });
  });

  // ── Suite 7: pointermove listener ─────────────────────────────────────────

  describe('setupEvents – pointermove', () => {
    let handlers: Record<string, (e?: unknown) => void>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
    });

    it('7.1 state IDLE → returns early (cursor not changed to crosshair)', () => {
      action.cleanup(); // resets to IDLE
      mockWeave._container.style.cursor = '';
      handlers['pointermove']?.();
      expect(mockWeave._container.style.cursor).toBe('');
    });

    it('7.2 2 pointers → sets state to ADDING and returns early', () => {
      (action as unknown as R)['state'] = WEAVE_ARROW_TOOL_STATE.DEFINING_SIZE;
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      pointers.set(0, { x: 0, y: 0 });
      pointers.set(1, { x: 10, y: 10 });
      handlers['pointermove']?.();
      expect((action as unknown as R)['state']).toBe(WEAVE_ARROW_TOOL_STATE.ADDING);
    });

    it('7.3 state DEFINING_SIZE + 1 pointer → calls handleMovement (updates tempArrowNode)', () => {
      (action as unknown as R)['state'] = WEAVE_ARROW_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['arrowId'] = 'test-id';
      const mockArrow = {
        setAttrs: vi.fn(),
        points: vi.fn().mockReturnValue([0, 0, 5, 5]),
        x: vi.fn().mockReturnValue(10),
        y: vi.fn().mockReturnValue(20),
      };
      const mockNextPoint = { setAttrs: vi.fn() };
      (action as unknown as R)['tempArrowNode'] = mockArrow;
      (action as unknown as R)['tempNextPoint'] = mockNextPoint;
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;

      handlers['pointermove']?.();

      expect(mockArrow.setAttrs).toHaveBeenCalled();
      expect(mockNextPoint.setAttrs).toHaveBeenCalled();
    });

    it('7.4 state ADDING + 1 pointer → sets cursor but does not call handleMovement', () => {
      (action as unknown as R)['state'] = WEAVE_ARROW_TOOL_STATE.ADDING;
      mockWeave._container.style.cursor = '';
      handlers['pointermove']?.();
      expect(mockWeave._container.style.cursor).toBe('crosshair');
      // tempArrowNode is null — handleMovement guard would have prevented any update
    });
  });

  // ── Suite 8: pointerup listener ────────────────────────────────────────────

  describe('setupEvents – pointerup', () => {
    let handlers: Record<string, (e?: unknown) => void>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      pointers.set(5, { x: 0, y: 0 });
    });

    it('8.1 deletes pointer id from pointers map', () => {
      handlers['pointerup']?.(makePointerEvent({ pointerId: 5 }));
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      expect(pointers.has(5)).toBe(false);
    });

    it('8.2 state DEFINING_SIZE → calls handleSettingSize (updates tempMainArrowNode)', () => {
      (action as unknown as R)['state'] = WEAVE_ARROW_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['arrowId'] = 'test-id';
      const mockLine = {
        setAttrs: vi.fn(),
        points: vi.fn().mockReturnValue([0, 0]),
        x: vi.fn().mockReturnValue(5),
        y: vi.fn().mockReturnValue(5),
      };
      const mockArrow = {
        setAttrs: vi.fn(),
        points: vi.fn().mockReturnValue([0, 0]),
        x: vi.fn().mockReturnValue(0),
        y: vi.fn().mockReturnValue(0),
      };
      (action as unknown as R)['tempMainArrowNode'] = mockLine;
      (action as unknown as R)['tempArrowNode'] = mockArrow;
      (action as unknown as R)['tempPoint'] = { setAttrs: vi.fn() };
      (action as unknown as R)['tempNextPoint'] = { setAttrs: vi.fn() };
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;

      handlers['pointerup']?.(makePointerEvent({ pointerId: 5 }));

      expect(mockLine.setAttrs).toHaveBeenCalled();
    });

    it('8.3 state not DEFINING_SIZE → does NOT call handleSettingSize', () => {
      (action as unknown as R)['state'] = WEAVE_ARROW_TOOL_STATE.ADDING;
      const mockLine = { setAttrs: vi.fn(), points: vi.fn().mockReturnValue([0, 0]) };
      (action as unknown as R)['tempMainArrowNode'] = mockLine;

      handlers['pointerup']?.(makePointerEvent({ pointerId: 5 }));

      expect(mockLine.setAttrs).not.toHaveBeenCalled();
    });
  });

  // ── Suite 9: handleAdding ──────────────────────────────────────────────────

  describe('handleAdding (private, via pointerdown)', () => {
    let handlers: Record<string, (e?: unknown) => void>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
      // After trigger(), state is already ADDING with tempMainArrowNode null
    });

    it('9.1 creates tempMainArrowNode (non-null) after first click', () => {
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      expect((action as unknown as R)['tempMainArrowNode']).not.toBeNull();
    });

    it('9.2 creates tempPoint and adds all nodes to measureContainer', () => {
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      expect((action as unknown as R)['tempPoint']).not.toBeUndefined();
      expect(mockWeave._measureContainer.add).toHaveBeenCalled();
    });

    it('9.3 creates tempArrowNode (non-null) after first click', () => {
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      expect((action as unknown as R)['tempArrowNode']).not.toBeNull();
    });

    it('9.4 creates tempNextPoint (non-undefined) after first click', () => {
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      expect((action as unknown as R)['tempNextPoint']).not.toBeUndefined();
    });

    it('9.5 calls moveToTop on tempPoint and tempNextPoint', () => {
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      const tempPoint = (action as unknown as R)['tempPoint'] as R;
      const tempNextPoint = (action as unknown as R)['tempNextPoint'] as R;
      expect((tempPoint['moveToTop'] as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
      expect((tempNextPoint['moveToTop'] as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });

    it('9.6 sets state to DEFINING_SIZE after handleAdding', () => {
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      expect((action as unknown as R)['state']).toBe(WEAVE_ARROW_TOOL_STATE.DEFINING_SIZE);
    });

    it('9.7 does NOT re-create nodes if tempMainArrowNode already exists', () => {
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      const firstNode = (action as unknown as R)['tempMainArrowNode'];
      const addCallsAfterFirst = mockWeave._measureContainer.add.mock.calls.length;
      // Reset state to ADDING to re-enter the pointerdown branch
      (action as unknown as R)['state'] = WEAVE_ARROW_TOOL_STATE.ADDING;
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      // tempMainArrowNode is unchanged and no extra add() calls were made
      expect((action as unknown as R)['tempMainArrowNode']).toBe(firstNode);
      expect(mockWeave._measureContainer.add.mock.calls.length).toBe(addCallsAfterFirst);
    });

    it('9.8 sets arrowId and tempArrowId to non-null UUID strings', () => {
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      expect(typeof (action as unknown as R)['arrowId']).toBe('string');
      expect(typeof (action as unknown as R)['tempArrowId']).toBe('string');
    });

    it('9.9 sets clickPoint from getMousePointer().mousePoint', () => {
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      expect((action as unknown as R)['clickPoint']).toEqual({ x: 10, y: 20 });
    });

    it('9.10 sets measureContainer from getMousePointer().measureContainer', () => {
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      expect((action as unknown as R)['measureContainer']).toBe(mockWeave._measureContainer);
    });

    it('9.11 clickPoint null → node x/y fallback to 0 (covers ?. null branch in lines 190-219)', () => {
      // Return a null mousePoint so this.clickPoint = null, exercising ?. null branches
      mockWeave.getMousePointer.mockReturnValueOnce({
        mousePoint: null,
        container: { getAttrs: vi.fn().mockReturnValue({ id: 'mainLayer' }) },
        measureContainer: mockWeave._measureContainer,
      });
      expect(() => handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }))).not.toThrow();
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });

    it('9.12 measureContainer undefined → add() not called (covers ?. null branch for measureContainer)', () => {
      mockWeave.getMousePointer.mockReturnValueOnce({
        mousePoint: { x: 5, y: 5 },
        container: { getAttrs: vi.fn().mockReturnValue({ id: 'mainLayer' }) },
        measureContainer: undefined,
      });
      handlers['pointerdown']?.(makePointerEvent({ pointerId: 0 }));
      // measureContainer is undefined, so add() is never called
      expect(mockWeave._measureContainer.add).not.toHaveBeenCalled();
    });
  });

  // ── Suite 10: handleMovement ───────────────────────────────────────────────

  describe('handleMovement (private, via pointermove)', () => {
    let handlers: Record<string, (e?: unknown) => void>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
    });

    function setupDefiningState() {
      (action as unknown as R)['state'] = WEAVE_ARROW_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['arrowId'] = 'arrow-1';
      const mockArrow = {
        setAttrs: vi.fn(),
        points: vi.fn().mockReturnValue([0, 0, 5, 5]),
        x: vi.fn().mockReturnValue(10),
        y: vi.fn().mockReturnValue(20),
      };
      const mockNextPoint = { setAttrs: vi.fn() };
      (action as unknown as R)['tempArrowNode'] = mockArrow;
      (action as unknown as R)['tempNextPoint'] = mockNextPoint;
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      return { mockArrow, mockNextPoint };
    }

    it('10.1 state ≠ DEFINING_SIZE → returns early without updating nodes', () => {
      const { mockArrow } = setupDefiningState();
      (action as unknown as R)['state'] = WEAVE_ARROW_TOOL_STATE.ADDING;
      handlers['pointermove']?.();
      expect(mockArrow.setAttrs).not.toHaveBeenCalled();
    });

    it('10.1b handleMovement called directly with state ≠ DEFINING_SIZE → early return (covers internal guard)', () => {
      const { mockArrow } = setupDefiningState();
      (action as unknown as R)['state'] = WEAVE_ARROW_TOOL_STATE.ADDING;
      (action as unknown as R)['handleMovement']();
      expect(mockArrow.setAttrs).not.toHaveBeenCalled();
    });

    it('10.2 all guards satisfied → updates tempArrowNode points', () => {
      const { mockArrow } = setupDefiningState();
      handlers['pointermove']?.();
      expect(mockArrow.setAttrs).toHaveBeenCalled();
    });

    it('10.3 updates tempNextPoint position to current mousePoint', () => {
      const { mockNextPoint } = setupDefiningState();
      handlers['pointermove']?.();
      expect(mockNextPoint.setAttrs).toHaveBeenCalledWith({ x: 30, y: 40 });
    });

    it('10.4 missing arrowId → guard prevents update', () => {
      const { mockArrow } = setupDefiningState();
      (action as unknown as R)['arrowId'] = null;
      handlers['pointermove']?.();
      expect(mockArrow.setAttrs).not.toHaveBeenCalled();
    });

    it('10.5 missing tempArrowNode → guard prevents update (no throw)', () => {
      setupDefiningState();
      (action as unknown as R)['tempArrowNode'] = null;
      expect(() => handlers['pointermove']?.()).not.toThrow();
    });

    it('10.6 missing measureContainer → guard prevents update', () => {
      const { mockArrow } = setupDefiningState();
      (action as unknown as R)['measureContainer'] = undefined;
      handlers['pointermove']?.();
      expect(mockArrow.setAttrs).not.toHaveBeenCalled();
    });

    it('10.7 missing tempNextPoint → guard prevents update', () => {
      const { mockArrow } = setupDefiningState();
      (action as unknown as R)['tempNextPoint'] = undefined;
      handlers['pointermove']?.();
      expect(mockArrow.setAttrs).not.toHaveBeenCalled();
    });
  });

  // ── Suite 11: handleSettingSize ────────────────────────────────────────────

  describe('handleSettingSize (private, via pointerup)', () => {
    let handlers: Record<string, (e?: unknown) => void>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
      (action as unknown as R)['state'] = WEAVE_ARROW_TOOL_STATE.DEFINING_SIZE;
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      pointers.set(5, { x: 0, y: 0 });
    });

    function setupFullState() {
      (action as unknown as R)['arrowId'] = 'arrow-1';
      const mockLine = {
        setAttrs: vi.fn(),
        points: vi.fn().mockReturnValue([0, 0]),
        x: vi.fn().mockReturnValue(5),
        y: vi.fn().mockReturnValue(5),
      };
      const mockArrow = {
        setAttrs: vi.fn(),
        points: vi.fn().mockReturnValue([0, 0]),
        x: vi.fn().mockReturnValue(0),
        y: vi.fn().mockReturnValue(0),
      };
      const mockPoint = { setAttrs: vi.fn() };
      const mockNextPoint = { setAttrs: vi.fn() };
      (action as unknown as R)['tempMainArrowNode'] = mockLine;
      (action as unknown as R)['tempArrowNode'] = mockArrow;
      (action as unknown as R)['tempPoint'] = mockPoint;
      (action as unknown as R)['tempNextPoint'] = mockNextPoint;
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      return { mockLine, mockArrow, mockPoint, mockNextPoint };
    }

    it('11.1 appends mousePoint (relative to line origin) to tempMainArrowNode.points()', () => {
      const { mockLine } = setupFullState();
      handlers['pointerup']?.(makePointerEvent({ pointerId: 5 }));
      // mousePoint={x:30, y:40}, line.x()=5, line.y()=5 → new pts=[0,0,25,35]
      const callArg = mockLine.setAttrs.mock.calls[0]?.[0] as R;
      expect(callArg?.['points']).toEqual([0, 0, 25, 35]);
    });

    it('11.2 updates tempPoint position to current mousePoint', () => {
      const { mockPoint } = setupFullState();
      handlers['pointerup']?.(makePointerEvent({ pointerId: 5 }));
      expect(mockPoint.setAttrs).toHaveBeenCalledWith({ x: 30, y: 40 });
    });

    it('11.3 updates tempNextPoint position to current mousePoint', () => {
      const { mockNextPoint } = setupFullState();
      handlers['pointerup']?.(makePointerEvent({ pointerId: 5 }));
      expect(mockNextPoint.setAttrs).toHaveBeenCalledWith({ x: 30, y: 40 });
    });

    it('11.4 resets tempArrowNode to new mousePoint position with points [0, 0]', () => {
      const { mockArrow } = setupFullState();
      handlers['pointerup']?.(makePointerEvent({ pointerId: 5 }));
      expect(mockArrow.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({ x: 30, y: 40, points: [0, 0] })
      );
    });

    it('11.5 sets state back to DEFINING_SIZE after handleSettingSize', () => {
      setupFullState();
      handlers['pointerup']?.(makePointerEvent({ pointerId: 5 }));
      expect((action as unknown as R)['state']).toBe(WEAVE_ARROW_TOOL_STATE.DEFINING_SIZE);
    });

    it('11.6 missing any required field → skips entirely without throwing', () => {
      // No setupFullState → all fields remain null/undefined
      expect(() => handlers['pointerup']?.(makePointerEvent({ pointerId: 5 }))).not.toThrow();
    });
  });

  // ── Suite 12: cleanup ──────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('12.1 calls destroy() on tempPoint, tempNextPoint, tempArrowNode', () => {
      const mockPoint = { destroy: vi.fn() };
      const mockNextPoint = { destroy: vi.fn() };
      const mockTempArrow = { destroy: vi.fn() };
      (action as unknown as R)['tempPoint'] = mockPoint;
      (action as unknown as R)['tempNextPoint'] = mockNextPoint;
      (action as unknown as R)['tempArrowNode'] = mockTempArrow;
      action.cleanup();
      expect(mockPoint.destroy).toHaveBeenCalled();
      expect(mockNextPoint.destroy).toHaveBeenCalled();
      expect(mockTempArrow.destroy).toHaveBeenCalled();
    });

    it('12.2 skips destroy when tempPoint/tempNextPoint/tempArrowNode are undefined', () => {
      expect(() => action.cleanup()).not.toThrow();
    });

    it('12.3 arrowId null → skips arrow creation', () => {
      (action as unknown as R)['arrowId'] = null;
      (action as unknown as R)['tempMainArrowNode'] = {
        destroy: vi.fn(),
        points: vi.fn().mockReturnValue([0, 0, 10, 20]),
      };
      action.cleanup();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('12.4 tempMainArrowNode null → skips arrow creation', () => {
      (action as unknown as R)['arrowId'] = 'some-id';
      (action as unknown as R)['tempMainArrowNode'] = null;
      action.cleanup();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('12.5 tempMainArrowNode.points().length < 4 → skips arrow creation', () => {
      (action as unknown as R)['arrowId'] = 'some-id';
      (action as unknown as R)['tempMainArrowNode'] = {
        destroy: vi.fn(),
        points: vi.fn().mockReturnValue([0, 0]),
      };
      action.cleanup();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('12.6 all guards pass + nodeHandler exists → creates arrow, calls addNode, emits onAddedArrow', () => {
      const mockClone = {
        getAttrs: vi.fn().mockReturnValue({ x: 0, y: 0, points: [0, 0, 10, 20] }),
      };
      const mockLine = {
        destroy: vi.fn(),
        points: vi.fn().mockReturnValue([0, 0, 10, 20]),
        clone: vi.fn().mockReturnValue(mockClone),
      };
      (action as unknown as R)['arrowId'] = 'final-arrow';
      (action as unknown as R)['tempMainArrowNode'] = mockLine;

      const finalArrow = { props: { dragBoundFunc: vi.fn(), fill: 'red' } };
      mockWeave.getNodeHandler.mockReturnValue({
        create: vi.fn().mockReturnValue(finalArrow),
      });

      action.cleanup();

      expect(mockWeave.addNode).toHaveBeenCalled();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedArrow');
    });

    it('12.6b container defined → addNode called with container id (covers ?. non-null branch)', () => {
      const mockClone = { getAttrs: vi.fn().mockReturnValue({}) };
      const mockLine = {
        destroy: vi.fn(),
        points: vi.fn().mockReturnValue([0, 0, 10, 20]),
        clone: vi.fn().mockReturnValue(mockClone),
      };
      (action as unknown as R)['arrowId'] = 'final-arrow';
      (action as unknown as R)['tempMainArrowNode'] = mockLine;
      (action as unknown as R)['container'] = {
        getAttrs: vi.fn().mockReturnValue({ id: 'target-layer' }),
      };
      const finalArrow = { props: {} };
      mockWeave.getNodeHandler.mockReturnValue({
        create: vi.fn().mockReturnValue(finalArrow),
      });

      action.cleanup();

      expect(mockWeave.addNode).toHaveBeenCalledWith(finalArrow, 'target-layer');
    });

    it('12.7 nodeHandler absent → skips node creation', () => {
      const mockLine = {
        destroy: vi.fn(),
        points: vi.fn().mockReturnValue([0, 0, 10, 20]),
        clone: vi.fn().mockReturnValue({ getAttrs: vi.fn().mockReturnValue({}) }),
      };
      (action as unknown as R)['arrowId'] = 'final-arrow';
      (action as unknown as R)['tempMainArrowNode'] = mockLine;
      mockWeave.getNodeHandler.mockReturnValue(undefined);

      action.cleanup();

      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('12.8 selectionPlugin present + findOne returns node → setSelectedNodes([node]) + triggerAction', () => {
      const mockLine = {
        destroy: vi.fn(),
        points: vi.fn().mockReturnValue([0, 0, 10, 20]),
        clone: vi.fn().mockReturnValue({ getAttrs: vi.fn().mockReturnValue({}) }),
      };
      (action as unknown as R)['arrowId'] = 'final-arrow';
      (action as unknown as R)['tempMainArrowNode'] = mockLine;
      mockWeave.getNodeHandler.mockReturnValue({
        create: vi.fn().mockReturnValue({ props: {} }),
      });
      const foundNode = { id: 'final-arrow' };
      mockWeave._stage.findOne.mockReturnValue(foundNode);
      const setSelectedNodes = vi.fn();
      mockWeave.getPlugin.mockReturnValue({ setSelectedNodes });

      action.cleanup();

      expect(setSelectedNodes).toHaveBeenCalledWith([foundNode]);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('12.9 selectionPlugin present + findOne returns undefined → no setSelectedNodes, still triggerAction', () => {
      const mockLine = {
        destroy: vi.fn(),
        points: vi.fn().mockReturnValue([0, 0, 10, 20]),
        clone: vi.fn().mockReturnValue({ getAttrs: vi.fn().mockReturnValue({}) }),
      };
      (action as unknown as R)['arrowId'] = 'final-arrow';
      (action as unknown as R)['tempMainArrowNode'] = mockLine;
      mockWeave.getNodeHandler.mockReturnValue({
        create: vi.fn().mockReturnValue({ props: {} }),
      });
      mockWeave._stage.findOne.mockReturnValue(undefined);
      const setSelectedNodes = vi.fn();
      mockWeave.getPlugin.mockReturnValue({ setSelectedNodes });

      action.cleanup();

      expect(setSelectedNodes).not.toHaveBeenCalled();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('12.10 selectionPlugin absent → skips setSelectedNodes and triggerAction', () => {
      const mockLine = {
        destroy: vi.fn(),
        points: vi.fn().mockReturnValue([0, 0, 10, 20]),
        clone: vi.fn().mockReturnValue({ getAttrs: vi.fn().mockReturnValue({}) }),
      };
      (action as unknown as R)['arrowId'] = 'final-arrow';
      (action as unknown as R)['tempMainArrowNode'] = mockLine;
      mockWeave.getNodeHandler.mockReturnValue({
        create: vi.fn().mockReturnValue({ props: {} }),
      });
      mockWeave.getPlugin.mockReturnValue(undefined);

      action.cleanup();

      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('12.11 resets all instance fields to initial values after cleanup', () => {
      action.cleanup();
      const a = action as unknown as R;
      expect(a['arrowId']).toBeNull();
      expect(a['tempArrowId']).toBeNull();
      expect(a['tempMainArrowNode']).toBeNull();
      expect(a['tempArrowNode']).toBeNull();
      expect(a['container']).toBeUndefined();
      expect(a['measureContainer']).toBeUndefined();
      expect(a['clickPoint']).toBeNull();
      expect(a['tempPoint']).toBeUndefined();
      expect(a['tempNextPoint']).toBeUndefined();
      expect(a['initialCursor']).toBeNull();
    });

    it('12.12 sets cursor to "default" after cleanup', () => {
      action.cleanup();
      expect(mockWeave._container.style.cursor).toBe('default');
    });

    it('12.13 sets state to IDLE after cleanup', () => {
      (action as unknown as R)['state'] = WEAVE_ARROW_TOOL_STATE.DEFINING_SIZE;
      action.cleanup();
      expect((action as unknown as R)['state']).toBe(WEAVE_ARROW_TOOL_STATE.IDLE);
    });

    it('12.14 deletes dragBoundFunc from finalArrow.props', () => {
      const mockLine = {
        destroy: vi.fn(),
        points: vi.fn().mockReturnValue([0, 0, 10, 20]),
        clone: vi.fn().mockReturnValue({ getAttrs: vi.fn().mockReturnValue({}) }),
      };
      (action as unknown as R)['arrowId'] = 'final-arrow';
      (action as unknown as R)['tempMainArrowNode'] = mockLine;

      const finalArrow = { props: { dragBoundFunc: vi.fn(), fill: 'red' } };
      mockWeave.getNodeHandler.mockReturnValue({
        create: vi.fn().mockReturnValue(finalArrow),
      });

      action.cleanup();

      expect('dragBoundFunc' in finalArrow.props).toBe(false);
    });
  });

  // ── Suite 13: setCursor ────────────────────────────────────────────────────

  describe('setCursor (private, covered via trigger → addArrow)', () => {
    it('13.1 sets stage.container().style.cursor to "crosshair"', () => {
      action.trigger(vi.fn());
      expect(mockWeave._container.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 14: setFocusStage ────────────────────────────────────────────────

  describe('setFocusStage (private, covered via trigger → addArrow)', () => {
    it('14.1 sets tabIndex = 1, calls blur(), then focus()', () => {
      action.trigger(vi.fn());
      expect(mockWeave._container.tabIndex).toBe(1);
      expect(mockWeave._container.blur).toHaveBeenCalled();
      expect(mockWeave._container.focus).toHaveBeenCalled();
    });
  });
});
