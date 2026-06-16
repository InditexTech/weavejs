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

import {
  makeContainer,
  type R,
} from '../../__tests__/shared/action.test-helpers';
import { WeavePolygonToolAction } from '../polygon-tool';
import { POLYGON_TOOL_ACTION_NAME, POLYGON_TOOL_STATE } from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';
import {
  WEAVE_POLYGON_PRESETS,
  instantiatePreset,
} from '../../../nodes/polygon/presets';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockWeave() {
  const stageContainer = {
    tabIndex: 0,
    focus: vi.fn(),
    blur: vi.fn(),
    style: { cursor: '' },
  };

  const stageHandlers: Record<string, (e?: unknown) => void> = {};
  const mockNode = { getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }) };

  const stage = {
    container: vi.fn().mockReturnValue(stageContainer),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      stageHandlers[event] = handler;
    }),
    findOne: vi.fn().mockReturnValue(mockNode),
  };

  const defaultContainer = makeContainer('layer-id');
  const selectionPlugin = {
    setSelectedNodes: vi.fn(),
    getSelectedNodes: vi.fn().mockReturnValue([]),
  };

  const nodeHandlerMock = {
    create: vi.fn().mockReturnValue(mockNode),
    serialize: vi.fn().mockReturnValue({ id: 'test-uuid', type: 'polygon', props: {} }),
  };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(selectionPlugin),
    getMousePointer: vi.fn().mockReturnValue({
      mousePoint: { x: 50, y: 75 },
      container: defaultContainer,
    }),
    getNodeHandler: vi.fn().mockReturnValue(nodeHandlerMock),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    getActiveAction: vi.fn().mockReturnValue(POLYGON_TOOL_ACTION_NAME),
    emitEvent: vi.fn(),
    addNode: vi.fn(),
    updateNode: vi.fn(),
    triggerAction: vi.fn(),
    getChildLogger: vi.fn().mockReturnValue({ debug: vi.fn() }),
    _stage: stage,
    _stageContainer: stageContainer,
    _stageHandlers: stageHandlers,
    _selectionPlugin: selectionPlugin,
    _nodeHandler: nodeHandlerMock,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WeavePolygonToolAction', () => {
  let action: WeavePolygonToolAction;
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

    action = new WeavePolygonToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
    (action as unknown as R)['cancelAction'] = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // ── Suite 1: constructor / initialize ─────────────────────────────────────

  describe('constructor / initialize', () => {
    it('1.1 initialized=false, state=IDLE, polygonId=null', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      expect((action as unknown as R)['state']).toBe(POLYGON_TOOL_STATE.IDLE);
      expect((action as unknown as R)['polygonId']).toBeNull();
    });

    it('1.2 default preset is pentagon', () => {
      expect((action as unknown as R)['preset']).toBe('pentagon');
    });

    it('1.3 accepts a preset in constructor', () => {
      const hexAction = new WeavePolygonToolAction('hexagon');
      expect((hexAction as unknown as R)['preset']).toBe('hexagon');
    });

    it('1.4 onPropsChange and onInit are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
    });
  });

  // ── Suite 2: getName ───────────────────────────────────────────────────────

  describe('getName', () => {
    it('2.1 returns POLYGON_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(POLYGON_TOOL_ACTION_NAME);
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
    });
  });

  // ── Suite 4: trigger ──────────────────────────────────────────────────────

  describe('trigger', () => {
    it('4.1 throws when instance not defined', () => {
      const bareAction = new WeavePolygonToolAction();
      expect(() => bareAction.trigger(vi.fn())).toThrow('Instance not defined');
    });

    it('4.2 sets state to ADDING after trigger', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      expect((action as unknown as R)['state']).toBe(POLYGON_TOOL_STATE.ADDING);
    });

    it('4.3 sets cursor to crosshair', () => {
      action.trigger(vi.fn());
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });

    it('4.4 registers pointerdown on stage', () => {
      action.trigger(vi.fn());
      expect(mockWeave._stage.on).toHaveBeenCalledWith(
        'pointerdown',
        expect.any(Function)
      );
    });

    it('4.5 clears selection on trigger', () => {
      action.trigger(vi.fn());
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith(
        []
      );
    });
  });

  // ── Suite 5: pointerdown creates node ─────────────────────────────────────

  describe('pointerdown creates polygon', () => {
    it('5.1 calls addNode with the created node', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);

      const handlers = mockWeave._stageHandlers;
      expect(handlers['pointerdown']).toBeDefined();

      handlers['pointerdown']?.({
        evt: { pointerId: 1, clientX: 50, clientY: 75, buttons: 0 },
      });

      expect(mockWeave.addNode).toHaveBeenCalled();
    });

    it('5.2 emits onAddingPolygon and onAddedPolygon', () => {
      action.trigger(vi.fn());
      const handlers = mockWeave._stageHandlers;

      handlers['pointerdown']?.({
        evt: { pointerId: 1, clientX: 50, clientY: 75, buttons: 0 },
      });

      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddingPolygon');
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedPolygon');
    });

    it('5.3 uses scaleFactor from updateProps when set', () => {
      action.trigger(vi.fn());
      action.updateProps({ scaleFactor: 2 });

      const handlers = mockWeave._stageHandlers;
      handlers['pointerdown']?.({
        evt: { pointerId: 1, clientX: 50, clientY: 75, buttons: 0 },
      });

      const createCall = mockWeave._nodeHandler.create.mock.calls[0]?.[1] as Record<string, unknown>;
      const expected = instantiatePreset(
        WEAVE_POLYGON_PRESETS.pentagon,
        WEAVE_POLYGON_PRESETS.pentagon.defaultWidth * 2,
        WEAVE_POLYGON_PRESETS.pentagon.defaultHeight * 2
      );
      expect(createCall?.width).toBe(expected.width);
      expect(createCall?.height).toBe(expected.height);
    });

    it('5.4 uses preset defaults (scaleFactor=1) when not set', () => {
      action.trigger(vi.fn());

      const handlers = mockWeave._stageHandlers;
      handlers['pointerdown']?.({
        evt: { pointerId: 1, clientX: 50, clientY: 75, buttons: 0 },
      });

      const createCall = mockWeave._nodeHandler.create.mock.calls[0]?.[1] as Record<string, unknown>;
      const expected = instantiatePreset(
        WEAVE_POLYGON_PRESETS.pentagon,
        WEAVE_POLYGON_PRESETS.pentagon.defaultWidth,
        WEAVE_POLYGON_PRESETS.pentagon.defaultHeight
      );
      expect(createCall?.width).toBe(expected.width);
      expect(createCall?.height).toBe(expected.height);
    });
  });

  // ── Suite 6: keyboard cancel ───────────────────────────────────────────────

  describe('keyboard cancel', () => {
    it('6.1 Escape cancels the action', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);

      windowHandlers['keydown']?.({ code: 'Escape' } as KeyboardEvent);

      expect(cancelFn).toHaveBeenCalled();
    });

    it('6.2 Enter also cancels the action', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);

      windowHandlers['keydown']?.({ code: 'Enter' } as KeyboardEvent);

      expect(cancelFn).toHaveBeenCalled();
    });
  });

  // ── Suite 7: cleanup ──────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('7.1 resets state to IDLE', () => {
      action.trigger(vi.fn());
      action.cleanup();
      expect((action as unknown as R)['state']).toBe(POLYGON_TOOL_STATE.IDLE);
    });

    it('7.2 sets cursor to default', () => {
      action.trigger(vi.fn());
      action.cleanup();
      expect(mockWeave._stageContainer.style.cursor).toBe('default');
    });

    it('7.3 triggers SELECTION action', () => {
      action.trigger(vi.fn());
      action.cleanup();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(
        SELECTION_TOOL_ACTION_NAME
      );
    });
  });
});
