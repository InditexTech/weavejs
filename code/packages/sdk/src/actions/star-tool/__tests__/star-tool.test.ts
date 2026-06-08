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
vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-uuid') }));

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { WeaveStarToolAction } from '../star-tool';
import { STAR_TOOL_ACTION_NAME, STAR_TOOL_STATE } from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';

type R = Record<string, unknown>;

function makeContainer(id = 'layer-id') {
  return { getAttrs: vi.fn().mockReturnValue({ id }) };
}

function makeMockStar() {
  return {
    setAttrs: vi.fn(),
    getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }),
  };
}

function makeNodeHandler() {
  const mockStar = makeMockStar();
  const serialized = { id: 'test-uuid', type: 'star', props: {} };
  return {
    create: vi.fn().mockReturnValue(mockStar),
    serialize: vi.fn().mockReturnValue(serialized),
    onUpdate: vi.fn(),
    _mockStar: mockStar,
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
  const mockStar = makeMockStar();
  const stage = {
    container: vi.fn().mockReturnValue(stageContainer),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      stageHandlers[event] = handler;
    }),
    findOne: vi.fn().mockReturnValue(mockStar),
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
    getActiveAction: vi.fn().mockReturnValue(STAR_TOOL_ACTION_NAME),
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
    _mockStar: mockStar,
  };
}

function makePointerEvent(
  overrides: Partial<{
    pointerId: number;
    clientX: number;
    clientY: number;
    buttons: number;
    pointerType: string;
  }> = {}
) {
  return {
    evt: {
      pointerId: 1,
      clientX: 50,
      clientY: 75,
      buttons: 1,
      pointerType: 'mouse',
      ...overrides,
    },
  };
}

describe('WeaveStarToolAction', () => {
  let action: WeaveStarToolAction;
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

    action = new WeaveStarToolAction();
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

  // ── Suite 1: constructor / initialize ────────────────────────────────────────

  describe('constructor / initialize', () => {
    it('1.1 initialized=false, state=IDLE, starId=null', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      expect((action as unknown as R)['state']).toBe(STAR_TOOL_STATE.IDLE);
      expect((action as unknown as R)['starId']).toBeNull();
    });

    it('1.2 creating=false, moved=false, clickPoint=null', () => {
      expect((action as unknown as R)['creating']).toBe(false);
      expect((action as unknown as R)['moved']).toBe(false);
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });

    it('1.3 container=undefined, pointers=empty Map', () => {
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['pointers']).toBeInstanceOf(Map);
      expect(
        ((action as unknown as R)['pointers'] as Map<number, unknown>).size
      ).toBe(0);
    });

    it('1.4 onPropsChange and onInit are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
    });
  });

  // ── Suite 2: getName ─────────────────────────────────────────────────────────

  describe('getName', () => {
    it('2.1 returns STAR_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(STAR_TOOL_ACTION_NAME);
    });
  });

  // ── Suite 3: initProps ───────────────────────────────────────────────────────

  describe('initProps', () => {
    it('3.1 returns expected defaults', () => {
      const props = (action as unknown as R)['initProps']() as Record<
        string,
        unknown
      >;
      expect(props.opacity).toBe(1);
      expect(props.fill).toBe('#ffffffff');
      expect(props.stroke).toBe('#000000ff');
      expect(props.strokeWidth).toBe(1);
      expect(props.numPoints).toBe(5);
      expect(props.innerRadius).toBe(35);
      expect(props.outerRadius).toBe(92);
      expect(props.keepAspectRatio).toBe(false);
    });
  });

  // ── Suite 4: trigger ─────────────────────────────────────────────────────────

  describe('trigger', () => {
    it('4.1 throws when no instance', () => {
      (action as unknown as R)['instance'] = undefined;
      expect(() => action.trigger(vi.fn())).toThrow('Instance not defined');
    });

    it('4.2 first call runs setupEvents, sets initialized=true', () => {
      triggerAction();
      expect((action as unknown as R)['initialized']).toBe(true);
      expect(mockWeave._stage.on).toHaveBeenCalledTimes(3);
    });

    it('4.3 second call does NOT re-run setupEvents', () => {
      triggerAction();
      triggerAction();
      expect(mockWeave._stage.on).toHaveBeenCalledTimes(3);
    });

    it('4.4 sets tabIndex=1 and calls focus()', () => {
      triggerAction();
      expect(mockWeave._stageContainer.tabIndex).toBe(1);
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
    });

    it('4.5 stores cancelAction callback', () => {
      const cancelFn = vi.fn();
      triggerAction(cancelFn);
      expect((action as unknown as R)['cancelAction']).toBe(cancelFn);
    });

    it('4.6 selectionPlugin present → calls setSelectedNodes([])', () => {
      triggerAction();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith(
        []
      );
    });

    it('4.7 selectionPlugin absent → skips setSelectedNodes', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      triggerAction();
      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
    });

    it('4.8 resets props via initProps()', () => {
      const { cancelFn } = triggerAction();
      const props = (action as unknown as R)['props'] as Record<string, unknown>;
      expect(props.numPoints).toBe(5);
      expect(cancelFn).toBeDefined();
    });

    it('4.9 sets state to ADDING via addStar()', () => {
      triggerAction();
      expect((action as unknown as R)['state']).toBe(STAR_TOOL_STATE.ADDING);
    });

    it('4.10 emits onAddingStar event', () => {
      triggerAction();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddingStar');
    });
  });

  // ── Suite 5: keydown listener ────────────────────────────────────────────────

  describe('setupEvents – keydown', () => {
    beforeEach(() => triggerAction());

    it('5.1 Enter + active=starTool → calls cancelAction()', () => {
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Enter' } as KeyboardEvent);
      expect(cancelAction).toHaveBeenCalled();
    });

    it('5.2 Escape + active=starTool → calls cancelAction()', () => {
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Escape' } as KeyboardEvent);
      expect(cancelAction).toHaveBeenCalled();
    });

    it('5.3 Enter + active≠starTool → does NOT call cancelAction()', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Enter' } as KeyboardEvent);
      expect(cancelAction).not.toHaveBeenCalled();
    });

    it('5.4 Escape + active≠starTool → does NOT call cancelAction()', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Escape' } as KeyboardEvent);
      expect(cancelAction).not.toHaveBeenCalled();
    });

    it('5.5 other key → does nothing', () => {
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Space' } as KeyboardEvent);
      expect(cancelAction).not.toHaveBeenCalled();
    });
  });

  // ── Suite 6: pointerdown listener ────────────────────────────────────────────

  describe('setupEvents – pointerdown', () => {
    beforeEach(() => triggerAction());

    it('6.1 2 pointers → sets state to ADDING, returns early', () => {
      const { handlers } = { handlers: mockWeave._stageHandlers };
      handlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      handlers['pointerdown'](makePointerEvent({ pointerId: 2 }));
      expect((action as unknown as R)['state']).toBe(STAR_TOOL_STATE.ADDING);
    });

    it('6.2 1 pointer + state=ADDING → calls handleAdding, creating=true', () => {
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect((action as unknown as R)['creating']).toBe(true);
      expect((action as unknown as R)['state']).toBe(
        STAR_TOOL_STATE.DEFINING_SIZE
      );
    });

    it('6.3 1 pointer + state≠ADDING → neither handleAdding nor state change', () => {
      (action as unknown as R)['state'] = STAR_TOOL_STATE.IDLE;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect((action as unknown as R)['creating']).toBe(false);
      expect((action as unknown as R)['state']).toBe(STAR_TOOL_STATE.IDLE);
    });

    it('6.4 pointer id stored in pointers map', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 7 }));
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      expect(pointers.has(7)).toBe(true);
    });
  });

  // ── Suite 7: pointermove listener ────────────────────────────────────────────

  describe('setupEvents – pointermove', () => {
    beforeEach(() => triggerAction());

    it('7.1 state=IDLE → returns early, no cursor change', () => {
      (action as unknown as R)['state'] = STAR_TOOL_STATE.IDLE;
      mockWeave._stageContainer.style.cursor = '';
      mockWeave._stageHandlers['pointermove'](makePointerEvent());
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('7.2 not pressed (buttons=0) → sets cursor but returns early', () => {
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointermove'](
        makePointerEvent({ buttons: 0 })
      );
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
      expect((action as unknown as R)['moved']).toBe(false);
    });

    it('7.3 pointer not in map → sets cursor but returns early', () => {
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointermove'](
        makePointerEvent({ pointerId: 99 })
      );
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
      expect((action as unknown as R)['moved']).toBe(false);
    });

    it('7.4 2 pointers → sets state to ADDING, returns early', () => {
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 2 }));
      mockWeave._stageHandlers['pointermove'](makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['state']).toBe(STAR_TOOL_STATE.ADDING);
    });

    it('7.5 state=DEFINING_SIZE, pressed, pointer in map → moved=true, handleMovement called', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      (action as unknown as R)['state'] = STAR_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['starId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 10, y: 10 };
      (action as unknown as R)['container'] = makeContainer();
      mockWeave.getNodeHandler.mockReturnValue(makeNodeHandler());

      mockWeave._stageHandlers['pointermove'](makePointerEvent({ pointerId: 1 }));

      expect((action as unknown as R)['moved']).toBe(true);
    });

    it('7.6 state=ADDING, pressed, pointer in map → setCursor only, no handleMovement', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;

      mockWeave._stageHandlers['pointermove'](makePointerEvent({ pointerId: 1 }));

      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
      expect((action as unknown as R)['moved']).toBe(false);
    });
  });

  // ── Suite 8: pointerup listener ──────────────────────────────────────────────

  describe('setupEvents – pointerup', () => {
    beforeEach(() => triggerAction());

    it('8.1 deletes pointer id from pointers map', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 3 }));
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      expect(pointers.has(3)).toBe(true);
      mockWeave._stageHandlers['pointerup'](makePointerEvent({ pointerId: 3 }));
      expect(pointers.has(3)).toBe(false);
    });

    it('8.2 isTap=true → resets moved=false', () => {
      (action as unknown as R)['moved'] = true;
      (action as unknown as R)['tapStart'] = {
        x: 50,
        y: 75,
        time: performance.now() - 10,
      };
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerup'](
        makePointerEvent({ pointerType: 'touch', clientX: 50, clientY: 75 })
      );
      expect((action as unknown as R)['moved']).toBe(false);
    });

    it('8.3 isTap=false (mouse) → does NOT reset moved', () => {
      (action as unknown as R)['moved'] = true;
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerup'](makePointerEvent({ pointerType: 'mouse' }));
      expect((action as unknown as R)['moved']).toBe(true);
    });

    it('8.4 state=DEFINING_SIZE → calls handleSettingSize, creating=false', () => {
      (action as unknown as R)['state'] = STAR_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['starId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = makeContainer();

      const cancelAction = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelAction;

      mockWeave._stageHandlers['pointerup'](makePointerEvent());

      expect((action as unknown as R)['creating']).toBe(false);
      expect(cancelAction).toHaveBeenCalled();
    });

    it('8.5 state≠DEFINING_SIZE → does NOT call handleSettingSize', () => {
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;
      const cancelAction = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelAction;

      mockWeave._stageHandlers['pointerup'](makePointerEvent());

      expect(cancelAction).not.toHaveBeenCalled();
    });
  });

  // ── Suite 9: handleAdding ────────────────────────────────────────────────────

  describe('handleAdding', () => {
    beforeEach(() => triggerAction());

    it('9.1 sets clickPoint and container from getMousePointer()', () => {
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());

      expect((action as unknown as R)['clickPoint']).toEqual({ x: 50, y: 75 });
      expect((action as unknown as R)['container']).toBe(
        mockWeave._defaultContainer
      );
    });

    it('9.2 sets starId to UUID', () => {
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect((action as unknown as R)['starId']).toBe('test-uuid');
    });

    it('9.3 nodeHandler present → calls create() and addNode()', () => {
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;

      mockWeave._stageHandlers['pointerdown'](makePointerEvent());

      expect(nh.create).toHaveBeenCalledWith('test-uuid', expect.objectContaining({ numPoints: 5 }));
      expect(mockWeave.addNode).toHaveBeenCalledWith(
        nh._mockStar,
        'layer-id'
      );
    });

    it('9.4 nodeHandler absent → skips create/addNode', () => {
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;

      mockWeave._stageHandlers['pointerdown'](makePointerEvent());

      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('9.5 container null → addNode receives undefined as containerId', () => {
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 50, y: 75 },
        container: null,
      });
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;

      mockWeave._stageHandlers['pointerdown'](makePointerEvent());

      expect(mockWeave.addNode).toHaveBeenCalledWith(nh._mockStar, undefined);
    });

    it('9.6 sets state to DEFINING_SIZE', () => {
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent());
      expect((action as unknown as R)['state']).toBe(
        STAR_TOOL_STATE.DEFINING_SIZE
      );
    });

    it('9.7 clickPoint null (mousePoint=null) → uses 0+outerRadius fallback', () => {
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: null,
        container: makeContainer(),
      });
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;

      mockWeave._stageHandlers['pointerdown'](makePointerEvent());

      expect(nh.create).toHaveBeenCalledWith(
        'test-uuid',
        expect.objectContaining({ x: 92, y: 92 })
      );
    });
  });

  // ── Suite 10: handleSettingSize ──────────────────────────────────────────────

  describe('handleSettingSize', () => {
    beforeEach(() => {
      triggerAction();
      (action as unknown as R)['state'] = STAR_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['cancelAction'] = vi.fn();
    });

    it('10.1 guard fails (starId=null) → skips star update, calls cancelAction', () => {
      (action as unknown as R)['starId'] = null;
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = makeContainer();

      mockWeave._stageHandlers['pointerup'](makePointerEvent());

      expect(mockWeave._mockStar.setAttrs).not.toHaveBeenCalled();
      expect(
        ((action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>)
      ).toHaveBeenCalled();
    });

    it('10.2 guard fails (findOne returns undefined) → skips, calls cancelAction', () => {
      mockWeave._stage.findOne.mockReturnValue(undefined);
      (action as unknown as R)['starId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = makeContainer();

      mockWeave._stageHandlers['pointerup'](makePointerEvent());

      expect(mockWeave._mockStar.setAttrs).not.toHaveBeenCalled();
      expect(
        ((action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>)
      ).toHaveBeenCalled();
    });

    it('10.3 moved=false → uses default radii, starPos=clickPoint', () => {
      (action as unknown as R)['starId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = makeContainer();
      (action as unknown as R)['moved'] = false;

      mockWeave._stageHandlers['pointerup'](makePointerEvent());

      expect(mockWeave._mockStar.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 50,
          y: 75,
          outerRadius: 46, // 92 / 2
          innerRadius: 17.5, // 35 / 2
        })
      );
    });

    it('10.4 moved=true → computes both radii from delta, starPos from Math.min', () => {
      (action as unknown as R)['starId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = makeContainer();
      (action as unknown as R)['moved'] = true;
      // mousePoint = { x: 120, y: 140 } from mock
      // starOuterRadius = |50 - 120| = 70, outerRadius/2 = 35
      // starInnerRadius = |75 - 140| = 65, innerRadius/2 = 32.5
      // starPos.x = Math.min(50, 120) = 50, starPos.y = Math.min(75, 140) = 75

      mockWeave._stageHandlers['pointerup'](makePointerEvent());

      expect(mockWeave._mockStar.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 50,
          y: 75,
          outerRadius: 35,
          innerRadius: 32.5,
        })
      );
    });

    it('10.5 nodeHandler present → calls serialize + updateNode + emits onAddedStar', () => {
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      (action as unknown as R)['starId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = makeContainer();

      mockWeave._stageHandlers['pointerup'](makePointerEvent());

      expect(nh.serialize).toHaveBeenCalled();
      expect(mockWeave.updateNode).toHaveBeenCalled();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedStar');
    });

    it('10.6 nodeHandler absent → skips serialize/updateNode, still emits onAddedStar', () => {
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      (action as unknown as R)['starId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = makeContainer();

      mockWeave._stageHandlers['pointerup'](makePointerEvent());

      expect(mockWeave.updateNode).not.toHaveBeenCalled();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedStar');
    });

    it('10.7 always calls cancelAction at end', () => {
      (action as unknown as R)['starId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 50, y: 75 };
      (action as unknown as R)['container'] = makeContainer();

      mockWeave._stageHandlers['pointerup'](makePointerEvent());

      expect(
        ((action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>)
      ).toHaveBeenCalled();
    });
  });

  // ── Suite 11: handleMovement ─────────────────────────────────────────────────

  describe('handleMovement', () => {
    beforeEach(() => triggerAction());

    it('11.1 state≠DEFINING_SIZE → returns early', () => {
      (action as unknown as R)['state'] = STAR_TOOL_STATE.ADDING;
      (action as unknown as R)['starId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 10, y: 10 };

      (action as unknown as R)['handleMovement']();

      expect(mockWeave._mockStar.setAttrs).not.toHaveBeenCalled();
    });

    it('11.2 guard fails (starId=null) → skips inner block', () => {
      (action as unknown as R)['state'] = STAR_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['starId'] = null;

      (action as unknown as R)['handleMovement']();

      expect(mockWeave.getNodeHandler).not.toHaveBeenCalled();
    });

    it('11.3 moved=false → starPos=clickPoint, radii from delta', () => {
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      (action as unknown as R)['state'] = STAR_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['starId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 10, y: 20 };
      (action as unknown as R)['container'] = makeContainer();
      (action as unknown as R)['moved'] = false;
      // mousePoint from mock = { x: 120, y: 140 }
      // deltaX = |120 - 10| = 110, deltaY = |140 - 20| = 120

      (action as unknown as R)['handleMovement']();

      expect(nh.onUpdate).toHaveBeenCalledWith(
        mockWeave._mockStar,
        expect.objectContaining({
          id: 'test-uuid',
          outerRadius: 55,  // 110 / 2
          innerRadius: 60,  // 120 / 2
        })
      );
    });

    it('11.4 moved=true → starPos from Math.min, radii still from delta', () => {
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      (action as unknown as R)['state'] = STAR_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['starId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 10, y: 20 };
      (action as unknown as R)['container'] = makeContainer();
      (action as unknown as R)['moved'] = true;
      // mousePoint = { x: 120, y: 140 }
      // starPos.x = Math.min(10, 120) = 10, starPos.y = Math.min(20, 140) = 20

      (action as unknown as R)['handleMovement']();

      expect(nh.onUpdate).toHaveBeenCalledWith(
        mockWeave._mockStar,
        expect.objectContaining({
          outerRadius: 55,
          innerRadius: 60,
        })
      );
    });

    it('11.5 nodeHandler present → calls onUpdate', () => {
      const nh = makeNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nh);
      (action as unknown as R)['state'] = STAR_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['starId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 10, y: 20 };
      (action as unknown as R)['container'] = makeContainer();

      (action as unknown as R)['handleMovement']();

      expect(nh.onUpdate).toHaveBeenCalled();
    });

    it('11.6 nodeHandler absent → skips onUpdate', () => {
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      (action as unknown as R)['state'] = STAR_TOOL_STATE.DEFINING_SIZE;
      (action as unknown as R)['starId'] = 'test-uuid';
      (action as unknown as R)['clickPoint'] = { x: 10, y: 20 };
      (action as unknown as R)['container'] = makeContainer();

      expect(() => (action as unknown as R)['handleMovement']()).not.toThrow();
    });
  });

  // ── Suite 12: cleanup ────────────────────────────────────────────────────────

  describe('cleanup', () => {
    beforeEach(() => triggerAction());

    it('12.1 sets cursor to default', () => {
      action.cleanup();
      expect(mockWeave._stageContainer.style.cursor).toBe('default');
    });

    it('12.2 selectionPlugin present + findOne returns node → setSelectedNodes + triggerAction', () => {
      (action as unknown as R)['starId'] = 'test-uuid';
      action.cleanup();

      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([
        mockWeave._mockStar,
      ]);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(
        SELECTION_TOOL_ACTION_NAME
      );
    });

    it('12.3 selectionPlugin present + findOne returns undefined → skips setSelectedNodes, still triggerAction', () => {
      mockWeave._stage.findOne.mockReturnValue(undefined);
      (action as unknown as R)['starId'] = 'test-uuid';
      mockWeave._selectionPlugin.setSelectedNodes.mockClear();
      action.cleanup();

      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(
        SELECTION_TOOL_ACTION_NAME
      );
    });

    it('12.4 selectionPlugin absent → skips both setSelectedNodes and triggerAction', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      mockWeave._selectionPlugin.setSelectedNodes.mockClear();
      action.cleanup();

      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('12.5 resets all fields to initial values', () => {
      (action as unknown as R)['starId'] = 'test-uuid';
      (action as unknown as R)['creating'] = true;
      (action as unknown as R)['moved'] = true;
      (action as unknown as R)['container'] = makeContainer();
      (action as unknown as R)['clickPoint'] = { x: 1, y: 2 };

      action.cleanup();

      expect((action as unknown as R)['starId']).toBeNull();
      expect((action as unknown as R)['creating']).toBe(false);
      expect((action as unknown as R)['moved']).toBe(false);
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['state']).toBe(STAR_TOOL_STATE.IDLE);
    });
  });

  // ── Suite 13: setCursor ──────────────────────────────────────────────────────

  describe('setCursor', () => {
    it('13.1 sets stage cursor to crosshair', () => {
      triggerAction();
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 14: setFocusStage ──────────────────────────────────────────────────

  describe('setFocusStage', () => {
    it('14.1 sets tabIndex=1, calls blur() then focus()', () => {
      triggerAction();
      expect(mockWeave._stageContainer.tabIndex).toBe(1);
      expect(mockWeave._stageContainer.blur).toHaveBeenCalled();
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
    });
  });
});
