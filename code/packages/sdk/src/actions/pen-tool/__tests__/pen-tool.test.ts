// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted Konva mocks ────────────────────────────────────────────────────────
const { MockLine, MockCircle } = vi.hoisted(() => {
  const makeLineInstance = () => {
    const inst = {
      x: vi.fn().mockReturnValue(10),
      y: vi.fn().mockReturnValue(20),
      points: vi.fn().mockReturnValue([0, 0]),
      setAttrs: vi.fn(),
      destroy: vi.fn(),
      getAttrs: vi.fn().mockReturnValue({ x: 10, y: 20 }),
      clone: vi.fn(),
    };
    inst.clone.mockReturnValue({
      getAttrs: vi.fn().mockReturnValue({ x: 10, y: 20 }),
    });
    return inst;
  };
  const makeCircleInstance = () => ({
    setAttrs: vi.fn(),
    destroy: vi.fn(),
    moveToTop: vi.fn(),
  });
  const MockLine = vi.fn().mockImplementation(() => makeLineInstance());
  const MockCircle = vi.fn().mockImplementation(() => makeCircleInstance());
  return { MockLine, MockCircle };
});

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('konva', () => ({ default: { Line: MockLine, Circle: MockCircle } }));
vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-uuid') }));

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { WeavePenToolAction } from '../pen-tool';
import { PEN_TOOL_ACTION_NAME, PEN_TOOL_STATE } from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';

type R = Record<string, unknown>;

function makeContainer(id = 'layer-id') {
  return { getAttrs: vi.fn().mockReturnValue({ id }) };
}

function makeMeasureContainer() {
  return { add: vi.fn() };
}

function makeNodeHandler() {
  const mockNode = { getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }) };
  return {
    create: vi.fn().mockReturnValue(mockNode),
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
  const mockLineNode = { id: 'test-uuid' };
  const stage = {
    container: vi.fn().mockReturnValue(stageContainer),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      stageHandlers[event] = handler;
    }),
    findOne: vi.fn().mockReturnValue(mockLineNode),
    scaleX: vi.fn().mockReturnValue(1),
  };

  const defaultContainer = makeContainer('layer-id');
  const defaultMeasureContainer = makeMeasureContainer();
  const selectionPlugin = { setSelectedNodes: vi.fn() };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(selectionPlugin),
    getMousePointer: vi.fn().mockReturnValue({
      mousePoint: { x: 50, y: 75 },
      container: defaultContainer,
      measureContainer: defaultMeasureContainer,
    }),
    getMousePointerRelativeToContainer: vi.fn().mockReturnValue({
      mousePoint: { x: 120, y: 140 },
    }),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    getActiveAction: vi.fn().mockReturnValue(PEN_TOOL_ACTION_NAME),
    emitEvent: vi.fn(),
    addNode: vi.fn(),
    triggerAction: vi.fn(),
    _stage: stage,
    _stageContainer: stageContainer,
    _stageHandlers: stageHandlers,
    _selectionPlugin: selectionPlugin,
    _defaultContainer: defaultContainer,
    _defaultMeasureContainer: defaultMeasureContainer,
    _mockLineNode: mockLineNode,
  };
}

function makePointerEvent(
  overrides: Partial<{ pointerId: number; clientX: number; clientY: number }> = {}
) {
  return {
    evt: { pointerId: 1, clientX: 50, clientY: 75, ...overrides },
  };
}

describe('WeavePenToolAction', () => {
  let action: WeavePenToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let windowHandlers: Record<string, (e: KeyboardEvent) => void>;

  beforeEach(() => {
    MockLine.mockClear();
    MockCircle.mockClear();
    windowHandlers = {};
    vi.stubGlobal(
      'addEventListener',
      vi.fn((type: string, handler: (e: KeyboardEvent) => void) => {
        windowHandlers[type] = handler;
      })
    );

    action = new WeavePenToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
    (action as unknown as R)['cancelAction'] = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function triggerAction() {
    const cancelFn = vi.fn();
    action.trigger(cancelFn);
    return { cancelFn, handlers: mockWeave._stageHandlers };
  }

  function doHandleAdding() {
    (action as unknown as R)['state'] = PEN_TOOL_STATE.ADDING;
    mockWeave._stageHandlers['pointerdown'](makePointerEvent());
  }

  function getShapes() {
    return {
      tempMainLine: MockLine.mock.results[0]?.value,
      tempPoint: MockCircle.mock.results[0]?.value,
      tempLine: MockLine.mock.results[1]?.value,
      tempNextPoint: MockCircle.mock.results[1]?.value,
    };
  }

  // ── Suite 1: constructor / initialize ────────────────────────────────────────

  describe('constructor / initialize', () => {
    it('1.1 all fields at defaults', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      expect((action as unknown as R)['state']).toBe(PEN_TOOL_STATE.IDLE);
      expect((action as unknown as R)['lineId']).toBeNull();
      expect((action as unknown as R)['tempLineId']).toBeNull();
      expect((action as unknown as R)['tempMainLineNode']).toBeNull();
      expect((action as unknown as R)['tempLineNode']).toBeNull();
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['measureContainer']).toBeUndefined();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['tempPoint']).toBeUndefined();
      expect((action as unknown as R)['tempNextPoint']).toBeUndefined();
    });

    it('1.2 onPropsChange and onInit are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
    });
  });

  // ── Suite 2: getName / initProps ─────────────────────────────────────────────

  describe('getName / initProps', () => {
    it('2.1 getName() returns PEN_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(PEN_TOOL_ACTION_NAME);
    });

    it('2.2 initProps() returns correct defaults', () => {
      const props = (action as unknown as R)['initProps']() as Record<string, unknown>;
      expect(props.stroke).toBe('#000000ff');
      expect(props.strokeWidth).toBe(1);
      expect(props.opacity).toBe(1);
    });
  });

  // ── Suite 3: trigger ─────────────────────────────────────────────────────────

  describe('trigger', () => {
    it('3.1 no instance → throws "Instance not defined"', () => {
      (action as unknown as R)['instance'] = undefined;
      expect(() => action.trigger(vi.fn())).toThrow('Instance not defined');
    });

    it('3.2 first call → setupEvents runs, initialized=true', () => {
      triggerAction();
      expect((action as unknown as R)['initialized']).toBe(true);
    });

    it('3.3 second call → setupEvents NOT called again', () => {
      triggerAction();
      triggerAction();
      expect((action as unknown as R)['initialized']).toBe(true);
    });

    it('3.4 sets tabIndex=1 and calls focus()', () => {
      triggerAction();
      expect(mockWeave._stageContainer.tabIndex).toBe(1);
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
    });

    it('3.5 selectionPlugin present → setSelectedNodes([])', () => {
      triggerAction();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
    });

    it('3.6 selectionPlugin absent → skips setSelectedNodes', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      triggerAction();
      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
    });

    it('3.7 stores cancelAction, addLine → state=ADDING', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      expect((action as unknown as R)['cancelAction']).toBe(cancelFn);
      expect((action as unknown as R)['state']).toBe(PEN_TOOL_STATE.ADDING);
    });
  });

  // ── Suite 4: keydown listener ────────────────────────────────────────────────

  describe('setupEvents – keydown', () => {
    beforeEach(() => triggerAction());

    it('4.1 Enter + active=penTool → calls cancelAction()', () => {
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Enter', key: 'Enter' } as KeyboardEvent);
      expect(cancelAction).toHaveBeenCalled();
    });

    it('4.2 Escape + active=penTool → calls cancelAction()', () => {
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Escape', key: 'Escape' } as KeyboardEvent);
      expect(cancelAction).toHaveBeenCalled();
    });

    it('4.3 Enter + active≠penTool → does NOT call cancelAction()', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Enter', key: 'Enter' } as KeyboardEvent);
      expect(cancelAction).not.toHaveBeenCalled();
    });

    it('4.4 other key → does nothing', () => {
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Space', key: ' ' } as KeyboardEvent);
      expect(cancelAction).not.toHaveBeenCalled();
    });
  });

  // ── Suite 5: pointerdown listener ────────────────────────────────────────────

  describe('setupEvents – pointerdown', () => {
    beforeEach(() => triggerAction());

    it('5.1 2 pointers → state=ADDING, returns early', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 2 }));
      expect((action as unknown as R)['state']).toBe(PEN_TOOL_STATE.ADDING);
    });

    it('5.2 !tempMainLineNode + state=ADDING → handleAdding (4 shapes created)', () => {
      (action as unknown as R)['state'] = PEN_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect(MockLine).toHaveBeenCalledTimes(2);
      expect(MockCircle).toHaveBeenCalledTimes(2);
    });

    it('5.3 tempMainLineNode + state=ADDING → state=DEFINING_SIZE', () => {
      doHandleAdding();
      // state is now DEFINING_SIZE; set it back to ADDING with tempMainLineNode set
      (action as unknown as R)['state'] = PEN_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect((action as unknown as R)['state']).toBe(PEN_TOOL_STATE.DEFINING_SIZE);
    });

    it('5.4 state≠ADDING → neither handleAdding nor state change', () => {
      (action as unknown as R)['state'] = PEN_TOOL_STATE.IDLE;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect(MockLine).not.toHaveBeenCalled();
    });

    it('5.5 pointer id stored in pointers map', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 7 }));
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      expect(pointers.has(7)).toBe(true);
    });
  });

  // ── Suite 6: pointermove listener ────────────────────────────────────────────

  describe('setupEvents – pointermove', () => {
    beforeEach(() => triggerAction());

    it('6.1 state=IDLE → returns early, no cursor change', () => {
      (action as unknown as R)['state'] = PEN_TOOL_STATE.IDLE;
      mockWeave._stageContainer.style.cursor = '';
      mockWeave._stageHandlers['pointermove']();
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('6.2 2 pointers → state=ADDING, returns', () => {
      (action as unknown as R)['state'] = PEN_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 2 }));
      mockWeave._stageHandlers['pointermove']();
      expect((action as unknown as R)['state']).toBe(PEN_TOOL_STATE.ADDING);
    });

    it('6.3 state=DEFINING_SIZE → calls handleMovement, updates shapes', () => {
      doHandleAdding();
      const { tempLine, tempNextPoint: nextPt } = getShapes();
      mockWeave._stageHandlers['pointermove']();
      expect(tempLine.setAttrs).toHaveBeenCalled();
      expect(nextPt.setAttrs).toHaveBeenCalled();
    });

    it('6.4 state=ADDING, 1 pointer → setCursor only', () => {
      (action as unknown as R)['state'] = PEN_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      MockLine.mockClear();
      MockCircle.mockClear();
      (action as unknown as R)['state'] = PEN_TOOL_STATE.ADDING;
      (action as unknown as R)['tempMainLineNode'] = null;
      (action as unknown as R)['tempLineNode'] = null;
      mockWeave._stageHandlers['pointermove']();
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 7: pointerup listener ──────────────────────────────────────────────

  describe('setupEvents – pointerup', () => {
    beforeEach(() => triggerAction());

    it('7.1 state=DEFINING_SIZE → calls handleSettingSize (state stays DEFINING_SIZE)', () => {
      doHandleAdding();
      const prevState = (action as unknown as R)['state'];
      expect(prevState).toBe(PEN_TOOL_STATE.DEFINING_SIZE);
      mockWeave._stageHandlers['pointerup'](makePointerEvent());
      // handleSettingSize setState(DEFINING_SIZE) — stays DEFINING_SIZE
      expect((action as unknown as R)['state']).toBe(PEN_TOOL_STATE.DEFINING_SIZE);
      const { tempMainLine } = getShapes();
      expect(tempMainLine.setAttrs).toHaveBeenCalled();
    });

    it('7.2 state≠DEFINING_SIZE → skips handleSettingSize', () => {
      (action as unknown as R)['state'] = PEN_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerup'](makePointerEvent());
      expect(mockWeave.getMousePointerRelativeToContainer).not.toHaveBeenCalled();
    });

    it('7.3 deletes pointer id from pointers map', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 3 }));
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      expect(pointers.has(3)).toBe(true);
      mockWeave._stageHandlers['pointerup'](makePointerEvent({ pointerId: 3 }));
      expect(pointers.has(3)).toBe(false);
    });
  });

  // ── Suite 8: handleAdding ────────────────────────────────────────────────────

  describe('handleAdding', () => {
    beforeEach(() => triggerAction());

    it('8.1 sets clickPoint, container, measureContainer from getMousePointer()', () => {
      doHandleAdding();
      expect((action as unknown as R)['clickPoint']).toEqual({ x: 50, y: 75 });
      expect((action as unknown as R)['container']).toBe(mockWeave._defaultContainer);
      expect((action as unknown as R)['measureContainer']).toBe(mockWeave._defaultMeasureContainer);
    });

    it('8.2 !tempLineNode → creates all 4 shapes, adds to measureContainer', () => {
      doHandleAdding();
      expect(MockLine).toHaveBeenCalledTimes(2);
      expect(MockCircle).toHaveBeenCalledTimes(2);
      expect(mockWeave._defaultMeasureContainer.add).toHaveBeenCalledTimes(4);
      const { tempPoint, tempNextPoint: nextPt } = getShapes();
      expect(tempPoint.moveToTop).toHaveBeenCalled();
      expect(nextPt.moveToTop).toHaveBeenCalled();
    });

    it('8.3 tempLineNode exists → skips creation', () => {
      doHandleAdding();
      const countBefore = MockLine.mock.calls.length;
      (action as unknown as R)['state'] = PEN_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect(MockLine.mock.calls.length).toBe(countBefore);
    });

    it('8.4 measureContainer undefined → ?.add() no-op, no throw', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 50, y: 75 },
        container: makeContainer(),
        measureContainer: undefined,
      });
      (action as unknown as R)['state'] = PEN_TOOL_STATE.ADDING;
      expect(() => mockWeave._stageHandlers['pointerdown'](makePointerEvent())).not.toThrow();
      expect(MockLine).toHaveBeenCalledTimes(2);
    });

    it('8.5 mousePoint=null → ??0 fallback for x/y', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: null,
        container: makeContainer(),
        measureContainer: makeMeasureContainer(),
      });
      (action as unknown as R)['state'] = PEN_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect(MockLine).toHaveBeenCalledWith(expect.objectContaining({ x: 0, y: 0 }));
    });

    it('8.6 sets state to DEFINING_SIZE', () => {
      doHandleAdding();
      expect((action as unknown as R)['state']).toBe(PEN_TOOL_STATE.DEFINING_SIZE);
    });
  });

  // ── Suite 9: handleSettingSize ───────────────────────────────────────────────

  describe('handleSettingSize', () => {
    beforeEach(() => triggerAction());

    it('9.1 guard fails (lineId=null) → skips entire block', () => {
      (action as unknown as R)['lineId'] = null;
      (action as unknown as R)['state'] = PEN_TOOL_STATE.DEFINING_SIZE;
      mockWeave._stageHandlers['pointerup'](makePointerEvent());
      expect(mockWeave.getMousePointerRelativeToContainer).not.toHaveBeenCalled();
    });

    it('9.2 guard passes → updates all 4 shapes, state stays DEFINING_SIZE', () => {
      doHandleAdding();
      const { tempMainLine, tempPoint: tp, tempLine, tempNextPoint: tnp } = getShapes();
      mockWeave._stageHandlers['pointerup'](makePointerEvent());
      expect(tempMainLine.setAttrs).toHaveBeenCalled();
      expect(tp.setAttrs).toHaveBeenCalled();
      expect(tnp.setAttrs).toHaveBeenCalled();
      expect(tempLine.setAttrs).toHaveBeenCalled();
      expect((action as unknown as R)['state']).toBe(PEN_TOOL_STATE.DEFINING_SIZE);
    });
  });

  // ── Suite 10: handleMovement ─────────────────────────────────────────────────

  describe('handleMovement', () => {
    beforeEach(() => triggerAction());

    it('10.1 state≠DEFINING_SIZE → returns early', () => {
      (action as unknown as R)['state'] = PEN_TOOL_STATE.ADDING;
      (action as unknown as R)['handleMovement']();
      expect(mockWeave.getMousePointerRelativeToContainer).not.toHaveBeenCalled();
    });

    it('10.2 tempNextPoint absent → skips inner block', () => {
      (action as unknown as R)['state'] = PEN_TOOL_STATE.DEFINING_SIZE;
      doHandleAdding();
      (action as unknown as R)['tempNextPoint'] = undefined;
      const { tempLine } = getShapes();
      tempLine.setAttrs.mockClear();
      (action as unknown as R)['handleMovement']();
      expect(tempLine.setAttrs).not.toHaveBeenCalled();
    });

    it('10.3 all present → updates tempLineNode and tempNextPoint', () => {
      doHandleAdding();
      const { tempLine, tempNextPoint: tnp } = getShapes();
      tempLine.setAttrs.mockClear();
      tnp.setAttrs.mockClear();
      (action as unknown as R)['handleMovement']();
      expect(tempLine.setAttrs).toHaveBeenCalled();
      expect(tnp.setAttrs).toHaveBeenCalled();
    });
  });

  // ── Suite 11: cleanup ────────────────────────────────────────────────────────

  describe('cleanup', () => {
    beforeEach(() => triggerAction());

    it('11.1 tempPoint exists → destroy() called', () => {
      doHandleAdding();
      const { tempPoint: tp } = getShapes();
      action.cleanup();
      expect(tp.destroy).toHaveBeenCalled();
    });

    it('11.2 tempPoint undefined → no-op', () => {
      (action as unknown as R)['tempPoint'] = undefined;
      expect(() => action.cleanup()).not.toThrow();
    });

    it('11.3 tempNextPoint exists → destroy() called', () => {
      doHandleAdding();
      const { tempNextPoint: tnp } = getShapes();
      action.cleanup();
      expect(tnp.destroy).toHaveBeenCalled();
    });

    it('11.4 tempNextPoint undefined → no-op', () => {
      (action as unknown as R)['tempNextPoint'] = undefined;
      expect(() => action.cleanup()).not.toThrow();
    });

    it('11.5 tempLineNode exists → destroy() called', () => {
      doHandleAdding();
      const { tempLine } = getShapes();
      action.cleanup();
      expect(tempLine.destroy).toHaveBeenCalled();
    });

    it('11.6 tempLineNode null → no-op', () => {
      (action as unknown as R)['tempLineNode'] = null;
      expect(() => action.cleanup()).not.toThrow();
    });

    it('11.7 lineId=null → skips node creation block', () => {
      (action as unknown as R)['lineId'] = null;
      action.cleanup();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('11.8 points().length < 4 → skips node creation block', () => {
      doHandleAdding();
      const { tempMainLine } = getShapes();
      tempMainLine.points.mockReturnValue([0, 0]); // length=2
      action.cleanup();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('11.9 nodeHandler absent → skips create/addNode', () => {
      doHandleAdding();
      const { tempMainLine } = getShapes();
      tempMainLine.points.mockReturnValue([0, 0, 50, 75]);
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      action.cleanup();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('11.10 nodeHandler present → creates node, addNode, emits onAddedPen', () => {
      doHandleAdding();
      const { tempMainLine } = getShapes();
      tempMainLine.points.mockReturnValue([0, 0, 50, 75]);
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      action.cleanup();
      expect(nh.create).toHaveBeenCalled();
      expect(mockWeave.addNode).toHaveBeenCalled();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedPen');
    });

    it('11.11 selectionPlugin present + findOne returns node → setSelectedNodes + triggerAction', () => {
      doHandleAdding();
      const { tempMainLine } = getShapes();
      tempMainLine.points.mockReturnValue([0, 0, 50, 75]);
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([
        mockWeave._mockLineNode,
      ]);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('11.12 selectionPlugin present + findOne returns undefined → skips setSelectedNodes, still triggerAction', () => {
      mockWeave._stage.findOne.mockReturnValue(undefined);
      mockWeave._selectionPlugin.setSelectedNodes.mockClear();
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('11.13 selectionPlugin absent → skips entirely', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      mockWeave._selectionPlugin.setSelectedNodes.mockClear();
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('11.14 resets all fields to initial values', () => {
      doHandleAdding();
      action.cleanup();
      expect((action as unknown as R)['lineId']).toBeNull();
      expect((action as unknown as R)['tempMainLineNode']).toBeNull();
      expect((action as unknown as R)['tempLineId']).toBeNull();
      expect((action as unknown as R)['tempLineNode']).toBeNull();
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['measureContainer']).toBeUndefined();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['initialCursor']).toBeNull();
      expect((action as unknown as R)['tempPoint']).toBeUndefined();
      expect((action as unknown as R)['tempNextPoint']).toBeUndefined();
      expect((action as unknown as R)['state']).toBe(PEN_TOOL_STATE.IDLE);
    });
  });
});
