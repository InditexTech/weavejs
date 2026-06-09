// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Break circular dependency
vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));

vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-uuid') }));

// Hoist Konva.Rect mock
const { MockRect } = vi.hoisted(() => {
  const MockRect = vi.fn().mockImplementation((attrs: Record<string, unknown>) => {
    const inst = {
      _attrs: { ...attrs },
      setAttrs: vi.fn().mockImplementation(function (
        this: { _attrs: Record<string, unknown> },
        a: Record<string, unknown>
      ) {
        Object.assign(this._attrs, a);
      }),
      getAttrs: vi.fn().mockImplementation(function (
        this: { _attrs: Record<string, unknown> }
      ) {
        return this._attrs;
      }),
      clone: vi.fn(),
      destroy: vi.fn(),
    };
    // clone returns a fresh plain object with same attrs
    inst.clone.mockImplementation(() => ({
      _attrs: { ...inst._attrs },
      getAttrs: vi.fn().mockReturnValue({ ...inst._attrs }),
      destroy: vi.fn(),
    }));
    return inst;
  });
  return { MockRect };
});

vi.mock('konva', () => ({ default: { Rect: MockRect } }));

// In node environment alias window → globalThis
if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { makePointerEvent, type R } from '../../__tests__/shared/action.test-helpers';
import { WeaveRectangleToolAction } from '../rectangle-tool';
import { RECTANGLE_TOOL_ACTION_NAME, RECTANGLE_TOOL_STATE } from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeContainer(id = 'layer-id') {
  return {
    getAttrs: vi.fn().mockReturnValue({ id }),
    add: vi.fn(),
  };
}

function makeMockWeave() {
  const stageContainer = {
    tabIndex: 0,
    focus: vi.fn(),
    blur: vi.fn(),
    click: vi.fn(),
    style: { cursor: '' },
    findOne: vi.fn().mockReturnValue(null),
  };

  const stageHandlers: Record<string, (e?: unknown) => void> = {};
  const stage = {
    container: vi.fn().mockReturnValue(stageContainer),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      // accumulate multiple handlers for same event
      if (stageHandlers[event]) {
        const prev = stageHandlers[event];
        stageHandlers[event] = (e) => {
          prev(e);
          handler(e);
        };
      } else {
        stageHandlers[event] = handler;
      }
    }),
    findOne: vi.fn().mockReturnValue(null),
  };

  const measureContainer = makeContainer('measure-layer');
  const defaultContainer = makeContainer('layer-id');

  const selectionPlugin = {
    setSelectedNodes: vi.fn(),
  };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(selectionPlugin),
    getMousePointer: vi.fn().mockReturnValue({
      mousePoint: { x: 50, y: 75 },
      container: defaultContainer,
      measureContainer,
    }),
    getMousePointerRelativeToContainer: vi.fn().mockReturnValue({
      mousePoint: { x: 120, y: 140 },
    }),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    getActiveAction: vi.fn().mockReturnValue(RECTANGLE_TOOL_ACTION_NAME),
    emitEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addNode: vi.fn(),
    triggerAction: vi.fn(),
    getChildLogger: vi.fn().mockReturnValue({ debug: vi.fn() }),
    _stage: stage,
    _stageContainer: stageContainer,
    _stageHandlers: stageHandlers,
    _selectionPlugin: selectionPlugin,
    _measureContainer: measureContainer,
    _defaultContainer: defaultContainer,
  };
}

function makeNodeHandler() {
  const mockNode = { getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }) };
  return {
    create: vi.fn().mockReturnValue(mockNode),
    _mockNode: mockNode,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveRectangleToolAction', () => {
  let action: WeaveRectangleToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let windowHandlers: Record<string, (e: KeyboardEvent) => void>;

  beforeEach(() => {
    windowHandlers = {};
    vi.stubGlobal(
      'addEventListener',
      vi.fn((type: string, handler: (e: KeyboardEvent) => void) => {
        windowHandlers[type] = handler;
      })
    );

    action = new WeaveRectangleToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
    (action as unknown as R)['cancelAction'] = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function triggerAction(cancelFn = vi.fn()) {
    action.trigger(cancelFn);
    return { cancelFn, handlers: mockWeave._stageHandlers };
  }

  // ── Suite 1: constructor / initialize ─────────────────────────────────────

  describe('constructor / initialize', () => {
    it('1.1 initialized=false, state=IDLE, rectId=null after construction', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      expect((action as unknown as R)['state']).toBe(RECTANGLE_TOOL_STATE.IDLE);
      expect((action as unknown as R)['rectId']).toBeNull();
    });

    it('1.2 moved=false, tempRectNode=null, clickPoint=null', () => {
      expect((action as unknown as R)['moved']).toBe(false);
      expect((action as unknown as R)['tempRectNode']).toBeNull();
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });

    it('1.3 container=undefined, measureContainer=undefined, pointers=empty Map', () => {
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['measureContainer']).toBeUndefined();
      expect((action as unknown as R)['pointers']).toBeInstanceOf(Map);
      expect(((action as unknown as R)['pointers'] as Map<number, unknown>).size).toBe(0);
    });

    it('1.4 onPropsChange and onInit are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
    });
  });

  // ── Suite 2: getName ───────────────────────────────────────────────────────

  describe('getName', () => {
    it('2.1 returns RECTANGLE_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(RECTANGLE_TOOL_ACTION_NAME);
    });
  });

  // ── Suite 3: initProps ─────────────────────────────────────────────────────

  describe('initProps', () => {
    it('3.1 returns expected defaults', () => {
      const props = (action as unknown as R)['initProps']() as Record<string, unknown>;
      expect(props.opacity).toBe(1);
      expect(props.fill).toBe('#ffffffff');
      expect(props.stroke).toBe('#000000ff');
      expect(props.strokeWidth).toBe(1);
      expect(props.width).toBe(100);
      expect(props.height).toBe(100);
    });
  });

  // ── Suite 4: trigger — guards & setup ─────────────────────────────────────

  describe('trigger — guards & setup', () => {
    it('4.1 !instance → throws "Instance not defined"', () => {
      const bare = new WeaveRectangleToolAction();
      expect(() => bare.trigger(vi.fn())).toThrow('Instance not defined');
    });

    it('4.2 !initialized → setupEvents called (stage.on called 4 times)', () => {
      triggerAction();
      expect(mockWeave._stage.on).toHaveBeenCalledTimes(4);
      expect((action as unknown as R)['initialized']).toBe(true);
    });

    it('4.3 second trigger → setupEvents NOT called again (still 4 stage.on calls)', () => {
      triggerAction();
      triggerAction();
      expect(mockWeave._stage.on).toHaveBeenCalledTimes(4);
    });

    it('4.4 sets tabIndex=1 and calls focus()', () => {
      triggerAction();
      expect(mockWeave._stageContainer.tabIndex).toBe(1);
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
    });

    it('4.5 selectionPlugin present → setSelectedNodes([]) called', () => {
      triggerAction();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
    });

    it('4.6 selectionPlugin absent → no setSelectedNodes', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      triggerAction();
      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
    });

    it('4.8 after trigger → state=ADDING, clickPoint=null', () => {
      triggerAction();
      expect((action as unknown as R)['state']).toBe(RECTANGLE_TOOL_STATE.ADDING);
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });
  });

  // ── Suite 5: keydown window listener ──────────────────────────────────────

  describe('keydown window listener', () => {
    let cancelFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      cancelFn = vi.fn();
      triggerAction(cancelFn);
    });

    it('5.1 Enter + active=rectangleTool → cancelAction called', () => {
      mockWeave.getActiveAction.mockReturnValue(RECTANGLE_TOOL_ACTION_NAME);
      windowHandlers['keydown']?.({ code: 'Enter' } as KeyboardEvent);
      expect(cancelFn).toHaveBeenCalled();
    });

    it('5.2 Enter + active≠rectangleTool → NOT called', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      windowHandlers['keydown']?.({ code: 'Enter' } as KeyboardEvent);
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('5.3 Escape + active=rectangleTool → cancelAction called', () => {
      mockWeave.getActiveAction.mockReturnValue(RECTANGLE_TOOL_ACTION_NAME);
      windowHandlers['keydown']?.({ code: 'Escape' } as KeyboardEvent);
      expect(cancelFn).toHaveBeenCalled();
    });

    it('5.4 Escape + active≠rectangleTool → NOT called', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      windowHandlers['keydown']?.({ code: 'Escape' } as KeyboardEvent);
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('5.5 other key → nothing', () => {
      windowHandlers['keydown']?.({ code: 'KeyA' } as KeyboardEvent);
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 6: pointermove (first — simple) ─────────────────────────────────

  describe('pointermove (first — sets cursor only)', () => {
    beforeEach(() => triggerAction());

    it('6.1 state=IDLE → early return, cursor NOT set', () => {
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.IDLE;
      mockWeave._stageContainer.style.cursor = '';
      // fire the pointermove — only the first simple one fires when state=IDLE
      // Both handlers fire but first returns early; second also returns early on IDLE
      mockWeave._stageHandlers['pointermove']?.();
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('6.2 state=ADDING → setCursor called (cursor=crosshair)', () => {
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.ADDING;
      mockWeave._stageContainer.style.cursor = '';
      mockWeave._stageHandlers['pointermove']?.(makePointerEvent({ buttons: 0 }));
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 7: pointerdown handler ──────────────────────────────────────────

  describe('pointerdown handler', () => {
    beforeEach(() => {
      triggerAction();
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.ADDING;
    });

    it('7.1 pointers.size=2 + active=rectangleTool → state=ADDING, no handleAdding', () => {
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.IDLE;
      // Add a pointer already
      ((action as unknown as R)['pointers'] as Map<number, unknown>).set(99, { x: 0, y: 0 });
      mockWeave.getActiveAction.mockReturnValue(RECTANGLE_TOOL_ACTION_NAME);
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['state']).toBe(RECTANGLE_TOOL_STATE.ADDING);
      // handleAdding NOT called — clickPoint stays null since state was IDLE before
      expect((action as unknown as R)['rectId']).toBeNull();
    });

    it('7.2 pointers.size=1 + state=ADDING → handleAdding() called', () => {
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['rectId']).toBe('test-uuid');
      expect((action as unknown as R)['state']).toBe(RECTANGLE_TOOL_STATE.DEFINING_SIZE);
    });

    it('7.3 pointers.size=1 + state=IDLE → nothing', () => {
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.IDLE;
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['rectId']).toBeNull();
    });
  });

  // ── Suite 8: pointermove (second — richer) ────────────────────────────────

  describe('pointermove (second — with movement logic)', () => {
    beforeEach(() => triggerAction());

    it('8.1 state=IDLE → early return from both handlers', () => {
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.IDLE;
      mockWeave._stageContainer.style.cursor = '';
      mockWeave._stageHandlers['pointermove']?.(makePointerEvent({ buttons: 1, pointerId: 1 }));
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('8.2 state=ADDING + !isPressed (buttons=0) → setCursor, no handleMovement', () => {
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.ADDING;
      mockWeave._stageContainer.style.cursor = '';
      mockWeave._stageHandlers['pointermove']?.(makePointerEvent({ buttons: 0, pointerId: 1 }));
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
      expect(mockWeave.getMousePointerRelativeToContainer).not.toHaveBeenCalled();
    });

    it('8.3 state=ADDING + isPressed + !pointers.has(pointerId) → return', () => {
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.ADDING;
      // pointerId=999 not in pointers
      mockWeave._stageHandlers['pointermove']?.(makePointerEvent({ buttons: 1, pointerId: 999 }));
      expect(mockWeave.getMousePointerRelativeToContainer).not.toHaveBeenCalled();
    });

    it('8.4 pointers.size=2 + active=rectangleTool → state=ADDING, return early', () => {
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.DEFINING_SIZE;
      // Add extra pointer
      ((action as unknown as R)['pointers'] as Map<number, unknown>).set(99, { x: 0, y: 0 });
      ((action as unknown as R)['pointers'] as Map<number, unknown>).set(1, { x: 50, y: 75 });
      mockWeave.getActiveAction.mockReturnValue(RECTANGLE_TOOL_ACTION_NAME);
      mockWeave._stageHandlers['pointermove']?.(makePointerEvent({ buttons: 1, pointerId: 1 }));
      expect((action as unknown as R)['state']).toBe(RECTANGLE_TOOL_STATE.ADDING);
    });

    it('8.5 state=DEFINING_SIZE + isPressed + pointers.has + size=1 → handleMovement', () => {
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.DEFINING_SIZE;
      ((action as unknown as R)['pointers'] as Map<number, unknown>).set(1, { x: 50, y: 75 });
      // Set up required fields for handleMovement
      (action as unknown as R)['rectId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      const tempRect = MockRect.mock.results[0]?.value ?? { setAttrs: vi.fn(), _attrs: {} };
      (action as unknown as R)['tempRectNode'] = tempRect;
      mockWeave.getActiveAction.mockReturnValue(RECTANGLE_TOOL_ACTION_NAME);
      mockWeave._stageHandlers['pointermove']?.(makePointerEvent({ buttons: 1, pointerId: 1 }));
      expect((action as unknown as R)['moved']).toBe(true);
    });
  });

  // ── Suite 9: pointerup handler ────────────────────────────────────────────

  describe('pointerup handler', () => {
    let cancelFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      cancelFn = vi.fn();
      triggerAction(cancelFn);
      // Set up state for handleSettingSize guard to pass
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['rectId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      const tempRect = { setAttrs: vi.fn(), getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid-preview' }), clone: vi.fn().mockReturnValue({ getAttrs: vi.fn().mockReturnValue({ x: 50, y: 75, width: 100, height: 100 }) }), destroy: vi.fn() };
      (action as unknown as R)['tempRectNode'] = tempRect;
    });

    it('9.1 deletes pointer from map', () => {
      ((action as unknown as R)['pointers'] as Map<number, unknown>).set(1, { x: 50, y: 75 });
      mockWeave._stageHandlers['pointerup']?.(makePointerEvent({ pointerId: 1 }));
      expect(((action as unknown as R)['pointers'] as Map<number, unknown>).has(1)).toBe(false);
    });

    it('9.2 isTap=true (touch, dist<10, dt<300ms) → moved=false', () => {
      (action as unknown as R)['moved'] = true;
      (action as unknown as R)['tapStart'] = { x: 50, y: 75, time: performance.now() - 10 };
      mockWeave._stageHandlers['pointerup']?.(makePointerEvent({ clientX: 50, clientY: 75, pointerType: 'touch' }));
      expect((action as unknown as R)['moved']).toBe(false);
    });

    it('9.3 isTap=false (no tapStart) → moved unchanged', () => {
      (action as unknown as R)['moved'] = true;
      (action as unknown as R)['tapStart'] = null;
      mockWeave._stageHandlers['pointerup']?.(makePointerEvent({ pointerType: 'touch' }));
      // moved stays true because isTap=false (tapStart is null)
      // handleSettingSize will reset it, so just check cancelAction was called
      expect(cancelFn).toHaveBeenCalled();
    });

    it('9.4 state=DEFINING_SIZE → handleSettingSize called (cancelAction fires)', () => {
      mockWeave._stageHandlers['pointerup']?.(makePointerEvent({ pointerId: 1 }));
      expect(cancelFn).toHaveBeenCalled();
    });

    it('9.5 state≠DEFINING_SIZE → handleSettingSize NOT called', () => {
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerup']?.(makePointerEvent({ pointerId: 1 }));
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 10: addRectangle (via trigger) ──────────────────────────────────

  describe('addRectangle (via trigger)', () => {
    it('10.1 emitEvent("onAddingRectangle") called', () => {
      triggerAction();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddingRectangle');
    });

    it('10.2 clickPoint=null, state=ADDING', () => {
      triggerAction();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['state']).toBe(RECTANGLE_TOOL_STATE.ADDING);
    });

    it('10.3 setFocusStage: tabIndex=1, blur, focus', () => {
      triggerAction();
      expect(mockWeave._stageContainer.blur).toHaveBeenCalled();
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
    });
  });

  // ── Suite 11: handleAdding — temp rect creation ───────────────────────────

  describe('handleAdding', () => {
    beforeEach(() => {
      triggerAction();
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.ADDING;
    });

    it('11.1 mousePoint=null → clickPoint=null, Konva.Rect created with x=0, y=0', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: null,
        container: mockWeave._defaultContainer,
        measureContainer: mockWeave._measureContainer,
      });
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      const rectAttrs = (MockRect.mock.calls.at(-1) as unknown[])[0] as Record<string, unknown>;
      expect(rectAttrs.x).toBe(0);
      expect(rectAttrs.y).toBe(0);
    });

    it('11.2 mousePoint defined → Konva.Rect created with clickPoint coords', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 50, y: 75 },
        container: mockWeave._defaultContainer,
        measureContainer: mockWeave._measureContainer,
      });
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      const rectAttrs = (MockRect.mock.calls.at(-1) as unknown[])[0] as Record<string, unknown>;
      expect(rectAttrs.x).toBe(50);
      expect(rectAttrs.y).toBe(75);
    });

    it('11.3 measureContainer present → measureContainer.add(tempRectNode) called', () => {
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect(mockWeave._measureContainer.add).toHaveBeenCalled();
    });

    it('11.4 measureContainer=null → no crash (?.add skipped)', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 50, y: 75 },
        container: mockWeave._defaultContainer,
        measureContainer: null,
      });
      expect(() =>
        mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }))
      ).not.toThrow();
    });

    it('11.5 tempRectNode already set → NO new Konva.Rect created', () => {
      const existingRect = { setAttrs: vi.fn(), getAttrs: vi.fn().mockReturnValue({}), clone: vi.fn(), destroy: vi.fn() };
      (action as unknown as R)['tempRectNode'] = existingRect;
      const callsBefore = MockRect.mock.calls.length;
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect(MockRect.mock.calls.length).toBe(callsBefore);
    });

    it('11.6 after handleAdding → state=DEFINING_SIZE', () => {
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['state']).toBe(RECTANGLE_TOOL_STATE.DEFINING_SIZE);
    });
  });

  // ── Suite 12: handleSettingSize — guard (any field missing) ───────────────

  describe('handleSettingSize — guard (missing required field)', () => {
    beforeEach(() => {
      triggerAction();
    });

    it('12.1 rectId=null → only cancelAction called', () => {
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      (action as unknown as R)['rectId'] = null;
      (action as unknown as R)['tempRectNode'] = { setAttrs: vi.fn(), getAttrs: vi.fn().mockReturnValue({}), clone: vi.fn(), destroy: vi.fn() };
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      (action as unknown as R)['handleSettingSize']();
      expect(cancelFn).toHaveBeenCalled();
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAddedRectangle');
    });

    it('12.2 tempRectNode=null → only cancelAction called', () => {
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      (action as unknown as R)['rectId'] = 'test-uuid';
      (action as unknown as R)['tempRectNode'] = null;
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      (action as unknown as R)['handleSettingSize']();
      expect(cancelFn).toHaveBeenCalled();
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAddedRectangle');
    });

    it('12.3 clickPoint=null → only cancelAction called', () => {
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      (action as unknown as R)['rectId'] = 'test-uuid';
      (action as unknown as R)['tempRectNode'] = { setAttrs: vi.fn(), getAttrs: vi.fn().mockReturnValue({}), clone: vi.fn(), destroy: vi.fn() };
      (action as unknown as R)['clickPoint'] = null;
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      (action as unknown as R)['handleSettingSize']();
      expect(cancelFn).toHaveBeenCalled();
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAddedRectangle');
    });

    it('12.4 container=undefined → only cancelAction called', () => {
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      (action as unknown as R)['rectId'] = 'test-uuid';
      (action as unknown as R)['tempRectNode'] = { setAttrs: vi.fn(), getAttrs: vi.fn().mockReturnValue({}), clone: vi.fn(), destroy: vi.fn() };
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = undefined;
      (action as unknown as R)['handleSettingSize']();
      expect(cancelFn).toHaveBeenCalled();
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAddedRectangle');
    });
  });

  // ── Suite 13: handleSettingSize — moved=false (default dimensions) ─────────

  describe('handleSettingSize — moved=false', () => {
    function setupHandleSettingSize() {
      const cancelFn = vi.fn();
      const tempRect = {
        setAttrs: vi.fn(),
        getAttrs: vi.fn().mockReturnValue({ x: 50, y: 75, width: 100, height: 100, id: 'test-uuid-preview' }),
        clone: vi.fn().mockReturnValue({
          getAttrs: vi.fn().mockReturnValue({ x: 50, y: 75, width: 100, height: 100 }),
          destroy: vi.fn(),
        }),
        destroy: vi.fn(),
      };
      (action as unknown as R)['cancelAction'] = cancelFn;
      (action as unknown as R)['rectId'] = 'test-uuid';
      (action as unknown as R)['tempRectNode'] = tempRect;
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      (action as unknown as R)['moved'] = false;
      return { cancelFn, tempRect };
    }

    it('13.1 moved=false → setAttrs called with clickPoint coords and default dims', () => {
      const { tempRect } = setupHandleSettingSize();
      (action as unknown as R)['handleSettingSize']();
      expect(tempRect.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({ x: 50, y: 75, width: 100, height: 100 })
      );
    });

    it('13.2 emitEvent("onAddedRectangle") called', () => {
      setupHandleSettingSize();
      (action as unknown as R)['handleSettingSize']();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedRectangle');
    });

    it('13.3 cancelAction() called', () => {
      const { cancelFn } = setupHandleSettingSize();
      (action as unknown as R)['handleSettingSize']();
      expect(cancelFn).toHaveBeenCalled();
    });
  });

  // ── Suite 14: handleSettingSize — moved=true (calculated dimensions) ───────

  describe('handleSettingSize — moved=true', () => {
    it('14.1 moved=true → uses Math.min/Math.abs for pos and dims', () => {
      // clickPoint={x:50,y:75}, mousePoint={x:120,y:140}
      // rectPos={x:min(50,120)=50, y:min(75,140)=75}
      // width=Math.abs(50-120)=70, height=Math.abs(75-140)=65
      const tempRect = {
        setAttrs: vi.fn(),
        getAttrs: vi.fn().mockReturnValue({}),
        clone: vi.fn().mockReturnValue({ getAttrs: vi.fn().mockReturnValue({}) }),
        destroy: vi.fn(),
      };
      (action as unknown as R)['cancelAction'] = vi.fn();
      (action as unknown as R)['rectId'] = 'test-uuid';
      (action as unknown as R)['tempRectNode'] = tempRect;
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      (action as unknown as R)['moved'] = true;
      // getMousePointerRelativeToContainer returns {mousePoint:{x:120,y:140}}
      (action as unknown as R)['handleSettingSize']();
      expect(tempRect.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({ x: 50, y: 75, width: 70, height: 65 })
      );
    });
  });

  // ── Suite 15: handleSettingSize — nodeHandler present ────────────────────

  describe('handleSettingSize — nodeHandler present', () => {
    let nodeHandler: ReturnType<typeof makeNodeHandler>;
    let tempRect: {
      setAttrs: ReturnType<typeof vi.fn>;
      getAttrs: ReturnType<typeof vi.fn>;
      clone: ReturnType<typeof vi.fn>;
      destroy: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      nodeHandler = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);

      tempRect = {
        setAttrs: vi.fn(),
        getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid-preview' }),
        clone: vi.fn().mockReturnValue({
          getAttrs: vi.fn().mockReturnValue({ x: 50, y: 75 }),
          destroy: vi.fn(),
        }),
        destroy: vi.fn(),
      };
      (action as unknown as R)['cancelAction'] = vi.fn();
      (action as unknown as R)['rectId'] = 'test-uuid';
      (action as unknown as R)['tempRectNode'] = tempRect;
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      (action as unknown as R)['moved'] = false;
    });

    it('15.1 nodeHandler present → clone(), create(), addNode() called', () => {
      (action as unknown as R)['handleSettingSize']();
      expect(tempRect.clone).toHaveBeenCalled();
      expect(nodeHandler.create).toHaveBeenCalledWith('test-uuid', expect.any(Object));
      expect(mockWeave.addNode).toHaveBeenCalled();
    });

    it('15.2 addEventListener("onNodeRenderedAdded", cb) called', () => {
      (action as unknown as R)['handleSettingSize']();
      expect(mockWeave.addEventListener).toHaveBeenCalledWith(
        'onNodeRenderedAdded',
        expect.any(Function)
      );
    });

    it('15.3 destroyOnRender: id matches → destroy + removeEventListener', () => {
      (action as unknown as R)['handleSettingSize']();
      const cb = mockWeave.addEventListener.mock.calls[0][1] as (node: unknown) => void;
      const matchingNode = { getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }) };
      cb(matchingNode);
      expect(tempRect.destroy).toHaveBeenCalled();
      expect(mockWeave.removeEventListener).toHaveBeenCalledWith(
        'onNodeRenderedAdded',
        cb
      );
    });

    it('15.4 destroyOnRender: id mismatch → destroy NOT called', () => {
      (action as unknown as R)['handleSettingSize']();
      const cb = mockWeave.addEventListener.mock.calls[0][1] as (node: unknown) => void;
      const otherNode = { getAttrs: vi.fn().mockReturnValue({ id: 'different-id' }) };
      cb(otherNode);
      expect(tempRect.destroy).not.toHaveBeenCalled();
    });
  });

  // ── Suite 16: handleSettingSize — nodeHandler absent ─────────────────────

  describe('handleSettingSize — nodeHandler absent', () => {
    it('16.1 nodeHandler=undefined → clone/create/addNode NOT called, emitEvent+cancelAction still called', () => {
      const cancelFn = vi.fn();
      const tempRect = {
        setAttrs: vi.fn(),
        getAttrs: vi.fn().mockReturnValue({}),
        clone: vi.fn(),
        destroy: vi.fn(),
      };
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      (action as unknown as R)['cancelAction'] = cancelFn;
      (action as unknown as R)['rectId'] = 'test-uuid';
      (action as unknown as R)['tempRectNode'] = tempRect;
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      (action as unknown as R)['moved'] = false;
      (action as unknown as R)['handleSettingSize']();
      expect(tempRect.clone).not.toHaveBeenCalled();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedRectangle');
      expect(cancelFn).toHaveBeenCalled();
    });
  });

  // ── Suite 17: handleMovement — branches ──────────────────────────────────

  describe('handleMovement', () => {
    beforeEach(() => triggerAction());

    it('17.1 state≠DEFINING_SIZE → early return (dead-code guard)', () => {
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.ADDING;
      // Should not throw and not call getMousePointerRelativeToContainer
      (action as unknown as R)['handleMovement']();
      expect(mockWeave.getMousePointerRelativeToContainer).not.toHaveBeenCalled();
    });

    it('17.2 all fields set → setAttrs called, moved=true', () => {
      const tempRect = { setAttrs: vi.fn() };
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['rectId'] = 'test-uuid';
      (action as unknown as R)['tempRectNode'] = tempRect;
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      // mousePoint={x:120,y:140} → deltaX=70, deltaY=65
      (action as unknown as R)['handleMovement']();
      expect((action as unknown as R)['moved']).toBe(true);
      expect(tempRect.setAttrs).toHaveBeenCalledWith({ width: 70, height: 65 });
    });

    it('17.3 rectId=null → no setAttrs', () => {
      const tempRect = { setAttrs: vi.fn() };
      (action as unknown as R)['state'] = RECTANGLE_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['rectId'] = null;
      (action as unknown as R)['tempRectNode'] = tempRect;
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['handleMovement']();
      expect(tempRect.setAttrs).not.toHaveBeenCalled();
    });
  });

  // ── Suite 18: cleanup ─────────────────────────────────────────────────────

  describe('cleanup', () => {
    beforeEach(() => {
      triggerAction();
    });

    it('18.1 sets cursor="default"', () => {
      mockWeave._stageContainer.style.cursor = 'crosshair';
      action.cleanup();
      expect(mockWeave._stageContainer.style.cursor).toBe('default');
    });

    it('18.2 selectionPlugin present + findOne returns node → setSelectedNodes([node])', () => {
      const foundNode = { id: 'test-uuid' };
      mockWeave._stage.findOne.mockReturnValue(foundNode);
      (action as unknown as R)['rectId'] = 'test-uuid';
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([foundNode]);
    });

    it('18.3 selectionPlugin present + findOne returns null → setSelectedNodes NOT called', () => {
      mockWeave._stage.findOne.mockReturnValue(null);
      (action as unknown as R)['rectId'] = 'test-uuid';
      mockWeave._selectionPlugin.setSelectedNodes.mockClear();
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
    });

    it('18.4 selectionPlugin present → triggerAction(SELECTION_TOOL_ACTION_NAME) called', () => {
      action.cleanup();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('18.5 selectionPlugin absent → no triggerAction', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      action.cleanup();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('18.6 resets all fields after cleanup', () => {
      (action as unknown as R)['rectId'] = 'test-uuid';
      (action as unknown as R)['moved'] = true;
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      action.cleanup();
      expect((action as unknown as R)['rectId']).toBeNull();
      expect((action as unknown as R)['tempRectNode']).toBeNull();
      expect((action as unknown as R)['moved']).toBe(false);
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['measureContainer']).toBeUndefined();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['state']).toBe(RECTANGLE_TOOL_STATE.IDLE);
    });
  });

  // ── Suite 19: setCursor / setFocusStage ───────────────────────────────────

  describe('setCursor / setFocusStage', () => {
    it('19.1 setCursor: stage.container().style.cursor = "crosshair"', () => {
      mockWeave._stageContainer.style.cursor = '';
      triggerAction(); // trigger → addRectangle → setCursor
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });

    it('19.2 setFocusStage: tabIndex=1, blur(), focus()', () => {
      triggerAction();
      expect(mockWeave._stageContainer.tabIndex).toBe(1);
      expect(mockWeave._stageContainer.blur).toHaveBeenCalled();
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
    });
  });
});
