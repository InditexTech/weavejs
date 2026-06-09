// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted Konva shape mocks ──────────────────────────────────────────────────
const { MockGroup, MockLine, MockCircle } = vi.hoisted(() => {
  const makeGroupInstance = () => ({
    add: vi.fn(),
    scale: vi.fn(),
    position: vi.fn(),
    moveToTop: vi.fn(),
    destroy: vi.fn(),
  });

  const makeLineInstance = () => ({
    points: vi.fn(),
    x: vi.fn().mockReturnValue(10),
    y: vi.fn().mockReturnValue(20),
    moveToBottom: vi.fn(),
    destroy: vi.fn(),
  });

  const makeCircleInstance = () => ({
    x: vi.fn().mockReturnValue(50),
    y: vi.fn().mockReturnValue(75),
    moveToTop: vi.fn(),
    destroy: vi.fn(),
  });

  const MockGroup = vi.fn().mockImplementation(() => makeGroupInstance());
  const MockLine = vi.fn().mockImplementation(() => makeLineInstance());
  const MockCircle = vi.fn().mockImplementation(() => makeCircleInstance());

  return { MockGroup, MockLine, MockCircle };
});

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('konva', () => ({
  default: { Group: MockGroup, Line: MockLine, Circle: MockCircle },
}));
vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-uuid') }));
vi.mock('@/index', () => ({
  mergeExceptArrays: vi.fn((a: Record<string, unknown>, b: Record<string, unknown>) => ({ ...a, ...b })),
  moveNodeToContainer: vi.fn(),
}));

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { type R } from '../../__tests__/shared/action.test-helpers';
import { WeaveMeasureToolAction } from '../measure-tool';
import { MEASURE_TOOL_ACTION_NAME, MEASURE_TOOL_STATE } from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';
import { moveNodeToContainer } from '@/index';

function makeMockWeave() {
  const windowHandlers: Record<string, (e?: unknown) => void> = {};
  const stageHandlers: Record<string, (e?: unknown) => void> = {};
  const instanceHandlers: Record<string, (e?: unknown) => void> = {};
  const onceHandlers: Record<string, (e?: unknown) => void> = {};

  const stageContainer = {
    tabIndex: 0,
    focus: vi.fn(),
    blur: vi.fn(),
    style: { cursor: '' },
  };

  const mockFoundNode = {
    getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }),
    id: vi.fn().mockReturnValue('test-uuid'),
  };

  const mainLayer = {
    findOne: vi.fn().mockReturnValue(mockFoundNode),
  };

  const utilityLayer = { add: vi.fn(), batchDraw: vi.fn() };

  const mockMeasureContainer = {
    id: vi.fn().mockReturnValue('someContainer'),
    getAttrs: vi.fn().mockReturnValue({ id: 'someContainer' }),
  };

  const stage = {
    container: vi.fn().mockReturnValue(stageContainer),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      stageHandlers[event] = handler;
    }),
    off: vi.fn(),
    findOne: vi.fn().mockReturnValue(mockFoundNode),
    getRelativePointerPosition: vi.fn().mockReturnValue({ x: 100, y: 200 }),
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
  };

  const transformer = { hide: vi.fn() };
  const selectionPlugin = {
    getTransformer: vi.fn().mockReturnValue(transformer),
    setSelectedNodes: vi.fn(),
  };

  const nodeHandler = {
    create: vi.fn().mockReturnValue({ id: 'test-uuid' }),
  };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(selectionPlugin),
    getMousePointer: vi.fn().mockReturnValue({
      mousePoint: { x: 50, y: 75 },
      container: mockMeasureContainer,
      measureContainer: mockMeasureContainer,
    }),
    getNodeHandler: vi.fn().mockReturnValue(nodeHandler),
    getMainLayer: vi.fn().mockReturnValue(mainLayer),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    getActiveAction: vi.fn().mockReturnValue(MEASURE_TOOL_ACTION_NAME),
    getUtilityLayer: vi.fn().mockReturnValue(utilityLayer),
    emitEvent: vi.fn(),
    addNode: vi.fn(),
    triggerAction: vi.fn(),
    addEventListener: vi.fn((event: string, handler: (e?: unknown) => void) => {
      instanceHandlers[event] = handler;
    }),
    addOnceEventListener: vi.fn((event: string, handler: (e?: unknown) => void) => {
      onceHandlers[event] = handler;
    }),
    removeEventListener: vi.fn(),
    // Internal references
    _stageContainer: stageContainer,
    _stageHandlers: stageHandlers,
    _windowHandlers: windowHandlers,
    _instanceHandlers: instanceHandlers,
    _onceHandlers: onceHandlers,
    _selectionPlugin: selectionPlugin,
    _transformer: transformer,
    _foundNode: mockFoundNode,
    _utilityLayer: utilityLayer,
    _mainLayer: mainLayer,
    _stage: stage,
    _nodeHandler: nodeHandler,
    _measureContainer: mockMeasureContainer,
  };
}

describe('WeaveMeasureToolAction', () => {
  let action: WeaveMeasureToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let capturedKeydownHandler: ((e: KeyboardEvent) => void) | undefined;

  beforeEach(() => {
    MockGroup.mockClear();
    MockLine.mockClear();
    MockCircle.mockClear();

    action = new WeaveMeasureToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
    (action as unknown as R)['cancelAction'] = vi.fn();

    // Stub global addEventListener to capture keydown handler
    capturedKeydownHandler = undefined;
    vi.stubGlobal('addEventListener', vi.fn((type: string, handler: unknown) => {
      if (type === 'keydown') {
        capturedKeydownHandler = handler as (e: KeyboardEvent) => void;
      }
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function triggerAction() {
    const cancelFn = vi.fn();
    (action as unknown as R)['cancelAction'] = cancelFn;
    action.trigger(cancelFn);
    return cancelFn;
  }

  // ── Suite 1: constructor / initialize ─────────────────────────────────────────
  describe('Suite 1: constructor / initialize', () => {
    it('1.1 no params → config defined with defaults', () => {
      expect((action as unknown as R)['config']).toBeDefined();
    });

    it('1.2 with params → merged config (custom stroke)', () => {
      const custom = new WeaveMeasureToolAction({ config: { style: { stroke: '#FF0000' } } });
      expect((custom as unknown as R)['config']).toBeDefined();
    });

    it('1.3 initialize() sets all fields to defaults', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      expect((action as unknown as R)['state']).toBe(MEASURE_TOOL_STATE.IDLE);
      expect((action as unknown as R)['measureId']).toBeNull();
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['crosshairCursor']).toBeNull();
      expect((action as unknown as R)['firstPoint']).toBeNull();
      expect((action as unknown as R)['measureLine']).toBeNull();
      expect((action as unknown as R)['measureContainer']).toBeUndefined();
    });

    it('1.4 onPropsChange is undefined', () => {
      expect((action as unknown as R)['onPropsChange']).toBeUndefined();
    });

    it('1.5 onInit is undefined', () => {
      expect((action as unknown as R)['onInit']).toBeUndefined();
    });
  });

  // ── Suite 2: getName / initProps ──────────────────────────────────────────────
  describe('Suite 2: getName / initProps', () => {
    it('2.1 getName returns MEASURE_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(MEASURE_TOOL_ACTION_NAME);
    });

    it('2.2 initProps returns defaults', () => {
      expect(action.initProps()).toEqual({
        orientation: -1,
        separation: 0,
        unit: 'cm',
        unitPerPixel: 10,
      });
    });
  });

  // ── Suite 3: trigger ──────────────────────────────────────────────────────────
  describe('Suite 3: trigger', () => {
    it('3.1 !instance → throws Error', () => {
      (action as unknown as R)['instance'] = undefined;
      expect(() => action.trigger(vi.fn())).toThrow('Instance not defined');
    });

    it('3.2 !initialized → setupEvents called (stage.on pointerclick registered)', () => {
      triggerAction();
      expect(mockWeave._stage.on).toHaveBeenCalledWith('pointerclick', expect.any(Function));
      expect((action as unknown as R)['initialized']).toBe(true);
    });

    it('3.3 already initialized → setupEvents NOT called again', () => {
      triggerAction();
      expect((action as unknown as R)['initialized']).toBe(true);
      // Verify window.addEventListener was called only once (for keydown in setupEvents)
      // The second trigger should not add another keydown listener
      const addEventListenerMock = (globalThis.addEventListener as ReturnType<typeof vi.fn>);
      const keydownCallsAfterFirst = addEventListenerMock.mock.calls.filter(([t]) => t === 'keydown').length;
      triggerAction();
      const keydownCallsAfterSecond = addEventListenerMock.mock.calls.filter(([t]) => t === 'keydown').length;
      expect(keydownCallsAfterSecond).toBe(keydownCallsAfterFirst);
    });

    it('3.4 selectionPlugin present → setSelectedNodes([])', () => {
      triggerAction();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
    });

    it('3.5 selectionPlugin absent → no error', () => {
      mockWeave.getPlugin.mockReturnValue(null);
      expect(() => triggerAction()).not.toThrow();
    });

    it('3.6 addMeasure called → state = SET_FROM', () => {
      triggerAction();
      expect((action as unknown as R)['state']).toBe(MEASURE_TOOL_STATE.SET_FROM);
    });
  });

  // ── Suite 4: addMeasure / onZoomChange ────────────────────────────────────────
  describe('Suite 4: addMeasure / onZoomChange', () => {
    beforeEach(() => {
      triggerAction();
    });

    it('4.1 selectionPlugin present → tr.hide() called', () => {
      expect(mockWeave._transformer.hide).toHaveBeenCalled();
    });

    it('4.2 selectionPlugin absent → no error', () => {
      mockWeave.getPlugin.mockReturnValue(null);
      (action as unknown as R)['initialized'] = false;
      expect(() => triggerAction()).not.toThrow();
    });

    it('4.3 addEventListener("onZoomChange", ...) registered', () => {
      expect(mockWeave.addEventListener).toHaveBeenCalledWith('onZoomChange', expect.any(Function));
    });

    it('4.4 onZoomChange callback + crosshairCursor present → scale set', () => {
      const mockCursor = MockGroup.mock.results[0].value as ReturnType<typeof MockGroup>;
      (action as unknown as R)['crosshairCursor'] = mockCursor;
      mockWeave._instanceHandlers['onZoomChange']?.();
      expect(mockCursor.scale).toHaveBeenCalledWith({
        x: expect.any(Number),
        y: expect.any(Number),
      });
    });

    it('4.5 onZoomChange callback + crosshairCursor null → no error', () => {
      (action as unknown as R)['crosshairCursor'] = null;
      expect(() => mockWeave._instanceHandlers['onZoomChange']?.()).not.toThrow();
    });
  });

  // ── Suite 5: buildCrosshairCursor ─────────────────────────────────────────────
  describe('Suite 5: buildCrosshairCursor', () => {
    beforeEach(() => {
      triggerAction();
    });

    it('5.1 MockGroup created + 2 MockLines + group added to utilityLayer', () => {
      expect(MockGroup).toHaveBeenCalledTimes(1);
      expect(MockLine).toHaveBeenCalledTimes(2);
      expect(mockWeave._utilityLayer.add).toHaveBeenCalled();
    });

    it('5.2 pointermove.measureTool: pos + crosshairCursor → position() + moveToTop()', () => {
      const mockCursor = MockGroup.mock.results[0].value as ReturnType<typeof MockGroup>;
      (action as unknown as R)['crosshairCursor'] = mockCursor;
      mockWeave._stageHandlers['pointermove.measureTool']?.();
      expect(mockCursor.position).toHaveBeenCalledWith({ x: 100, y: 200 });
      expect(mockCursor.moveToTop).toHaveBeenCalled();
    });

    it('5.3 pointermove.measureTool: crosshairCursor null → no position call', () => {
      (action as unknown as R)['crosshairCursor'] = null;
      expect(() => mockWeave._stageHandlers['pointermove.measureTool']?.()).not.toThrow();
      const mockCursor = MockGroup.mock.results[0].value as ReturnType<typeof MockGroup>;
      expect(mockCursor.position).not.toHaveBeenCalled();
    });

    it('5.4 pointermove.measureTool: pos null → no position call', () => {
      const mockCursor = MockGroup.mock.results[0].value as ReturnType<typeof MockGroup>;
      (action as unknown as R)['crosshairCursor'] = mockCursor;
      mockWeave._stage.getRelativePointerPosition.mockReturnValue(null);
      mockWeave._stageHandlers['pointermove.measureTool']?.();
      expect(mockCursor.position).not.toHaveBeenCalled();
    });
  });

  // ── Suite 6: keydown handler ──────────────────────────────────────────────────
  describe('Suite 6: keydown handler', () => {
    beforeEach(() => {
      triggerAction();
    });

    it('6.1 Escape + active=measureTool → cancelAction called', () => {
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      capturedKeydownHandler?.({ code: 'Escape' } as KeyboardEvent);
      expect(cancelFn).toHaveBeenCalled();
    });

    it('6.2 Escape + active≠measureTool → cancelAction NOT called', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      capturedKeydownHandler?.({ code: 'Escape' } as KeyboardEvent);
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('6.3 non-Escape → cancelAction NOT called', () => {
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      capturedKeydownHandler?.({ code: 'Enter' } as KeyboardEvent);
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 7: pointermove handler ──────────────────────────────────────────────
  describe('Suite 7: pointermove handler', () => {
    beforeEach(() => {
      triggerAction();
    });

    it('7.1 state=IDLE → early return (cursor NOT set)', () => {
      (action as unknown as R)['state'] = MEASURE_TOOL_STATE.IDLE;
      mockWeave._stageContainer.style.cursor = '';
      mockWeave._stageHandlers['pointermove']?.();
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('7.2 state=SET_FROM → setCursor called but no measureLine.points update', () => {
      (action as unknown as R)['state'] = MEASURE_TOOL_STATE.SET_FROM;
      mockWeave._stageHandlers['pointermove']?.();
      expect(mockWeave._stageContainer.style.cursor).toBe('none');
    });

    it('7.3 state=SET_TO + measureLine + firstPoint → measureLine.points updated + setCursor', () => {
      const mockLine = MockLine.mock.results[0]?.value as ReturnType<typeof MockLine>;
      const mockCircle = { x: vi.fn().mockReturnValue(50), y: vi.fn().mockReturnValue(75), moveToTop: vi.fn(), destroy: vi.fn() };
      (action as unknown as R)['state'] = MEASURE_TOOL_STATE.SET_TO;
      (action as unknown as R)['measureLine'] = mockLine;
      (action as unknown as R)['firstPoint'] = mockCircle;
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      mockWeave._stageHandlers['pointermove']?.();
      expect(mockLine.points).toHaveBeenCalledWith([0, 0, expect.any(Number), expect.any(Number)]);
      expect(mockWeave._stageContainer.style.cursor).toBe('none');
    });

    it('7.4 state=SET_TO + no measureLine → defineFinalPoint returns {0,0} (no lines update)', () => {
      (action as unknown as R)['state'] = MEASURE_TOOL_STATE.SET_TO;
      (action as unknown as R)['measureLine'] = null;
      (action as unknown as R)['firstPoint'] = null;
      expect(() => mockWeave._stageHandlers['pointermove']?.()).not.toThrow();
      expect(mockWeave._stageContainer.style.cursor).toBe('none');
    });
  });

  // ── Suite 8: pointerclick handler ─────────────────────────────────────────────
  describe('Suite 8: pointerclick handler', () => {
    beforeEach(() => {
      triggerAction();
    });

    it('8.1 state=IDLE → early return (no state change)', () => {
      (action as unknown as R)['state'] = MEASURE_TOOL_STATE.IDLE;
      mockWeave._stageHandlers['pointerclick']?.();
      expect((action as unknown as R)['state']).toBe(MEASURE_TOOL_STATE.IDLE);
    });

    it('8.2 state=SET_FROM → handleSetFrom called (state→SET_TO)', () => {
      (action as unknown as R)['state'] = MEASURE_TOOL_STATE.SET_FROM;
      mockWeave._stageHandlers['pointerclick']?.();
      expect((action as unknown as R)['state']).toBe(MEASURE_TOOL_STATE.SET_TO);
    });

    it('8.3 state=SET_TO → handleSetTo called (state→FINISHED)', () => {
      (action as unknown as R)['state'] = MEASURE_TOOL_STATE.SET_TO;
      // Need firstPoint set for handleSetTo to proceed
      (action as unknown as R)['firstPoint'] = MockCircle.mock.results[0]?.value ?? {
        x: vi.fn().mockReturnValue(50),
        y: vi.fn().mockReturnValue(75),
        destroy: vi.fn(),
      };
      mockWeave._stageHandlers['pointerclick']?.();
      expect((action as unknown as R)['state']).toBe(MEASURE_TOOL_STATE.FINISHED);
    });
  });

  // ── Suite 9: handleSetFrom ────────────────────────────────────────────────────
  describe('Suite 9: handleSetFrom', () => {
    beforeEach(() => {
      triggerAction();
      (action as unknown as R)['state'] = MEASURE_TOOL_STATE.SET_FROM;
    });

    it('9.1 MockCircle created with correct shape attrs', () => {
      MockCircle.mockClear();
      mockWeave._stageHandlers['pointerclick']?.();
      expect(MockCircle).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 6, fill: '#FFFFFF', stroke: '#000000' })
      );
    });

    it('9.2 MockLine (measureLine) created with correct attrs', () => {
      const initialLineCalls = MockLine.mock.calls.length;
      mockWeave._stageHandlers['pointerclick']?.();
      expect(MockLine.mock.calls.length).toBeGreaterThan(initialLineCalls);
    });

    it('9.3 both firstPoint and measureLine added to utilityLayer', () => {
      const addCount = (mockWeave._utilityLayer.add as ReturnType<typeof vi.fn>).mock.calls.length;
      mockWeave._stageHandlers['pointerclick']?.();
      expect((mockWeave._utilityLayer.add as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(addCount);
    });

    it('9.4 state → SET_TO after handleSetFrom', () => {
      mockWeave._stageHandlers['pointerclick']?.();
      expect((action as unknown as R)['state']).toBe(MEASURE_TOOL_STATE.SET_TO);
    });

    it('9.5 clickPoint null (getRelativePointerPosition returns null) → ?? 0 fallback for Circle x/y', () => {
      MockCircle.mockClear();
      mockWeave._stage.getRelativePointerPosition.mockReturnValue(null);
      mockWeave._stageHandlers['pointerclick']?.();
      expect(MockCircle).toHaveBeenCalledWith(
        expect.objectContaining({ x: 0, y: 0 })
      );
    });
  });

  // ── Suite 10: handleSetTo ─────────────────────────────────────────────────────
  describe('Suite 10: handleSetTo', () => {
    function setupHandleSetTo() {
      triggerAction();
      (action as unknown as R)['state'] = MEASURE_TOOL_STATE.SET_TO;
      const firstPoint = {
        x: vi.fn().mockReturnValue(50),
        y: vi.fn().mockReturnValue(75),
        moveToTop: vi.fn(),
        destroy: vi.fn(),
      };
      (action as unknown as R)['firstPoint'] = firstPoint;
      return firstPoint;
    }

    it('10.1 nodeHandler null → no measureId, no addNode', () => {
      setupHandleSetTo();
      mockWeave.getNodeHandler.mockReturnValue(null);
      mockWeave._stageHandlers['pointerclick']?.();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
      expect((action as unknown as R)['measureId']).toBeNull();
    });

    it('10.2 firstPoint null → no addNode (nodeHandler present)', () => {
      triggerAction();
      (action as unknown as R)['state'] = MEASURE_TOOL_STATE.SET_TO;
      (action as unknown as R)['firstPoint'] = null;
      mockWeave._stageHandlers['pointerclick']?.();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('10.3 nodeHandler + firstPoint → create(), addNode(), state=FINISHED', () => {
      setupHandleSetTo();
      mockWeave._stageHandlers['pointerclick']?.();
      expect(mockWeave._nodeHandler.create).toHaveBeenCalled();
      expect(mockWeave.addNode).toHaveBeenCalledWith(expect.any(Object), 'mainLayer');
      expect((action as unknown as R)['state']).toBe(MEASURE_TOOL_STATE.FINISHED);
    });

    it('10.4 addOnceEventListener callback: child.id ≠ measureId → cancelAction NOT called', () => {
      setupHandleSetTo();
      mockWeave._stageHandlers['pointerclick']?.();
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      cancelFn.mockClear();
      const child = { getAttrs: vi.fn().mockReturnValue({ id: 'other-id' }) };
      mockWeave._onceHandlers['onNodeRenderedAdded']?.(child);
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('10.5 callback: child.id === measureId + measureContainer undefined → cancelAction', () => {
      setupHandleSetTo();
      (action as unknown as R)['measureContainer'] = undefined;
      mockWeave._stageHandlers['pointerclick']?.();
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      cancelFn.mockClear();
      const child = { getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }) };
      mockWeave._onceHandlers['onNodeRenderedAdded']?.(child);
      expect(cancelFn).toHaveBeenCalled();
      expect(moveNodeToContainer).not.toHaveBeenCalled();
    });

    it("10.6 callback: measureContainer.id() === 'mainLayer' → cancelAction (no move)", () => {
      setupHandleSetTo();
      mockWeave._measureContainer.id.mockReturnValue('mainLayer');
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 50, y: 75 },
        container: mockWeave._measureContainer,
        measureContainer: mockWeave._measureContainer,
      });
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      mockWeave._stageHandlers['pointerclick']?.();
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      cancelFn.mockClear();
      const child = { getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }) };
      mockWeave._onceHandlers['onNodeRenderedAdded']?.(child);
      expect(cancelFn).toHaveBeenCalled();
      expect(moveNodeToContainer).not.toHaveBeenCalled();
    });

    it("10.7 callback: measureContainer defined + id≠'mainLayer' + nodeId undefined + nodeInstance found → moveNodeToContainer", () => {
      setupHandleSetTo();
      mockWeave._measureContainer.id.mockReturnValue('containerX');
      mockWeave._measureContainer.getAttrs.mockReturnValue({ id: 'containerX', nodeId: undefined });
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      mockWeave._stageHandlers['pointerclick']?.();
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      cancelFn.mockClear();
      const child = { getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }) };
      mockWeave._onceHandlers['onNodeRenderedAdded']?.(child);
      expect(moveNodeToContainer).toHaveBeenCalled();
    });

    it('10.8 callback: nodeId defined → realContainer = stage.findOne(nodeId) → moveNodeToContainer', () => {
      setupHandleSetTo();
      mockWeave._measureContainer.id.mockReturnValue('containerX');
      mockWeave._measureContainer.getAttrs.mockReturnValue({ id: 'containerX', nodeId: 'parent-container' });
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      mockWeave._stageHandlers['pointerclick']?.();
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      cancelFn.mockClear();
      const child = { getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }) };
      mockWeave._onceHandlers['onNodeRenderedAdded']?.(child);
      expect(mockWeave._stage.findOne).toHaveBeenCalledWith('#parent-container');
      expect(moveNodeToContainer).toHaveBeenCalled();
    });

    it('10.9 callback: nodeInstance null → moveNodeToContainer NOT called', () => {
      setupHandleSetTo();
      mockWeave._measureContainer.id.mockReturnValue('containerX');
      mockWeave._measureContainer.getAttrs.mockReturnValue({ id: 'containerX', nodeId: undefined });
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      mockWeave._mainLayer.findOne.mockReturnValue(null);
      mockWeave._stageHandlers['pointerclick']?.();
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      cancelFn.mockClear();
      (moveNodeToContainer as ReturnType<typeof vi.fn>).mockClear();
      const child = { getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }) };
      mockWeave._onceHandlers['onNodeRenderedAdded']?.(child);
      expect(moveNodeToContainer).not.toHaveBeenCalled();
      expect(cancelFn).toHaveBeenCalled();
    });

    it('10.10 clickPoint null → toPoint uses ?? 0 fallback', () => {
      setupHandleSetTo();
      mockWeave._stage.getRelativePointerPosition.mockReturnValue(null);
      mockWeave._stageHandlers['pointerclick']?.();
      const createArgs = (mockWeave._nodeHandler.create as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(createArgs.toPoint).toEqual({ x: 0, y: 0 });
    });
  });

  // ── Suite 11: defineFinalPoint ────────────────────────────────────────────────
  describe('Suite 11: defineFinalPoint', () => {
    beforeEach(() => {
      triggerAction();
    });

    it('11.1 measureLine null → returns {x:0, y:0}', () => {
      (action as unknown as R)['measureLine'] = null;
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      const result = (action as unknown as R)['defineFinalPoint']() as { x: number; y: number };
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('11.2 measureContainer undefined → returns {x:0, y:0}', () => {
      (action as unknown as R)['measureLine'] = MockLine.mock.results[0]?.value;
      (action as unknown as R)['measureContainer'] = undefined;
      const result = (action as unknown as R)['defineFinalPoint']() as { x: number; y: number };
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('11.3 both set → calculated value (mouseX - lineX) * scaleX', () => {
      const mockLine = MockLine.mock.results[0]?.value as ReturnType<typeof MockLine>;
      // mockLine.x() = 10, mockLine.y() = 20 (from factory)
      // stage.getRelativePointerPosition() = {x:100, y:200}
      // scaleX() = 1, scaleY() = 1
      // pos.x = (100 - 10) * 1 = 90
      // pos.y = (200 - 20) * 1 = 180
      (action as unknown as R)['measureLine'] = mockLine;
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      const result = (action as unknown as R)['defineFinalPoint']() as { x: number; y: number };
      expect(result.x).toBe(90);
      expect(result.y).toBe(180);
    });

    it('11.4 realMousePoint null → ?? 0 fallback', () => {
      const mockLine = MockLine.mock.results[0]?.value as ReturnType<typeof MockLine>;
      mockWeave._stage.getRelativePointerPosition.mockReturnValue(null);
      (action as unknown as R)['measureLine'] = mockLine;
      (action as unknown as R)['measureContainer'] = mockWeave._measureContainer;
      const result = (action as unknown as R)['defineFinalPoint']() as { x: number; y: number };
      // pos.x = (0 - 10) * 1 = -10, pos.y = (0 - 20) * 1 = -20
      expect(result.x).toBe(-10);
      expect(result.y).toBe(-20);
    });
  });

  // ── Suite 12: setCursor / setFocusStage ───────────────────────────────────────
  describe('Suite 12: setCursor / setFocusStage', () => {
    beforeEach(() => {
      triggerAction();
    });

    it('12.1 setCursor() → stageContainer.style.cursor = "none"', () => {
      (action as unknown as R)['setCursor']();
      expect(mockWeave._stageContainer.style.cursor).toBe('none');
    });

    it('12.2 setFocusStage() → tabIndex=1, blur(), focus()', () => {
      (action as unknown as R)['setFocusStage']();
      expect(mockWeave._stageContainer.tabIndex).toBe(1);
      expect(mockWeave._stageContainer.blur).toHaveBeenCalled();
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
    });
  });

  // ── Suite 13: cleanup ─────────────────────────────────────────────────────────
  describe('Suite 13: cleanup', () => {
    beforeEach(() => {
      triggerAction();
    });

    it('13.1 cursor → "default"', () => {
      action.cleanup();
      expect(mockWeave._stageContainer.style.cursor).toBe('default');
    });

    it('13.2 stage.off("pointermove.measureTool") called', () => {
      action.cleanup();
      expect(mockWeave._stage.off).toHaveBeenCalledWith('pointermove.measureTool');
    });

    it('13.3 selectionPlugin + node found → setSelectedNodes([node]) + triggerAction(SELECTION)', () => {
      (action as unknown as R)['measureId'] = 'test-uuid';
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([mockWeave._foundNode]);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('13.4 selectionPlugin + node NOT found → setSelectedNodes NOT called', () => {
      mockWeave._stage.findOne.mockReturnValue(null);
      (action as unknown as R)['measureId'] = 'test-uuid';
      (mockWeave._selectionPlugin.setSelectedNodes as ReturnType<typeof vi.fn>).mockClear();
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
    });

    it('13.5 selectionPlugin absent → no error', () => {
      mockWeave.getPlugin.mockReturnValue(null);
      expect(() => action.cleanup()).not.toThrow();
    });

    it('13.6 crosshairCursor present → destroy() called', () => {
      const mockCursor = MockGroup.mock.results[0].value as ReturnType<typeof MockGroup>;
      (action as unknown as R)['crosshairCursor'] = mockCursor;
      action.cleanup();
      expect(mockCursor.destroy).toHaveBeenCalled();
    });

    it('13.7 crosshairCursor null → no error', () => {
      (action as unknown as R)['crosshairCursor'] = null;
      expect(() => action.cleanup()).not.toThrow();
    });

    it('13.8 firstPoint present → destroy() called', () => {
      const mockCircle = { x: vi.fn(), y: vi.fn(), moveToTop: vi.fn(), destroy: vi.fn() };
      (action as unknown as R)['firstPoint'] = mockCircle;
      action.cleanup();
      expect(mockCircle.destroy).toHaveBeenCalled();
    });

    it('13.9 firstPoint null → no error', () => {
      (action as unknown as R)['firstPoint'] = null;
      expect(() => action.cleanup()).not.toThrow();
    });

    it('13.10 measureLine present → destroy() called', () => {
      const mockLine = { x: vi.fn(), y: vi.fn(), points: vi.fn(), moveToBottom: vi.fn(), destroy: vi.fn() };
      (action as unknown as R)['measureLine'] = mockLine;
      action.cleanup();
      expect(mockLine.destroy).toHaveBeenCalled();
    });

    it('13.11 measureLine null → no error', () => {
      (action as unknown as R)['measureLine'] = null;
      expect(() => action.cleanup()).not.toThrow();
    });

    it('13.12 all fields reset after cleanup', () => {
      (action as unknown as R)['measureId'] = 'test-uuid';
      (action as unknown as R)['container'] = {};
      (action as unknown as R)['clickPoint'] = { x: 1, y: 2 };
      (action as unknown as R)['state'] = MEASURE_TOOL_STATE.SET_TO;
      action.cleanup();
      expect((action as unknown as R)['initialCursor']).toBeNull();
      expect((action as unknown as R)['measureId']).toBeNull();
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['firstPoint']).toBeNull();
      expect((action as unknown as R)['measureLine']).toBeNull();
      expect((action as unknown as R)['state']).toBe(MEASURE_TOOL_STATE.IDLE);
    });
  });
});
