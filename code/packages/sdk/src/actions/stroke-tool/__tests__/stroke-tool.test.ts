// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('konva', () => ({ default: {} }));
vi.mock('@/internal-utils/greedy-snapper', () => ({
  GreedySnapper: vi.fn().mockImplementation(() => ({
    apply: vi.fn().mockImplementation((angle: number) => angle),
  })),
}));
vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-uuid') }));

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { WeaveStrokeToolAction } from '../stroke-tool';
import {
  WEAVE_STROKE_TOOL_ACTION_NAME,
  WEAVE_STROKE_TOOL_ACTION_NAME_ALIASES,
  WEAVE_STROKE_TOOL_DEFAULT_CONFIG,
  WEAVE_STROKE_TOOL_STATE,
} from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';

type R = Record<string, unknown>;

function makeTempLineNode(linePoints = [0, 0, 1, 1]) {
  const cloneAttrs = { linePoints: [...linePoints] };
  return {
    x: vi.fn().mockReturnValue(10),
    y: vi.fn().mockReturnValue(20),
    getAttrs: vi.fn().mockReturnValue({ linePoints }),
    setAttrs: vi.fn(),
    destroy: vi.fn(),
    clone: vi.fn().mockReturnValue({
      getAttrs: vi.fn().mockReturnValue(cloneAttrs),
    }),
  };
}

function makeContainer(id = 'layer-id') {
  return { getAttrs: vi.fn().mockReturnValue({ id }) };
}

function makeMeasureContainer() {
  return { add: vi.fn() };
}

function makeNodeHandler(tempNode = makeTempLineNode()) {
  return {
    onRender: vi.fn().mockReturnValue(tempNode),
    updateLine: vi.fn(),
    create: vi.fn().mockReturnValue({ props: { dragBoundFunc: vi.fn() } }),
    _tempNode: tempNode,
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
  const mockNode = { id: 'test-uuid' };
  const stage = {
    container: vi.fn().mockReturnValue(stageContainer),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      stageHandlers[event] = handler;
    }),
    findOne: vi.fn().mockReturnValue(mockNode),
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
    getActiveAction: vi.fn().mockReturnValue(WEAVE_STROKE_TOOL_ACTION_NAME),
    emitEvent: vi.fn(),
    addNode: vi.fn(),
    triggerAction: vi.fn(),
    _stage: stage,
    _stageContainer: stageContainer,
    _stageHandlers: stageHandlers,
    _selectionPlugin: selectionPlugin,
    _defaultContainer: defaultContainer,
    _defaultMeasureContainer: defaultMeasureContainer,
    _mockNode: mockNode,
  };
}

function makePointerEvent(
  overrides: Partial<{ pointerId: number; clientX: number; clientY: number }> = {}
) {
  return {
    evt: { pointerId: 1, clientX: 50, clientY: 75, ...overrides },
  };
}

describe('WeaveStrokeToolAction', () => {
  let action: WeaveStrokeToolAction;
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

    action = new WeaveStrokeToolAction();
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
    return { cancelFn };
  }

  function doHandleAdding(nh = makeNodeHandler()) {
    mockWeave.getNodeHandler.mockReturnValue(nh);
    (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.ADDING;
    mockWeave._stageHandlers['pointerdown'](makePointerEvent());
    return nh;
  }

  // ── Suite 1: constructor / initialize ────────────────────────────────────────

  describe('constructor / initialize', () => {
    it('1.1 no params → config = WEAVE_STROKE_TOOL_DEFAULT_CONFIG', () => {
      const config = (action as unknown as R)['config'] as typeof WEAVE_STROKE_TOOL_DEFAULT_CONFIG;
      expect(config.snapAngles.activateThreshold).toBe(5);
      expect(config.snapAngles.angles).toEqual(WEAVE_STROKE_TOOL_DEFAULT_CONFIG.snapAngles.angles);
    });

    it('1.2 with params.config override → merges config', () => {
      const custom = new WeaveStrokeToolAction({
        config: { snapAngles: { angles: [0, 90], activateThreshold: 3, releaseThreshold: 7 } },
      });
      const config = (custom as unknown as R)['config'] as typeof WEAVE_STROKE_TOOL_DEFAULT_CONFIG;
      expect(config.snapAngles.activateThreshold).toBe(3);
    });

    it('1.3 initialize sets all fields to defaults', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      expect((action as unknown as R)['state']).toBe(WEAVE_STROKE_TOOL_STATE.IDLE);
      expect((action as unknown as R)['arrowId']).toBeNull();
      expect((action as unknown as R)['tempLineId']).toBeNull();
      expect((action as unknown as R)['tempLineNode']).toBeNull();
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['measureContainer']).toBeUndefined();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['shiftPressed']).toBe(false);
    });

    it('1.4 onPropsChange and onInit are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
    });
  });

  // ── Suite 2: getName / getNames / hasAliases / getAliases / initProps ─────────

  describe('getName / getNames / hasAliases / getAliases / initProps', () => {
    it('2.1 getName() returns WEAVE_STROKE_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(WEAVE_STROKE_TOOL_ACTION_NAME);
    });

    it('2.2 getNames() returns name + aliases', () => {
      expect(action.getNames()).toEqual([
        WEAVE_STROKE_TOOL_ACTION_NAME,
        ...WEAVE_STROKE_TOOL_ACTION_NAME_ALIASES,
      ]);
    });

    it('2.3 hasAliases() returns true', () => {
      expect(action.hasAliases()).toBe(true);
    });

    it('2.4 getAliases() returns WEAVE_STROKE_TOOL_ACTION_NAME_ALIASES', () => {
      expect(action.getAliases()).toEqual(WEAVE_STROKE_TOOL_ACTION_NAME_ALIASES);
    });

    it('2.5 initProps() returns correct defaults', () => {
      const props = (action as unknown as R)['initProps']() as Record<string, unknown>;
      expect(props.stroke).toBe('#000000ff');
      expect(props.strokeWidth).toBe(1);
      expect(props.opacity).toBe(1);
      expect(props.tipStartStyle).toBe('none');
      expect(props.tipEndStyle).toBe('none');
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
      expect((action as unknown as R)['state']).toBe(WEAVE_STROKE_TOOL_STATE.ADDING);
    });
  });

  // ── Suite 4: keydown listener ────────────────────────────────────────────────

  describe('setupEvents – keydown', () => {
    beforeEach(() => triggerAction());

    it('4.1 Enter + active=strokeTool → calls cancelAction()', () => {
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Enter', key: 'Enter' } as KeyboardEvent);
      expect(cancelAction).toHaveBeenCalled();
    });

    it('4.2 Enter + active=arrowTool (alias) → calls cancelAction()', () => {
      mockWeave.getActiveAction.mockReturnValue('arrowTool');
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Enter', key: 'Enter' } as KeyboardEvent);
      expect(cancelAction).toHaveBeenCalled();
    });

    it('4.3 Escape + active=strokeTool → calls cancelAction()', () => {
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Escape', key: 'Escape' } as KeyboardEvent);
      expect(cancelAction).toHaveBeenCalled();
    });

    it('4.4 Shift + active=strokeTool → shiftPressed=true', () => {
      windowHandlers['keydown']({ code: 'ShiftLeft', key: 'Shift' } as KeyboardEvent);
      expect((action as unknown as R)['shiftPressed']).toBe(true);
    });

    it('4.5 Enter + active≠any → noop', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Enter', key: 'Enter' } as KeyboardEvent);
      expect(cancelAction).not.toHaveBeenCalled();
    });

    it('4.6 Shift + active≠any → shiftPressed stays false', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      windowHandlers['keydown']({ code: 'ShiftLeft', key: 'Shift' } as KeyboardEvent);
      expect((action as unknown as R)['shiftPressed']).toBe(false);
    });

    it('4.7 other key → does nothing', () => {
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Space', key: ' ' } as KeyboardEvent);
      expect(cancelAction).not.toHaveBeenCalled();
    });

    it('4.8 getActiveAction()=null → ?? "" covers null-coalescing in all keydown checks', () => {
      mockWeave.getActiveAction.mockReturnValue(null);
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Enter', key: 'Enter' } as KeyboardEvent);
      windowHandlers['keydown']({ code: 'Escape', key: 'Escape' } as KeyboardEvent);
      windowHandlers['keydown']({ code: 'ShiftLeft', key: 'Shift' } as KeyboardEvent);
      expect(cancelAction).not.toHaveBeenCalled();
      expect((action as unknown as R)['shiftPressed']).toBe(false);
    });
  });

  // ── Suite 5: keyup listener ──────────────────────────────────────────────────

  describe('setupEvents – keyup', () => {
    beforeEach(() => {
      triggerAction();
      (action as unknown as R)['shiftPressed'] = true;
    });

    it('5.1 Shift + active=strokeTool → shiftPressed=false', () => {
      windowHandlers['keyup']({ key: 'Shift' } as KeyboardEvent);
      expect((action as unknown as R)['shiftPressed']).toBe(false);
    });

    it('5.2 Shift + active≠any → shiftPressed stays true', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      windowHandlers['keyup']({ key: 'Shift' } as KeyboardEvent);
      expect((action as unknown as R)['shiftPressed']).toBe(true);
    });

    it('5.3 other key → does nothing', () => {
      windowHandlers['keyup']({ key: 'a' } as KeyboardEvent);
      expect((action as unknown as R)['shiftPressed']).toBe(true);
    });

    it('5.4 getActiveAction()=null → ?? "" covers null-coalescing in keyup check', () => {
      mockWeave.getActiveAction.mockReturnValue(null);
      windowHandlers['keyup']({ key: 'Shift' } as KeyboardEvent);
      expect((action as unknown as R)['shiftPressed']).toBe(true); // no change
    });
  });

  // ── Suite 6: pointerdown listener ────────────────────────────────────────────

  describe('setupEvents – pointerdown', () => {
    beforeEach(() => triggerAction());

    it('6.1 2 pointers → state=ADDING, returns early', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 2 }));
      expect((action as unknown as R)['state']).toBe(WEAVE_STROKE_TOOL_STATE.ADDING);
    });

    it('6.2 !tempLineNode + state=ADDING + nodeHandler → handleAdding, onRender called', () => {
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect(nh.onRender).toHaveBeenCalled();
    });

    it('6.3 tempLineNode + state=ADDING → state=DEFINING_SIZE', () => {
      doHandleAdding();
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect((action as unknown as R)['state']).toBe(WEAVE_STROKE_TOOL_STATE.DEFINING_SIZE);
    });

    it('6.4 state≠ADDING → neither branch', () => {
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.IDLE;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect(mockWeave.getNodeHandler).not.toHaveBeenCalled();
    });

    it('6.5 pointer id stored in pointers map', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 7 }));
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      expect(pointers.has(7)).toBe(true);
    });

    it('6.6 getActiveAction()=null in 2-pointer guard → ?? "" covers null-coalescing', () => {
      mockWeave.getActiveAction.mockReturnValue(null);
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 2 }));
      // state doesn't change to ADDING because includes('') = false
      expect((action as unknown as R)['state']).toBe(WEAVE_STROKE_TOOL_STATE.ADDING);
    });
  });

  // ── Suite 7: pointermove listener ────────────────────────────────────────────

  describe('setupEvents – pointermove', () => {
    beforeEach(() => triggerAction());

    it('7.1 state=IDLE → returns early, no cursor change', () => {
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.IDLE;
      mockWeave._stageContainer.style.cursor = '';
      mockWeave._stageHandlers['pointermove']();
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('7.2 2 pointers → state=ADDING, returns', () => {
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 2 }));
      mockWeave._stageHandlers['pointermove']();
      expect((action as unknown as R)['state']).toBe(WEAVE_STROKE_TOOL_STATE.ADDING);
    });

    it('7.3 state=DEFINING_SIZE → calls handleMovement (nodeHandler+tempLineNode present)', () => {
      const nh = doHandleAdding();
      nh.updateLine.mockClear();
      mockWeave._stageHandlers['pointermove']();
      expect(nh.updateLine).toHaveBeenCalled();
    });

    it('7.4 state=ADDING, 1 pointer → setCursor only', () => {
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.ADDING;
      (action as unknown as R)['tempLineNode'] = null;
      mockWeave._stageHandlers['pointermove']();
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });

    it('7.5 getActiveAction()=null in 2-pointer guard → ?? "" covers null-coalescing', () => {
      mockWeave.getActiveAction.mockReturnValue(null);
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 2 }));
      mockWeave._stageHandlers['pointermove']();
      // state stays ADDING (includes('') = false, doesn't short-circuit to return)
      expect((action as unknown as R)['state']).toBe(WEAVE_STROKE_TOOL_STATE.ADDING);
    });
  });

  // ── Suite 8: pointerup listener ──────────────────────────────────────────────

  describe('setupEvents – pointerup', () => {
    beforeEach(() => triggerAction());

    it('8.1 state=DEFINING_SIZE + arrowId+tempLineNode+measureContainer → cancelAction()', () => {
      doHandleAdding();
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      mockWeave._stageHandlers['pointerup'](makePointerEvent());
      expect(cancelFn).toHaveBeenCalled();
    });

    it('8.2 state≠DEFINING_SIZE → skips handleSettingSize', () => {
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.ADDING;
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

  // ── Suite 9: addLine – emitEvent payload ─────────────────────────────────────

  describe('addLine – emitEvent payload', () => {
    it('9.1 getActiveAction() returns name → payload actionName=strokeTool', () => {
      triggerAction();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith(
        'onAddingStroke',
        expect.objectContaining({ actionName: WEAVE_STROKE_TOOL_ACTION_NAME })
      );
    });

    it('9.2 getActiveAction() returns null → payload actionName=not-defined', () => {
      mockWeave.getActiveAction.mockReturnValue(null);
      triggerAction();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith(
        'onAddingStroke',
        expect.objectContaining({ actionName: 'not-defined' })
      );
    });
  });

  // ── Suite 10: handleAdding ───────────────────────────────────────────────────

  describe('handleAdding', () => {
    beforeEach(() => triggerAction());

    it('10.1 sets clickPoint, container, measureContainer', () => {
      doHandleAdding();
      expect((action as unknown as R)['clickPoint']).toEqual({ x: 50, y: 75 });
      expect((action as unknown as R)['container']).toBe(mockWeave._defaultContainer);
      expect((action as unknown as R)['measureContainer']).toBe(mockWeave._defaultMeasureContainer);
    });

    it('10.2 !tempLineNode + nodeHandler → onRender called, added to measureContainer, state=DEFINING_SIZE', () => {
      const nh = doHandleAdding();
      expect(nh.onRender).toHaveBeenCalledWith(expect.objectContaining({ strokeScaleEnabled: true }));
      expect(mockWeave._defaultMeasureContainer.add).toHaveBeenCalled();
      expect((action as unknown as R)['state']).toBe(WEAVE_STROKE_TOOL_STATE.DEFINING_SIZE);
    });

    it('10.3 tempLineNode present → skips onRender', () => {
      doHandleAdding();
      const nh2 = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh2);
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect(nh2.onRender).not.toHaveBeenCalled();
    });

    it('10.4 nodeHandler absent → skips onRender', () => {
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect((action as unknown as R)['tempLineNode']).toBeNull();
    });

    it('10.5 measureContainer undefined → ?.add() no-op', () => {
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 50, y: 75 },
        container: makeContainer(),
        measureContainer: undefined,
      });
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.ADDING;
      expect(() => mockWeave._stageHandlers['pointerdown'](makePointerEvent())).not.toThrow();
      expect(nh.onRender).toHaveBeenCalled();
    });

    it('10.6 mousePoint=null → ??0 fallback for x/y', () => {
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: null,
        container: makeContainer(),
        measureContainer: makeMeasureContainer(),
      });
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect(nh.onRender).toHaveBeenCalledWith(expect.objectContaining({ x: 0, y: 0 }));
    });
  });

  // ── Suite 11: defineFinalPoint ───────────────────────────────────────────────

  describe('defineFinalPoint', () => {
    beforeEach(() => triggerAction());

    it('11.1 !tempLineNode → returns {x:0, y:0}', () => {
      (action as unknown as R)['tempLineNode'] = null;
      (action as unknown as R)['measureContainer'] = makeMeasureContainer();
      const result = (action as unknown as R)['defineFinalPoint']() as { x: number; y: number };
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('11.2 !measureContainer → returns {x:0, y:0}', () => {
      doHandleAdding();
      (action as unknown as R)['measureContainer'] = undefined;
      const result = (action as unknown as R)['defineFinalPoint']() as { x: number; y: number };
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('11.3 shiftPressed=false → simple subtraction', () => {
      const nh = doHandleAdding();
      (action as unknown as R)['shiftPressed'] = false;
      nh._tempNode.x.mockReturnValue(50);
      nh._tempNode.y.mockReturnValue(75);
      // mousePoint = {x:120, y:140} → pos.x = 120-50=70, pos.y = 140-75=65
      const result = (action as unknown as R)['defineFinalPoint']() as { x: number; y: number };
      expect(result.x).toBe(70);
      expect(result.y).toBe(65);
    });

    it('11.4 shiftPressed=true → snap angle applied', () => {
      const nh = doHandleAdding();
      (action as unknown as R)['shiftPressed'] = true;
      nh._tempNode.x.mockReturnValue(10);
      nh._tempNode.y.mockReturnValue(10);
      nh._tempNode.getAttrs.mockReturnValue({ linePoints: [0, 0, 1, 1] });
      const result = (action as unknown as R)['defineFinalPoint']() as { x: number; y: number };
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
    });
  });

  // ── Suite 12: handleSettingSize ──────────────────────────────────────────────

  describe('handleSettingSize', () => {
    beforeEach(() => triggerAction());

    it('12.1 guard fails (arrowId=null) → no cancelAction', () => {
      (action as unknown as R)['arrowId'] = null;
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.DEFINING_SIZE;
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      mockWeave._stageHandlers['pointerup'](makePointerEvent());
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('12.2 guard passes → calls cancelAction()', () => {
      doHandleAdding();
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      mockWeave._stageHandlers['pointerup'](makePointerEvent());
      expect(cancelFn).toHaveBeenCalled();
    });
  });

  // ── Suite 13: handleMovement ─────────────────────────────────────────────────

  describe('handleMovement', () => {
    beforeEach(() => triggerAction());

    it('13.1 state≠DEFINING_SIZE → returns early', () => {
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.ADDING;
      (action as unknown as R)['handleMovement']();
      expect(mockWeave.getMousePointerRelativeToContainer).not.toHaveBeenCalled();
    });

    it('13.2 nodeHandler absent → skips inner block', () => {
      doHandleAdding();
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      expect(() => (action as unknown as R)['handleMovement']()).not.toThrow();
      expect(mockWeave.getMousePointerRelativeToContainer).not.toHaveBeenCalled();
    });

    it('13.3 tempLineNode absent → skips inner block', () => {
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      (action as unknown as R)['state'] = WEAVE_STROKE_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['tempLineNode'] = null;
      (action as unknown as R)['measureContainer'] = makeMeasureContainer();
      (action as unknown as R)['handleMovement']();
      expect(nh.updateLine).not.toHaveBeenCalled();
    });

    it('13.4 all present → setAttrs + updateLine called', () => {
      const nh = doHandleAdding();
      nh.updateLine.mockClear();
      (action as unknown as R)['handleMovement']();
      expect(nh._tempNode.setAttrs).toHaveBeenCalled();
      expect(nh.updateLine).toHaveBeenCalled();
    });
  });

  // ── Suite 14: cleanup ────────────────────────────────────────────────────────

  describe('cleanup', () => {
    beforeEach(() => triggerAction());

    it('14.1 tempLineNode exists → first ?.destroy() called', () => {
      const nh = doHandleAdding();
      action.cleanup();
      expect(nh._tempNode.destroy).toHaveBeenCalled();
    });

    it('14.2 tempLineNode null → ?.destroy() is no-op', () => {
      (action as unknown as R)['tempLineNode'] = null;
      expect(() => action.cleanup()).not.toThrow();
    });

    it('14.3 arrowId=null → skips node creation block', () => {
      (action as unknown as R)['arrowId'] = null;
      action.cleanup();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('14.4 linePoints.length !== 4 → skips', () => {
      const nh = doHandleAdding();
      nh._tempNode.getAttrs.mockReturnValue({ linePoints: [0, 0] }); // length=2
      action.cleanup();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('14.5 all points are zero → skips', () => {
      const nh = doHandleAdding();
      nh._tempNode.getAttrs.mockReturnValue({ linePoints: [0, 0, 0, 0] }); // all zero
      action.cleanup();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('14.6 nodeHandler absent → skips create', () => {
      const nh = doHandleAdding();
      nh._tempNode.getAttrs.mockReturnValue({ linePoints: [0, 0, 50, 75] });
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      action.cleanup();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('14.7 nodeHandler present → clone, create, delete dragBoundFunc, addNode, emitEvent', () => {
      const nh = doHandleAdding();
      nh._tempNode.getAttrs.mockReturnValue({ linePoints: [0, 0, 50, 75] });
      mockWeave.getNodeHandler.mockReturnValue(nh);
      const finalLine = { props: { dragBoundFunc: vi.fn(), other: 'val' } };
      nh.create.mockReturnValue(finalLine);

      action.cleanup();

      expect(nh.create).toHaveBeenCalled();
      expect(finalLine.props.dragBoundFunc).toBeUndefined(); // deleted
      expect(mockWeave.addNode).toHaveBeenCalled();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedStroke', expect.any(Object));
    });

    it('14.8 emitEvent payload actionName from getActiveAction()', () => {
      const nh = doHandleAdding();
      nh._tempNode.getAttrs.mockReturnValue({ linePoints: [0, 0, 50, 75] });
      mockWeave.getNodeHandler.mockReturnValue(nh);
      nh.create.mockReturnValue({ props: { dragBoundFunc: vi.fn() } });

      action.cleanup();

      expect(mockWeave.emitEvent).toHaveBeenCalledWith(
        'onAddedStroke',
        expect.objectContaining({ actionName: WEAVE_STROKE_TOOL_ACTION_NAME })
      );
    });

    it('14.9 getActiveAction()=null → actionName="not-defined"', () => {
      const nh = doHandleAdding();
      nh._tempNode.getAttrs.mockReturnValue({ linePoints: [0, 0, 50, 75] });
      mockWeave.getNodeHandler.mockReturnValue(nh);
      nh.create.mockReturnValue({ props: { dragBoundFunc: vi.fn() } });
      mockWeave.getActiveAction.mockReturnValue(null);

      action.cleanup();

      expect(mockWeave.emitEvent).toHaveBeenCalledWith(
        'onAddedStroke',
        expect.objectContaining({ actionName: 'not-defined' })
      );
    });

    it('14.10 nodeCreated=true + selectionPlugin + findOne returns node → setSelectedNodes + triggerAction', () => {
      const nh = doHandleAdding();
      nh._tempNode.getAttrs.mockReturnValue({ linePoints: [0, 0, 50, 75] });
      mockWeave.getNodeHandler.mockReturnValue(nh);
      nh.create.mockReturnValue({ props: { dragBoundFunc: vi.fn() } });

      action.cleanup();

      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([
        mockWeave._mockNode,
      ]);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('14.11 nodeCreated=true + selectionPlugin + findOne=undefined → skips setSelectedNodes, still triggerAction', () => {
      const nh = doHandleAdding();
      nh._tempNode.getAttrs.mockReturnValue({ linePoints: [0, 0, 50, 75] });
      mockWeave.getNodeHandler.mockReturnValue(nh);
      nh.create.mockReturnValue({ props: { dragBoundFunc: vi.fn() } });
      mockWeave._stage.findOne.mockReturnValue(undefined);
      mockWeave._selectionPlugin.setSelectedNodes.mockClear();

      action.cleanup();

      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('14.12 nodeCreated=false → skips selectionPlugin block', () => {
      (action as unknown as R)['arrowId'] = null;
      mockWeave._selectionPlugin.setSelectedNodes.mockClear();
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('14.13 resets all fields to initial values', () => {
      doHandleAdding();
      action.cleanup();
      expect((action as unknown as R)['arrowId']).toBeNull();
      expect((action as unknown as R)['tempLineId']).toBeNull();
      expect((action as unknown as R)['tempLineNode']).toBeNull();
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['measureContainer']).toBeUndefined();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['initialCursor']).toBeNull();
      expect((action as unknown as R)['state']).toBe(WEAVE_STROKE_TOOL_STATE.IDLE);
    });
  });
});
