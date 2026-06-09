// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Break circular dependency: action.ts → @/weave → managers → @/index → …
vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('@/plugins/nodes-snapping/nodes-snapping', () => ({
  WeaveNodesSnappingPlugin: class WeaveNodesSnappingPlugin {},
}));

// Hoist Konva.Line mock so vi.mock factory can reference it
const { MockLine } = vi.hoisted(() => {
  const MockLine = vi.fn().mockImplementation((attrs: unknown) => ({
    _attrs: attrs,
    points: vi.fn(),
    destroy: vi.fn(),
    getClientRect: vi.fn().mockReturnValue({ x: 50, y: 0, width: 0, height: 600 }),
  }));
  return { MockLine };
});

vi.mock('konva', () => ({ default: { Line: MockLine } }));

vi.mock('nanoid', () => ({ nanoid: vi.fn().mockReturnValue('test-guide-id') }));

vi.mock('@/plugins/nodes-snapping/nodes-snapping.guide-distance-to-target-info', () => ({
  WeaveNodesSnappingGuideDistanceToTargetInfo: vi.fn().mockImplementation(() => ({
    handleTarget: vi.fn(),
    cleanup: vi.fn(),
    cleanupTarget: vi.fn(),
    handleDistanceLine: vi.fn(),
  })),
}));

// In node environment, window is not defined — alias to globalThis
if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { WeaveGuideToolAction } from '../guide-tool';
import {
  DEFAULT_GUIDE_TOOL_ACTION_CONFIG,
  GUIDE_TOOL_ACTION_NAME,
  GUIDE_TOOL_STATE,
} from '../constants';
import {
  GUIDE_KIND,
  GUIDE_ORIENTATION,
  WEAVE_NODES_SNAPPING_PLUGIN_KEY,
} from '@/plugins/nodes-snapping/constants';
import { WEAVE_NODES_SELECTION_KEY } from '@/plugins/nodes-selection/constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

type R = Record<string, unknown>;

function makeNonMainContainer(
  id = 'c1',
  x = 10,
  y = 20,
  width = 400,
  height = 300
) {
  return {
    id: vi.fn().mockReturnValue(id),
    getClientRect: vi.fn().mockReturnValue({ x, y, width, height }),
  };
}

function makeMockWeave() {
  const container = { tabIndex: 0, focus: vi.fn(), style: { cursor: '' } };

  const stageHandlers: Record<string, (e?: unknown) => void> = {};
  const stage = {
    container: vi.fn().mockReturnValue(container),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      stageHandlers[event] = handler;
    }),
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    position: vi.fn().mockReturnValue({ x: -100, y: -200 }),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    getRelativePointerPosition: vi.fn().mockReturnValue({ x: 100, y: 150 }),
    getClientRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 }),
  };

  const mainLayer = {
    id: vi.fn().mockReturnValue('mainLayer'),
    getClientRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 }),
  };

  const utilityLayer = { add: vi.fn(), batchDraw: vi.fn() };

  const guidesManager = {
    renderAllVisibleCustomGuides: vi.fn(),
    saveCustomGuide: vi.fn(),
    isCustomGuidesVisible: vi.fn().mockReturnValue(false),
    toggleCustomGuides: vi.fn(),
  };

  const snappingPlugin = { getGuidesManager: vi.fn().mockReturnValue(guidesManager) };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockImplementation((key: string) => {
      if (key === WEAVE_NODES_SNAPPING_PLUGIN_KEY) return snappingPlugin;
      if (key === WEAVE_NODES_SELECTION_KEY) return { dummy: true };
      return undefined;
    }),
    getMousePointer: vi
      .fn()
      .mockReturnValue({ mousePoint: { x: 100, y: 150 }, container: mainLayer }),
    getMainLayer: vi.fn().mockReturnValue(mainLayer),
    getUtilityLayer: vi.fn().mockReturnValue(utilityLayer),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    getActiveAction: vi.fn().mockReturnValue(GUIDE_TOOL_ACTION_NAME),
    emitEvent: vi.fn(),
    triggerAction: vi.fn(),
    getChildLogger: vi.fn().mockReturnValue({ debug: vi.fn() }),
    _stage: stage,
    _container: container,
    _stageHandlers: stageHandlers,
    _mainLayer: mainLayer,
    _utilityLayer: utilityLayer,
    _guidesManager: guidesManager,
    _snappingPlugin: snappingPlugin,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveGuideToolAction', () => {
  let action: WeaveGuideToolAction;
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

    action = new WeaveGuideToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
    (action as unknown as R)['cancelAction'] = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  /** Calls onInit + trigger; returns cancelFn */
  function triggerAction(
    orientation = GUIDE_ORIENTATION.VERTICAL,
    cancelFn = vi.fn()
  ) {
    action.onInit();
    action.trigger(cancelFn, { orientation });
    return { cancelFn, handlers: mockWeave._stageHandlers };
  }

  function getGuideDistInfo() {
    return (action as unknown as R)['guideDistanceToTargetInfo'] as {
      handleTarget: ReturnType<typeof vi.fn>;
      cleanup: ReturnType<typeof vi.fn>;
      cleanupTarget: ReturnType<typeof vi.fn>;
      handleDistanceLine: ReturnType<typeof vi.fn>;
    };
  }

  function getCreatedLine() {
    return MockLine.mock.results[0]?.value as {
      _attrs: unknown;
      points: ReturnType<typeof vi.fn>;
      destroy: ReturnType<typeof vi.fn>;
      getClientRect: ReturnType<typeof vi.fn>;
    };
  }

  // ── Suite 1: constructor ───────────────────────────────────────────────────

  describe('constructor', () => {
    it('1.1 no params → config equals DEFAULT_GUIDE_TOOL_ACTION_CONFIG', () => {
      const a = new WeaveGuideToolAction();
      expect((a as unknown as R)['config']).toMatchObject(DEFAULT_GUIDE_TOOL_ACTION_CONFIG);
    });

    it('1.2 with params.config → config is merged', () => {
      const a = new WeaveGuideToolAction({
        config: { style: { guide: { stroke: '#FF0000' } } },
      });
      expect((a as unknown as R)['config']).toMatchObject({
        style: { guide: { stroke: '#FF0000' } },
      });
    });

    it('1.3 state=IDLE, guideLine/guide/container=undefined after construction', () => {
      expect((action as unknown as R)['state']).toBe(GUIDE_TOOL_STATE.IDLE);
      expect((action as unknown as R)['guideLine']).toBeUndefined();
      expect((action as unknown as R)['guide']).toBeUndefined();
      expect((action as unknown as R)['container']).toBeUndefined();
    });
  });

  // ── Suite 2: getName ───────────────────────────────────────────────────────

  describe('getName', () => {
    it('2.1 returns GUIDE_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(GUIDE_TOOL_ACTION_NAME);
    });
  });

  // ── Suite 3: initialize ────────────────────────────────────────────────────

  describe('initialize', () => {
    it('3.1 resets all fields', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      (action as unknown as R)['guideLine'] = {};
      (action as unknown as R)['guide'] = {};
      (action as unknown as R)['container'] = {};
      (action as unknown as R)['initialized'] = true;
      (action as unknown as R)['initialize']();
      expect((action as unknown as R)['state']).toBe(GUIDE_TOOL_STATE.IDLE);
      expect((action as unknown as R)['guideLine']).toBeUndefined();
      expect((action as unknown as R)['guide']).toBeUndefined();
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['initialized']).toBe(false);
    });
  });

  // ── Suite 4: onInit ────────────────────────────────────────────────────────

  describe('onInit', () => {
    it('4.1 creates guideDistanceToTargetInfo with expected methods', () => {
      action.onInit();
      const dist = getGuideDistInfo();
      expect(dist.handleTarget).toBeInstanceOf(Function);
      expect(dist.cleanup).toBeInstanceOf(Function);
      expect(dist.cleanupTarget).toBeInstanceOf(Function);
      expect(dist.handleDistanceLine).toBeInstanceOf(Function);
    });
  });

  // ── Suite 5: trigger — guards ──────────────────────────────────────────────

  describe('trigger — guards', () => {
    it('5.1 !instance → throws "Instance not defined"', () => {
      const bare = new WeaveGuideToolAction();
      expect(() =>
        bare.trigger(vi.fn(), { orientation: GUIDE_ORIENTATION.VERTICAL })
      ).toThrow('Instance not defined');
    });

    it('5.2 snappingManagerPlugin absent → console.warn + cancelAction + return', () => {
      action.onInit();
      mockWeave.getPlugin.mockReturnValue(undefined);
      const cancelFn = vi.fn();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      action.trigger(cancelFn, { orientation: GUIDE_ORIENTATION.VERTICAL });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Snapping Manager Plugin'));
      expect(cancelFn).toHaveBeenCalled();
    });

    it('5.3 utilityLayer absent → console.warn + cancelAction + return', () => {
      action.onInit();
      mockWeave.getUtilityLayer.mockReturnValue(undefined);
      const cancelFn = vi.fn();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      action.trigger(cancelFn, { orientation: GUIDE_ORIENTATION.VERTICAL });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Utility layer'));
      expect(cancelFn).toHaveBeenCalled();
    });

    it('5.4 normal flow → renderAllVisibleCustomGuides called + state=ADDING', () => {
      triggerAction();
      expect(mockWeave._guidesManager.renderAllVisibleCustomGuides).toHaveBeenCalled();
      expect((action as unknown as R)['state']).toBe(GUIDE_TOOL_STATE.ADDING);
    });

    it('5.5 setupEvents called only on first trigger (stage.on called twice total)', () => {
      action.onInit();
      const cancelFn = vi.fn();
      action.trigger(cancelFn, { orientation: GUIDE_ORIENTATION.VERTICAL });
      action.trigger(cancelFn, { orientation: GUIDE_ORIENTATION.VERTICAL });
      expect(mockWeave._stage.on).toHaveBeenCalledTimes(2);
    });

  });

  // ── Suite 6: keyup window listener ────────────────────────────────────────

  describe('keyup window listener', () => {
    beforeEach(() => triggerAction());

    it('6.1 key=Alt → guideDistanceToTargetInfo.cleanup() called', () => {
      const dist = getGuideDistInfo();
      windowHandlers['keyup']?.({ key: 'Alt' } as KeyboardEvent);
      expect(dist.cleanup).toHaveBeenCalled();
    });

    it('6.2 key=Option → guideDistanceToTargetInfo.cleanup() called', () => {
      const dist = getGuideDistInfo();
      windowHandlers['keyup']?.({ key: 'Option' } as KeyboardEvent);
      expect(dist.cleanup).toHaveBeenCalled();
    });

    it('6.3 other key → cleanup NOT called', () => {
      const dist = getGuideDistInfo();
      windowHandlers['keyup']?.({ key: 'Shift' } as KeyboardEvent);
      expect(dist.cleanup).not.toHaveBeenCalled();
    });
  });

  // ── Suite 7: keydown window listener ──────────────────────────────────────

  describe('keydown window listener', () => {
    let cancelFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      cancelFn = vi.fn();
      action.onInit();
      action.trigger(cancelFn, { orientation: GUIDE_ORIENTATION.VERTICAL });
    });

    it('7.1 Escape → setState(NOT_ADDED), cancelAction called', () => {
      const evt = { key: 'Escape', preventDefault: vi.fn(), stopPropagation: vi.fn() };
      windowHandlers['keydown']?.(evt as unknown as KeyboardEvent);
      expect((action as unknown as R)['state']).toBe(GUIDE_TOOL_STATE.NOT_ADDED);
      expect(cancelFn).toHaveBeenCalled();
    });

    it('7.2 Enter + state=ADDING → setState(ADDED), emitEvent(onAddedGuide), cancelAction', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      const evt = { key: 'Enter', preventDefault: vi.fn(), stopPropagation: vi.fn() };
      windowHandlers['keydown']?.(evt as unknown as KeyboardEvent);
      expect((action as unknown as R)['state']).toBe(GUIDE_TOOL_STATE.ADDED);
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedGuide');
      expect(cancelFn).toHaveBeenCalled();
    });

    it('7.3 Enter + state≠ADDING → no state change, cancelAction NOT called', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.IDLE;
      const newCancel = vi.fn();
      (action as unknown as R)['cancelAction'] = newCancel;
      const evt = { key: 'Enter', preventDefault: vi.fn(), stopPropagation: vi.fn() };
      windowHandlers['keydown']?.(evt as unknown as KeyboardEvent);
      expect(newCancel).not.toHaveBeenCalled();
    });

    it('7.4 Alt + active=guideTool + state=ADDING → moveGuide(true) called', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      mockWeave.getActiveAction.mockReturnValue(GUIDE_TOOL_ACTION_NAME);
      const dist = getGuideDistInfo();
      windowHandlers['keydown']?.({ key: 'Alt' } as KeyboardEvent);
      expect(dist.handleDistanceLine).toHaveBeenCalledWith(expect.anything(), true);
    });

    it('7.5 Alt + active≠guideTool → moveGuide NOT called', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      const dist = getGuideDistInfo();
      windowHandlers['keydown']?.({ key: 'Alt' } as KeyboardEvent);
      expect(dist.handleDistanceLine).not.toHaveBeenCalled();
    });

    it('7.6 Alt + state≠ADDING → moveGuide NOT called', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.IDLE;
      mockWeave.getActiveAction.mockReturnValue(GUIDE_TOOL_ACTION_NAME);
      const dist = getGuideDistInfo();
      windowHandlers['keydown']?.({ key: 'Alt' } as KeyboardEvent);
      expect(dist.handleDistanceLine).not.toHaveBeenCalled();
    });

    it('7.7 Option + all conditions met → moveGuide(true) called', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      mockWeave.getActiveAction.mockReturnValue(GUIDE_TOOL_ACTION_NAME);
      const dist = getGuideDistInfo();
      windowHandlers['keydown']?.({ key: 'Option' } as KeyboardEvent);
      expect(dist.handleDistanceLine).toHaveBeenCalledWith(expect.anything(), true);
    });

    it('7.8 other key → no state change, no moveGuide', () => {
      const dist = getGuideDistInfo();
      windowHandlers['keydown']?.({ key: 'a' } as KeyboardEvent);
      expect(dist.handleDistanceLine).not.toHaveBeenCalled();
    });
  });

  // ── Suite 8: pointermove stage listener ───────────────────────────────────

  describe('pointermove stage listener', () => {
    beforeEach(() => triggerAction());

    it('8.1 state=IDLE → early return, cursor NOT set', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.IDLE;
      mockWeave._container.style.cursor = '';
      mockWeave._stageHandlers['pointermove']?.({ evt: { altKey: false } });
      expect(mockWeave._container.style.cursor).toBe('');
    });

    it('8.2 state=ADDING + active≠guideTool → setCursor only, no moveGuide', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      mockWeave._container.style.cursor = '';
      const dist = getGuideDistInfo();
      mockWeave._stageHandlers['pointermove']?.({ evt: { altKey: false } });
      expect(mockWeave._container.style.cursor).toBe('crosshair');
      expect(dist.handleDistanceLine).not.toHaveBeenCalled();
    });

    it('8.3 state=ADDING + active=guideTool + altKey=false → moveGuide(false)', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      mockWeave.getActiveAction.mockReturnValue(GUIDE_TOOL_ACTION_NAME);
      const dist = getGuideDistInfo();
      mockWeave._stageHandlers['pointermove']?.({ evt: { altKey: false } });
      expect(dist.handleDistanceLine).toHaveBeenCalledWith(expect.anything(), false);
    });

    it('8.4 state=ADDING + active=guideTool + altKey=true → moveGuide(true)', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      mockWeave.getActiveAction.mockReturnValue(GUIDE_TOOL_ACTION_NAME);
      const dist = getGuideDistInfo();
      mockWeave._stageHandlers['pointermove']?.({ evt: { altKey: true } });
      expect(dist.handleDistanceLine).toHaveBeenCalledWith(expect.anything(), true);
    });
  });

  // ── Suite 9: pointerup stage listener ─────────────────────────────────────

  describe('pointerup stage listener', () => {
    let cancelFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      cancelFn = vi.fn();
      action.onInit();
      action.trigger(cancelFn, { orientation: GUIDE_ORIENTATION.VERTICAL });
    });

    it('9.1 state=IDLE → early return, cancelAction NOT called', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.IDLE;
      mockWeave._stageHandlers['pointerup']?.();
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('9.2 state=ADDING + active=guideTool → setState(ADDED), emitEvent, cancelAction', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      mockWeave.getActiveAction.mockReturnValue(GUIDE_TOOL_ACTION_NAME);
      mockWeave._stageHandlers['pointerup']?.();
      expect((action as unknown as R)['state']).toBe(GUIDE_TOOL_STATE.ADDED);
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedGuide');
      expect(cancelFn).toHaveBeenCalled();
    });

    it('9.3 state=ADDING + active≠guideTool → setCursor only, no state change', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      mockWeave._container.style.cursor = '';
      mockWeave._stageHandlers['pointerup']?.();
      expect(mockWeave._container.style.cursor).toBe('crosshair');
      expect((action as unknown as R)['state']).toBe(GUIDE_TOOL_STATE.ADDING);
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 10: addGuide — VERTICAL ─────────────────────────────────────────

  describe('addGuide — VERTICAL', () => {
    it('10.1 container=mainLayer + mousePoint → line uses visible rect y-spans', () => {
      // stage: scaleX=1, pos={-100,-200}, w=800, h=600 → visible={x:100,y:200,w:800,h:600}
      // mousePoint.x=100 → points=[100,200,100,800]
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 100, y: 150 },
        container: mockWeave._mainLayer,
      });
      triggerAction(GUIDE_ORIENTATION.VERTICAL);
      expect(MockLine).toHaveBeenCalledWith(
        expect.objectContaining({ points: [100, 200, 100, 800] })
      );
      expect(mockWeave._utilityLayer.add).toHaveBeenCalled();
      expect(mockWeave._utilityLayer.batchDraw).toHaveBeenCalled();
    });

    it('10.2 container≠mainLayer + mousePoint → line uses containerRect y-spans', () => {
      const nonMain = makeNonMainContainer('c1', 10, 20, 400, 300);
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 100, y: 150 },
        container: nonMain,
      });
      triggerAction(GUIDE_ORIENTATION.VERTICAL);
      // points=[mouseX, contY, mouseX, contY+contH] = [100, 20, 100, 320]
      expect(MockLine).toHaveBeenCalledWith(
        expect.objectContaining({ points: [100, 20, 100, 320] })
      );
    });

    it('10.3 addGuide-level !utilityLayer → cancelAction called, no Konva.Line', () => {
      // Trigger passes utilityLayer check (call 1 = truthy), addGuide gets null (call 2)
      mockWeave.getUtilityLayer
        .mockReturnValueOnce(mockWeave._utilityLayer)
        .mockReturnValueOnce(null);
      action.onInit();
      const cancelFn = vi.fn();
      action.trigger(cancelFn, { orientation: GUIDE_ORIENTATION.VERTICAL });
      expect(MockLine).not.toHaveBeenCalled();
      expect(cancelFn).toHaveBeenCalled();
    });

    it('10.4 mousePoint=null → addGuide=false, no Konva.Line created', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: null,
        container: mockWeave._mainLayer,
      });
      triggerAction(GUIDE_ORIENTATION.VERTICAL);
      expect(MockLine).not.toHaveBeenCalled();
    });
  });

  // ── Suite 11: addGuide — HORIZONTAL ───────────────────────────────────────

  describe('addGuide — HORIZONTAL', () => {
    it('11.1 container=mainLayer + mousePoint → line uses visible rect x-spans', () => {
      // visible={x:100,y:200,w:800,h:600}, mousePoint.y=150 → [100,150,900,150]
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 100, y: 150 },
        container: mockWeave._mainLayer,
      });
      triggerAction(GUIDE_ORIENTATION.HORIZONTAL);
      expect(MockLine).toHaveBeenCalledWith(
        expect.objectContaining({ points: [100, 150, 900, 150] })
      );
    });

    it('11.2 container≠mainLayer + mousePoint → line uses containerRect x-spans', () => {
      const nonMain = makeNonMainContainer('c1', 10, 20, 400, 300);
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 100, y: 150 },
        container: nonMain,
      });
      triggerAction(GUIDE_ORIENTATION.HORIZONTAL);
      // points=[contX, mouseY, contX+contW, mouseY] = [10, 150, 410, 150]
      expect(MockLine).toHaveBeenCalledWith(
        expect.objectContaining({ points: [10, 150, 410, 150] })
      );
    });

    it('11.3 mousePoint=null → no Konva.Line', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: null,
        container: mockWeave._mainLayer,
      });
      triggerAction(GUIDE_ORIENTATION.HORIZONTAL);
      expect(MockLine).not.toHaveBeenCalled();
    });
  });

  // ── Suite 12: moveGuide — VERTICAL ────────────────────────────────────────

  describe('moveGuide — VERTICAL', () => {
    it('12.1 !guide → early return, handleDistanceLine NOT called', () => {
      action.onInit();
      (action as unknown as R)['guide'] = undefined;
      const dist = getGuideDistInfo();
      (action as unknown as R)['moveGuide'](false);
      expect(dist.handleDistanceLine).not.toHaveBeenCalled();
    });

    it('12.2 VERTICAL + container=mainLayer → uses mousePoint.x via roundNumber', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 100, y: 150 },
        container: mockWeave._mainLayer,
      });
      triggerAction(GUIDE_ORIENTATION.VERTICAL);
      const lineInst = getCreatedLine();
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      mockWeave.getActiveAction.mockReturnValue(GUIDE_TOOL_ACTION_NAME);
      mockWeave._stageHandlers['pointermove']?.({ evt: { altKey: false } });
      // visible={100,200,800,600}, roundNumber(100)=100 → [100,200,100,800]
      expect(lineInst.points).toHaveBeenCalledWith([100, 200, 100, 800]);
    });

    it('12.3 VERTICAL + container≠mainLayer + pointerPosition defined → uses pointerPosition.x', () => {
      const nonMain = makeNonMainContainer('c1', 10, 20, 400, 300);
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 100, y: 150 },
        container: nonMain,
      });
      mockWeave._stage.getRelativePointerPosition.mockReturnValue({ x: 200, y: 250 });
      triggerAction(GUIDE_ORIENTATION.VERTICAL);
      const lineInst = getCreatedLine();
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      mockWeave.getActiveAction.mockReturnValue(GUIDE_TOOL_ACTION_NAME);
      mockWeave._stageHandlers['pointermove']?.({ evt: { altKey: false } });
      // roundNumber(200)=200, containerRect.y=20, y+h=320 → [200,20,200,320]
      expect(lineInst.points).toHaveBeenCalledWith([200, 20, 200, 320]);
    });

    it('12.4 VERTICAL + container≠mainLayer + pointerPosition=null → early return', () => {
      const nonMain = makeNonMainContainer('c1', 10, 20, 400, 300);
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 100, y: 150 },
        container: nonMain,
      });
      mockWeave._stage.getRelativePointerPosition.mockReturnValue(null);
      triggerAction(GUIDE_ORIENTATION.VERTICAL);
      const lineInst = getCreatedLine();
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      mockWeave.getActiveAction.mockReturnValue(GUIDE_TOOL_ACTION_NAME);
      const dist = getGuideDistInfo();
      mockWeave._stageHandlers['pointermove']?.({ evt: { altKey: false } });
      expect(lineInst.points).not.toHaveBeenCalled();
      // early return prevents handleDistanceLine from being reached
      expect(dist.handleDistanceLine).not.toHaveBeenCalled();
    });

    it('12.5 !guideLine → skip point update, handleDistanceLine still called', () => {
      action.onInit();
      const dist = getGuideDistInfo();
      (action as unknown as R)['guide'] = {
        guideId: 'g1',
        orientation: GUIDE_ORIENTATION.VERTICAL,
        value: 0,
        kind: GUIDE_KIND.CUSTOM,
        containerId: '',
        persist: true,
      };
      (action as unknown as R)['guideLine'] = undefined;
      (action as unknown as R)['container'] = mockWeave._mainLayer;
      (action as unknown as R)['moveGuide'](false);
      expect(dist.handleDistanceLine).toHaveBeenCalled();
    });

    it('12.6 !mousePoint → skip point update, handleDistanceLine still called', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: null,
        container: mockWeave._mainLayer,
      });
      // addGuide won't create a line (no mousePoint), set it manually
      triggerAction(GUIDE_ORIENTATION.VERTICAL);
      const manualLine = { points: vi.fn(), destroy: vi.fn() };
      (action as unknown as R)['guideLine'] = manualLine;
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      mockWeave.getActiveAction.mockReturnValue(GUIDE_TOOL_ACTION_NAME);
      const dist = getGuideDistInfo();
      mockWeave._stageHandlers['pointermove']?.({ evt: { altKey: false } });
      expect(manualLine.points).not.toHaveBeenCalled();
      expect(dist.handleDistanceLine).toHaveBeenCalled();
    });
  });

  // ── Suite 13: moveGuide — HORIZONTAL ──────────────────────────────────────

  describe('moveGuide — HORIZONTAL', () => {
    it('13.1 HORIZONTAL + container=mainLayer → uses mousePoint.y', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 100, y: 150 },
        container: mockWeave._mainLayer,
      });
      triggerAction(GUIDE_ORIENTATION.HORIZONTAL);
      const lineInst = getCreatedLine();
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      mockWeave.getActiveAction.mockReturnValue(GUIDE_TOOL_ACTION_NAME);
      mockWeave._stageHandlers['pointermove']?.({ evt: { altKey: false } });
      // visible={100,200,800,600}, roundNumber(150)=150 → [100,150,900,150]
      expect(lineInst.points).toHaveBeenCalledWith([100, 150, 900, 150]);
    });

    it('13.2 HORIZONTAL + container≠mainLayer + pointerPosition defined → uses pointerPosition.y', () => {
      const nonMain = makeNonMainContainer('c1', 10, 20, 400, 300);
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 100, y: 150 },
        container: nonMain,
      });
      mockWeave._stage.getRelativePointerPosition.mockReturnValue({ x: 200, y: 250 });
      triggerAction(GUIDE_ORIENTATION.HORIZONTAL);
      const lineInst = getCreatedLine();
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      mockWeave.getActiveAction.mockReturnValue(GUIDE_TOOL_ACTION_NAME);
      mockWeave._stageHandlers['pointermove']?.({ evt: { altKey: false } });
      // roundNumber(250)=250, containerRect.x=10, x+w=410 → [10,250,410,250]
      expect(lineInst.points).toHaveBeenCalledWith([10, 250, 410, 250]);
    });

    it('13.3 HORIZONTAL + container≠mainLayer + pointerPosition=null → early return', () => {
      const nonMain = makeNonMainContainer('c1', 10, 20, 400, 300);
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 100, y: 150 },
        container: nonMain,
      });
      mockWeave._stage.getRelativePointerPosition.mockReturnValue(null);
      triggerAction(GUIDE_ORIENTATION.HORIZONTAL);
      const lineInst = getCreatedLine();
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDING;
      mockWeave.getActiveAction.mockReturnValue(GUIDE_TOOL_ACTION_NAME);
      const dist = getGuideDistInfo();
      mockWeave._stageHandlers['pointermove']?.({ evt: { altKey: false } });
      expect(lineInst.points).not.toHaveBeenCalled();
      expect(dist.handleDistanceLine).not.toHaveBeenCalled();
    });
  });

  // ── Suite 14: cleanup — NOT_ADDED ─────────────────────────────────────────

  describe('cleanup — NOT_ADDED', () => {
    beforeEach(() => action.onInit());

    it('14.1 state=NOT_ADDED + guide + guideLine → destroy + renderAllVisibleCustomGuides', () => {
      const lineInst = { destroy: vi.fn(), getClientRect: vi.fn().mockReturnValue({ x: 0 }) };
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.NOT_ADDED;
      (action as unknown as R)['guide'] = {
        guideId: 'g1',
        orientation: GUIDE_ORIENTATION.VERTICAL,
      };
      (action as unknown as R)['guideLine'] = lineInst;
      (action as unknown as R)['container'] = mockWeave._mainLayer;
      action.cleanup();
      expect(lineInst.destroy).toHaveBeenCalled();
      expect(mockWeave._guidesManager.renderAllVisibleCustomGuides).toHaveBeenCalled();
    });

    it('14.2 state=NOT_ADDED + guide but no guideLine → no destroy', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.NOT_ADDED;
      (action as unknown as R)['guide'] = { guideId: 'g1' };
      (action as unknown as R)['guideLine'] = undefined;
      action.cleanup();
      expect(mockWeave._guidesManager.renderAllVisibleCustomGuides).not.toHaveBeenCalled();
    });

    it('14.3 state=NOT_ADDED + no guide → no destroy', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.NOT_ADDED;
      (action as unknown as R)['guide'] = undefined;
      (action as unknown as R)['guideLine'] = { destroy: vi.fn() };
      action.cleanup();
      expect(mockWeave._guidesManager.renderAllVisibleCustomGuides).not.toHaveBeenCalled();
    });
  });

  // ── Suite 15: cleanup — ADDED, container=mainLayer ────────────────────────

  describe('cleanup — ADDED, container=mainLayer', () => {
    beforeEach(() => action.onInit());

    function setupAddedMainLayer(orientation = GUIDE_ORIENTATION.VERTICAL) {
      const lineInst = {
        destroy: vi.fn(),
        getClientRect: vi.fn().mockReturnValue({ x: 50, y: 75, width: 0, height: 600 }),
      };
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDED;
      (action as unknown as R)['guide'] = {
        guideId: 'g1',
        orientation,
        value: 0,
        kind: GUIDE_KIND.CUSTOM,
        containerId: '',
        persist: true,
      };
      (action as unknown as R)['guideLine'] = lineInst;
      (action as unknown as R)['container'] = mockWeave._mainLayer;
      return lineInst;
    }

    it('15.1 VERTICAL + mainLayer → value=roundNumber(nodeRect.x - 0) = 50', () => {
      setupAddedMainLayer(GUIDE_ORIENTATION.VERTICAL);
      // stage.getClientRect → {x:0,y:0,w:800,h:600}, offset={0,0}
      // nodeRect.x=50, valueX=roundNumber(50-0)=50
      action.cleanup();
      expect(mockWeave._guidesManager.saveCustomGuide).toHaveBeenCalledWith(
        expect.objectContaining({ value: 50 })
      );
    });

    it('15.2 HORIZONTAL + mainLayer → value=roundNumber(nodeRect.y - 0) = 75', () => {
      setupAddedMainLayer(GUIDE_ORIENTATION.HORIZONTAL);
      // nodeRect.y=75, valueY=roundNumber(75-0)=75
      action.cleanup();
      expect(mockWeave._guidesManager.saveCustomGuide).toHaveBeenCalledWith(
        expect.objectContaining({ value: 75 })
      );
    });

    it('15.3 isCustomGuidesVisible=false → toggleCustomGuides called', () => {
      setupAddedMainLayer();
      mockWeave._guidesManager.isCustomGuidesVisible.mockReturnValue(false);
      action.cleanup();
      expect(mockWeave._guidesManager.toggleCustomGuides).toHaveBeenCalled();
    });

    it('15.4 isCustomGuidesVisible=true → toggleCustomGuides NOT called', () => {
      setupAddedMainLayer();
      mockWeave._guidesManager.isCustomGuidesVisible.mockReturnValue(true);
      action.cleanup();
      expect(mockWeave._guidesManager.toggleCustomGuides).not.toHaveBeenCalled();
    });

    it('15.5 no snappingManager → saveCustomGuide NOT called', () => {
      setupAddedMainLayer();
      mockWeave.getPlugin.mockImplementation((key: string) => {
        if (key === WEAVE_NODES_SELECTION_KEY) return { dummy: true };
        return undefined;
      });
      action.cleanup();
      expect(mockWeave._guidesManager.saveCustomGuide).not.toHaveBeenCalled();
    });

    it('15.6 guideLine.destroy() called at end', () => {
      const lineInst = setupAddedMainLayer();
      action.cleanup();
      expect(lineInst.destroy).toHaveBeenCalled();
    });
  });

  // ── Suite 16: cleanup — ADDED, container≠mainLayer ────────────────────────

  describe('cleanup — ADDED, container≠mainLayer', () => {
    beforeEach(() => action.onInit());

    function setupAddedNonMainLayer(orientation = GUIDE_ORIENTATION.VERTICAL) {
      const nonMain = makeNonMainContainer('c1', 10, 20, 400, 300);
      const lineInst = {
        destroy: vi.fn(),
        getClientRect: vi.fn().mockReturnValue({ x: 60, y: 45, width: 0, height: 300 }),
      };
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.ADDED;
      (action as unknown as R)['guide'] = {
        guideId: 'g1',
        orientation,
        value: 0,
        kind: GUIDE_KIND.CUSTOM,
        containerId: '',
        persist: true,
      };
      (action as unknown as R)['guideLine'] = lineInst;
      (action as unknown as R)['container'] = nonMain;
      return { lineInst, nonMain };
    }

    it('16.1 VERTICAL + container≠mainLayer → offset=containerRect, valueX=Math.abs(nodeRect.x-offset.x)', () => {
      setupAddedNonMainLayer(GUIDE_ORIENTATION.VERTICAL);
      // containerRect={x:10,y:20,w:400,h:300}, nodeRect.x=60
      // offset={x:10,y:20}, valueX=roundNumber(Math.abs(60-10))=50
      action.cleanup();
      expect(mockWeave._guidesManager.saveCustomGuide).toHaveBeenCalledWith(
        expect.objectContaining({ value: 50 })
      );
    });

    it('16.2 HORIZONTAL + container≠mainLayer → valueY=Math.abs(nodeRect.y-offset.y)', () => {
      setupAddedNonMainLayer(GUIDE_ORIENTATION.HORIZONTAL);
      // nodeRect.y=45, offset.y=20 → valueY=roundNumber(Math.abs(45-20))=25
      action.cleanup();
      expect(mockWeave._guidesManager.saveCustomGuide).toHaveBeenCalledWith(
        expect.objectContaining({ value: 25 })
      );
    });

    it('16.3 guideLine.destroy() called at end', () => {
      const { lineInst } = setupAddedNonMainLayer();
      action.cleanup();
      expect(lineInst.destroy).toHaveBeenCalled();
    });

    it('16.4 getMainLayer() returns null → getMainLayer()?.id()=undefined, offset branch hit', () => {
      mockWeave.getMainLayer.mockReturnValue(null);
      setupAddedNonMainLayer(GUIDE_ORIENTATION.VERTICAL);
      // container !== null → guideContainer = container
      // container.id() !== undefined → true → offset = containerRect.{x,y}
      expect(() => action.cleanup()).not.toThrow();
    });
  });

  // ── Suite 17: cleanup — selectionPlugin ───────────────────────────────────

  describe('cleanup — selectionPlugin', () => {
    beforeEach(() => action.onInit());

    it('17.1 selectionPlugin present → triggerAction("selectionTool") called', () => {
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.IDLE;
      action.cleanup();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith('selectionTool');
    });

    it('17.2 selectionPlugin absent → triggerAction NOT called', () => {
      mockWeave.getPlugin.mockImplementation((key: string) => {
        if (key === WEAVE_NODES_SNAPPING_PLUGIN_KEY) return mockWeave._snappingPlugin;
        return undefined;
      });
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.IDLE;
      action.cleanup();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });
  });

  // ── Suite 18: cleanup — always resets ─────────────────────────────────────

  describe('cleanup — always resets state', () => {
    it('18.1 guide/guideLine/container=undefined, state=IDLE after cleanup', () => {
      action.onInit();
      (action as unknown as R)['state'] = GUIDE_TOOL_STATE.NOT_ADDED;
      (action as unknown as R)['guide'] = { guideId: 'g1' };
      (action as unknown as R)['guideLine'] = {
        destroy: vi.fn(),
        getClientRect: vi.fn().mockReturnValue({ x: 0 }),
      };
      (action as unknown as R)['container'] = mockWeave._mainLayer;
      action.cleanup();
      expect((action as unknown as R)['guide']).toBeUndefined();
      expect((action as unknown as R)['guideLine']).toBeUndefined();
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['state']).toBe(GUIDE_TOOL_STATE.IDLE);
    });
  });

  // ── Suite 19: getVisibleStageRect ─────────────────────────────────────────

  describe('getVisibleStageRect (via addGuide)', () => {
    it('19.1 scaleX=2, pos={x:-100,y:-200}, w=800, h=600 → visible={x:50,y:100,w:400,h:300}', () => {
      mockWeave._stage.scaleX.mockReturnValue(2);
      mockWeave._stage.scaleY.mockReturnValue(2);
      mockWeave._stage.position.mockReturnValue({ x: -100, y: -200 });
      mockWeave._stage.width.mockReturnValue(800);
      mockWeave._stage.height.mockReturnValue(600);
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 100, y: 150 },
        container: mockWeave._mainLayer,
      });
      // HORIZONTAL: lineSegments = [visible.x, mouseY, visible.x+visible.w, mouseY]
      //           = [50, 150, 450, 150]
      triggerAction(GUIDE_ORIENTATION.HORIZONTAL);
      expect(MockLine).toHaveBeenCalledWith(
        expect.objectContaining({ points: [50, 150, 450, 150] })
      );
    });
  });

  // ── Suite 20: setCursor ────────────────────────────────────────────────────

  describe('setCursor (via trigger/addGuide)', () => {
    it('20.1 after trigger → stage.container().style.cursor = "crosshair"', () => {
      mockWeave._container.style.cursor = '';
      triggerAction();
      expect(mockWeave._container.style.cursor).toBe('crosshair');
    });
  });
});
