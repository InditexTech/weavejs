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

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { type R } from '../../__tests__/shared/action.test-helpers';
import { WeaveMoveToolAction } from '../move-tool';
import { MOVE_TOOL_ACTION_NAME, MOVE_TOOL_STATE } from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';

function makeTransformer() {
  return {
    listening: vi.fn(),
    draggable: vi.fn(),
    show: vi.fn(),
  };
}

function makeSelectionPlugin(isEnabled = false) {
  const transformer = makeTransformer();
  return {
    isEnabled: vi.fn().mockReturnValue(isEnabled),
    getTransformer: vi.fn().mockReturnValue(transformer),
    _transformer: transformer,
  };
}

function makeMockWeave() {
  const stageContainer = {
    tabIndex: 0,
    focus: vi.fn(),
    style: { cursor: '' },
  };

  const stageHandlers: Record<string, (e?: unknown) => void> = {};
  const stage = {
    container: vi.fn().mockReturnValue(stageContainer),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      stageHandlers[event] = handler;
    }),
  };

  const selectionPlugin = makeSelectionPlugin(false);

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(selectionPlugin),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    getActiveAction: vi.fn().mockReturnValue(MOVE_TOOL_ACTION_NAME),
    enablePlugin: vi.fn(),
    triggerAction: vi.fn(),
    emitEvent: vi.fn(),
    _stageContainer: stageContainer,
    _stageHandlers: stageHandlers,
    _selectionPlugin: selectionPlugin,
  };
}

describe('WeaveMoveToolAction', () => {
  let action: WeaveMoveToolAction;
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

    action = new WeaveMoveToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
    (action as unknown as R)['cancelAction'] = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function triggerAction(params?: { triggerSelectionTool?: boolean }) {
    const cancelFn = vi.fn();
    action.trigger(cancelFn, params);
    return { cancelFn, handlers: mockWeave._stageHandlers };
  }

  // ── Suite 1: constructor / initialize ────────────────────────────────────────

  describe('constructor / initialize', () => {
    it('1.1 initialized=false, state=IDLE', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      expect((action as unknown as R)['state']).toBe(MOVE_TOOL_STATE.IDLE);
    });

    it('1.2 onPropsChange and onInit are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
    });
  });

  // ── Suite 2: getName ─────────────────────────────────────────────────────────

  describe('getName', () => {
    it('2.1 returns MOVE_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(MOVE_TOOL_ACTION_NAME);
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
      expect(mockWeave._stageHandlers['pointerdown']).toBeDefined();
    });

    it('3.3 second call → setupEvents NOT called again (initialized stays true)', () => {
      triggerAction();
      triggerAction();
      expect((action as unknown as R)['initialized']).toBe(true);
    });

    it('3.4 sets tabIndex=1 and calls focus()', () => {
      triggerAction();
      expect(mockWeave._stageContainer.tabIndex).toBe(1);
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
    });

    it('3.5 params absent → triggerSelectionTool=true (default)', () => {
      triggerAction(undefined);
      expect((action as unknown as R)['triggerSelectionTool']).toBe(true);
    });

    it('3.6 params.triggerSelectionTool=false → stores false', () => {
      triggerAction({ triggerSelectionTool: false });
      expect((action as unknown as R)['triggerSelectionTool']).toBe(false);
    });

    it('3.7 stores cancelAction callback', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      expect((action as unknown as R)['cancelAction']).toBe(cancelFn);
    });

    it('3.8 calls setMoving → state becomes MOVING', () => {
      triggerAction();
      expect((action as unknown as R)['state']).toBe(MOVE_TOOL_STATE.MOVING);
    });
  });

  // ── Suite 4: setupEvents – keydown listener ───────────────────────────────────

  describe('setupEvents – keydown', () => {
    beforeEach(() => triggerAction());

    it('4.1 Escape + active=moveTool → calls cancelAction()', () => {
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Escape' } as KeyboardEvent);
      expect(cancelAction).toHaveBeenCalled();
    });

    it('4.2 Escape + active≠moveTool → does NOT call cancelAction()', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Escape' } as KeyboardEvent);
      expect(cancelAction).not.toHaveBeenCalled();
    });

    it('4.3 other key → does nothing', () => {
      const cancelAction = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      windowHandlers['keydown']({ code: 'Space' } as KeyboardEvent);
      expect(cancelAction).not.toHaveBeenCalled();
    });
  });

  // ── Suite 5: setupEvents – pointerdown / pointerup listeners ─────────────────

  describe('setupEvents – pointerdown/pointerup', () => {
    beforeEach(() => {
      triggerAction();
      mockWeave._stageContainer.style.cursor = '';
    });

    it('5.1 pointerdown + active=moveTool → cursor=grabbing', () => {
      mockWeave._stageHandlers['pointerdown']();
      expect(mockWeave._stageContainer.style.cursor).toBe('grabbing');
    });

    it('5.2 pointerdown + active≠moveTool → cursor unchanged', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      mockWeave._stageHandlers['pointerdown']();
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('5.3 pointerup + active=moveTool → cursor=grab', () => {
      mockWeave._stageHandlers['pointerup']();
      expect(mockWeave._stageContainer.style.cursor).toBe('grab');
    });

    it('5.4 pointerup + active≠moveTool → cursor unchanged', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      mockWeave._stageHandlers['pointerup']();
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('5.5 pointerdown + getActiveAction()=null → cursor unchanged (null coalescing)', () => {
      mockWeave.getActiveAction.mockReturnValue(null);
      mockWeave._stageHandlers['pointerdown']();
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('5.6 pointerup + getActiveAction()=null → cursor unchanged (null coalescing)', () => {
      mockWeave.getActiveAction.mockReturnValue(null);
      mockWeave._stageHandlers['pointerup']();
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });
  });

  // ── Suite 6: setMoving (private, via trigger) ─────────────────────────────────

  describe('setMoving', () => {
    it('6.1 always sets cursor=grab and calls focus()', () => {
      triggerAction();
      expect(mockWeave._stageContainer.style.cursor).toBe('grab');
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
    });

    it('6.2 always sets state to MOVING', () => {
      triggerAction();
      expect((action as unknown as R)['state']).toBe(MOVE_TOOL_STATE.MOVING);
    });

    it('6.3 selectionPlugin absent → skips enablePlugin and tr methods', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      triggerAction();
      expect(mockWeave.enablePlugin).not.toHaveBeenCalled();
    });

    it('6.4 selectionPlugin present + isEnabled=false → enablePlugin + tr.listening(false) + tr.draggable(false) + tr.show()', () => {
      mockWeave._selectionPlugin.isEnabled.mockReturnValue(false);
      triggerAction();
      expect(mockWeave.enablePlugin).toHaveBeenCalledWith('nodesSelection');
      expect(mockWeave._selectionPlugin._transformer.listening).toHaveBeenCalledWith(false);
      expect(mockWeave._selectionPlugin._transformer.draggable).toHaveBeenCalledWith(false);
      expect(mockWeave._selectionPlugin._transformer.show).toHaveBeenCalled();
    });

    it('6.5 selectionPlugin present + isEnabled=true → skips enablePlugin and tr methods', () => {
      mockWeave._selectionPlugin.isEnabled.mockReturnValue(true);
      triggerAction();
      expect(mockWeave.enablePlugin).not.toHaveBeenCalled();
      expect(mockWeave._selectionPlugin._transformer.show).not.toHaveBeenCalled();
    });
  });

  // ── Suite 7: cleanup ─────────────────────────────────────────────────────────

  describe('cleanup', () => {
    beforeEach(() => triggerAction());

    it('7.1 always sets cursor to default', () => {
      action.cleanup();
      expect(mockWeave._stageContainer.style.cursor).toBe('default');
    });

    it('7.2 selectionPlugin present → tr.listening(true) + tr.draggable(true)', () => {
      action.cleanup();
      expect(mockWeave._selectionPlugin._transformer.listening).toHaveBeenCalledWith(true);
      expect(mockWeave._selectionPlugin._transformer.draggable).toHaveBeenCalledWith(true);
    });

    it('7.3 selectionPlugin absent → skips tr.listening/draggable', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      action.cleanup();
      expect(mockWeave._selectionPlugin._transformer.listening).not.toHaveBeenCalledWith(true);
    });

    it('7.4 selectionPlugin present + triggerSelectionTool=true → triggerAction(SELECTION_TOOL_ACTION_NAME)', () => {
      (action as unknown as R)['triggerSelectionTool'] = true;
      action.cleanup();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(
        SELECTION_TOOL_ACTION_NAME
      );
    });

    it('7.5 selectionPlugin present + triggerSelectionTool=false → skips triggerAction', () => {
      (action as unknown as R)['triggerSelectionTool'] = false;
      action.cleanup();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('7.6 always sets state to IDLE', () => {
      action.cleanup();
      expect((action as unknown as R)['state']).toBe(MOVE_TOOL_STATE.IDLE);
    });
  });
});
