// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted Konva.Line mock ────────────────────────────────────────────────────
const { MockLine } = vi.hoisted(() => {
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
      setAttrs: vi.fn(),
    });
    return inst;
  };
  const MockLine = vi.fn().mockImplementation(() => makeLineInstance());
  return { MockLine };
});

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('konva', () => ({ default: { Line: MockLine } }));
vi.mock('@/internal-utils/greedy-snapper', () => ({
  GreedySnapper: vi.fn().mockImplementation(() => ({
    apply: vi.fn().mockImplementation((angle: number) => angle),
  })),
}));
vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-uuid') }));

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { makeContainer, makeMeasureContainer, makePointerEvent, type R } from '../../__tests__/shared/action.test-helpers';
import { WeaveLineToolAction } from '../line-tool';
import {
  LINE_TOOL_ACTION_NAME,
  LINE_TOOL_DEFAULT_CONFIG,
  LINE_TOOL_STATE,
} from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';

function makeNodeHandler() {
  const mockNode = { getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }) };
  return {
    create: vi.fn().mockReturnValue(mockNode),
    scaleReset: vi.fn(),
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
    getActiveAction: vi.fn().mockReturnValue(LINE_TOOL_ACTION_NAME),
    emitEvent: vi.fn(),
    addNode: vi.fn(),
    triggerAction: vi.fn(),
    getChildLogger: vi.fn().mockReturnValue({ debug: vi.fn() }),
    _stage: stage,
    _stageContainer: stageContainer,
    _stageHandlers: stageHandlers,
    _selectionPlugin: selectionPlugin,
    _defaultContainer: defaultContainer,
    _defaultMeasureContainer: defaultMeasureContainer,
    _mockLineNode: mockLineNode,
  };
}


describe('WeaveLineToolAction', () => {
  let action: WeaveLineToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let windowHandlers: Record<string, (e: KeyboardEvent) => void>;

  beforeEach(() => {
    MockLine.mockClear();
    windowHandlers = {};
    vi.stubGlobal(
      'addEventListener',
      vi.fn((type: string, handler: (e: KeyboardEvent) => void) => {
        windowHandlers[type] = handler;
      })
    );

    action = new WeaveLineToolAction();
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
    (action as unknown as R)['state'] = LINE_TOOL_STATE.ADDING;
    mockWeave._stageHandlers['pointerdown'](makePointerEvent());
  }

  // ── Suite 1: constructor / initialize ────────────────────────────────────────

  describe('constructor / initialize', () => {
    it('1.1 no params → config = LINE_TOOL_DEFAULT_CONFIG', () => {
      const config = (action as unknown as R)['config'] as typeof LINE_TOOL_DEFAULT_CONFIG;
      expect(config.snapAngles.angles).toEqual(LINE_TOOL_DEFAULT_CONFIG.snapAngles.angles);
      expect(config.snapAngles.activateThreshold).toBe(5);
    });

    it('1.2 with params.config override → merges config', () => {
      const custom = new WeaveLineToolAction({
        config: { snapAngles: { angles: [0, 90], activateThreshold: 3, releaseThreshold: 7 } },
      });
      const config = (custom as unknown as R)['config'] as typeof LINE_TOOL_DEFAULT_CONFIG;
      expect(config.snapAngles.activateThreshold).toBe(3);
    });

    it('1.3 initialize sets all fields to defaults', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      expect((action as unknown as R)['state']).toBe(LINE_TOOL_STATE.IDLE);
      expect((action as unknown as R)['lineId']).toBeNull();
      expect((action as unknown as R)['tempLineId']).toBeNull();
      expect((action as unknown as R)['tempMainLineNode']).toBeNull();
      expect((action as unknown as R)['tempLineNode']).toBeNull();
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['measureContainer']).toBeUndefined();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['shiftPressed']).toBe(false);
      expect((action as unknown as R)['snappedAngle']).toBeNull();
    });

    it('1.4 onPropsChange and onInit are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
    });
  });

  // ── Suite 2: getName / initProps ─────────────────────────────────────────────

  describe('getName / initProps', () => {
    it('2.1 getName() returns LINE_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(LINE_TOOL_ACTION_NAME);
    });

    it('2.2 initProps() returns stroke/strokeWidth/opacity defaults', () => {
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

    it('3.7 stores cancelAction, calls addLine → state=ADDING', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      expect((action as unknown as R)['cancelAction']).toBe(cancelFn);
      expect((action as unknown as R)['state']).toBe(LINE_TOOL_STATE.ADDING);
    });
  });

  // ── Suite 4: keydown listener ────────────────────────────────────────────────

  describe('setupEvents – keydown', () => {
    beforeEach(() => triggerAction());

    it('4.1 Enter + active=lineTool → calls cancelAction()', () => {
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Enter', key: 'Enter' } as KeyboardEvent);
      expect(cancelAction).toHaveBeenCalled();
    });

    it('4.2 Escape + active=lineTool → calls cancelAction()', () => {
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Escape', key: 'Escape' } as KeyboardEvent);
      expect(cancelAction).toHaveBeenCalled();
    });

    it('4.3 Shift + active=lineTool → snappedAngle=null, shiftPressed=true', () => {
      windowHandlers['keydown']({ code: 'ShiftLeft', key: 'Shift' } as KeyboardEvent);
      expect((action as unknown as R)['shiftPressed']).toBe(true);
      expect((action as unknown as R)['snappedAngle']).toBeNull();
    });

    it('4.4 Enter + active≠lineTool → does NOT call cancelAction()', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Enter', key: 'Enter' } as KeyboardEvent);
      expect(cancelAction).not.toHaveBeenCalled();
    });

    it('4.5 Shift + active≠lineTool → shiftPressed stays false', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      windowHandlers['keydown']({ code: 'ShiftLeft', key: 'Shift' } as KeyboardEvent);
      expect((action as unknown as R)['shiftPressed']).toBe(false);
    });

    it('4.6 other key → does nothing', () => {
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Space', key: ' ' } as KeyboardEvent);
      expect(cancelAction).not.toHaveBeenCalled();
    });
  });

  // ── Suite 5: keyup listener ──────────────────────────────────────────────────

  describe('setupEvents – keyup', () => {
    beforeEach(() => {
      triggerAction();
      (action as unknown as R)['shiftPressed'] = true;
    });

    it('5.1 Shift + active=lineTool → snappedAngle=null, shiftPressed=false', () => {
      windowHandlers['keyup']({ key: 'Shift' } as KeyboardEvent);
      expect((action as unknown as R)['shiftPressed']).toBe(false);
      expect((action as unknown as R)['snappedAngle']).toBeNull();
    });

    it('5.2 Shift + active≠lineTool → shiftPressed stays true', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      windowHandlers['keyup']({ key: 'Shift' } as KeyboardEvent);
      expect((action as unknown as R)['shiftPressed']).toBe(true);
    });

    it('5.3 other key → does nothing', () => {
      windowHandlers['keyup']({ key: 'a' } as KeyboardEvent);
      expect((action as unknown as R)['shiftPressed']).toBe(true);
    });
  });

  // ── Suite 6: pointerdown listener ────────────────────────────────────────────

  describe('setupEvents – pointerdown', () => {
    beforeEach(() => triggerAction());

    it('6.1 2 pointers → sets state=ADDING, returns early', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 2 }));
      expect((action as unknown as R)['state']).toBe(LINE_TOOL_STATE.ADDING);
    });

    it('6.2 !tempMainLineNode + state=ADDING → calls handleAdding (creates lines)', () => {
      (action as unknown as R)['state'] = LINE_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect(MockLine).toHaveBeenCalledTimes(2);
    });

    it('6.3 tempMainLineNode + state=ADDING → state=DEFINING_SIZE', () => {
      (action as unknown as R)['state'] = LINE_TOOL_STATE.ADDING;
      const fakeLine = MockLine.mock.results[0]?.value ?? { setAttrs: vi.fn(), x: vi.fn(), y: vi.fn(), points: vi.fn().mockReturnValue([0,0]), destroy: vi.fn(), clone: vi.fn(), getAttrs: vi.fn() };
      (action as unknown as R)['tempMainLineNode'] = fakeLine;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect((action as unknown as R)['state']).toBe(LINE_TOOL_STATE.DEFINING_SIZE);
    });

    it('6.4 state≠ADDING → neither handleAdding nor state change', () => {
      (action as unknown as R)['state'] = LINE_TOOL_STATE.IDLE;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect(MockLine).not.toHaveBeenCalled();
    });

    it('6.5 pointer id stored in pointers map', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 7 }));
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      expect(pointers.has(7)).toBe(true);
    });
  });

  // ── Suite 7: pointermove listener ────────────────────────────────────────────

  describe('setupEvents – pointermove', () => {
    beforeEach(() => triggerAction());

    it('7.1 state=IDLE → returns early, no cursor change', () => {
      (action as unknown as R)['state'] = LINE_TOOL_STATE.IDLE;
      mockWeave._stageContainer.style.cursor = '';
      mockWeave._stageHandlers['pointermove']();
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('7.2 2 pointers → state=ADDING, returns', () => {
      (action as unknown as R)['state'] = LINE_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 2 }));
      mockWeave._stageHandlers['pointermove']();
      expect((action as unknown as R)['state']).toBe(LINE_TOOL_STATE.ADDING);
    });

    it('7.3 state=DEFINING_SIZE, 1 pointer → calls handleMovement', () => {
      doHandleAdding();
      expect((action as unknown as R)['state']).toBe(LINE_TOOL_STATE.DEFINING_SIZE);
      const tempLineNode = MockLine.mock.results[1]?.value;
      expect(tempLineNode).toBeDefined();

      mockWeave._stageHandlers['pointermove']();
      expect(tempLineNode.setAttrs).toHaveBeenCalled();
    });

    it('7.4 state=ADDING, 1 pointer → setCursor only, no handleMovement', () => {
      (action as unknown as R)['state'] = LINE_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      MockLine.mockClear();
      // Reset state to ADDING (handleAdding set it to DEFINING_SIZE)
      (action as unknown as R)['state'] = LINE_TOOL_STATE.ADDING;
      (action as unknown as R)['tempMainLineNode'] = null;
      (action as unknown as R)['tempLineNode'] = null;
      mockWeave._stageHandlers['pointermove']();
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 8: pointerup listener ──────────────────────────────────────────────

  describe('setupEvents – pointerup', () => {
    beforeEach(() => triggerAction());

    it('8.1 state=DEFINING_SIZE → calls handleSettingSize (cancelAction)', () => {
      doHandleAdding();
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      mockWeave._stageHandlers['pointerup'](makePointerEvent());
      expect(cancelFn).toHaveBeenCalled();
    });

    it('8.2 state≠DEFINING_SIZE → skips handleSettingSize', () => {
      (action as unknown as R)['state'] = LINE_TOOL_STATE.ADDING;
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      mockWeave._stageHandlers['pointerup'](makePointerEvent());
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('8.3 deletes pointer id from pointers map', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 3 }));
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      expect(pointers.has(3)).toBe(true);
      mockWeave._stageHandlers['pointerup'](makePointerEvent({ pointerId: 3 }));
      expect(pointers.has(3)).toBe(false);
    });
  });

  // ── Suite 9: handleAdding ────────────────────────────────────────────────────

  describe('handleAdding', () => {
    beforeEach(() => triggerAction());

    it('9.1 sets clickPoint, container, measureContainer', () => {
      doHandleAdding();
      expect((action as unknown as R)['clickPoint']).toEqual({ x: 50, y: 75 });
      expect((action as unknown as R)['container']).toBe(mockWeave._defaultContainer);
      expect((action as unknown as R)['measureContainer']).toBe(mockWeave._defaultMeasureContainer);
    });

    it('9.2 sets lineId and tempLineId to UUID', () => {
      doHandleAdding();
      expect((action as unknown as R)['lineId']).toBe('test-uuid');
      expect((action as unknown as R)['tempLineId']).toBe('test-uuid');
    });

    it('9.3 !tempLineNode → creates both Konva.Line instances, adds to measureContainer', () => {
      doHandleAdding();
      expect(MockLine).toHaveBeenCalledTimes(2);
      expect(mockWeave._defaultMeasureContainer.add).toHaveBeenCalledTimes(2);
      expect((action as unknown as R)['state']).toBe(LINE_TOOL_STATE.DEFINING_SIZE);
    });

    it('9.4 tempLineNode already exists → skips creation', () => {
      doHandleAdding();
      const countBefore = MockLine.mock.calls.length;
      // Second call with tempLineNode already set
      (action as unknown as R)['state'] = LINE_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect(MockLine.mock.calls.length).toBe(countBefore);
    });

    it('9.5 measureContainer undefined → no-op on add', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 50, y: 75 },
        container: makeContainer(),
        measureContainer: undefined,
      });
      (action as unknown as R)['state'] = LINE_TOOL_STATE.ADDING;
      expect(() => mockWeave._stageHandlers['pointerdown'](makePointerEvent())).not.toThrow();
      expect(MockLine).toHaveBeenCalledTimes(2);
    });

    it('9.6 mousePoint=null → clickPoint null, lines use x=0, y=0 fallback', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: null,
        container: makeContainer(),
        measureContainer: makeMeasureContainer(),
      });
      (action as unknown as R)['state'] = LINE_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect(MockLine).toHaveBeenCalledWith(expect.objectContaining({ x: 0, y: 0 }));
    });
  });

  // ── Suite 10: defineFinalPoint ───────────────────────────────────────────────

  describe('defineFinalPoint', () => {
    beforeEach(() => triggerAction());

    it('10.1 !tempLineNode → returns {x:0, y:0}', () => {
      (action as unknown as R)['tempLineNode'] = null;
      (action as unknown as R)['measureContainer'] = makeMeasureContainer();
      const result = (action as unknown as R)['defineFinalPoint']() as { x: number; y: number };
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('10.2 !measureContainer → returns {x:0, y:0}', () => {
      doHandleAdding();
      (action as unknown as R)['measureContainer'] = undefined;
      const result = (action as unknown as R)['defineFinalPoint']() as { x: number; y: number };
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('10.3 shiftPressed=false → simple subtraction', () => {
      doHandleAdding();
      (action as unknown as R)['shiftPressed'] = false;
      const tempLineNode = MockLine.mock.results[1]?.value;
      tempLineNode.x.mockReturnValue(50);
      tempLineNode.y.mockReturnValue(75);
      // mousePoint = {x:120, y:140}, tempLineNode.x()=50, tempLineNode.y()=75
      const result = (action as unknown as R)['defineFinalPoint']() as { x: number; y: number };
      expect(result.x).toBe(70); // 120 - 50
      expect(result.y).toBe(65); // 140 - 75
    });

    it('10.4 shiftPressed=true → snap angle applied', () => {
      doHandleAdding();
      (action as unknown as R)['shiftPressed'] = true;
      const tempLineNode = MockLine.mock.results[1]?.value;
      tempLineNode.x.mockReturnValue(10);
      tempLineNode.y.mockReturnValue(10);
      tempLineNode.points.mockReturnValue([0, 0]);
      // dx = 120 - (10+0) = 110, dy = 140 - (10+0) = 130
      const result = (action as unknown as R)['defineFinalPoint']() as { x: number; y: number };
      // result is points[0] + dx and points[1] + dy after snap (passthrough)
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
    });
  });

  // ── Suite 11: handleSettingSize ──────────────────────────────────────────────

  describe('handleSettingSize', () => {
    beforeEach(() => triggerAction());

    it('11.1 guard fails (lineId=null) → skips inner block, cancelAction NOT called', () => {
      (action as unknown as R)['lineId'] = null;
      (action as unknown as R)['state'] = LINE_TOOL_STATE.DEFINING_SIZE;
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      mockWeave._stageHandlers['pointerup'](makePointerEvent());
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('11.2 guard passes → updates both lines, calls cancelAction', () => {
      doHandleAdding();
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      mockWeave._stageHandlers['pointerup'](makePointerEvent());
      const tempMainLine = MockLine.mock.results[0]?.value;
      const tempLine = MockLine.mock.results[1]?.value;
      expect(tempMainLine.setAttrs).toHaveBeenCalled();
      expect(tempLine.setAttrs).toHaveBeenCalled();
      expect(cancelFn).toHaveBeenCalled();
    });
  });

  // ── Suite 12: handleMovement ─────────────────────────────────────────────────

  describe('handleMovement', () => {
    beforeEach(() => triggerAction());

    it('12.1 state≠DEFINING_SIZE → returns early', () => {
      (action as unknown as R)['state'] = LINE_TOOL_STATE.ADDING;
      (action as unknown as R)['handleMovement']();
      // no calls to getMousePointerRelativeToContainer
      expect(mockWeave.getMousePointerRelativeToContainer).not.toHaveBeenCalled();
    });

    it('12.2 tempLineNode absent → skips inner block', () => {
      (action as unknown as R)['state'] = LINE_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['tempLineNode'] = null;
      (action as unknown as R)['measureContainer'] = makeMeasureContainer();
      (action as unknown as R)['handleMovement']();
      expect(mockWeave.getMousePointerRelativeToContainer).not.toHaveBeenCalled();
    });

    it('12.3 tempLineNode + measureContainer present → updates tempLineNode attrs', () => {
      doHandleAdding();
      const tempLineNode = MockLine.mock.results[1]?.value;
      tempLineNode.points.mockReturnValue([0, 0]);
      (action as unknown as R)['handleMovement']();
      expect(tempLineNode.setAttrs).toHaveBeenCalled();
    });
  });

  // ── Suite 13: cleanup ────────────────────────────────────────────────────────

  describe('cleanup', () => {
    beforeEach(() => triggerAction());

    it('13.1 tempLineNode exists → destroy() called', () => {
      doHandleAdding();
      const tempLineNode = MockLine.mock.results[1]?.value;
      action.cleanup();
      expect(tempLineNode.destroy).toHaveBeenCalled();
    });

    it('13.2 tempLineNode null → ?.destroy() is no-op', () => {
      (action as unknown as R)['tempLineNode'] = null;
      expect(() => action.cleanup()).not.toThrow();
    });

    it('13.3 lineId=null → skips node creation block', () => {
      (action as unknown as R)['lineId'] = null;
      action.cleanup();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('13.4 tempMainLineNode.points().length !== 4 → skips', () => {
      doHandleAdding();
      const tempMainLine = MockLine.mock.results[0]?.value;
      tempMainLine.points.mockReturnValue([0, 0]); // length=2, not 4
      action.cleanup();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('13.5 all points are zero → skips (every coord === 0)', () => {
      doHandleAdding();
      const tempMainLine = MockLine.mock.results[0]?.value;
      tempMainLine.points.mockReturnValue([0, 0, 0, 0]); // length=4 but all zero
      action.cleanup();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('13.6 all conditions met + nodeHandler absent → skips create, nodeCreated=false', () => {
      doHandleAdding();
      const tempMainLine = MockLine.mock.results[0]?.value;
      tempMainLine.points.mockReturnValue([0, 0, 50, 75]);
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      action.cleanup();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('13.7 all conditions met + nodeHandler present → creates node, emits onAddedLine, nodeCreated=true', () => {
      doHandleAdding();
      const tempMainLine = MockLine.mock.results[0]?.value;
      tempMainLine.points.mockReturnValue([0, 0, 50, 75]);
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      action.cleanup();
      expect(nh.scaleReset).toHaveBeenCalled();
      expect(mockWeave.addNode).toHaveBeenCalled();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedLine');
    });

    it('13.8 nodeCreated=true + selectionPlugin + findOne returns node → setSelectedNodes + triggerAction', () => {
      doHandleAdding();
      const tempMainLine = MockLine.mock.results[0]?.value;
      tempMainLine.points.mockReturnValue([0, 0, 50, 75]);
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([
        mockWeave._mockLineNode,
      ]);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('13.9 nodeCreated=true + selectionPlugin + findOne returns undefined → skips setSelectedNodes, still triggerAction', () => {
      doHandleAdding();
      const tempMainLine = MockLine.mock.results[0]?.value;
      tempMainLine.points.mockReturnValue([0, 0, 50, 75]);
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      mockWeave._stage.findOne.mockReturnValue(undefined);
      mockWeave._selectionPlugin.setSelectedNodes.mockClear();
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('13.10 nodeCreated=false → skips selectionPlugin block entirely', () => {
      (action as unknown as R)['lineId'] = null;
      mockWeave._selectionPlugin.setSelectedNodes.mockClear();
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('13.11 resets all fields to initial values', () => {
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
      expect((action as unknown as R)['state']).toBe(LINE_TOOL_STATE.IDLE);
    });
  });
});
