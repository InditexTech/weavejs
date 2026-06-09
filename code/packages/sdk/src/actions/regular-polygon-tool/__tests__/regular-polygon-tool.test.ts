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
vi.mock('konva', () => ({ default: {} }));
vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-uuid') }));

// In node environment alias window → globalThis
if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { makeContainer, makePointerEvent, type R } from '../../__tests__/shared/action.test-helpers';
import { WeaveRegularPolygonToolAction } from '../regular-polygon-tool';
import {
  REGULAR_POLYGON_TOOL_ACTION_NAME,
  REGULAR_POLYGON_TOOL_STATE,
} from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeMockPolygon() {
  return {
    setAttrs: vi.fn(),
    getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }),
  };
}

function makeNodeHandler() {
  const mockNode = { getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }) };
  const serialized = { id: 'test-uuid', type: 'regular-polygon', props: {} };
  return {
    create: vi.fn().mockReturnValue(mockNode),
    serialize: vi.fn().mockReturnValue(serialized),
    onUpdate: vi.fn(),
    _mockNode: mockNode,
  };
}

function makeMockWeave() {
  const stageContainer = {
    tabIndex: 0,
    focus: vi.fn(),
    blur: vi.fn(),
    style: { cursor: '' },
  };

  const stageHandlers: Record<string, (e?: unknown) => void> = {};
  const mockPolygon = makeMockPolygon();
  const stage = {
    container: vi.fn().mockReturnValue(stageContainer),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      stageHandlers[event] = handler;
    }),
    findOne: vi.fn().mockReturnValue(mockPolygon),
  };

  const defaultContainer = makeContainer('layer-id');
  const selectionPlugin = { setSelectedNodes: vi.fn() };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(selectionPlugin),
    getMousePointer: vi.fn().mockReturnValue({
      mousePoint: { x: 50, y: 75 },
      container: defaultContainer,
    }),
    getMousePointerRelativeToContainer: vi.fn().mockReturnValue({
      mousePoint: { x: 120, y: 140 },
    }),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    getActiveAction: vi.fn().mockReturnValue(REGULAR_POLYGON_TOOL_ACTION_NAME),
    emitEvent: vi.fn(),
    addNode: vi.fn(),
    updateNode: vi.fn(),
    triggerAction: vi.fn(),
    getChildLogger: vi.fn().mockReturnValue({ debug: vi.fn() }),
    _stage: stage,
    _stageContainer: stageContainer,
    _stageHandlers: stageHandlers,
    _selectionPlugin: selectionPlugin,
    _defaultContainer: defaultContainer,
    _mockPolygon: mockPolygon,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveRegularPolygonToolAction', () => {
  let action: WeaveRegularPolygonToolAction;
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

    action = new WeaveRegularPolygonToolAction();
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
    it('1.1 initialized=false, state=IDLE, regularPolygonId=null', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      expect((action as unknown as R)['state']).toBe(REGULAR_POLYGON_TOOL_STATE.IDLE);
      expect((action as unknown as R)['regularPolygonId']).toBeNull();
    });

    it('1.2 creating=false, moved=false, clickPoint=null', () => {
      expect((action as unknown as R)['creating']).toBe(false);
      expect((action as unknown as R)['moved']).toBe(false);
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });

    it('1.3 container=undefined, pointers=empty Map', () => {
      expect((action as unknown as R)['container']).toBeUndefined();
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
    it('2.1 returns REGULAR_POLYGON_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(REGULAR_POLYGON_TOOL_ACTION_NAME);
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
      expect(props.sides).toBe(5);
      expect(props.radius).toBe(50);
    });
  });

  // ── Suite 4: trigger — guards & setup ─────────────────────────────────────

  describe('trigger — guards & setup', () => {
    it('4.1 !instance → throws "Instance not defined"', () => {
      const bare = new WeaveRegularPolygonToolAction();
      expect(() => bare.trigger(vi.fn())).toThrow('Instance not defined');
    });

    it('4.2 !initialized → setupEvents called (3 stage.on calls)', () => {
      triggerAction();
      expect(mockWeave._stage.on).toHaveBeenCalledTimes(3);
      expect((action as unknown as R)['initialized']).toBe(true);
    });

    it('4.3 second trigger → setupEvents NOT called again (still 3 stage.on calls)', () => {
      triggerAction();
      triggerAction();
      expect(mockWeave._stage.on).toHaveBeenCalledTimes(3);
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
      expect((action as unknown as R)['state']).toBe(REGULAR_POLYGON_TOOL_STATE.ADDING);
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

    it('5.1 Enter + active=regularPolygonTool → cancelAction called', () => {
      mockWeave.getActiveAction.mockReturnValue(REGULAR_POLYGON_TOOL_ACTION_NAME);
      windowHandlers['keydown']?.({ code: 'Enter' } as KeyboardEvent);
      expect(cancelFn).toHaveBeenCalled();
    });

    it('5.2 Enter + active≠regularPolygonTool → NOT called', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      windowHandlers['keydown']?.({ code: 'Enter' } as KeyboardEvent);
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('5.3 Escape + active=regularPolygonTool → cancelAction called', () => {
      mockWeave.getActiveAction.mockReturnValue(REGULAR_POLYGON_TOOL_ACTION_NAME);
      windowHandlers['keydown']?.({ code: 'Escape' } as KeyboardEvent);
      expect(cancelFn).toHaveBeenCalled();
    });

    it('5.4 Escape + active≠regularPolygonTool → NOT called', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      windowHandlers['keydown']?.({ code: 'Escape' } as KeyboardEvent);
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('5.5 other key → nothing', () => {
      windowHandlers['keydown']?.({ code: 'KeyA' } as KeyboardEvent);
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 6: pointerdown handler ──────────────────────────────────────────

  describe('pointerdown handler', () => {
    beforeEach(() => {
      triggerAction();
      (action as unknown as R)['state'] = REGULAR_POLYGON_TOOL_STATE.ADDING;
    });

    it('6.1 pointers.size=2 + active=regularPolygonTool → state=ADDING, no handleAdding', () => {
      (action as unknown as R)['state'] = REGULAR_POLYGON_TOOL_STATE.IDLE;
      ((action as unknown as R)['pointers'] as Map<number, unknown>).set(99, { x: 0, y: 0 });
      mockWeave.getActiveAction.mockReturnValue(REGULAR_POLYGON_TOOL_ACTION_NAME);
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['state']).toBe(REGULAR_POLYGON_TOOL_STATE.ADDING);
      expect((action as unknown as R)['regularPolygonId']).toBeNull();
    });

    it('6.2 pointers.size=1 + state=ADDING → creating=true, handleAdding called', () => {
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['creating']).toBe(true);
      expect((action as unknown as R)['regularPolygonId']).toBe('test-uuid');
      expect((action as unknown as R)['state']).toBe(REGULAR_POLYGON_TOOL_STATE.DEFINING_SIZE);
    });

    it('6.3 pointers.size=1 + state=IDLE → nothing', () => {
      (action as unknown as R)['state'] = REGULAR_POLYGON_TOOL_STATE.IDLE;
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['regularPolygonId']).toBeNull();
    });
  });

  // ── Suite 7: pointermove handler ──────────────────────────────────────────

  describe('pointermove handler', () => {
    beforeEach(() => triggerAction());

    it('7.1 state=IDLE → early return, cursor NOT set', () => {
      (action as unknown as R)['state'] = REGULAR_POLYGON_TOOL_STATE.IDLE;
      mockWeave._stageContainer.style.cursor = '';
      mockWeave._stageHandlers['pointermove']?.(makePointerEvent({ buttons: 1, pointerId: 1 }));
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('7.2 state=ADDING + !isPressed → setCursor, no handleMovement', () => {
      (action as unknown as R)['state'] = REGULAR_POLYGON_TOOL_STATE.ADDING;
      mockWeave._stageContainer.style.cursor = '';
      mockWeave._stageHandlers['pointermove']?.(makePointerEvent({ buttons: 0, pointerId: 1 }));
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
      expect(mockWeave.getMousePointerRelativeToContainer).not.toHaveBeenCalled();
    });

    it('7.3 state=ADDING + isPressed + !pointers.has(pointerId) → return', () => {
      (action as unknown as R)['state'] = REGULAR_POLYGON_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointermove']?.(makePointerEvent({ buttons: 1, pointerId: 999 }));
      expect(mockWeave.getMousePointerRelativeToContainer).not.toHaveBeenCalled();
    });

    it('7.4 pointers.size=2 + active=regularPolygonTool → state=ADDING, return', () => {
      (action as unknown as R)['state'] = REGULAR_POLYGON_TOOL_STATE.DEFINING_SIZE;
      ((action as unknown as R)['pointers'] as Map<number, unknown>).set(99, { x: 0, y: 0 });
      ((action as unknown as R)['pointers'] as Map<number, unknown>).set(1, { x: 50, y: 75 });
      mockWeave.getActiveAction.mockReturnValue(REGULAR_POLYGON_TOOL_ACTION_NAME);
      mockWeave._stageHandlers['pointermove']?.(makePointerEvent({ buttons: 1, pointerId: 1 }));
      expect((action as unknown as R)['state']).toBe(REGULAR_POLYGON_TOOL_STATE.ADDING);
    });

    it('7.5 state=DEFINING_SIZE + isPressed + pointers.has → moved=true, handleMovement called', () => {
      (action as unknown as R)['state'] = REGULAR_POLYGON_TOOL_STATE.DEFINING_SIZE;
      ((action as unknown as R)['pointers'] as Map<number, unknown>).set(1, { x: 50, y: 75 });
      (action as unknown as R)['regularPolygonId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      mockWeave.getActiveAction.mockReturnValue(REGULAR_POLYGON_TOOL_ACTION_NAME);
      mockWeave._stageHandlers['pointermove']?.(makePointerEvent({ buttons: 1, pointerId: 1 }));
      expect((action as unknown as R)['moved']).toBe(true);
    });
  });

  // ── Suite 8: pointerup handler ────────────────────────────────────────────

  describe('pointerup handler', () => {
    let cancelFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      cancelFn = vi.fn();
      triggerAction(cancelFn);
      (action as unknown as R)['state'] = REGULAR_POLYGON_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['regularPolygonId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
    });

    it('8.1 deletes pointer from map', () => {
      ((action as unknown as R)['pointers'] as Map<number, unknown>).set(1, { x: 50, y: 75 });
      mockWeave._stageHandlers['pointerup']?.(makePointerEvent({ pointerId: 1 }));
      expect(((action as unknown as R)['pointers'] as Map<number, unknown>).has(1)).toBe(false);
    });

    it('8.2 isTap=true → moved=false', () => {
      (action as unknown as R)['moved'] = true;
      (action as unknown as R)['tapStart'] = { x: 50, y: 75, time: performance.now() - 10 };
      mockWeave._stageHandlers['pointerup']?.(makePointerEvent({ clientX: 50, clientY: 75, pointerType: 'touch' }));
      expect((action as unknown as R)['moved']).toBe(false);
    });

    it('8.3 isTap=false (no tapStart) → cancelAction still fires', () => {
      (action as unknown as R)['tapStart'] = null;
      mockWeave._stageHandlers['pointerup']?.(makePointerEvent());
      expect(cancelFn).toHaveBeenCalled();
    });

    it('8.4 state=DEFINING_SIZE → creating=false, handleSettingSize (cancelAction fires)', () => {
      mockWeave._stageHandlers['pointerup']?.(makePointerEvent());
      expect((action as unknown as R)['creating']).toBe(false);
      expect(cancelFn).toHaveBeenCalled();
    });

    it('8.5 state≠DEFINING_SIZE → handleSettingSize NOT called', () => {
      (action as unknown as R)['state'] = REGULAR_POLYGON_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerup']?.(makePointerEvent());
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 9: addRegularPolygon (via trigger) ───────────────────────────────

  describe('addRegularPolygon (via trigger)', () => {
    it('9.1 emitEvent("onAddingRegularPolygon") called', () => {
      triggerAction();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddingRegularPolygon');
    });

    it('9.2 clickPoint=null, state=ADDING', () => {
      triggerAction();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['state']).toBe(REGULAR_POLYGON_TOOL_STATE.ADDING);
    });

    it('9.3 setFocusStage: blur+focus, setCursor: cursor=crosshair', () => {
      triggerAction();
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
      expect(mockWeave._stageContainer.blur).toHaveBeenCalled();
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
    });
  });

  // ── Suite 10: handleAdding — nodeHandler branches ─────────────────────────

  describe('handleAdding', () => {
    beforeEach(() => {
      triggerAction();
      (action as unknown as R)['state'] = REGULAR_POLYGON_TOOL_STATE.ADDING;
    });

    it('10.1 clickPoint=null → create called with x=0, y=0', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: null,
        container: mockWeave._defaultContainer,
      });
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect(nh.create).toHaveBeenCalledWith(
        'test-uuid',
        expect.objectContaining({ x: 0, y: 0, radius: 1 })
      );
    });

    it('10.2 clickPoint defined → create called with clickPoint coords', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 50, y: 75 },
        container: mockWeave._defaultContainer,
      });
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect(nh.create).toHaveBeenCalledWith(
        'test-uuid',
        expect.objectContaining({ x: 50, y: 75, radius: 1 })
      );
    });

    it('10.3 nodeHandler absent → no create/addNode', () => {
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('10.4 nodeHandler present → addNode called', () => {
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect(mockWeave.addNode).toHaveBeenCalled();
    });

    it('10.5 container?.getAttrs().id null branch — container=null, no crash', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 50, y: 75 },
        container: null,
      });
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      expect(() =>
        mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }))
      ).not.toThrow();
      expect(mockWeave.addNode).toHaveBeenCalledWith(expect.anything(), undefined);
    });

    it('10.6 after handleAdding → state=DEFINING_SIZE, regularPolygonId set', () => {
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['state']).toBe(REGULAR_POLYGON_TOOL_STATE.DEFINING_SIZE);
      expect((action as unknown as R)['regularPolygonId']).toBe('test-uuid');
    });
  });

  // ── Suite 11: handleSettingSize — guard (missing field) ───────────────────

  describe('handleSettingSize — guard', () => {
    beforeEach(() => triggerAction());

    function setupForSettingSize() {
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      (action as unknown as R)['regularPolygonId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      return cancelFn;
    }

    it('11.1 regularPolygonId=null → only cancelAction', () => {
      const cancelFn = setupForSettingSize();
      (action as unknown as R)['regularPolygonId'] = null;
      (action as unknown as R)['handleSettingSize']();
      expect(cancelFn).toHaveBeenCalled();
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAddedRegularPolygon');
    });

    it('11.2 clickPoint=null → only cancelAction', () => {
      const cancelFn = setupForSettingSize();
      (action as unknown as R)['clickPoint'] = null;
      (action as unknown as R)['handleSettingSize']();
      expect(cancelFn).toHaveBeenCalled();
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAddedRegularPolygon');
    });

    it('11.3 container=undefined → only cancelAction', () => {
      const cancelFn = setupForSettingSize();
      (action as unknown as R)['container'] = undefined;
      (action as unknown as R)['handleSettingSize']();
      expect(cancelFn).toHaveBeenCalled();
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAddedRegularPolygon');
    });

    it('11.4 regularPolygon=null (findOne returns null) → only cancelAction', () => {
      const cancelFn = setupForSettingSize();
      mockWeave._stage.findOne.mockReturnValue(null);
      (action as unknown as R)['handleSettingSize']();
      expect(cancelFn).toHaveBeenCalled();
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAddedRegularPolygon');
    });
  });

  // ── Suite 12: handleSettingSize — moved=false ─────────────────────────────

  describe('handleSettingSize — moved=false', () => {
    function setup() {
      triggerAction();
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      (action as unknown as R)['regularPolygonId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      (action as unknown as R)['moved'] = false;
      return cancelFn;
    }

    it('12.1 moved=false → setAttrs called with clickPoint pos and radius=props.radius/2=25', () => {
      setup();
      (action as unknown as R)['handleSettingSize']();
      expect(mockWeave._mockPolygon.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({ x: 50, y: 75, radius: 25 })
      );
    });

    it('12.2 emitEvent("onAddedRegularPolygon") called', () => {
      setup();
      (action as unknown as R)['handleSettingSize']();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedRegularPolygon');
    });

    it('12.3 cancelAction called', () => {
      const cancelFn = setup();
      (action as unknown as R)['handleSettingSize']();
      expect(cancelFn).toHaveBeenCalled();
    });
  });

  // ── Suite 13: handleSettingSize — moved=true ──────────────────────────────

  describe('handleSettingSize — moved=true', () => {
    it('13.1 moved=true → starPos=Math.min, radius=Math.abs(clickX-mouseX)/2', () => {
      triggerAction();
      // clickPoint={x:50,y:75}, mousePoint={x:120,y:140}
      // starPos={min(50,120)=50, min(75,140)=75}, newRadius=|50-120|=70, radius=70/2=35
      (action as unknown as R)['cancelAction'] = vi.fn();
      (action as unknown as R)['regularPolygonId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      (action as unknown as R)['moved'] = true;
      (action as unknown as R)['handleSettingSize']();
      expect(mockWeave._mockPolygon.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({ x: 50, y: 75, radius: 35 })
      );
    });
  });

  // ── Suite 14: handleSettingSize — nodeHandler branches ───────────────────

  describe('handleSettingSize — nodeHandler', () => {
    function setup() {
      triggerAction();
      (action as unknown as R)['cancelAction'] = vi.fn();
      (action as unknown as R)['regularPolygonId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      (action as unknown as R)['moved'] = false;
    }

    it('14.1 nodeHandler present → serialize + updateNode called', () => {
      setup();
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      (action as unknown as R)['handleSettingSize']();
      expect(nh.serialize).toHaveBeenCalled();
      expect(mockWeave.updateNode).toHaveBeenCalled();
    });

    it('14.2 nodeHandler absent → no serialize/updateNode; still emitEvent + cancelAction', () => {
      setup();
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      (action as unknown as R)['handleSettingSize']();
      expect(mockWeave.updateNode).not.toHaveBeenCalled();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedRegularPolygon');
      expect(cancelFn).toHaveBeenCalled();
    });
  });

  // ── Suite 15: handleMovement — dead guard ────────────────────────────────

  describe('handleMovement — state guard', () => {
    beforeEach(() => triggerAction());

    it('15.1 state≠DEFINING_SIZE → early return (dead-code guard)', () => {
      (action as unknown as R)['state'] = REGULAR_POLYGON_TOOL_STATE.ADDING;
      (action as unknown as R)['handleMovement']();
      expect(mockWeave.getMousePointerRelativeToContainer).not.toHaveBeenCalled();
    });
  });

  // ── Suite 16: handleMovement — guard (missing field) ─────────────────────

  describe('handleMovement — guard', () => {
    beforeEach(() => triggerAction());

    it('16.1 regularPolygon=null (findOne returns null) → no onUpdate', () => {
      (action as unknown as R)['state'] = REGULAR_POLYGON_TOOL_STATE.DEFINING_SIZE;
      mockWeave._stage.findOne.mockReturnValue(null);
      (action as unknown as R)['regularPolygonId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      (action as unknown as R)['handleMovement']();
      expect(nh.onUpdate).not.toHaveBeenCalled();
    });

    it('16.2 regularPolygonId=null → no onUpdate', () => {
      (action as unknown as R)['state'] = REGULAR_POLYGON_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['regularPolygonId'] = null;
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      (action as unknown as R)['handleMovement']();
      expect(nh.onUpdate).not.toHaveBeenCalled();
    });
  });

  // ── Suite 17: handleMovement — normal paths ───────────────────────────────

  describe('handleMovement — normal paths', () => {
    function setupMovement() {
      triggerAction();
      (action as unknown as R)['state'] = REGULAR_POLYGON_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['regularPolygonId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
    }

    it('17.1 moved=false → starPos=clickPoint, deltaX=|mouseX-clickX|, onUpdate(radius=deltaX/2)', () => {
      setupMovement();
      // mousePoint={x:120,y:140}, clickPoint={x:50,y:75}
      // deltaX=|120-50|=70, radius=70/2=35
      // starPos={x:50, y:75} (moved=false → no Math.min)
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      (action as unknown as R)['moved'] = false;
      (action as unknown as R)['handleMovement']();
      expect(nh.onUpdate).toHaveBeenCalledWith(
        mockWeave._mockPolygon,
        expect.objectContaining({ radius: 35 })
      );
    });

    it('17.2 moved=true → starPos uses Math.min, same radius logic', () => {
      setupMovement();
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      (action as unknown as R)['moved'] = true;
      (action as unknown as R)['handleMovement']();
      // starPos.x=min(50,120)=50, starPos.y=min(75,140)=75, radius still 35
      expect(nh.onUpdate).toHaveBeenCalledWith(
        mockWeave._mockPolygon,
        expect.objectContaining({ radius: 35 })
      );
    });

    it('17.3 nodeHandler absent → no onUpdate', () => {
      setupMovement();
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      (action as unknown as R)['handleMovement']();
      expect(mockWeave.updateNode).not.toHaveBeenCalled();
    });
  });

  // ── Suite 18: cleanup ─────────────────────────────────────────────────────

  describe('cleanup', () => {
    beforeEach(() => triggerAction());

    it('18.1 sets cursor="default"', () => {
      mockWeave._stageContainer.style.cursor = 'crosshair';
      action.cleanup();
      expect(mockWeave._stageContainer.style.cursor).toBe('default');
    });

    it('18.2 selectionPlugin present + findOne returns node → setSelectedNodes([node])', () => {
      (action as unknown as R)['regularPolygonId'] = 'test-uuid';
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith(
        [mockWeave._mockPolygon]
      );
    });

    it('18.3 selectionPlugin present + findOne=null → setSelectedNodes NOT called (with node)', () => {
      mockWeave._stage.findOne.mockReturnValue(null);
      mockWeave._selectionPlugin.setSelectedNodes.mockClear();
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
    });

    it('18.4 selectionPlugin present → triggerAction(SELECTION_TOOL_ACTION_NAME)', () => {
      action.cleanup();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('18.5 selectionPlugin absent → no triggerAction', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      action.cleanup();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('18.6 resets all fields after cleanup', () => {
      (action as unknown as R)['regularPolygonId'] = 'test-uuid';
      (action as unknown as R)['creating'] = true;
      (action as unknown as R)['moved'] = true;
      (action as unknown as R)['container'] = mockWeave._defaultContainer;
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      action.cleanup();
      expect((action as unknown as R)['regularPolygonId']).toBeNull();
      expect((action as unknown as R)['creating']).toBe(false);
      expect((action as unknown as R)['moved']).toBe(false);
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['state']).toBe(REGULAR_POLYGON_TOOL_STATE.IDLE);
    });
  });
});
