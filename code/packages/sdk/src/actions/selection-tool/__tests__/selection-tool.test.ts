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

import { WeaveSelectionToolAction } from '../selection-tool';
import {
  SELECTION_TOOL_ACTION_NAME,
  SELECTION_TOOL_STATE,
} from '../constants';

type R = Record<string, unknown>;

function makeTransformer() {
  return { show: vi.fn(), hide: vi.fn() };
}

function makeSelectionPlugin() {
  const transformer = makeTransformer();
  return {
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
  const stage = {
    container: vi.fn().mockReturnValue(stageContainer),
  };
  const selectionPlugin = makeSelectionPlugin();

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(selectionPlugin),
    enablePlugin: vi.fn(),
    disablePlugin: vi.fn(),
    emitEvent: vi.fn(),
    _stageContainer: stageContainer,
    _selectionPlugin: selectionPlugin,
  };
}

describe('WeaveSelectionToolAction', () => {
  let action: WeaveSelectionToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;

  beforeEach(() => {
    action = new WeaveSelectionToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Suite 1: constructor / initialize ────────────────────────────────────────

  describe('constructor / initialize', () => {
    it('1.1 initialized=false, state=IDLE', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      expect((action as unknown as R)['state']).toBe(SELECTION_TOOL_STATE.IDLE);
    });

    it('1.2 onPropsChange and onInit are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
    });
  });

  // ── Suite 2: getName ─────────────────────────────────────────────────────────

  describe('getName', () => {
    it('2.1 returns SELECTION_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(SELECTION_TOOL_ACTION_NAME);
    });
  });

  // ── Suite 3: trigger ─────────────────────────────────────────────────────────

  describe('trigger', () => {
    it('3.1 no instance → throws "Instance not defined"', () => {
      (action as unknown as R)['instance'] = undefined;
      expect(() => action.trigger(vi.fn())).toThrow('Instance not defined');
    });

    it('3.2 first call → setupEvents runs, initialized=true', () => {
      action.trigger(vi.fn());
      expect((action as unknown as R)['initialized']).toBe(true);
    });

    it('3.3 second call → setupEvents NOT called again (initialized stays true)', () => {
      action.trigger(vi.fn());
      action.trigger(vi.fn());
      expect((action as unknown as R)['initialized']).toBe(true);
    });

    it('3.4 sets tabIndex=1 and calls focus()', () => {
      action.trigger(vi.fn());
      expect(mockWeave._stageContainer.tabIndex).toBe(1);
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
    });

    it('3.5 stores cancelAction callback', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      expect((action as unknown as R)['cancelAction']).toBe(cancelFn);
    });

    it('3.6 calls setSelection → state becomes SELECTING', () => {
      action.trigger(vi.fn());
      expect((action as unknown as R)['state']).toBe(
        SELECTION_TOOL_STATE.SELECTING
      );
    });
  });

  // ── Suite 4: setSelection (private, exercised via trigger) ───────────────────

  describe('setSelection', () => {
    it('4.1 selectionPlugin present → enablePlugin + tr.show()', () => {
      action.trigger(vi.fn());
      expect(mockWeave.enablePlugin).toHaveBeenCalledWith('nodesSelection');
      expect(mockWeave._selectionPlugin._transformer.show).toHaveBeenCalled();
    });

    it('4.2 selectionPlugin absent → skips enablePlugin and tr.show()', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      action.trigger(vi.fn());
      expect(mockWeave.enablePlugin).not.toHaveBeenCalled();
    });

    it('4.3 always sets cursor=default and calls focus()', () => {
      action.trigger(vi.fn());
      expect(mockWeave._stageContainer.style.cursor).toBe('default');
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
    });

    it('4.4 always sets state to SELECTING', () => {
      action.trigger(vi.fn());
      expect((action as unknown as R)['state']).toBe(
        SELECTION_TOOL_STATE.SELECTING
      );
    });
  });

  // ── Suite 5: cleanup ─────────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('5.1 always sets cursor to default', () => {
      action.cleanup();
      expect(mockWeave._stageContainer.style.cursor).toBe('default');
    });

    it('5.2 selectionPlugin present → disablePlugin + tr.hide()', () => {
      action.cleanup();
      expect(mockWeave.disablePlugin).toHaveBeenCalledWith('nodesSelection');
      expect(mockWeave._selectionPlugin._transformer.hide).toHaveBeenCalled();
    });

    it('5.3 selectionPlugin absent → skips disablePlugin and tr.hide()', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      action.cleanup();
      expect(mockWeave.disablePlugin).not.toHaveBeenCalled();
    });

    it('5.4 always sets state to IDLE', () => {
      (action as unknown as R)['state'] = SELECTION_TOOL_STATE.SELECTING;
      action.cleanup();
      expect((action as unknown as R)['state']).toBe(SELECTION_TOOL_STATE.IDLE);
    });
  });
});
